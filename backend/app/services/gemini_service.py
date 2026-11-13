import json
import logging
import random
import re
import time
from typing import Any, Dict, Optional
from fastapi import HTTPException, status
from google import genai
from google.genai import types
from google.genai.errors import APIError

from app.core.config import settings
from app.models.ticket import TicketCategory, TicketPriority
from app.schemas.ai import (
    SentimentLabel,
    AIClassificationResponse,
    AIPriorityResponse,
    AISummaryResponse,
    AIResolutionResponse,
    AISentimentResponse,
)

logger = logging.getLogger("issueflow.ai")


class GeminiService:
    """
    Service responsible for all interactions with the Google Gemini AI API.
    Handles client initialization, prompt engineering, structured response parsing,
    and comprehensive error handling (quotas, timeouts, invalid keys).
    """

    @classmethod
    def _get_client(cls) -> genai.Client:
        """
        Initializes and returns the Gemini API client.
        Validates that GEMINI_API_KEY is present and not a default placeholder.
        """
        api_key = (settings.GEMINI_API_KEY or "").strip()
        if not api_key or api_key.startswith("your_") or api_key == "replace_with_a_secure_random_secret":
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Google Gemini API key is not configured. Please add a valid GEMINI_API_KEY in backend/.env to use AI features."
            )
        try:
            return genai.Client(api_key=api_key)
        except Exception as e:
            logger.error("Failed to initialize Google Gemini client: %s", str(e))
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to initialize AI service client."
            )

    @classmethod
    def _clean_json_response(cls, text: str) -> str:
        """
        Strips markdown code blocks (e.g. ```json ... ```) to guarantee valid JSON string.
        """
        cleaned = text.strip()
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
            cleaned = re.sub(r"\s*```$", "", cleaned)
        return cleaned.strip()

    @classmethod
    def _execute_prompt(cls, prompt: str, system_instruction: str, max_retries: int = 2) -> Dict[str, Any]:
        """
        Sends a structured JSON prompt to Gemini with exponential backoff retry for
        transient errors (503 high demand, 429 quota spikes, network timeouts).
        Permanent errors (401/403 invalid key, 404 model not found) fail fast without retrying.
        """
        client = cls._get_client()
        model_name = settings.GEMINI_MODEL or "gemini-3.5-flash-lite"

        for attempt in range(max_retries + 1):
            try:
                config = types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    response_mime_type="application/json",
                    temperature=0.1,
                )
                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config=config,
                )

                raw_text = response.text or "{}"
                cleaned_text = cls._clean_json_response(raw_text)
                return json.loads(cleaned_text)

            except APIError as api_err:
                err_msg = str(api_err).lower()
                code = getattr(api_err, "code", None)
                logger.warning(
                    "Gemini API response code: %s on attempt %d/%d (error: %s)",
                    code, attempt + 1, max_retries + 1, str(api_err)[:120]
                )

                # 1. Permanent Authentication / Permission Errors (400, 401, 403) - DO NOT RETRY
                if code in (400, 401, 403) or "api_key_invalid" in err_msg or "permission_denied" in err_msg or "unauthorized" in err_msg:
                    logger.error("Gemini API authentication failed (code: %s). Check GEMINI_API_KEY.", code)
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail="Invalid or unauthorized Google Gemini API key. Please verify your credentials in Google AI Studio."
                    )

                # 2. Model Not Found / Deprecated (404) - DO NOT RETRY
                if code == 404 or "not_found" in err_msg:
                    logger.error("Gemini model '%s' not found or deprecated (code: 404).", model_name)
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail=f"Configured Gemini model '{model_name}' was not found or is no longer supported."
                    )

                # 3. Temporary Upstream Unavailability / High Demand (503 / 502 / 504 / 500)
                if code in (500, 502, 503, 504) or "unavailable" in err_msg or "high demand" in err_msg or "overloaded" in err_msg:
                    if attempt < max_retries:
                        backoff = (1.5 ** attempt) + random.uniform(0.2, 0.5)
                        logger.warning(
                            "Gemini model '%s' unavailable/high demand (503) on attempt %d/%d. Retrying in %.2fs...",
                            model_name, attempt + 1, max_retries + 1, backoff
                        )
                        time.sleep(backoff)
                        continue
                    else:
                        logger.error("Gemini API 503 retries exhausted after %d attempts.", max_retries + 1)
                        raise HTTPException(
                            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                            detail="Google Gemini AI is temporarily experiencing high upstream demand (503). Retries were exhausted. Please wait a few moments and try again."
                        )

                # 4. Rate Limit / Quota Exceeded (429)
                if code == 429 or "quota" in err_msg or "resource_exhausted" in err_msg or "rate limit" in err_msg:
                    if attempt < max_retries:
                        backoff = (2.0 ** attempt) + random.uniform(0.5, 1.0)
                        logger.warning(
                            "Gemini API rate limit/quota reached on attempt %d/%d. Retrying in %.2fs...",
                            attempt + 1, max_retries + 1, backoff
                        )
                        time.sleep(backoff)
                        continue
                    else:
                        logger.error("Gemini API 429 rate limit retries exhausted.")
                        raise HTTPException(
                            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                            detail="Gemini API rate limit or quota exceeded (429). Retries were exhausted. Please wait a moment and try again."
                        )

                # Unclassified API Error
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Gemini API service error: {getattr(api_err, 'message', str(api_err))}"
                )

            except (json.JSONDecodeError, ValueError) as json_err:
                logger.error("Failed to parse Gemini response as JSON: %s", str(json_err))
                if attempt < max_retries:
                    time.sleep(0.5)
                    continue
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Gemini returned an invalid or unparseable response structure. Please retry."
                )
            except TimeoutError:
                if attempt < max_retries:
                    time.sleep(1.0)
                    continue
                raise HTTPException(
                    status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                    detail="Request to Gemini AI service timed out. Please try again later."
                )
            except HTTPException:
                raise
            except Exception as general_err:
                logger.error("Unexpected error in GeminiService: %s", str(general_err))
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="An unexpected error occurred while communicating with the Gemini AI service."
                )

    @classmethod
    def classify_ticket(cls, title: str, description: str) -> AIClassificationResponse:
        """
        Classifies support ticket into one of the canonical categories:
        TECHNICAL_ISSUE, BILLING, ACCOUNT, GENERAL_INQUIRY, BUG_REPORT, FEATURE_REQUEST.
        """
        system_instruction = (
            "You are an expert IT support ticket classifier for an issue management platform. "
            "Analyze the ticket title and description and output strict JSON with fields: "
            "'suggested_category' (must be exactly one of: TECHNICAL_ISSUE, BILLING, ACCOUNT, "
            "GENERAL_INQUIRY, BUG_REPORT, FEATURE_REQUEST), "
            "'confidence' (float between 0.0 and 1.0), "
            "'explanation' (concise 1-2 sentence reason), "
            "'alternative_category' (optional secondary category or null)."
        )
        prompt = f"Title: {title}\nDescription: {description}"
        data = cls._execute_prompt(prompt, system_instruction)

        # Validate category enum
        raw_cat = str(data.get("suggested_category", "")).upper()
        if raw_cat not in TicketCategory.__members__:
            raw_cat = TicketCategory.TECHNICAL_ISSUE.value

        alt_cat = data.get("alternative_category")
        if alt_cat and str(alt_cat).upper() in TicketCategory.__members__:
            alt_cat = TicketCategory(str(alt_cat).upper())
        else:
            alt_cat = None

        return AIClassificationResponse(
            suggested_category=TicketCategory(raw_cat),
            confidence=float(data.get("confidence", 0.85)),
            explanation=data.get("explanation", "Classified based on ticket keywords."),
            alternative_category=alt_cat,
        )

    @classmethod
    def detect_priority(cls, title: str, description: str) -> AIPriorityResponse:
        """
        Assesses urgency and impact to suggest ticket priority: LOW, MEDIUM, HIGH, CRITICAL.
        Does not automatically override user selections.
        """
        system_instruction = (
            "You are an enterprise incident manager. Evaluate ticket urgency and impact. "
            "Output strict JSON with fields: "
            "'suggested_priority' (must be exactly one of: LOW, MEDIUM, HIGH, CRITICAL), "
            "'explanation' (clear explanation of why this priority is recommended), "
            "'urgency_factors' (list of strings highlighting critical keywords or circumstances)."
        )
        prompt = f"Title: {title}\nDescription: {description}"
        data = cls._execute_prompt(prompt, system_instruction)

        raw_priority = str(data.get("suggested_priority", "")).upper()
        if raw_priority not in TicketPriority.__members__:
            raw_priority = TicketPriority.MEDIUM.value

        return AIPriorityResponse(
            suggested_priority=TicketPriority(raw_priority),
            explanation=data.get("explanation", "Priority assessed from system impact description."),
            urgency_factors=data.get("urgency_factors", []),
            disclaimer="AI-generated suggestion. Manual review is recommended."
        )

    @classmethod
    def summarize_content(cls, content: str, max_words: int = 80) -> AISummaryResponse:
        """
        Produces a concise summary and key takeaways from ticket descriptions or discussion threads.
        """
        system_instruction = (
            f"You are a technical documentation assistant. Summarize the support issue in under {max_words} words. "
            "Output strict JSON with fields: "
            "'summary' (concise paragraph summarizing the core issue), "
            "'key_points' (list of 2-4 bullet strings highlighting key facts or symptoms)."
        )
        prompt = f"Issue Content to summarize:\n{content}"
        data = cls._execute_prompt(prompt, system_instruction)

        summary_text = data.get("summary", content[:200])
        return AISummaryResponse(
            summary=summary_text,
            key_points=data.get("key_points", []),
            original_length=len(content),
            summary_length=len(summary_text),
        )

    @classmethod
    def suggest_resolution(cls, title: str, description: str) -> AIResolutionResponse:
        """
        Generates diagnostic steps, potential root cause, and suggested troubleshooting steps.
        Clearly labeled with a prominent disclaimer.
        """
        system_instruction = (
            "You are a senior support engineer. Analyze the reported incident and provide: "
            "1. 'possible_root_cause' (string hypothesis of what caused the issue), "
            "2. 'troubleshooting_steps' (list of step-by-step diagnostic or isolation commands/actions), "
            "3. 'recommended_resolution' (string proposed remedy or configuration fix). "
            "Output strict JSON."
        )
        prompt = f"Title: {title}\nDescription: {description}"
        data = cls._execute_prompt(prompt, system_instruction)

        return AIResolutionResponse(
            possible_root_cause=data.get("possible_root_cause", "Unable to determine root cause without additional logs."),
            troubleshooting_steps=data.get("troubleshooting_steps", ["Check application error logs", "Verify service connectivity"]),
            recommended_resolution=data.get("recommended_resolution", "Inspect recent system changes and retry."),
            disclaimer="AI-generated suggestion. Not a verified solution. Test in a safe environment first."
        )

    @classmethod
    def analyze_sentiment(cls, text: str) -> AISentimentResponse:
        """
        Analyzes emotional sentiment of customer messages: POSITIVE, NEUTRAL, NEGATIVE, FRUSTRATED.
        """
        system_instruction = (
            "You are a customer experience analyst. Assess the emotional sentiment of the customer message. "
            "Output strict JSON with fields: "
            "'sentiment' (must be exactly one of: POSITIVE, NEUTRAL, NEGATIVE, FRUSTRATED), "
            "'score' (float from -1.0 [most frustrated] to 1.0 [most positive]), "
            "'explanation' (short 1-2 sentence breakdown), "
            "'detected_emotions' (list of specific emotion keywords, e.g. impatient, confused, pleased)."
        )
        prompt = f"Customer message:\n{text}"
        data = cls._execute_prompt(prompt, system_instruction)

        raw_sentiment = str(data.get("sentiment", "")).upper()
        if raw_sentiment not in SentimentLabel.__members__:
            raw_sentiment = SentimentLabel.NEUTRAL.value

        score = float(data.get("score", 0.0))
        # Clamp score between -1.0 and 1.0
        score = max(-1.0, min(1.0, score))

        return AISentimentResponse(
            sentiment=SentimentLabel(raw_sentiment),
            score=score,
            explanation=data.get("explanation", "Sentiment inferred from message tone and language."),
            detected_emotions=data.get("detected_emotions", []),
        )
