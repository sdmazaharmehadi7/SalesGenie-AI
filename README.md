# SalesGenie-AI

## AI-Powered Sales Intelligence and CRM Platform

SalesGenie-AI is an AI-powered Customer Relationship Management (CRM) platform designed to help individuals and sales teams manage leads, opportunities, customer activities, communication, team performance, and sales operations from a single platform.

The platform combines traditional CRM functionality with AI assistance, workspace-based collaboration, Gmail integration, notifications, team tracking, and workflow automation.

SalesGenie-AI supports both individual users and collaborative workspaces, allowing users to work independently or participate in teams.

---

## Project Overview

Sales teams often manage leads, customer communication, follow-ups, opportunities, meetings, and team activities across multiple tools.

SalesGenie-AI brings these activities together into one platform.

A user can work independently in their Personal Area or participate in one or more workspaces.

Within a workspace, users can have different responsibilities depending on their role.

A user who creates or manages a workspace acts as its Manager/Owner, while other users can participate as team members.

The platform provides managers with visibility into team activities while allowing team members to manage their assigned sales work.

---

# Core Concept

Every account in SalesGenie-AI is a User.

A user can operate in:

- Personal Area
- Existing Workspace
- Multiple Workspaces

A user becomes a Manager/Owner only within a workspace that they create or manage.

The same user can also be a team member in another workspace.

```text
                         USER
                          |
             +------------+------------+
             |                         |
             ▼                         ▼
       PERSONAL AREA              WORKSPACE HUB
                                       |
                         +-------------+-------------+
                         |                           |
                         ▼                           ▼
                  Create Workspace             Join Workspace
                         |
                         ▼
                    MANAGER
                         |
                         ▼
                  TEAM MEMBERS
Key Features
1. Authentication

SalesGenie-AI provides user authentication and account management.

Features include:

User registration
User login
Email verification
Password management
Google authentication
Protected routes
User-specific data access

After authentication, users are directed to the appropriate part of the application based on their account and workspace status.

2. Personal Area

Every user has access to a Personal Area.

The Personal Area is intended for work that does not belong to a particular team or workspace.

Users can work independently without creating a workspace.

Users can later:

Create a workspace
Join an existing workspace
Switch between available workspaces
3. Workspace Hub

The Workspace Hub provides a centralized place for users to manage their workspace participation.

Users can:

View existing workspaces
Create a workspace
Join a workspace
View workspace invitations
Accept workspace invitations
Access workspace-specific information
Switch between workspaces

Workspace information and CRM data are separated according to workspace context.

4. Workspace Management

A workspace represents a collaborative sales team.

When a user creates a workspace, that user becomes the Manager/Owner of that workspace.

The manager can:

Manage workspace information
Add team members
Search for existing users
Send workspace invitations
Assign leads
Track team activities
Manage important workspace information
View team performance

Workspace membership determines what users can access within that workspace.

5. Team Member Management

Managers can add existing SalesGenie-AI users to their workspace.

Instead of manually entering an unknown email address, a manager can search for an existing user using their email address.

The manager can select the user and send a workspace invitation.

Manager
   |
   ▼
Search User by Email
   |
   ▼
Existing User Found
   |
   ▼
Select User
   |
   ▼
Send Workspace Invitation
   |
   +--------------------+
   |                    |
   ▼                    ▼
Notification          Email
   |
   ▼
Workspace Hub
   |
   ▼
Accept Invitation
6. Workspace Roles

SalesGenie-AI uses workspace-based roles.

Manager / Owner

The workspace manager can:

Manage workspace information
Add team members
Assign leads
Track team activity
View team performance
Manage workspace information
Team Member

Team members can:

View assigned leads
Manage sales activities
Work with opportunities
Track tasks
View relevant workspace information
Receive notifications
Use the AI Assistant

The same user can be a Manager in one workspace and a Team Member in another workspace.

7. Workspace Details

Each workspace provides a Workspace Details section.

Users can view relevant workspace information such as:

Workspace name
Workspace description
Manager
Team members
Member roles
Team responsibilities
Important dates
Tasks
Other workspace information

Managers can update workspace information when required.

This provides a common reference point for the team.

CRM
8. Lead Management

SalesGenie-AI provides lead management functionality.

Users can:

Create leads
View leads
Update leads
Search leads
Filter leads
Track lead status
Assign leads
View lead activities
Manage follow-ups

Managers can assign leads to specific team members.

Manager
   |
   ▼
Select Lead
   |
   ▼
Select Team Member
   |
   ▼
Assign Lead
   |
   ▼
Team Member Notification
   |
   ▼
Team Member Works on Lead
9. Lead Activities

SalesGenie-AI maintains activity information associated with leads.

Activities can include:

Calls
Emails
Notes
Follow-ups
Meetings
Other sales activities

This allows users to understand the history and current state of a lead.

10. Opportunity Management

SalesGenie-AI provides opportunity management for tracking potential deals.

Users can:

Create opportunities
Update opportunities
Track opportunity stages
Monitor deal progress
Record activities
Track important dates
Manage sales pipeline information

Managers can use opportunity information to understand overall team and pipeline performance.

11. Team Tracking

Team Tracking provides managers with visibility into the activities of their team.

Managers can monitor:

Team members
Assigned leads
Lead progress
Sales activities
Tasks
Important lead dates
Opportunities
Team responsibilities

The purpose of Team Tracking is to help managers understand:

Who is working on what
Which leads are being handled
Which opportunities are progressing
Which activities require attention
Where follow-up may be required
Notifications
12. Notification System

SalesGenie-AI provides an in-application notification system for important events.

Supported notification types include:

Lead Assigned to Me

Triggered when a lead is assigned to the user.

Lead Status Changed

Triggered when the status of a relevant lead changes.

Deal Stage Changed

Triggered when an opportunity moves between stages.

Task Due

Triggered when a task becomes due.

AI Insights and Recommendations

Triggered when AI identifies a relevant recommendation or insight.

Email Activity

Includes relevant email activities such as:

Email opened
Email replied
Meeting Reminders

Provides reminders for scheduled meetings.

Workspace Invitations

Users are notified when another manager invites them to a workspace.

Team Mentions

Users can receive notifications when they are mentioned by another team member.

Email Integration
13. Gmail Integration

SalesGenie-AI can integrate with a user's Gmail account.

The purpose of Gmail integration is to connect sales communication with CRM activities.

Depending on the connected account and configured functionality, users can:

Connect Gmail
Send sales emails
Track email activity
Detect email replies
Associate communication with CRM activities
Disconnect Gmail

Email integration is associated with the authenticated user and should not expose another user's email credentials or communication.

14. Email Activity

Email activity allows sales communication to become part of the CRM workflow.

Important events include:

Email Sent
    |
    ▼
Prospect Opens Email
    |
    ▼
Email Opened Activity

or:

Email Sent
    |
    ▼
Prospect Replies
    |
    ▼
Email Replied Activity

These activities can contribute to lead and opportunity tracking.

AI
15. AI Sales Assistant

SalesGenie-AI includes an AI Assistant designed to help users work with their CRM data.

The assistant can help with:

Lead analysis
Lead summaries
Opportunity analysis
Follow-up recommendations
Sales-related questions
CRM information retrieval
Identifying potential risks
Suggesting next actions

The AI Assistant is integrated with the CRM rather than functioning as a completely separate chatbot.

16. CRM + AI Integration

The AI Assistant can work with authorized CRM information.

For example, a user may ask:

Which of my leads need follow-up?

The system can retrieve the relevant CRM information and provide an AI-generated response.

Another example:

Give me a summary of this lead and suggest the next action.

The system can use the relevant CRM information before generating the recommendation.

The objective is to reduce the amount of manual searching required from users.

17. AI Context Control

The AI Assistant should only receive the information required to answer a particular request.

Instead of sending the complete CRM database to an AI model, the system can retrieve relevant information based on the user's request.

User Question
      |
      ▼
Identify Required Context
      |
      ▼
Retrieve Relevant CRM Data
      |
      ▼
Provide Required Context
      |
      ▼
AI Assistant
      |
      ▼
Response

This reduces unnecessary context and helps control API usage.

Agentic AI
18. Agentic AI

SalesGenie-AI includes an Agent Brain for tasks that require dynamic reasoning and tool selection.

Instead of creating a separate fixed workflow for every possible question, the Agent Brain analyzes the user's task and determines which capabilities are required.

User Request
     |
     ▼
Agent Brain
     |
     ▼
Understand Task
     |
     ▼
Select Required Capability
     |
     ▼
Execute Tool
     |
     ▼
Observe Result
     |
     ▼
Next Decision
     |
     ▼
Final Answer
19. Agent Brain

The Agent Brain acts as the decision-making layer for the AI Assistant.

Depending on the task, it can select appropriate capabilities such as:

CRM information retrieval
RAG
Calculator
Unit conversion
CRM operations
Other available tools
Workflow automation

The agent can use multiple capabilities when a task requires multiple steps.

                     AGENT BRAIN
                          |
          +---------------+---------------+
          |               |               |
          ▼               ▼               ▼
         RAG          Calculator     Unit Converter
          |
          +------------ CRM Tools
          |
          +------------ Other Tools
          |
          +------------ Workflows
20. Multi-Step AI Tasks

Some tasks require more than one operation.

For example:

Retrieve two values and calculate the difference between them.

The agent can perform:

User Request
     |
     ▼
Agent Brain
     |
     ▼
RAG / Data Retrieval
     |
     ▼
Calculator
     |
     ▼
Final Answer

A more complex task can use multiple capabilities:

User Request
     |
     ▼
Agent Brain
     |
     ▼
Retrieve Information
     |
     ▼
Calculator
     |
     ▼
Unit Conversion
     |
     ▼
Retrieve Additional Information
     |
     ▼
Final Reasoning
     |
     ▼
Final Answer

The sequence is determined according to the task rather than being permanently fixed for every question.

21. RAG

SalesGenie-AI can use Retrieval-Augmented Generation for knowledge-based AI interactions.

Instead of relying only on the model's internal knowledge, the system can retrieve relevant information before generating a response.

User Question
      |
      ▼
Search Relevant Information
      |
      ▼
Retrieve Relevant Context
      |
      ▼
AI Reasoning
      |
      ▼
Answer

RAG helps the AI Assistant answer questions using available organizational knowledge.

22. Knowledge Retrieval

The knowledge retrieval system can provide relevant information to the AI Assistant.

The general process is:

Question
   |
   ▼
Search
   |
   ▼
Retrieve Relevant Information
   |
   ▼
AI Assistant
   |
   ▼
Response

This allows the system to use available knowledge when answering user questions.

23. AI Recommendations

The AI Assistant can provide recommendations based on relevant CRM information.

Examples include:

Suggested next actions
Follow-up recommendations
Lead risks
Opportunity risks
Potential sales opportunities
Activity recommendations

AI recommendations are intended to assist the user rather than replace human decision-making.

Automation
24. Workflow Automation

SalesGenie-AI includes automation for repetitive and predictable sales operations.

Automation is used for business events where a predefined action is appropriate.

Examples include:

Follow-up reminders
Task reminders
Meeting reminders
Lead-related automation
Email-related activities
Scheduled sales operations
Predictable Business Event
          |
          ▼
   Automation Engine
          |
          ▼
    Condition Check
          |
          ▼
    Automated Action
          |
          ▼
Notification / Task
25. Agentic AI vs Automation

SalesGenie-AI separates dynamic AI reasoning from deterministic automation.

Agentic AI

Used when the system needs to understand a user's request and decide what action or information is required.

User Request
     |
     ▼
Agent Brain
     |
     ▼
Dynamic Tool Selection
     |
     ▼
Execution
     |
     ▼
Observation
     |
     ▼
Final Answer
Automation

Used when a known event should trigger a known action.

Event
  |
  ▼
Condition
  |
  ▼
Automation
  |
  ▼
Action

This combination provides both flexible AI assistance and reliable business automation.

Data Isolation and Security
26. Personal and Workspace Data

SalesGenie-AI separates personal and workspace-related data.

Personal Area

Contains information belonging to the individual user's personal work.

Workspace

Contains information associated with a specific team and workspace.

User Access

Users should only access CRM information they are authorized to access.

User A
  |
  +── Personal Area
  |
  └── Workspace A

User B
  |
  +── Personal Area
  |
  └── Workspace B

A workspace member should not automatically gain access to another workspace's information.

27. Security Principles

SalesGenie-AI follows these principles:

Authentication
Authorization
User-specific access
Workspace-level access control
Personal/workspace data separation
Protected backend APIs
User-specific Gmail integration
Secure credential handling
No API keys committed to source control

AI systems should only receive information that the authenticated user is authorized to access.

Technology Stack
Frontend
React
Vite
JavaScript
Tailwind CSS
React Router
Axios
Backend
Node.js
Express.js
Database
MongoDB
AI
AI Assistant
Agentic AI
Agent Brain
Retrieval-Augmented Generation
AI-powered CRM analysis
Email
Gmail Integration
System Architecture
                         SALESGenie-AI
                              |
                              ▼
                       React Frontend
                              |
                              ▼
                      Node.js / Express
                              |
            +-----------------+------------------+
            |                 |                  |
            ▼                 ▼                  ▼
       Authentication        CRM             Workspace
                              |                  |
                    +---------+---------+        |
                    |         |         |        |
                    ▼         ▼         ▼        ▼
                  Leads  Opportunities Activities Team
                    |         |         |
                    +---------+---------+
                              |
                              ▼
                         AI Assistant
                              |
                              ▼
                         Agent Brain
                              |
               +--------------+--------------+
               |              |              |
               ▼              ▼              ▼
             RAG          Calculator      CRM Tools
               |
               +------- Other Tools
                              |
                              ▼
                       Workflow Engine
                              |
                              ▼
                    Notifications / Actions
                              |
                              ▼
                           User
Application Flow
New User
Create Account
      |
      ▼
Authentication
      |
      ▼
Onboarding
      |
      +-----------------------+
      |                       |
      ▼                       ▼
Personal Area          Create Workspace
                              |
                              ▼
                           Manager
Existing User
Login
  |
  ▼
Check User
  |
  ▼
Existing Workspace Membership?
  |
  +-----------+-----------+
  |                       |
 Yes                       No
  |                       |
  ▼                       ▼
Workspace Hub         Personal Area
Workspace Manager
Manager
   |
   ▼
Workspace
   |
   +── Workspace Details
   |
   +── Team Members
   |
   +── Leads
   |
   +── Opportunities
   |
   +── Team Tracking
   |
   +── Tasks
   |
   +── Activities
   |
   +── Notifications
   |
   └── AI Assistant
Team Member
Team Member
     |
     ▼
Workspace
     |
     +── Assigned Leads
     |
     +── Opportunities
     |
     +── Tasks
     |
     +── Activities
     |
     +── Notifications
     |
     +── Workspace Details
     |
     └── AI Assistant
Project Structure
SalesGenie-AI/

├── frontend/
│   └── React application
│
├── backend/
│   └── Node.js / Express application
│
├── docs/
│   └── Project documentation
│
├── assets/
│   ├── screenshots/
│   ├── architecture/
│   └── diagrams/
│
├── .env.example
├── .gitignore
└── README.md
Development Workflow

The project uses Git for version control.

Developers should avoid making direct changes to the main branch.

Recommended workflow:

main
 |
 +── feature branch
 |
 +── Development
 |
 +── Testing
 |
 +── Commit
 |
 +── Push
 |
 └── Pull Request

Before starting development:

git checkout main
git pull origin main

Create a feature branch:

git checkout -b feature/feature-name

Check changes:

git status

Commit changes:

git add .
git commit -m "Describe the change"

Push changes:

git push origin feature/feature-name
Branch Naming Convention

Examples:

feature/authentication
feature/workspace-management
feature/team-management
feature/lead-management
feature/opportunities
feature/team-tracking
feature/notifications
feature/gmail-integration
feature/ai-assistant
feature/automation

Experimental work:

experiment/agent-framework
experiment/ai-agent
Environment Configuration

Create local environment variables using the provided example configuration.

.env.example

Never commit sensitive credentials.

Do not commit:

API keys
OAuth secrets
Database credentials
Access tokens
Private credentials
Testing

SalesGenie-AI is tested across the complete application flow.

Testing areas include:

User registration
Login
Email verification
Google authentication
Personal Area
Workspace creation
Workspace joining
Workspace invitations
Workspace switching
Workspace isolation
Team member management
Lead management
Lead assignment
Lead activities
Opportunities
Team tracking
Notifications
Gmail integration
AI Assistant
AI + CRM integration
RAG
Agent tool selection
Multi-step agent tasks
Workflow automation
User authorization
Error handling
AI Agent Testing

AI-specific tests verify that the Agent Brain can select appropriate capabilities for a task.

Example:

RAG → Calculator → Answer

Another example:

RAG → Calculator → Unit Conversion → RAG → Calculator → Answer

The objective is to demonstrate dynamic tool selection and multi-step reasoning.

Project Goals

The main goals of SalesGenie-AI are:

Provide a complete CRM platform
Simplify lead management
Improve opportunity tracking
Improve team collaboration
Provide managers with team visibility
Connect sales communication with CRM activities
Reduce repetitive sales operations
Provide AI-powered sales assistance
Demonstrate Agentic AI
Support retrieval-based AI interactions
Combine dynamic AI reasoning with deterministic automation
Maintain personal and workspace data isolation
Future Enhancements

Potential future improvements include:

Advanced sales forecasting
Advanced sales analytics
Additional communication integrations
Additional AI tools
Improved AI recommendations
Advanced reporting
Mobile application
Additional automation triggers
More CRM integrations
Academic Project

Project Name: SalesGenie-AI

Domain: Artificial Intelligence / Customer Relationship Management

Project Type: AI-Powered CRM and Sales Intelligence Platform

Institution: Lakireddy Balireddy College of Engineering

Team Members
Member	Responsibility
Member 1	Frontend Development
Member 2	Backend Development
Member 3	Database and Integration
Member 4	AI, Agent, Testing and Documentation

Team responsibilities may be updated according to the final project contribution.