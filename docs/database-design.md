
---

# `docs/database-design.md`

```markdown
# SalesGenie-AI - Database Design

## 1. Overview

SalesGenie-AI uses MongoDB as its primary database.

The database stores users, workspaces, CRM records, activities, notifications, invitations, and other application information.

The main design principle is to associate data with the correct user and workspace.

---

# 2. Main Data Entities

The main entities are:

- User
- Workspace
- Workspace Member
- Workspace Invitation
- Lead
- Opportunity
- Task
- Activity
- Notification
- Email Activity

---

# 3. User

The User entity represents an authenticated SalesGenie-AI account.

Typical information includes:

```text
User
 |
 +-- name
 +-- email
 +-- password / authentication information
 +-- profile information
 +-- verification status
 +-- createdAt
 +-- updatedAt