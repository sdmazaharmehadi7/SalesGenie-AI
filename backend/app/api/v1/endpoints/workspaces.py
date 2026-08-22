"""
Workspace endpoints.

All routes are authenticated. The service layer is the authoritative
access-control gate — it re-verifies membership/role on every call,
regardless of anything the frontend may have cached.

Route summary
─────────────
POST   /workspaces                                   — create workspace
GET    /workspaces                                   — list caller's workspaces
GET    /workspaces/invitations/pending               — list caller's pending invitations
GET    /workspaces/invitations/lookup                — lookup invitation details by token
POST   /workspaces/invitations/accept                — accept invitation by token
POST   /workspaces/invitations/reject                — decline invitation by token
GET    /workspaces/{workspace_id}                    — workspace details
PATCH  /workspaces/{workspace_id}                    — update name/description (manager)
GET    /workspaces/{workspace_id}/context            — context-switch verification
GET    /workspaces/{workspace_id}/me                 — caller's own membership
GET    /workspaces/{workspace_id}/members            — list members (any member)
POST   /workspaces/{workspace_id}/members            — add a member by user_id (manager)
PATCH  /workspaces/{workspace_id}/members/{user_id}/role — change role (manager)
DELETE /workspaces/{workspace_id}/members/{user_id}  — remove member (manager)
DELETE /workspaces/{workspace_id}/leave              — leave workspace (self)
POST   /workspaces/{workspace_id}/invitations        — invite user by email (manager)
GET    /workspaces/{workspace_id}/invitations        — list workspace invitations (manager)
DELETE /workspaces/{workspace_id}/invitations/{inv_id} — cancel invitation (manager)
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Body, Depends, status

from app.api.deps import CurrentActiveUser, DBSession
from app.models.workspace import WorkspaceRole, WorkspaceType
from app.schemas.workspace import (
    AcceptInvitationRequest,
    AcceptInvitationResponse,
    DeclineInvitationRequest,
    InvitationCreate,
    MyMembershipRead,
    PendingInvitationItem,
    UpdateMemberRoleRequest,
    WorkspaceContextResponse,
    WorkspaceCreate,
    WorkspaceInvitationRead,
    WorkspaceListItem,
    WorkspaceMemberRead,
    WorkspaceRead,
    WorkspaceUpdate,
)
from app.services.workspace_service import WorkspaceService

router = APIRouter()


# ---------------------------------------------------------------------------
# Helpers — build response models from ORM objects
# ---------------------------------------------------------------------------


def _workspace_read(workspace, membership) -> WorkspaceRead:
    return WorkspaceRead(
        id=workspace.id,
        name=workspace.name,
        description=workspace.description,
        type=workspace.type,
        owner_id=workspace.owner_id,
        is_active=workspace.is_active,
        created_at=workspace.created_at,
        updated_at=workspace.updated_at,
        my_role=membership.role,
    )


def _member_read(m) -> WorkspaceMemberRead:
    return WorkspaceMemberRead(
        id=m.id,
        workspace_id=m.workspace_id,
        user_id=m.user_id,
        user_name=m.user.name if m.user else "",
        user_email=m.user.email if m.user else "",
        role=m.role,
        status=m.status,
        joined_at=m.joined_at,
        created_at=m.created_at,
    )


def _my_membership_read(workspace, membership) -> MyMembershipRead:
    return MyMembershipRead(
        membership_id=membership.id,
        workspace_id=workspace.id,
        workspace_name=workspace.name,
        workspace_type=workspace.type,
        role=membership.role,
        status=membership.status,
        joined_at=membership.joined_at,
        is_manager=membership.role == WorkspaceRole.MANAGER,
    )


def _invitation_read(inv) -> WorkspaceInvitationRead:
    return WorkspaceInvitationRead(
        id=inv.id,
        workspace_id=inv.workspace_id,
        workspace_name=inv.workspace.name if inv.workspace else "",
        workspace_type=inv.workspace.type if inv.workspace else WorkspaceType.TEAM,
        email=inv.email,
        role=inv.role,
        status=inv.status,
        token=inv.token,
        invited_by_id=inv.invited_by_id,
        invited_by_name=inv.invited_by.name if inv.invited_by else "",
        invited_by_email=inv.invited_by.email if inv.invited_by else "",
        expires_at=inv.expires_at,
        created_at=inv.created_at,
        accepted_at=inv.accepted_at,
    )


def _pending_invitation_item(inv) -> PendingInvitationItem:
    return PendingInvitationItem(
        id=inv.id,
        workspace_id=inv.workspace_id,
        workspace_name=inv.workspace.name if inv.workspace else "",
        workspace_description=inv.workspace.description if inv.workspace else None,
        invited_by_name=inv.invited_by.name if inv.invited_by else "",
        invited_by_email=inv.invited_by.email if inv.invited_by else "",
        role=inv.role,
        status=inv.status,
        token=inv.token,
        expires_at=inv.expires_at,
        created_at=inv.created_at,
        members_count=1,
    )


# ---------------------------------------------------------------------------
# Global Workspace & Invitation List Routes (Declared first for routing precedence)
# ---------------------------------------------------------------------------


@router.post(
    "",
    response_model=WorkspaceRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a workspace",
    description=(
        "Creates a new team workspace. The authenticated user automatically "
        "becomes its first member with the **manager** role."
    ),
)
async def create_workspace(
    data: WorkspaceCreate,
    db: DBSession,
    current_user: CurrentActiveUser,
) -> WorkspaceRead:
    workspace, membership = await WorkspaceService(db).create_workspace(data, current_user)
    return _workspace_read(workspace, membership)


@router.get(
    "",
    response_model=list[WorkspaceListItem],
    summary="List my workspaces",
    description="Returns all workspaces the authenticated user actively belongs to.",
)
async def list_my_workspaces(
    db: DBSession,
    current_user: CurrentActiveUser,
) -> list[WorkspaceListItem]:
    pairs = await WorkspaceService(db).list_user_workspaces(current_user)
    return [
        WorkspaceListItem(
            id=m.workspace.id,
            name=m.workspace.name,
            type=m.workspace.type,
            is_active=m.workspace.is_active,
            my_role=m.role,
            member_count=count,
        )
        for m, count in pairs
    ]


@router.get(
    "/invitations/pending",
    response_model=list[PendingInvitationItem],
    summary="List my pending invitations",
    description="Returns all active, non-expired invitations sent to the authenticated user's email address.",
)
async def list_my_pending_invitations(
    db: DBSession,
    current_user: CurrentActiveUser,
) -> list[PendingInvitationItem]:
    invitations = await WorkspaceService(db).list_my_pending_invitations(current_user)
    return [_pending_invitation_item(inv) for inv in invitations]


@router.get(
    "/invitations/lookup",
    response_model=PendingInvitationItem,
    summary="Lookup invitation details by token",
    description="Inspect workspace and inviter details for an invitation token without immediately accepting it.",
)
async def lookup_invitation(
    token: str,
    db: DBSession,
    current_user: CurrentActiveUser,
) -> PendingInvitationItem:
    invitation = await WorkspaceService(db).get_invitation_by_token(token)
    return _pending_invitation_item(invitation)


@router.post(
    "/invitations/accept",
    response_model=AcceptInvitationResponse,
    summary="Accept workspace invitation",
    description=(
        "Accepts a workspace invitation using its token. Creates an active membership "
        "with TEAM_MEMBER role and enables the user to access the workspace."
    ),
)
async def accept_invitation(
    payload: AcceptInvitationRequest,
    db: DBSession,
    current_user: CurrentActiveUser,
) -> AcceptInvitationResponse:
    workspace, membership = await WorkspaceService(db).accept_invitation(payload.token, current_user)
    return AcceptInvitationResponse(
        message=f"Successfully joined {workspace.name} as Team Member.",
        workspace_id=workspace.id,
        workspace_name=workspace.name,
        workspace_type=workspace.type,
        role=membership.role,
        is_manager=membership.role == WorkspaceRole.MANAGER,
    )


@router.post(
    "/invitations/reject",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Decline workspace invitation",
    description="Declines an invitation using its token.",
)
async def decline_invitation(
    payload: DeclineInvitationRequest,
    db: DBSession,
    current_user: CurrentActiveUser,
) -> None:
    await WorkspaceService(db).reject_invitation(payload.token, current_user)


# ---------------------------------------------------------------------------
# Workspace Parameterized Routes (/{workspace_id}/...)
# ---------------------------------------------------------------------------


@router.get(
    "/{workspace_id}",
    response_model=WorkspaceRead,
    summary="Get workspace details",
    description="Returns details of a specific workspace. Requires active membership.",
)
async def get_workspace(
    workspace_id: uuid.UUID,
    db: DBSession,
    current_user: CurrentActiveUser,
) -> WorkspaceRead:
    workspace, membership = await WorkspaceService(db).get_workspace(workspace_id, current_user)
    return _workspace_read(workspace, membership)


@router.patch(
    "/{workspace_id}",
    response_model=WorkspaceRead,
    summary="Update workspace",
    description="Update workspace name or description. Requires **manager** role.",
)
async def update_workspace(
    workspace_id: uuid.UUID,
    data: WorkspaceUpdate,
    db: DBSession,
    current_user: CurrentActiveUser,
) -> WorkspaceRead:
    svc = WorkspaceService(db)
    workspace = await svc.update_workspace(workspace_id, data, current_user)
    _, membership = await svc.get_workspace(workspace_id, current_user)
    return _workspace_read(workspace, membership)


@router.get(
    "/{workspace_id}/context",
    response_model=WorkspaceContextResponse,
    summary="Verify workspace context",
    description=(
        "Confirms the user has access to the given workspace and returns "
        "their role. The frontend calls this when switching context. "
        "No server-side session is modified — the frontend is responsible "
        "for carrying workspace_id in subsequent requests."
    ),
)
async def get_workspace_context(
    workspace_id: uuid.UUID,
    db: DBSession,
    current_user: CurrentActiveUser,
) -> WorkspaceContextResponse:
    workspace, membership = await WorkspaceService(db).get_context(workspace_id, current_user)
    return WorkspaceContextResponse(
        workspace_id=workspace.id,
        workspace_name=workspace.name,
        workspace_type=workspace.type,
        role=membership.role,
        is_manager=membership.role == WorkspaceRole.MANAGER,
    )


@router.get(
    "/{workspace_id}/me",
    response_model=MyMembershipRead,
    summary="Get my membership in this workspace",
    description="Returns the calling user's own role and membership status.",
)
async def get_my_membership(
    workspace_id: uuid.UUID,
    db: DBSession,
    current_user: CurrentActiveUser,
) -> MyMembershipRead:
    workspace, membership = await WorkspaceService(db).get_workspace(workspace_id, current_user)
    return _my_membership_read(workspace, membership)


@router.get(
    "/{workspace_id}/members",
    response_model=list[WorkspaceMemberRead],
    summary="List workspace members",
    description="Returns all active members. Any workspace member may call this.",
)
async def list_workspace_members(
    workspace_id: uuid.UUID,
    db: DBSession,
    current_user: CurrentActiveUser,
) -> list[WorkspaceMemberRead]:
    members = await WorkspaceService(db).list_workspace_members(workspace_id, current_user)
    return [_member_read(m) for m in members]


@router.post(
    "/{workspace_id}/members",
    response_model=WorkspaceMemberRead,
    status_code=status.HTTP_201_CREATED,
    summary="Add a member to the workspace",
    description=(
        "Adds an existing user (by user_id) to the workspace. "
        "Requires **manager** role. Use role='team_member' or 'manager'."
    ),
)
async def add_workspace_member(
    workspace_id: uuid.UUID,
    db: DBSession,
    current_user: CurrentActiveUser,
    user_id: uuid.UUID = Body(..., description="UUID of the user to add"),
    role: WorkspaceRole = Body(WorkspaceRole.TEAM_MEMBER, description="Role to assign"),
) -> WorkspaceMemberRead:
    membership = await WorkspaceService(db).add_member(
        workspace_id=workspace_id,
        target_user_id=user_id,
        role=role,
        current_user=current_user,
    )
    from sqlalchemy.orm import selectinload
    from sqlalchemy import select
    from app.models.workspace import WorkspaceMembership
    result = await db.execute(
        select(WorkspaceMembership)
        .where(WorkspaceMembership.id == membership.id)
        .options(selectinload(WorkspaceMembership.user))
    )
    membership = result.scalar_one()
    return _member_read(membership)


@router.patch(
    "/{workspace_id}/members/{user_id}/role",
    response_model=WorkspaceMemberRead,
    summary="Change a member's role",
    description="Promote or demote a member. Requires **manager** role.",
)
async def update_member_role(
    workspace_id: uuid.UUID,
    user_id: uuid.UUID,
    payload: UpdateMemberRoleRequest,
    db: DBSession,
    current_user: CurrentActiveUser,
) -> WorkspaceMemberRead:
    membership = await WorkspaceService(db).update_member_role(
        workspace_id=workspace_id,
        target_user_id=user_id,
        new_role=payload.role,
        current_user=current_user,
    )
    from sqlalchemy.orm import selectinload
    from sqlalchemy import select
    from app.models.workspace import WorkspaceMembership
    result = await db.execute(
        select(WorkspaceMembership)
        .where(WorkspaceMembership.id == membership.id)
        .options(selectinload(WorkspaceMembership.user))
    )
    membership = result.scalar_one()
    return _member_read(membership)


@router.delete(
    "/{workspace_id}/members/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove a member",
    description="Remove another user from the workspace. Requires **manager** role.",
)
async def remove_workspace_member(
    workspace_id: uuid.UUID,
    user_id: uuid.UUID,
    db: DBSession,
    current_user: CurrentActiveUser,
) -> None:
    await WorkspaceService(db).remove_member(workspace_id, user_id, current_user)


@router.delete(
    "/{workspace_id}/leave",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Leave workspace",
    description=(
        "Let the calling user leave the workspace. "
        "Not allowed for personal workspaces or if you are the last manager."
    ),
)
async def leave_workspace(
    workspace_id: uuid.UUID,
    db: DBSession,
    current_user: CurrentActiveUser,
) -> None:
    await WorkspaceService(db).leave_workspace(workspace_id, current_user)


# ---------------------------------------------------------------------------
# Workspace-scoped Invitation Endpoints (Manager Only)
# ---------------------------------------------------------------------------


@router.post(
    "/{workspace_id}/invitations",
    response_model=WorkspaceInvitationRead,
    status_code=status.HTTP_201_CREATED,
    summary="Invite a user to the workspace by email",
    description=(
        "Generates an invitation for the given email address. Requires **manager** role. "
        "If the user does not have a SalesGenie account yet, the invitation is preserved "
        "and will be available when they register."
    ),
)
async def invite_user(
    workspace_id: uuid.UUID,
    payload: InvitationCreate,
    db: DBSession,
    current_user: CurrentActiveUser,
) -> WorkspaceInvitationRead:
    invitation = await WorkspaceService(db).invite_user_by_email(
        workspace_id=workspace_id,
        email=payload.email,
        role=payload.role,
        current_user=current_user,
    )
    return _invitation_read(invitation)


@router.get(
    "/{workspace_id}/invitations",
    response_model=list[WorkspaceInvitationRead],
    summary="List pending invitations for a workspace",
    description="Returns all pending, active invitations for the workspace. Requires **manager** role.",
)
async def list_workspace_invitations(
    workspace_id: uuid.UUID,
    db: DBSession,
    current_user: CurrentActiveUser,
) -> list[WorkspaceInvitationRead]:
    invitations = await WorkspaceService(db).list_workspace_invitations(workspace_id, current_user)
    return [_invitation_read(inv) for inv in invitations]


@router.delete(
    "/{workspace_id}/invitations/{invitation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Cancel a pending invitation",
    description="Cancels an outstanding invitation. Requires **manager** role.",
)
async def cancel_invitation(
    workspace_id: uuid.UUID,
    invitation_id: uuid.UUID,
    db: DBSession,
    current_user: CurrentActiveUser,
) -> None:
    await WorkspaceService(db).cancel_invitation(workspace_id, invitation_id, current_user)
