# Contributing Guide

## Repository

SalesGenie AI

---

# First Time Setup

Clone the repository:

```bash
git clone https://github.com/sdmazaharmehadi7/SalesGenie-AI.git
```

Move into the project:

```bash
cd SalesGenie-AI
```

---

# Folder Responsibilities

## Frontend

Location:

```bash
cd frontend
```

Responsibilities:

* React Setup
* UI Components
* Dashboard
* Authentication Pages

Return to root:

```bash
cd ..
```

---

## Backend

Location:

```bash
cd backend
```

Responsibilities:

* FastAPI
* REST APIs
* Authentication
* Database Integration

Return to root:

```bash
cd ..
```

---

## Database

Location:

```bash
cd database
```

Responsibilities:

* PostgreSQL Schema
* SQL Scripts
* ER Diagrams

Return to root:

```bash
cd ..
```

---

## Documentation

Location:

```bash
cd docs
```

Responsibilities:

* Architecture Diagrams
* Meeting Notes
* Project Documentation

Return to root:

```bash
cd ..
```

---

# Daily Workflow

## 1. Enter Project

```bash
cd SalesGenie-AI
```

## 2. Get Latest Changes

```bash
git pull origin main
```

## 3. Move to Your Working Folder

Frontend:

```bash
cd frontend
```

Backend:

```bash
cd backend
```

Database:

```bash
cd database
```

Documentation:

```bash
cd docs
```

## 4. Make Changes

Write code or update files.

## 5. Return to Project Root

```bash
cd ..
```

Verify:

```bash
pwd
```

## 6. Check Changes

```bash
git status
```

## 7. Add Files

```bash
git add .
```

## 8. Commit Changes

```bash
git commit -m "Describe your changes"
```

Examples:

```bash
git commit -m "Added login page"
git commit -m "Created lead API"
git commit -m "Added PostgreSQL schema"
```

## 9. Push Changes

```bash
git push origin main
```

---

# Complete Example

```bash
cd SalesGenie-AI

git pull origin main

cd frontend

# make changes

cd ..

git add .

git commit -m "Added dashboard UI"

git push origin main
```

---

# Rules

* Always pull before starting work.
* Commit frequently.
* Use meaningful commit messages.
* Test your code before pushing.
* Do not delete another member's code.
* Do not commit `.env` files or API keys.

---

# Quick Commands

```bash
git pull origin main

git status

git add .

git commit -m "Your message"

git push origin main
```

