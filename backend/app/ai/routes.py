"""
routes.py — FastAPI Router for the AI Module
=============================================
Defines all HTTP endpoints under the /api/ai prefix.

Rules enforced here:
  - No business logic. All processing is delegated to services.py.
  - No direct OpenAI SDK calls. The client is accessed only via services.py.
  - Exceptions from the service layer are mapped to appropriate HTTP status
    codes and returned as structured JSON via HTTPException.

Registration:
    In your main app factory (e.g. main.py) include this router:

        from app.ai.routes import router as ai_router
        app.include_router(ai_router)
"""

import logging

from fastapi import APIRouter, HTTPException, status

from app.ai.client import OPENAI_MODEL
from app.ai.schemas import ChatRequest, ChatResponse, ErrorResponse
from app.ai.services import AIServiceError, get_ai_response

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Router — all routes registered here will be prefixed with /api/ai and
# grouped under the "AI Assistant" tag in the auto-generated docs.
# ---------------------------------------------------------------------------
router = APIRouter(
    prefix="/api/ai",
    tags=["AI Assistant"],
    responses={
        500: {"model": ErrorResponse, "description": "Internal server error"},
        502: {"model": ErrorResponse, "description": "AI provider error"},
    },
)


# ---------------------------------------------------------------------------
# POST /api/ai/chat
# ---------------------------------------------------------------------------

@router.post(
    "/chat",
    response_model=ChatResponse,
    status_code=status.HTTP_200_OK,
    summary="Chat with the AI sales assistant",
    description=(
        "Send a natural-language message to SalesGenie AI and receive a "
        "professional sales-focused response. The assistant can draft outreach "
        "emails, summarise conversations, suggest follow-ups, score leads, and "
        "handle objections. All requests are processed using the configured "
        "OpenAI model."
    ),
    responses={
        200: {"description": "AI response returned successfully."},
        400: {"model": ErrorResponse, "description": "Invalid or empty message."},
        502: {"model": ErrorResponse, "description": "OpenAI API error."},
    },
)
async def chat(request: ChatRequest) -> ChatResponse:
    """
    Accept a user message, forward it to the AI service layer, and return
    the assistant's reply along with the model name used.
    """
    logger.info("POST /api/ai/chat | message_length=%d", len(request.message))

    try:
        reply = get_ai_response(user_message=request.message)

    except ValueError as exc:
        # Raised by get_ai_response() when the message is empty/whitespace.
        logger.warning("Bad chat request: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    except AIServiceError as exc:
        # Raised when OpenAI returns a timeout, connection error, or API error.
        logger.error("AI service error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc

    return ChatResponse(reply=reply, model=OPENAI_MODEL)
