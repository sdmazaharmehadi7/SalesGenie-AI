"""
schemas.py — Pydantic Request & Response Schemas for AI Module
================================================================
Defines strict data contracts for all SalesGenie AI capabilities.
All AI responses return structured JSON objects — no raw Markdown parsing required by the frontend.
"""

from typing import Optional, List
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# 1. Chat Schemas
# ---------------------------------------------------------------------------
class ChatRequest(BaseModel):
    """Request schema for general sales assistant chat."""
    message: str = Field(
        ...,
        min_length=1,
        max_length=4000,
        description="User sales query or request.",
        examples=["What is the best way to handle a price objection during a demo?"],
    )


class ChatResponse(BaseModel):
    """Response schema for general chat."""
    reply: str = Field(..., description="AI assistant response.")
    model: str = Field(..., description="AI model used.")


# ---------------------------------------------------------------------------
# 2. Email Schemas
# ---------------------------------------------------------------------------
class EmailRequest(BaseModel):
    """Request schema for generating sales outreach emails."""
    lead_info: str = Field(
        ...,
        min_length=1,
        description="Prospect/lead details including role, company, or background.",
        examples=["Sarah Miller, VP of Engineering at TechScale (200 employees). Pain point: slow deployment cycles."],
    )
    email_type: Optional[str] = Field(
        default="cold_outreach",
        description="Type of email: cold_outreach, follow_up, thank_you, meeting_request, proposal, re_engagement.",
        examples=["cold_outreach"],
    )
    prospect_name: Optional[str] = Field(default=None, examples=["Sarah Miller"])
    company_name: Optional[str] = Field(default=None, examples=["TechScale"])
    pain_points: Optional[str] = Field(default=None, examples=["Slow software deployment velocity"])


class EmailSignature(BaseModel):
    """Signature block within generated email."""
    name: str = Field(..., description="Sender's name or placeholder.", examples=["[Your Name]"])
    designation: str = Field(..., description="Sender's job title.", examples=["Sales Consultant"])
    company: str = Field(..., description="Sender's company name.", examples=["SalesGenie AI"])


class EmailResponse(BaseModel):
    """Structured response schema for generated sales email."""
    subject_options: List[str] = Field(
        ...,
        description="List of 2-3 punchy subject line options under 8 words.",
        examples=[["Subject Option 1", "Subject Option 2", "Subject Option 3"]],
    )
    email_body: str = Field(
        ...,
        description="The main body text of the sales email.",
        examples=["Hi Sarah,\n\nManaging engineering deployment cycles..."],
    )
    call_to_action: str = Field(
        ...,
        description="Clear call to action for the prospect.",
        examples=["Are you open to a brief 15-minute call next Tuesday?"],
    )
    signature: EmailSignature = Field(..., description="Structured signature block.")
    email_type: str = Field(..., description="Type of email generated.")
    model: str = Field(..., description="AI model used.")


# ---------------------------------------------------------------------------
# 3. Summary Schemas
# ---------------------------------------------------------------------------
class SummaryRequest(BaseModel):
    """Request schema for conversation/transcript summarization."""
    content: str = Field(
        ...,
        min_length=1,
        description="Sales call transcript, meeting notes, or email thread text.",
        examples=["Prospect: We love the analytics module, but our budget is capped at $20k this quarter. Agent: We can offer a tier 1 plan."],
    )
    source_type: Optional[str] = Field(
        default="transcript",
        description="Source format: transcript, meeting_notes, email_thread.",
        examples=["transcript"],
    )


class ActionItem(BaseModel):
    """Action item itemized in conversation summary."""
    owner: str = Field(..., description="Owner of the action item.", examples=["Agent"])
    task: str = Field(..., description="Task description.", examples=["Send revised tier 1 pricing proposal"])
    timeline: str = Field(..., description="Timeline or deadline.", examples=["By Friday end of day"])


class SummaryResponse(BaseModel):
    """Structured response schema for conversation summary."""
    overview: str = Field(..., description="Executive summary overview.")
    key_points: List[str] = Field(..., description="Main topics discussed.")
    customer_requirements: List[str] = Field(..., description="Customer pain points & requirements.")
    action_items: List[ActionItem] = Field(..., description="Structured list of next steps.")
    deal_status: str = Field(..., description="Overall deal sentiment (Positive, Neutral, At-Risk).")
    source_type: str = Field(..., description="Source format summarized.")
    model: str = Field(..., description="AI model used.")


# ---------------------------------------------------------------------------
# 4. Follow-up Schemas
# ---------------------------------------------------------------------------
class FollowupRequest(BaseModel):
    """Request schema for follow-up strategy recommendation."""
    context: str = Field(
        ...,
        min_length=1,
        description="Background details of recent interactions and deal status.",
        examples=["Demo completed 3 days ago with VP of Operations. They asked for pricing for 50 seats."],
    )
    deal_stage: Optional[str] = Field(default=None, examples=["Post-Demo / Proposal"])
    last_interaction: Optional[str] = Field(default=None, examples=["Product demonstration 3 days ago"])


class FollowupResponse(BaseModel):
    """Structured response schema for follow-up recommendations."""
    recommended_timing: str = Field(..., description="Optimal timing to follow up.")
    optimal_channel: str = Field(..., description="Best communication channel.")
    strategy_hook: str = Field(..., description="Key value hook to re-engage.")
    suggested_draft: str = Field(..., description="Customizable follow-up message draft.")
    model: str = Field(..., description="AI model used.")


# ---------------------------------------------------------------------------
# 5. Lead Qualification & Scoring Schemas
# ---------------------------------------------------------------------------
class LeadScoreRequest(BaseModel):
    """Request schema for lead qualification and scoring."""
    lead_info: str = Field(
        ...,
        min_length=1,
        description="Comprehensive lead information (industry, size, budget, timeline, role).",
        examples=["Fintech enterprise with 1,200 employees. Contact is VP of IT with $100k budget. Needs solution by Q3."],
    )
    company_size: Optional[str] = Field(default=None, examples=["1200 employees"])
    industry: Optional[str] = Field(default=None, examples=["Fintech"])
    budget_signals: Optional[str] = Field(default=None, examples=["$100k budget approved for Q3"])


class LeadScoreResponse(BaseModel):
    """Structured response schema for lead score evaluation."""
    lead_classification: str = Field(..., description="Lead score rating: HOT, WARM, or COLD.")
    numerical_score: int = Field(..., description="Numerical score from 1 to 10.")
    icp_alignment: str = Field(..., description="ICP fit evaluation.")
    key_strengths: List[str] = Field(..., description="Positive deal signals.")
    risks_and_red_flags: List[str] = Field(..., description="Risks or missing information.")
    recommendation: str = Field(..., description="Actionable recommendation.")
    model: str = Field(..., description="AI model used.")


# ---------------------------------------------------------------------------
# 6. Objection Handling Schemas
# ---------------------------------------------------------------------------
class ObjectionRequest(BaseModel):
    """Request schema for objection handling."""
    objection: str = Field(
        ...,
        min_length=1,
        description="The specific objection raised by the prospect.",
        examples=["Your product looks great, but your annual subscription cost is 30% higher than your competitor."],
    )
    category: Optional[str] = Field(
        default="pricing",
        description="Category: pricing, competitors, implementation, security, timing, features.",
        examples=["pricing"],
    )
    competitor_name: Optional[str] = Field(default=None, examples=["Competitor X"])


class ObjectionResponse(BaseModel):
    """Structured response schema for objection handling response strategy."""
    objection_category: str = Field(..., description="Categorized objection type.")
    empathetic_acknowledgment: str = Field(..., description="Validating prospect concern.")
    reframe_strategy: str = Field(..., description="Value reframe strategy.")
    suggested_script: str = Field(..., description="Ready-to-use verbal or email response script.")
    closing_question: str = Field(..., description="Closing CTA question to maintain momentum.")
    category: str = Field(..., description="Requested category.")
    model: str = Field(..., description="AI model used.")


# ---------------------------------------------------------------------------
# Error Response Schema
# ---------------------------------------------------------------------------
class ErrorResponse(BaseModel):
    """Standard error response payload."""
    detail: str = Field(..., description="Human-readable error explanation.")
