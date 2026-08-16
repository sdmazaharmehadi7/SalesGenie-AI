"""Opportunities endpoints (CRM Deals & Sales Pipeline)."""

import uuid

from fastapi import APIRouter, status

from app.ai.services import analyze_deal_risk, get_next_best_action
from app.api.deps import CurrentActiveUser, DBSession, Pagination
from app.models.pipeline_enums import OpportunityStage
from app.schemas.crm_dashboard import OpportunityRiskAnalysis
from app.schemas.opportunity import (
    OpportunityCreate,
    OpportunityListItem,
    OpportunityRead,
    OpportunityStageUpdate,
    OpportunityUpdate,
    PaginatedOpportunities,
    PipelineBoardView,
)
from app.schemas.sales_interaction import ActivityListItem
from app.services.activity_service import ActivityService
from app.services.opportunity_service import OpportunityService

router = APIRouter()


@router.post("", response_model=OpportunityRead, status_code=status.HTTP_201_CREATED, summary="Create an opportunity")
async def create_opportunity(opp_in: OpportunityCreate, db: DBSession, current_user: CurrentActiveUser) -> OpportunityRead:
    opp = await OpportunityService(db).create_opportunity(opp_in, current_user)
    return OpportunityRead.model_validate(opp)


@router.get("", response_model=PaginatedOpportunities, summary="List opportunities")
async def list_opportunities(
    db: DBSession,
    current_user: CurrentActiveUser,
    pagination: Pagination,
    account_id: uuid.UUID | None = None,
    contact_id: uuid.UUID | None = None,
    stage: OpportunityStage | None = None,
    search: str | None = None,
    owner_id: uuid.UUID | None = None,
) -> PaginatedOpportunities:
    opps, total = await OpportunityService(db).list_opportunities(
        current_user,
        offset=pagination.offset,
        limit=pagination.page_size,
        account_id=account_id,
        contact_id=contact_id,
        stage=stage,
        search=search,
        owner_id=owner_id,
    )
    return PaginatedOpportunities(
        items=[OpportunityListItem.model_validate(o) for o in opps],
        total=total,
        page=pagination.page,
        page_size=pagination.page_size,
    )


@router.get("/pipeline/board", response_model=PipelineBoardView, summary="Get visual Kanban pipeline board")
async def get_pipeline_board(
    db: DBSession,
    current_user: CurrentActiveUser,
    owner_id: uuid.UUID | None = None,
) -> PipelineBoardView:
    return await OpportunityService(db).get_pipeline_board(current_user, owner_id=owner_id)


@router.get("/{opportunity_id}", response_model=OpportunityRead, summary="Get opportunity details")
async def get_opportunity(opportunity_id: uuid.UUID, db: DBSession, current_user: CurrentActiveUser) -> OpportunityRead:
    opp = await OpportunityService(db).get_opportunity(opportunity_id, current_user)
    return OpportunityRead.model_validate(opp)


@router.patch("/{opportunity_id}", response_model=OpportunityRead, summary="Update an opportunity")
async def update_opportunity(
    opportunity_id: uuid.UUID, opp_in: OpportunityUpdate, db: DBSession, current_user: CurrentActiveUser
) -> OpportunityRead:
    opp = await OpportunityService(db).update_opportunity(opportunity_id, opp_in, current_user)
    return OpportunityRead.model_validate(opp)


@router.patch("/{opportunity_id}/stage", response_model=OpportunityRead, summary="Update opportunity stage (Kanban drag)")
async def update_opportunity_stage(
    opportunity_id: uuid.UUID, stage_in: OpportunityStageUpdate, db: DBSession, current_user: CurrentActiveUser
) -> OpportunityRead:
    opp = await OpportunityService(db).update_stage(opportunity_id, stage_in, current_user)
    return OpportunityRead.model_validate(opp)


@router.delete("/{opportunity_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete an opportunity")
async def delete_opportunity(opportunity_id: uuid.UUID, db: DBSession, current_user: CurrentActiveUser) -> None:
    await OpportunityService(db).delete_opportunity(opportunity_id, current_user)


@router.get("/{opportunity_id}/activities", response_model=list[ActivityListItem], summary="Get opportunity activity timeline")
async def get_opportunity_activities(opportunity_id: uuid.UUID, db: DBSession, current_user: CurrentActiveUser) -> list[ActivityListItem]:
    await OpportunityService(db).get_opportunity(opportunity_id, current_user)
    activities = await ActivityService(db).get_timeline(opportunity_id=opportunity_id)
    return [ActivityListItem.model_validate(a) for a in activities]


@router.post("/{opportunity_id}/analyze", response_model=OpportunityRiskAnalysis, summary="AI deal risk analysis & recommendation")
async def analyze_opportunity_deal(opportunity_id: uuid.UUID, db: DBSession, current_user: CurrentActiveUser) -> OpportunityRiskAnalysis:
    opp = await OpportunityService(db).get_opportunity(opportunity_id, current_user)
    activities = await ActivityService(db).get_timeline(opportunity_id=opportunity_id, limit=5)
    activity_summary = "\n".join(f"- [{a.interaction_type.value}] {a.summary or ''}" for a in activities)

    risk_data, _ = analyze_deal_risk(
        deal_name=opp.name,
        stage=opp.stage.value,
        amount=float(opp.amount) if opp.amount else None,
        expected_close_date=opp.expected_close_date.isoformat() if opp.expected_close_date else None,
        recent_interactions=activity_summary if activity_summary else None,
        notes=opp.notes,
    )

    action_data, _ = get_next_best_action(
        context_type="Opportunity",
        entity_name=opp.name,
        current_status=opp.stage.value,
        timeline_summary=activity_summary if activity_summary else None,
    )

    return OpportunityRiskAnalysis(
        opportunity_id=str(opp.id),
        deal_name=opp.name,
        risk_level=risk_data.get("risk_level", "Medium"),
        risk_factors=risk_data.get("risk_factors", []),
        recommendations=risk_data.get("recommendations", []),
        next_best_action=action_data.get("recommended_action", risk_data.get("next_best_action", "Follow up with prospect")),
        conversion_probability=int(risk_data.get("conversion_probability", opp.probability or 50)),
    )
