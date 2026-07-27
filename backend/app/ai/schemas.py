"""
schemas.py — Pydantic Request / Response Models for the AI Module
==================================================================
All data contracts used by the AI routes are defined here.
Keeping schemas separate from routes and services means they can be
imported freely without triggering route registration or SDK calls.

Usage:
    from app.ai.schemas import ChatRequest, ChatResponse
"""

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------

class ChatRequest(BaseModel):
    """Payload sent by the client to the POST /api/ai/chat endpoint."""

    message: str = Field(
        ...,
        min_length=1,
        max_length=4000,
        description="The user's message or query for the AI sales assistant.",
        examples=["Draft a cold outreach email to Acme Corp's VP of Sales."],
    )

    class Config:
        json_schema_extra = {
            "example": {
                "message": "Draft a cold outreach email to Acme Corp's VP of Sales."
            }
        }


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------

class ChatResponse(BaseModel):
    """Payload returned by the POST /api/ai/chat endpoint on success."""

    reply: str = Field(
        ...,
        description="The AI assistant's response to the user's message.",
    )
    model: str = Field(
        ...,
        description="The OpenAI model that generated the response.",
    )

    class Config:
        json_schema_extra = {
            "example": {
                "reply": "Subject: Boosting Revenue at Acme Corp\n\nHi [Name], ...",
                "model": "gpt-5",
            }
        }


class ErrorResponse(BaseModel):
    """Standard error payload returned on 4xx / 5xx responses."""

    detail: str = Field(..., description="Human-readable error message.")
