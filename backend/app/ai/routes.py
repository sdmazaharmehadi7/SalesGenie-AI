"""
routes.py — FastAPI Router for AI-Powered Sales Forecasting Platform Using Predictive Analytics Capabilities
===========================================================
Exposes REST endpoints for all AI capabilities under the /api/v1 prefix with workspace authorization.
All endpoints return structured JSON objects — no raw Markdown parsing required by frontend.

Endpoints:
  - POST /api/v1/chat       : General sales assistant chat with workspace CRM context
  - POST /api/v1/email      : B2B sales email generation (structured JSON)
  - POST /api/v1/summarize  : Conversation & transcript summarization (structured JSON)
  - POST /api/v1/followup   : Follow-up strategy & recommendations (structured JSON)
  - POST /api/v1/lead-score : Lead qualification & scoring (structured JSON)
  - POST /api/v1/objection  : Objection handling strategies (structured JSON)
"""

import logging
from fastapi import APIRouter, HTTPException, status

from app.api.deps import CurrentActiveUser, DBSession, WorkspaceContextDep
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
from app.services.contact_service import ContactService
from app.services.lead_service import LeadService
from app.services.opportunity_service import OpportunityService

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
# 1. POST /api/v1/chat
# ---------------------------------------------------------------------------
@router.post(
    "/chat",
    response_model=ChatResponse,
    status_code=status.HTTP_200_OK,
    summary="Chat with General AI Sales Assistant",
    description="Send any sales query to the AI assistant with workspace authorization context.",
)
async def chat_endpoint(
    request: ChatRequest,
    db: DBSession,
    current_user: CurrentActiveUser,
    ws_ctx: WorkspaceContextDep,
) -> ChatResponse:
    logger.info("POST /api/v1/chat | user=%s | workspace=%s", current_user.email, ws_ctx.workspace_id)

    from app.ai.crm_context_service import CRMContextService

    # 1. Build minimal, authorized CRM context
    context_svc = CRMContextService(db)
    crm_context = await context_svc.build_crm_context(
        query=request.message,
        current_user=current_user,
        ws_ctx=ws_ctx,
        lead_id=request.lead_id,
        opportunity_id=request.opportunity_id,
    )

    # 2. Extract recent conversation history if provided (max 6 messages)
    history_dicts = None
    if request.history:
        history_dicts = [m.model_dump() for m in request.history[-6:]]

    try:
        data, model = general_chat(
            message=request.message,
            crm_context=crm_context,
            history=history_dicts,
        )
        return ChatResponse(reply=data.get("reply", ""), model=model)
    except ValueError as exc:
        logger.warning("Invalid request to /api/v1/chat: %s", exc)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except AIServiceError as exc:
        logger.error("AI Service Error on /api/v1/chat: %s", exc)
        return ChatResponse(
            reply="AI is temporarily unavailable. Please try again later.",
            model="SalesGenie AI",
        )
    except Exception as exc:
        logger.error("Unexpected error on /api/v1/chat: %s", exc)
        return ChatResponse(
            reply="AI is temporarily unavailable. Please try again later.",
            model="SalesGenie AI",
        )


# ---------------------------------------------------------------------------
# 2. POST /api/v1/email
# ---------------------------------------------------------------------------
@router.post(
    "/email",
    response_model=EmailResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate B2B Sales Emails (Structured JSON)",
    description="Generate tailored B2B emails returning subject options, body, call to action, and signature as structured JSON.",
)
async def email_endpoint(
    request: EmailRequest,
    db: DBSession,
    current_user: CurrentActiveUser,
    ws_ctx: WorkspaceContextDep,
) -> EmailResponse:
    logger.info("POST /api/v1/email | user=%s | type=%s", current_user.email, request.email_type)
    
    prospect_name = request.prospect_name
    company_name = request.company_name
    lead_info = request.lead_info

    if request.lead_id:
        lead = await LeadService(db).get_lead(request.lead_id, current_user, ws_ctx=ws_ctx)
        prospect_name = prospect_name or lead.contact_name
        company_name = company_name or lead.company_name
        if not lead_info or lead_info == "string":
            lead_info = f"Company: {lead.company_name}, Contact: {lead.contact_name or 'N/A'}, Industry: {lead.industry or 'N/A'}"
    if request.contact_id:
        contact = await ContactService(db).get_contact(request.contact_id, current_user)
        prospect_name = prospect_name or f"{contact.first_name} {contact.last_name or ''}".strip()

    try:
        data, model = generate_email(
            lead_info=lead_info,
            email_type=request.email_type or "cold_outreach",
            prospect_name=prospect_name,
            company_name=company_name,
            pain_points=request.pain_points,
        )
        return EmailResponse(
            subject_options=data.get("subject_options", []),
            email_body=data.get("email_body", ""),
            call_to_action=data.get("call_to_action", ""),
            signature=data.get(
                "signature",
                {"name": current_user.name or "[Your Name]", "designation": "Sales Consultant", "company": "SalesGenie AI"},
            ),
            email_type=request.email_type or "cold_outreach",
            model=model,
        )
    except ValueError as exc:
        logger.warning("Invalid request to /api/v1/email: %s", exc)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except AIServiceError as exc:
        logger.error("AI Service Error on /api/v1/email: %s", exc)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc


# ---------------------------------------------------------------------------
# 3. POST /api/v1/summarize
# ---------------------------------------------------------------------------
@router.post(
    "/summarize",
    response_model=SummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Summarize Sales Conversations (Structured JSON)",
    description="Summarize sales call transcripts, meeting notes, or email threads with workspace authorization.",
)
async def summarize_endpoint(
    request: SummaryRequest,
    db: DBSession,
    current_user: CurrentActiveUser,
    ws_ctx: WorkspaceContextDep,
) -> SummaryResponse:
    logger.info("POST /api/v1/summarize | user=%s | source_type=%s", current_user.email, request.source_type)
    
    if request.lead_id:
        await LeadService(db).get_lead(request.lead_id, current_user, ws_ctx=ws_ctx)
    if request.opportunity_id:
        await OpportunityService(db).get_opportunity(request.opportunity_id, current_user, ws_ctx=ws_ctx)

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
        logger.warning("Invalid request to /api/v1/summarize: %s", exc)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except AIServiceError as exc:
        logger.error("AI Service Error on /api/v1/summarize: %s", exc)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc


# ---------------------------------------------------------------------------
# 4. POST /api/v1/followup
# ---------------------------------------------------------------------------
@router.post(
    "/followup",
    response_model=FollowupResponse,
    status_code=status.HTTP_200_OK,
    summary="Suggest Follow-up Strategy (Structured JSON)",
    description="Recommend personalized follow-up timing, channels, strategy hooks, and message drafts in structured JSON.",
)
async def followup_endpoint(
    request: FollowupRequest,
    db: DBSession,
    current_user: CurrentActiveUser,
    ws_ctx: WorkspaceContextDep,
) -> FollowupResponse:
    logger.info("POST /api/v1/followup | user=%s | stage=%s", current_user.email, request.deal_stage)
    
    context = request.context
    deal_stage = request.deal_stage

    if request.lead_id:
        lead = await LeadService(db).get_lead(request.lead_id, current_user, ws_ctx=ws_ctx)
        if not deal_stage:
            deal_stage = lead.lead_status.value
    if request.opportunity_id:
        opp = await OpportunityService(db).get_opportunity(request.opportunity_id, current_user, ws_ctx=ws_ctx)
        if not deal_stage:
            deal_stage = opp.stage.value

    try:
        data, model = suggest_followup(
            context=context,
            deal_stage=deal_stage,
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
        logger.warning("Invalid request to /api/v1/followup: %s", exc)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except AIServiceError as exc:
        logger.error("AI Service Error on /api/v1/followup: %s", exc)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc


# ---------------------------------------------------------------------------
# 5. POST /api/v1/lead-score
# ---------------------------------------------------------------------------
@router.post(
    "/lead-score",
    response_model=LeadScoreResponse,
    status_code=status.HTTP_200_OK,
    summary="Qualify and Score Leads (Structured JSON)",
    description="Evaluate lead details against ICP criteria and receive a score (HOT/WARM/COLD), risk analysis, and recommendations.",
)
async def lead_score_endpoint(
    request: LeadScoreRequest,
    db: DBSession,
    current_user: CurrentActiveUser,
    ws_ctx: WorkspaceContextDep,
) -> LeadScoreResponse:
    logger.info("POST /api/v1/lead-score | user=%s | industry=%s", current_user.email, request.industry)
    
    lead_info = request.lead_info
    industry = request.industry
    company_size = request.company_size

    if request.lead_id:
        lead = await LeadService(db).get_lead(request.lead_id, current_user, ws_ctx=ws_ctx)
        industry = industry or lead.industry
        if not lead_info or lead_info == "string":
            lead_info = f"Company: {lead.company_name}, Contact: {lead.contact_name or 'N/A'}, Industry: {lead.industry or 'N/A'}, Deal Value: {f'${lead.deal_value}' if lead.deal_value else 'N/A'}"

    try:
        data, model = analyze_lead_quality(
            lead_info=lead_info,
            company_size=company_size,
            industry=industry,
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
        logger.warning("Invalid request to /api/v1/lead-score: %s", exc)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except AIServiceError as exc:
        logger.error("AI Service Error on /api/v1/lead-score: %s", exc)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc


# ---------------------------------------------------------------------------
# 6. POST /api/v1/objection
# ---------------------------------------------------------------------------
@router.post(
    "/objection",
    response_model=ObjectionResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate Objection Handling Strategy (Structured JSON)",
    description="Receive structured responses to prospect objections (pricing, competitors, timing, security, features).",
)
async def objection_endpoint(
    request: ObjectionRequest,
    db: DBSession,
    current_user: CurrentActiveUser,
    ws_ctx: WorkspaceContextDep,
) -> ObjectionResponse:
    logger.info("POST /api/v1/objection | user=%s | category=%s", current_user.email, request.category)
    
    if request.lead_id:
        await LeadService(db).get_lead(request.lead_id, current_user, ws_ctx=ws_ctx)
    if request.opportunity_id:
        await OpportunityService(db).get_opportunity(request.opportunity_id, current_user, ws_ctx=ws_ctx)

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
        logger.warning("Invalid request to /api/v1/objection: %s", exc)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except AIServiceError as exc:
        logger.error("AI Service Error on /api/v1/objection: %s", exc)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
