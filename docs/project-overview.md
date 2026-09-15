# SalesGenie-AI - Project Overview

## 1. Introduction

SalesGenie-AI is an AI-powered CRM platform designed to help individuals and sales teams manage leads, opportunities, customer activities, communication, tasks, and team performance from one application.

The system combines CRM features with AI assistance, workspace-based collaboration, Gmail integration, notifications, and workflow automation.

SalesGenie-AI supports two main ways of working:

- Personal Area
- Workspace

The Personal Area is used for individual work, while a Workspace is used for collaborative sales activities.

---

## 2. Main Objectives

The main objectives of SalesGenie-AI are:

- Manage sales leads efficiently
- Track opportunities and deals
- Improve team collaboration
- Allow managers to monitor team activities
- Connect email communication with CRM activities
- Provide AI-powered assistance
- Automate repetitive sales activities
- Keep personal and workspace data separated
- Provide a centralized sales management platform

---

## 3. User Types

SalesGenie-AI uses workspace-based roles.

### Manager

A Manager is responsible for managing a workspace.

A manager can:

- Create and manage a workspace
- Add team members
- Send workspace invitations
- Assign leads
- Monitor team activities
- Manage workspace details
- Track opportunities
- View team performance

### Team Member

A Team Member works within a workspace and manages assigned sales activities.

A team member can:

- View assigned leads
- Manage leads
- Update lead status
- Manage opportunities
- Complete tasks
- Record activities
- Use the AI Assistant
- Receive notifications

A user can be a Manager in one workspace and a Team Member in another workspace.

---

## 4. Personal Area

Every authenticated user has access to a Personal Area.

The Personal Area allows users to work independently without depending on a workspace.

Personal work can include:

- Personal leads
- Personal opportunities
- Personal tasks
- Personal activities
- AI Assistant usage

---

## 5. Workspace

A Workspace represents a sales team.

A workspace contains:

- Workspace information
- Manager
- Team members
- Leads
- Opportunities
- Tasks
- Activities
- Notifications
- Team tracking information

Workspace data is separated from personal data.

---

## 6. Main Modules

The main modules of SalesGenie-AI are:

1. Authentication
2. Personal Area
3. Workspace Hub
4. Workspace Management
5. Team Management
6. Lead Management
7. Opportunity Management
8. Team Tracking
9. Notifications
10. Gmail Integration
11. AI Assistant
12. RAG
13. Workflow Automation

---

## 7. High-Level User Flow

### New User

```text
Create Account
      |
      v
Authentication
      |
      v
Onboarding
      |
      +--------------------+
      |                    |
      v                    v
Personal Area       Create Workspace
                           |
                           v
                        Manager