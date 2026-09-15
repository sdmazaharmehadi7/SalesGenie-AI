
---

# `docs/system-architecture.md`

```markdown
# SalesGenie-AI - System Architecture

## 1. Architecture Overview

SalesGenie-AI follows a client-server architecture.

The frontend provides the user interface, while the backend manages application logic, authentication, CRM operations, workspace operations, AI integration, notifications, and automation.

MongoDB is used for persistent application data.

---

## 2. High-Level Architecture

```text
                    USER
                      |
                      v
              React Frontend
                      |
                      v
              Node.js / Express
                      |
       +--------------+---------------+
       |              |               |
       v              v               v
 Authentication      CRM          Workspace
       |              |               |
       |        +-----+-----+         |
       |        |     |     |         |
       |        v     v     v         v
       |      Leads  Opps Activities Team
       |              |
       +--------------+
                      |
                      v
                 MongoDB
                      |
                      v
                AI Assistant
                      |
                      v
                 Agent Brain
                      |
          +-----------+-----------+
          |           |           |
          v           v           v
         RAG     Calculator    CRM Tools
                      |
                      v
              Workflow Engine
                      |
                      v
               Notifications