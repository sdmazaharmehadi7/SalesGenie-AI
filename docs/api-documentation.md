
---

# `docs/api-documentation.md`

```markdown
# SalesGenie-AI - API Documentation

## 1. Overview

The SalesGenie-AI backend provides REST APIs used by the frontend application.

The API handles:

- Authentication
- Users
- Workspaces
- Team members
- Invitations
- Leads
- Opportunities
- Tasks
- Activities
- Notifications
- Gmail integration
- AI Assistant
- Automation

The exact endpoint names may vary depending on the current implementation.

---

# 2. Authentication APIs

Authentication APIs manage user accounts and sessions.

### Signup

```http
POST /api/auth/signup
Creates a new user account.

Login
POST /api/auth/login

Authenticates a user.

Email Verification
POST /api/auth/verify-email

Verifies a user's email address.

Google Authentication

Used for Google-based authentication.

3. User APIs

User APIs manage authenticated user information.

Typical operations:

GET /api/users/me

Returns the currently authenticated user.

User information should only be returned for the authenticated account.

4. Workspace APIs
Create Workspace
POST /api/workspaces

Creates a new workspace.

The authenticated user becomes the workspace manager.

Get Workspaces
GET /api/workspaces

Returns workspaces accessible to the authenticated user.

Get Workspace
GET /api/workspaces/:workspaceId

Returns workspace information after validating membership.

Update Workspace
PUT /api/workspaces/:workspaceId

Updates workspace information.

5. Workspace Invitation APIs
Search User

Managers can search for existing users before sending invitations.

GET /api/users/search
Send Invitation
POST /api/workspaces/:workspaceId/invitations

Sends a workspace invitation.

Get Invitations
GET /api/invitations

Returns invitations for the authenticated user.

Accept Invitation
POST /api/invitations/:invitationId/accept

Accepts a workspace invitation.

6. Team APIs
Get Team Members
GET /api/workspaces/:workspaceId/members

Returns members of the workspace.

Update Member
PUT /api/workspaces/:workspaceId/members/:memberId

Updates member-related information where permitted.

7. Lead APIs
Create Lead
POST /api/leads

Creates a lead.

Get Leads
GET /api/leads

Returns leads accessible to the authenticated user.

Get Lead
GET /api/leads/:leadId

Returns a specific lead.

Update Lead
PUT /api/leads/:leadId

Updates lead information.

Assign Lead
PUT /api/leads/:leadId/assign

Assigns a lead to a team member.

8. Opportunity APIs
Create Opportunity
POST /api/opportunities

Creates an opportunity.

Get Opportunities
GET /api/opportunities

Returns accessible opportunities.

Update Opportunity
PUT /api/opportunities/:opportunityId

Updates opportunity information.

9. Task APIs
Create Task
POST /api/tasks

Creates a task.

Get Tasks
GET /api/tasks

Returns accessible tasks.

Update Task
PUT /api/tasks/:taskId

Updates task information.

10. Activity APIs

Activities are used to record sales interactions.

Typical operations include:

POST /api/activities
GET /api/activities

Activities may be associated with:

Leads
Opportunities
Users
Workspaces
11. Notification APIs
Get Notifications
GET /api/notifications

Returns notifications for the authenticated user.

Mark Notification as Read
PUT /api/notifications/:notificationId/read

Marks a notification as read.

Notifications should always be filtered by the authenticated user.

12. AI APIs

The AI Assistant uses backend APIs to process user requests.

Typical flow:

Frontend
   |
   v
AI API
   |
   v
Agent Brain
   |
   +---- CRM
   +---- RAG
   +---- Calculator
   +---- Other Tools
   |
   v
Response

AI requests should execute using the authenticated user's permitted context.

13. Gmail APIs

Gmail integration handles communication between the user's Gmail account and SalesGenie-AI.

Operations may include:

Connect Gmail
Send email
Retrieve email information
Track email activity
Detect replies
Disconnect Gmail

Gmail credentials and tokens must be handled securely.

14. Authorization

Every protected API should verify:

Authentication
      |
      v
User Identity
      |
      v
Workspace Membership
      |
      v
Role / Permission
      |
      v
Resource Access

The frontend must not be relied upon for authorization.

15. Error Handling

The API should return appropriate HTTP status codes.

Common examples:

200 - Successful request
201 - Resource created
400 - Invalid request
401 - Authentication required
403 - Access denied
404 - Resource not found
500 - Internal server error