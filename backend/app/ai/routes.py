"""
routes.py — FastAPI Router for AI-Powered Sales Forecasting Platform Using Predictive Analytics Capabilities
===========================================================
Exposes REST endpoints for all AI capabilities under the /api prefix.
All endpoints return structured JSON objects — no raw Markdown parsing required by frontend.

Endpoints:
  - POST /api/chat       : General sales assistant chat
  - POST /api/email      : B2B sales email generation (structured JSON)
  - POST /api/summarize  : Conversation & transcript summarization (structured JSON)
  - POST /api/followup   : Follow-up strategy & recommendations (structured JSON)
  - POST /api/lead-score : Lead qualification & scoring (structured JSON)
  - POST /api/objection  : Objection handling strategies (structured JSON)
"""

import logging
from fastapi import APIRouter, HTTPException, status

from app.ai.schemas import (
    ChatRequest,
    ChatResponse,
    EmailRequest,
    EmailResponse,
    SummaryRequest,
    SummaryResponse,
    FollowupRequest,
    FollowupResponse,
    LeadScoreRequest,
    LeadScoreResponse,
    ObjectionRequest,
    ObjectionResponse,
    ErrorResponse,
)
from app.ai.services import (
    AIServiceError,
    general_chat,
    generate_email,
    summarize_conversation,
    suggest_followup,
    analyze_lead_quality,
    handle_objection,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1",
    tags=["AI-Powered Sales Forecasting Platform Using Predictive Analytics"],
    responses={
        500: {"model": ErrorResponse, "description": "Internal Server Error"},
        502: {"model": ErrorResponse, "description": "AI Provider Gateway Error"},
    },
)


# ---------------------------------------------------------------------------
# 1. POST /api/chat
# ---------------------------------------------------------------------------
@router.post(
    "/chat",
    response_model=ChatResponse,
    status_code=status.HTTP_200_OK,
    summary="Chat with General AI Sales Assistant",
    description="Send any sales query or request to AI-Powered Sales Forecasting Platform Using Predictive Analytics and receive a structured JSON response.",
    responses={
        200: {"description": "Successful AI chat response."},
        400: {"model": ErrorResponse, "description": "Invalid message parameter."},
        502: {"model": ErrorResponse, "description": "AI provider service error or invalid JSON."},
    },
)
async def chat_endpoint(request: ChatRequest) -> ChatResponse:
    logger.info("POST /api/chat | message_len=%d", len(request.message))
    try:
        data, model = general_chat(message=request.message)
        return ChatResponse(reply=data.get("reply", ""), model=model)
    except ValueError as exc:
        logger.warning("Invalid request to /api/chat: %s", exc)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except AIServiceError as exc:
        logger.error("AI Service Error on /api/chat: %s", exc)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc


# ---------------------------------------------------------------------------
# 2. POST /api/email
# ---------------------------------------------------------------------------
@router.post(
    "/email",
    response_model=EmailResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate B2B Sales Emails (Structured JSON)",
    description="Generate tailored B2B emails returning subject options, body, call to action, and signature as structured JSON.",
    responses={
        200: {"description": "Generated structured sales email successfully."},
        400: {"model": ErrorResponse, "description": "Invalid input details."},
        502: {"model": ErrorResponse, "description": "AI provider service error or invalid JSON."},
    },
)
async def email_endpoint(request: EmailRequest) -> EmailResponse:
    logger.info("POST /api/email | type=%s", request.email_type)
    try:
        data, model = generate_email(
            lead_info=request.lead_info,
            email_type=request.email_type or "cold_outreach",
            prospect_name=request.prospect_name,
            company_name=request.company_name,
            pain_points=request.pain_points,
        )
        return EmailResponse(
            subject_options=data.get("subject_options", []),
            email_body=data.get("email_body", ""),
            call_to_action=data.get("call_to_action", ""),
            signature=data.get(
                "signature",
                {"name": "[Your Name]", "designation": "Sales Consultant", "company": "AI-Powered Sales Forecasting Platform Using Predictive Analytics"},
            ),
            email_type=request.email_type or "cold_outreach",
            model=model,
        )
    except ValueError as exc:
        logger.warning("Invalid request to /api/email: %s", exc)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except AIServiceError as exc:
        logger.error("AI Service Error on /api/email: %s", exc)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc


# ---------------------------------------------------------------------------
# 3. POST /api/summarize
# ---------------------------------------------------------------------------
@router.post(
    "/summarize",
    response_model=SummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Summarize Sales Conversations (Structured JSON)",
    description="Summarize sales call transcripts, meeting notes, or email threads into executive insights, action items, and requirements.",
    responses={
        200: {"description": "Structured conversation summary returned."},
        400: {"model": ErrorResponse, "description": "Empty or invalid content."},
        502: {"model": ErrorResponse, "description": "AI provider service error or invalid JSON."},
    },
)
async def summarize_endpoint(request: SummaryRequest) -> SummaryResponse:
    logger.info("POST /api/summarize | source_type=%s", request.source_type)
    try:
        data, model = summarize_conversation(
            content=request.content,
            source_type=request.source_type or "transcript",
        )
        return SummaryResponse(
            overview=data.get("overview", ""),
            key_points=data.get("key_points", []),
            customer_requirements=data.get("customer_requirements", []),
            action_items=data.get("action_items", []),
            deal_status=data.get("deal_status", "Neutral"),
            source_type=request.source_type or "transcript",
            model=model,
        )
    except ValueError as exc:
        logger.warning("Invalid request to /api/summarize: %s", exc)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except AIServiceError as exc:
        logger.error("AI Service Error on /api/summarize: %s", exc)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc


# ---------------------------------------------------------------------------
# 4. POST /api/followup
# ---------------------------------------------------------------------------
@router.post(
    "/followup",
    response_model=FollowupResponse,
    status_code=status.HTTP_200_OK,
    summary="Suggest Follow-up Strategy (Structured JSON)",
    description="Recommend personalized follow-up timing, channels, strategy hooks, and message drafts in structured JSON.",
    responses={
        200: {"description": "Follow-up recommendations returned."},
        400: {"model": ErrorResponse, "description": "Invalid context."},
        502: {"model": ErrorResponse, "description": "AI provider service error or invalid JSON."},
    },
)
async def followup_endpoint(request: FollowupRequest) -> FollowupResponse:
    logger.info("POST /api/followup | stage=%s", request.deal_stage)
    try:
        data, model = suggest_followup(
            context=request.context,
            deal_stage=request.deal_stage,
            last_interaction=request.last_interaction,
        )
        return FollowupResponse(
            recommended_timing=data.get("recommended_timing", ""),
            optimal_channel=data.get("optimal_channel", ""),
            strategy_hook=data.get("strategy_hook", ""),
            suggested_draft=data.get("suggested_draft", ""),
            model=model,
        )
    except ValueError as exc:
        logger.warning("Invalid request to /api/followup: %s", exc)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except AIServiceError as exc:
        logger.error("AI Service Error on /api/followup: %s", exc)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc


# ---------------------------------------------------------------------------
# 5. POST /api/lead-score
# ---------------------------------------------------------------------------
@router.post(
    "/lead-score",
    response_model=LeadScoreResponse,
    status_code=status.HTTP_200_OK,
    summary="Qualify and Score Leads (Structured JSON)",
    description="Evaluate lead details against ICP criteria and receive a score (HOT/WARM/COLD), risk analysis, and next-step recommendations.",
    responses={
        200: {"description": "Lead score evaluation returned."},
        400: {"model": ErrorResponse, "description": "Invalid lead info."},
        502: {"model": ErrorResponse, "description": "AI provider service error or invalid JSON."},
    },
)
async def lead_score_endpoint(request: LeadScoreRequest) -> LeadScoreResponse:
    logger.info("POST /api/lead-score | industry=%s", request.industry)
    try:
        data, model = analyze_lead_quality(
            lead_info=request.lead_info,
            company_size=request.company_size,
            industry=request.industry,
            budget_signals=request.budget_signals,
        )
        return LeadScoreResponse(
            lead_classification=data.get("lead_classification", "WARM"),
            numerical_score=data.get("numerical_score", 5),
            icp_alignment=data.get("icp_alignment", ""),
            key_strengths=data.get("key_strengths", []),
            risks_and_red_flags=data.get("risks_and_red_flags", []),
            recommendation=data.get("recommendation", ""),
            model=model,
        )
    except ValueError as exc:
        logger.warning("Invalid request to /api/lead-score: %s", exc)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except AIServiceError as exc:
        logger.error("AI Service Error on /api/lead-score: %s", exc)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc


# ---------------------------------------------------------------------------
# 6. POST /api/objection
# ---------------------------------------------------------------------------
@router.post(
    "/objection",
    response_model=ObjectionResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate Objection Handling Strategy (Structured JSON)",
    description="Receive structured responses to prospect objections (pricing, competitors, timing, security, features).",
    responses={
        200: {"description": "Objection handling strategy returned."},
        400: {"model": ErrorResponse, "description": "Invalid objection detail."},
        502: {"model": ErrorResponse, "description": "AI provider service error or invalid JSON."},
    },
)
async def objection_endpoint(request: ObjectionRequest) -> ObjectionResponse:
    logger.info("POST /api/objection | category=%s", request.category)
    try:
        data, model = handle_objection(
            objection=request.objection,
            category=request.category or "pricing",
            competitor_name=request.competitor_name,
        )
        return ObjectionResponse(
            objection_category=data.get("objection_category", request.category or "pricing"),
            empathetic_acknowledgment=data.get("empathetic_acknowledgment", ""),
            reframe_strategy=data.get("reframe_strategy", ""),
            suggested_script=data.get("suggested_script", ""),
            closing_question=data.get("closing_question", ""),
            category=request.category or "pricing",
            model=model,
        )
    except ValueError as exc:
        logger.warning("Invalid request to /api/objection: %s", exc)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except AIServiceError as exc:
        logger.error("AI Service Error on /api/objection: %s", exc)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
