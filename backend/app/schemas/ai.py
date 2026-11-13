import enum
from typing import Optional, List
from pydantic import BaseModel, Field, model_validator
from app.models.ticket import TicketCategory, TicketPriority


class SentimentLabel(str, enum.Enum):
    POSITIVE = "POSITIVE"
    NEUTRAL = "NEUTRAL"
    NEGATIVE = "NEGATIVE"
    FRUSTRATED = "FRUSTRATED"


class AITicketAnalyzeRequest(BaseModel):
    """
    Request payload for analyzing a ticket.
    Accepts either an existing ticket_id, or raw title and description text.
    """
    ticket_id: Optional[int] = Field(None, description="Optional ID of existing ticket in database")
    title: Optional[str] = Field(None, max_length=255, description="Ticket title/subject")
    description: Optional[str] = Field(None, description="Ticket body/description")

    @model_validator(mode="after")
    def check_inputs(self):
        if not self.ticket_id and not (self.title and self.description):
            raise ValueError("Either 'ticket_id' or both 'title' and 'description' must be provided.")
        if self.title is not None and not self.title.strip():
            raise ValueError("Ticket title cannot be empty.")
        if self.description is not None and not self.description.strip():
            raise ValueError("Ticket description cannot be empty.")
        return self


class AISummarizeRequest(BaseModel):
    ticket_id: Optional[int] = Field(None, description="Optional ID of existing ticket in database")
    content: Optional[str] = Field(None, description="Raw text or thread content to summarize")
    max_words: Optional[int] = Field(80, ge=10, le=300, description="Target word count for summary")

    @model_validator(mode="after")
    def check_inputs(self):
        if not self.ticket_id and not (self.content and self.content.strip()):
            raise ValueError("Either 'ticket_id' or non-empty 'content' must be provided.")
        return self


class AISentimentRequest(BaseModel):
    ticket_id: Optional[int] = Field(None, description="Optional ID of existing ticket in database")
    text: Optional[str] = Field(None, description="Customer message or comment text to analyze")

    @model_validator(mode="after")
    def check_inputs(self):
        if not self.ticket_id and not (self.text and self.text.strip()):
            raise ValueError("Either 'ticket_id' or non-empty 'text' must be provided.")
        return self


class AIClassificationResponse(BaseModel):
    suggested_category: TicketCategory = Field(..., description="Suggested ticket category enum")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score between 0.0 and 1.0")
    explanation: str = Field(..., description="Clear explanation for the classification choice")
    alternative_category: Optional[TicketCategory] = Field(None, description="Secondary possible category")


class AIPriorityResponse(BaseModel):
    suggested_priority: TicketPriority = Field(..., description="Suggested priority (LOW, MEDIUM, HIGH, CRITICAL)")
    explanation: str = Field(..., description="Concise justification for the urgency score")
    urgency_factors: List[str] = Field(default_factory=list, description="Key factors detected in content")
    disclaimer: str = Field(
        default="AI-generated suggestion. Manual review is recommended.",
        description="Notice that priority must not automatically override human selections."
    )


class AISummaryResponse(BaseModel):
    summary: str = Field(..., description="Concise summary of the ticket or thread")
    key_points: List[str] = Field(default_factory=list, description="Key facts or problems identified")
    original_length: int = Field(..., description="Character count of original content")
    summary_length: int = Field(..., description="Character count of generated summary")


class AIResolutionResponse(BaseModel):
    possible_root_cause: str = Field(..., description="Hypothesized root cause of the incident")
    troubleshooting_steps: List[str] = Field(..., description="Actionable step-by-step diagnostic guide")
    recommended_resolution: str = Field(..., description="Suggested fix or workaround")
    disclaimer: str = Field(
        default="AI-generated suggestion. Not a verified solution. Test in a safe environment first.",
        description="Prominent safety disclaimer"
    )


class AISentimentResponse(BaseModel):
    sentiment: SentimentLabel = Field(..., description="Overall emotional sentiment")
    score: float = Field(..., ge=-1.0, le=1.0, description="Polarity score from -1.0 (frustrated) to +1.0 (positive)")
    explanation: str = Field(..., description="Brief breakdown of emotional indicators")
    detected_emotions: List[str] = Field(default_factory=list, description="Specific nuances (e.g. impatient, grateful)")

