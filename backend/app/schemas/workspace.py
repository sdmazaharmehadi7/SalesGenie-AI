"""
Pydantic v2 schemas for the Workspace resource.

Covers:
  - workspace creation / update
  - workspace read (with the calling user's role embedded)
  - membership read (member listing within a workspace)
  - leave / role-change payloads
"""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.models.workspace import MembershipStatus, WorkspaceRole, WorkspaceType
from app.schemas.common import ORMBaseModel


# ---------------------------------------------------------------------------
# Workspace CRUD
# ---------------------------------------------------------------------------


class WorkspaceCreate(BaseModel):
    """Payload to create a new team workspace."""

    name: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=1000)
    # Callers may only create TEAM workspaces via the API.
    # PERSONAL workspaces are auto-created by the auth service on registration.
    type: WorkspaceType = WorkspaceType.TEAM


class WorkspaceUpdate(BaseModel):
    """Partial update — only fields provided are changed."""

    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=1000)


class WorkspaceRead(ORMBaseModel):
    """
    Workspace detail response.

    `my_role` is not a column on Workspace — it is injected by the service
    layer from the calling user's WorkspaceMembership.role.
    """

    id: uuid.UUID
    name: str
    description: str | None
    type: WorkspaceType
    owner_id: uuid.UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime
    # Injected at serialisation time; not from ORM columns directly.
    my_role: WorkspaceRole


class WorkspaceListItem(ORMBaseModel):
    """Compact representation used in the list-workspaces response."""

    id: uuid.UUID
    name: str
    type: WorkspaceType
    is_active: bool
    my_role: WorkspaceRole
    member_count: int = 0


# ---------------------------------------------------------------------------
# Membership
# ---------------------------------------------------------------------------


class WorkspaceMemberRead(ORMBaseModel):
    """
    A single member as seen from within a workspace.
    Includes user display fields denormalised from the User relationship.
    """

    id: uuid.UUID           # membership row id
    workspace_id: uuid.UUID
    user_id: uuid.UUID
    user_name: str          # denormalised from membership.user.name
    user_email: str         # denormalised from membership.user.email
    role: WorkspaceRole
    status: str             # MembershipStatus value
    joined_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class UpdateMemberRoleRequest(BaseModel):
    """Payload to promote or demote a workspace member."""

    role: WorkspaceRole


# ---------------------------------------------------------------------------
# Current-user membership (self-inspection endpoint)
# ---------------------------------------------------------------------------


class MyMembershipRead(ORMBaseModel):
    """What the calling user's membership looks like in a given workspace."""

    membership_id: uuid.UUID
    workspace_id: uuid.UUID
    workspace_name: str      # denormalised from membership.workspace.name
    workspace_type: WorkspaceType
    role: WorkspaceRole
    status: str
    joined_at: datetime | None
    is_manager: bool


# ---------------------------------------------------------------------------
# Context switch
# ---------------------------------------------------------------------------


class WorkspaceContextResponse(BaseModel):
    """
    Response from the context-switch endpoint.
    Tells the frontend which workspace is now active and the user's role in it.
    No server-side session is stored — the frontend is responsible for
    carrying workspace_id in subsequent API calls.
    """

    workspace_id: uuid.UUID
    workspace_name: str
    workspace_type: WorkspaceType
    role: WorkspaceRole
    is_manager: bool


# ---------------------------------------------------------------------------
# Invitations
# ---------------------------------------------------------------------------


class InvitationCreate(BaseModel):
    """Payload sent by a workspace manager to invite a user by email."""

    email: str = Field(min_length=3, max_length=255)
    role: WorkspaceRole = WorkspaceRole.TEAM_MEMBER


class WorkspaceInvitationRead(ORMBaseModel):
    """Full detail of an invitation."""

    id: uuid.UUID
    workspace_id: uuid.UUID
    workspace_name: str
    workspace_type: WorkspaceType
    email: str
    role: WorkspaceRole
    status: str
    token: str
    invited_by_id: uuid.UUID
    invited_by_name: str
    invited_by_email: str
    expires_at: datetime
    created_at: datetime
    accepted_at: datetime | None = None


class PendingInvitationItem(ORMBaseModel):
    """
    Representation of an invitation displayed to an invited user
    (e.g., on their onboarding screen or pending invitations list).
    """

    id: uuid.UUID
    workspace_id: uuid.UUID
    workspace_name: str
    workspace_description: str | None = None
    invited_by_name: str
    invited_by_email: str
    role: WorkspaceRole
    status: str
    token: str
    expires_at: datetime
    created_at: datetime
    members_count: int = 1


class AcceptInvitationRequest(BaseModel):
    """Payload to accept an invitation by token."""

    token: str = Field(min_length=1, max_length=128)


class DeclineInvitationRequest(BaseModel):
    """Payload to decline an invitation by token."""

    token: str = Field(min_length=1, max_length=128)


class AcceptInvitationResponse(BaseModel):
    """Result of accepting an invitation."""

    message: str
    workspace_id: uuid.UUID
    workspace_name: str
    workspace_type: WorkspaceType
    role: WorkspaceRole
    is_manager: bool
