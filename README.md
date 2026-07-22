# SalesGenie AI

## Project Overview

SalesGenie AI is an AI-powered Sales Assistant and Lead Intelligence Platform designed to help sales teams automate lead management, company analysis, outreach generation, lead scoring, and sales analytics.

This repository contains the complete source code and documentation for the project.

---

# Team Members

| Name     | Responsibility                          |
| -------- | --------------------------------------- |
| Member 1 | Frontend (React)                        |
| Member 2 | Backend (FastAPI)                       |
| Member 3 | Database (PostgreSQL)                   |
| Member 4 | AI Integration, Testing & Documentation |

Note: Team responsibilities may be adjusted after discussion.

---

# Proposed Technology Stack

## Frontend

* React
* React Router
* Axios
* Tailwind CSS

## Backend

* FastAPI
* SQLAlchemy

## Database

* PostgreSQL

## AI

* OpenAI API
* LangChain (Optional)

## Deployment

* Vercel
* Render/Railway

---

# Project Structure

```text
SalesGenie-AI/
│
├── frontend/
│   └── React Application
│
├── backend/
│   └── FastAPI Application
│
├── database/
│   └── PostgreSQL Scripts
│
├── docs/
│   └── Documentation
│
└── README.md
```

---

# Development Workflow

Important:

Do NOT directly modify the main branch.

Always:

1. Pull latest changes
2. Create or switch to your branch
3. Commit your changes
4. Push your branch
5. Create Pull Request

---

# Git Setup

Clone Repository

```bash
git clone <repository-url>
```

Move into project

```bash
cd SalesGenie-AI
```

Check branch

```bash
git branch
```

---

# Essential Git Commands

## Pull Latest Changes

Always do this before starting work.

```bash
git pull origin main
```

---

## Create New Branch

Example:

```bash
git checkout -b frontend
```

or

```bash
git checkout -b backend
```

---

## Switch Branch

```bash
git checkout frontend
```

---

## Check Changes

```bash
git status
```

---

## Add Changes

```bash
git add .
```

---

## Commit Changes

```bash
git commit -m "Added login page"
```

Use meaningful commit messages.

Examples:

```bash
git commit -m "Created leads table"
git commit -m "Added dashboard API"
git commit -m "Implemented email generation"
```

---

## Push Changes

```bash
git push origin frontend
```

or

```bash
git push origin backend
```

---

## Get Latest Updates

```bash
git pull origin main
```

---

# Branch Naming Convention

Use:

```text
frontend
backend
database
ai-integration
```

For feature work:

```text
feature/login-page
feature/dashboard
feature/lead-scoring
```

---

# Coding Guidelines

## Frontend

Store all React code inside:

```text
frontend/
```

Responsibilities:

* Authentication UI
* Dashboard
* Lead Management UI
* Analytics UI

---

## Backend

Store all FastAPI code inside:

```text
backend/
```

Responsibilities:

* APIs
* Authentication
* Lead Management
* Database Integration

---

## Database

Store:

```text
database/
```

Responsibilities:

* SQL Scripts
* Database Schema
* ER Diagrams

---

## AI Integration

Responsibilities:

* OpenAI Integration
* Company Analysis
* Lead Scoring
* Email Generation
* Meeting Summarization

---

# Communication Rules

Before starting a major feature:

1. Inform the team.
2. Ensure no one else is working on the same feature.
3. Pull latest changes.
4. Create commits regularly.

---

# Important Rules

DO:

* Pull before coding.
* Commit frequently.
* Use meaningful commit messages.
* Test before pushing.
* Keep code clean.

DO NOT:

* Push broken code.
* Commit secrets or API keys.
* Delete another member's code.
* Work directly on main without discussion.

---

# Initial Milestones

Phase 1

* Setup Repository
* Setup React
* Setup FastAPI
* Setup PostgreSQL

Phase 2

* Authentication
* Lead Management

Phase 3

* Dashboard

Phase 4

* AI Integration

Phase 5

* Testing and Deployment

---

# Goal

Build a complete AI-powered Sales Assistant platform capable of:

* Lead Management
* Company Analysis
* AI Outreach Generation
* Lead Scoring
* Meeting Summarization
* CRM Integration
* Analytics Dashboard

Let's maintain clean code, communicate regularly, and collaborate effectively to deliver a successful project.
