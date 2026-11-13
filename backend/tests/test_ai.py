from unittest.mock import patch, MagicMock
import pytest
from google.genai.errors import APIError
from app.models.ticket import TicketCategory, TicketPriority
from app.schemas.ai import SentimentLabel
from app.core.config import settings


# -----------------------------------------------------------------------------
# 1. Authentication Protection
# -----------------------------------------------------------------------------
def test_ai_endpoints_require_authentication(client):
    endpoints = [
        "/api/ai/classify",
        "/api/ai/priority",
        "/api/ai/summarize",
        "/api/ai/suggest-resolution",
        "/api/ai/sentiment",
    ]
    for url in endpoints:
        res = client.post(url, json={"title": "Test", "description": "Test description"})
        assert res.status_code == 401
        assert "Not authenticated" in res.json()["detail"]


# -----------------------------------------------------------------------------
# 2. Ticket Classification (Success with Mock)
# -----------------------------------------------------------------------------
def test_ai_classify_ticket_success(client, customer_headers):
    mock_gemini_return = {
        "suggested_category": "BILLING",
        "confidence": 0.94,
        "explanation": "Mentions failed card charge and invoice receipt.",
        "alternative_category": "ACCOUNT"
    }

    with patch("app.services.gemini_service.GeminiService._execute_prompt", return_value=mock_gemini_return):
        res = client.post("/api/ai/classify", json={
            "title": "Double charge on monthly subscription",
            "description": "I noticed two charges of $49 on my credit card statement this morning."
        }, headers=customer_headers)

        assert res.status_code == 200
        data = res.json()
        assert data["suggested_category"] == "BILLING"
        assert data["confidence"] == 0.94
        assert "invoice" in data["explanation"].lower() or "charge" in data["explanation"].lower()
        assert data["alternative_category"] == "ACCOUNT"


# -----------------------------------------------------------------------------
# 3. AI Priority Detection (Success with Mock)
# -----------------------------------------------------------------------------
def test_ai_priority_detection_success(client, customer_headers):
    mock_gemini_return = {
        "suggested_priority": "CRITICAL",
        "explanation": "Outage is affecting all production checkout customers worldwide.",
        "urgency_factors": ["production outage", "revenue impact", "checkout failure"]
    }

    with patch("app.services.gemini_service.GeminiService._execute_prompt", return_value=mock_gemini_return):
        res = client.post("/api/ai/priority", json={
            "title": "Production database connection refused",
            "description": "Entire platform is down with 500 errors. Customers cannot complete orders."
        }, headers=customer_headers)

        assert res.status_code == 200
        data = res.json()
        assert data["suggested_priority"] == "CRITICAL"
        assert "outage" in data["explanation"].lower()
        assert len(data["urgency_factors"]) == 3
        assert "Manual review" in data["disclaimer"]


# -----------------------------------------------------------------------------
# 4. AI Ticket Summarization (Success with Mock)
# -----------------------------------------------------------------------------
def test_ai_summarize_content_success(client, customer_headers):
    long_text = (
        "Customer reported that after upgrading to version 3.2, the user management dashboard "
        "takes more than 45 seconds to load. We inspected the browser console and discovered a "
        "series of 404 errors on user avatar endpoints. The customer tried clearing browser cache "
        "and restarting the gateway, but the issue persists on Google Chrome and Mozilla Firefox."
    )
    mock_gemini_return = {
        "summary": "Version 3.2 upgrade causes 45-second dashboard latency and avatar 404 errors across Chrome and Firefox.",
        "key_points": [
            "Upgrade to v3.2 introduced severe latency",
            "Avatar endpoint returns 404",
            "Reproducible on Chrome and Firefox"
        ]
    }

    with patch("app.services.gemini_service.GeminiService._execute_prompt", return_value=mock_gemini_return):
        res = client.post("/api/ai/summarize", json={
            "content": long_text,
            "max_words": 50
        }, headers=customer_headers)

        assert res.status_code == 200
        data = res.json()
        assert "latency" in data["summary"].lower()
        assert len(data["key_points"]) == 3
        assert data["original_length"] == len(long_text)
        assert data["summary_length"] > 0


# -----------------------------------------------------------------------------
# 5. AI Resolution Suggestions (Success with Mock)
# -----------------------------------------------------------------------------
def test_ai_suggest_resolution_success(client, customer_headers):
    mock_gemini_return = {
        "possible_root_cause": "N+1 database query in UserAvatarSerializer component.",
        "troubleshooting_steps": [
            "Inspect SQL queries executed during dashboard render",
            "Add select_related / joinedload on avatar relation",
            "Verify CDN caching rules for static avatar assets"
        ],
        "recommended_resolution": "Implement batch loading on user records and deploy patch 3.2.1."
    }

    with patch("app.services.gemini_service.GeminiService._execute_prompt", return_value=mock_gemini_return):
        res = client.post("/api/ai/suggest-resolution", json={
            "title": "Slow dashboard load",
            "description": "Dashboard takes 45 seconds to load."
        }, headers=customer_headers)

        assert res.status_code == 200
        data = res.json()
        assert "N+1" in data["possible_root_cause"]
        assert len(data["troubleshooting_steps"]) == 3
        assert "patch" in data["recommended_resolution"].lower()
        assert "Not a verified solution" in data["disclaimer"]


# -----------------------------------------------------------------------------
# 6. Sentiment Analysis (Success with Mock)
# -----------------------------------------------------------------------------
def test_ai_sentiment_analysis_success(client, customer_headers):
    mock_gemini_return = {
        "sentiment": "FRUSTRATED",
        "score": -0.85,
        "explanation": "Customer expresses severe dissatisfaction due to prolonged downtime and lack of communication.",
        "detected_emotions": ["frustrated", "impatient", "disappointed"]
    }

    with patch("app.services.gemini_service.GeminiService._execute_prompt", return_value=mock_gemini_return):
        res = client.post("/api/ai/sentiment", json={
            "text": "This is the third time our system crashed this week! We are losing money and nobody is replying to my emails!"
        }, headers=customer_headers)

        assert res.status_code == 200
        data = res.json()
        assert data["sentiment"] == "FRUSTRATED"
        assert data["score"] == -0.85
        assert "dissatisfaction" in data["explanation"].lower()
        assert "impatient" in data["detected_emotions"]


# -----------------------------------------------------------------------------
# 7. AI Analysis Resolving Ticket from Database by ticket_id
# -----------------------------------------------------------------------------
def test_ai_analysis_with_ticket_id(client, customer_headers):
    create_tkt = client.post("/api/tickets/", json={
        "title": "OAuth token expires prematurely",
        "description": "Sessions disconnect every 2 minutes instead of 60 minutes.",
        "category": "TECHNICAL_ISSUE",
        "priority": "HIGH"
    }, headers=customer_headers)
    assert create_tkt.status_code == 201
    ticket_id = create_tkt.json()["id"]

    mock_gemini_return = {
        "suggested_category": "TECHNICAL_ISSUE",
        "confidence": 0.98,
        "explanation": "OAuth session lifecycle issue.",
        "alternative_category": None
    }

    with patch("app.services.gemini_service.GeminiService._execute_prompt", return_value=mock_gemini_return):
        res = client.post("/api/ai/classify", json={"ticket_id": ticket_id}, headers=customer_headers)
        assert res.status_code == 200
        assert res.json()["suggested_category"] == "TECHNICAL_ISSUE"


# -----------------------------------------------------------------------------
# 8. Customer Cannot Analyze Another Customer's Ticket (403 Forbidden)
# -----------------------------------------------------------------------------
def test_customer_cannot_analyze_other_customer_ticket(
    client,
    customer_headers,
    other_customer_headers
):
    create_tkt = client.post("/api/tickets/", json={
        "title": "Customer A Secret Ticket",
        "description": "Confidential customer details.",
        "category": "BILLING",
        "priority": "LOW"
    }, headers=customer_headers)
    assert create_tkt.status_code == 201
    ticket_id = create_tkt.json()["id"]

    # Customer B attempts to run AI analysis on Customer A's ticket
    res = client.post("/api/ai/classify", json={"ticket_id": ticket_id}, headers=other_customer_headers)
    assert res.status_code == 403
    assert "Access denied" in res.json()["detail"]


# -----------------------------------------------------------------------------
# 9. Nonexistent Ticket Returns 404
# -----------------------------------------------------------------------------
def test_ai_nonexistent_ticket_returns_404(client, customer_headers):
    res = client.post("/api/ai/classify", json={"ticket_id": 99999}, headers=customer_headers)
    assert res.status_code == 404
    assert "not found" in res.json()["detail"]


# -----------------------------------------------------------------------------
# 10. Empty Input Validation (400 or 422)
# -----------------------------------------------------------------------------
def test_ai_empty_input_validation(client, customer_headers):
    # Both ticket_id and text omitted
    res = client.post("/api/ai/classify", json={}, headers=customer_headers)
    assert res.status_code in [400, 422]

    # Empty text
    res2 = client.post("/api/ai/sentiment", json={"text": "   "}, headers=customer_headers)
    assert res2.status_code in [400, 422]


# -----------------------------------------------------------------------------
# 11. Error Handling: Unconfigured API Key (503 Service Unavailable)
# -----------------------------------------------------------------------------
def test_ai_unconfigured_api_key(client, customer_headers):
    with patch.object(settings, "GEMINI_API_KEY", ""):
        res = client.post("/api/ai/classify", json={
            "title": "Valid Title",
            "description": "Valid Description"
        }, headers=customer_headers)
        assert res.status_code == 503
        assert "not configured" in res.json()["detail"].lower()


# -----------------------------------------------------------------------------
# 12. Error Handling: Rate Limit / Quota Exceeded (429 Too Many Requests)
# -----------------------------------------------------------------------------
def test_ai_quota_exceeded_error(client, customer_headers):
    mock_client = MagicMock()
    # Mock APIError with quota exhausted message
    api_error = APIError(429, {"error": {"message": "Resource exhausted: 429 quota exceeded for model"}})
    mock_client.models.generate_content.side_effect = api_error

    with patch.object(settings, "GEMINI_API_KEY", "real-mock-api-key"), \
         patch("app.services.gemini_service.GeminiService._get_client", return_value=mock_client), \
         patch("time.sleep"):
        res = client.post("/api/ai/classify", json={
            "title": "Title",
            "description": "Description"
        }, headers=customer_headers)
        assert res.status_code == 429
        assert "quota" in res.json()["detail"].lower() or "rate limit" in res.json()["detail"].lower()


# -----------------------------------------------------------------------------
# 13. Error Handling: Invalid API Key (502 Bad Gateway)
# -----------------------------------------------------------------------------
def test_ai_invalid_api_key_error(client, customer_headers):
    mock_client = MagicMock()
    api_error = APIError(400, {"error": {"message": "API_KEY_INVALID: The provided API key is expired or invalid"}})
    mock_client.models.generate_content.side_effect = api_error

    with patch.object(settings, "GEMINI_API_KEY", "invalid-key-example"), \
         patch("app.services.gemini_service.GeminiService._get_client", return_value=mock_client), \
         patch("time.sleep"):
        res = client.post("/api/ai/priority", json={
            "title": "Title",
            "description": "Description"
        }, headers=customer_headers)
        assert res.status_code == 502
        assert "invalid" in res.json()["detail"].lower()
        # Invalid API key fails fast on 1st attempt with no retries
        assert mock_client.models.generate_content.call_count == 1


# -----------------------------------------------------------------------------
# 14. Error Handling: Request Timeout (504 Gateway Timeout)
# -----------------------------------------------------------------------------
def test_ai_timeout_error(client, customer_headers):
    mock_client = MagicMock()
    mock_client.models.generate_content.side_effect = TimeoutError("Connection to Google AI timed out")

    with patch.object(settings, "GEMINI_API_KEY", "real-mock-api-key"), \
         patch("app.services.gemini_service.GeminiService._get_client", return_value=mock_client), \
         patch("time.sleep"):
        res = client.post("/api/ai/summarize", json={
            "content": "A long text that times out during processing"
        }, headers=customer_headers)
        assert res.status_code == 504
        assert "timed out" in res.json()["detail"].lower()


# -----------------------------------------------------------------------------
# 15. Error Handling: Invalid JSON Output from Model (502 Bad Gateway)
# -----------------------------------------------------------------------------
def test_ai_invalid_json_response(client, customer_headers):
    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_response.text = "This is not JSON at all, it's just raw text with no curly braces."
    mock_client.models.generate_content.return_value = mock_response

    with patch.object(settings, "GEMINI_API_KEY", "real-mock-api-key"), \
         patch("app.services.gemini_service.GeminiService._get_client", return_value=mock_client), \
         patch("time.sleep"):
        res = client.post("/api/ai/classify", json={
            "title": "Title",
            "description": "Description"
        }, headers=customer_headers)
        assert res.status_code == 502
        assert "unparseable" in res.json()["detail"].lower() or "invalid" in res.json()["detail"].lower()


# -----------------------------------------------------------------------------
# 16. Upstream 503 High Demand: Retries and Recovers Successfully
# -----------------------------------------------------------------------------
def test_ai_503_retries_and_succeeds(client, customer_headers):
    mock_client = MagicMock()
    api_error_503 = APIError(503, {"error": {"message": "503 UNAVAILABLE: Model experiencing high demand"}})
    mock_success = MagicMock()
    mock_success.text = '{"suggested_category": "BILLING", "confidence": 0.95, "explanation": "Recovered on retry", "alternative_category": null}'

    # First attempt fails with 503, second attempt succeeds
    mock_client.models.generate_content.side_effect = [api_error_503, mock_success]

    with patch.object(settings, "GEMINI_API_KEY", "real-mock-api-key"), \
         patch("app.services.gemini_service.GeminiService._get_client", return_value=mock_client), \
         patch("time.sleep") as mock_sleep:
        res = client.post("/api/ai/classify", json={
            "title": "Invoice failure",
            "description": "Payment failed"
        }, headers=customer_headers)

        assert res.status_code == 200
        assert res.json()["suggested_category"] == "BILLING"
        assert mock_client.models.generate_content.call_count == 2
        assert mock_sleep.call_count == 1


# -----------------------------------------------------------------------------
# 17. Upstream 503 High Demand: Retries Exhausted Returns 503
# -----------------------------------------------------------------------------
def test_ai_503_retries_exhausted_returns_503(client, customer_headers):
    mock_client = MagicMock()
    api_error_503 = APIError(503, {"error": {"message": "503 UNAVAILABLE: Model experiencing high demand"}})
    mock_client.models.generate_content.side_effect = api_error_503

    with patch.object(settings, "GEMINI_API_KEY", "real-mock-api-key"), \
         patch("app.services.gemini_service.GeminiService._get_client", return_value=mock_client), \
         patch("time.sleep") as mock_sleep:
        res = client.post("/api/ai/classify", json={
            "title": "Invoice failure",
            "description": "Payment failed"
        }, headers=customer_headers)

        assert res.status_code == 503
        assert "high upstream demand" in res.json()["detail"].lower()
        # Max retries = 2 means total 3 attempts (1 initial + 2 retries)
        assert mock_client.models.generate_content.call_count == 3
        assert mock_sleep.call_count == 2
