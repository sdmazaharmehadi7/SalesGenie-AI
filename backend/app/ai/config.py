"""
config.py — AI Service Configuration
=====================================
Loads and validates environment variables required by the AI provider(s)
(Google Gemini and OpenAI).

Usage:
    from app.ai.config import GEMINI_API_KEY, GEMINI_MODEL, OPENAI_API_KEY, OPENAI_MODEL
"""

import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv(override=False)

# Google Gemini Configuration
GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

# OpenAI Configuration (Fallback / Alternative)
OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-5")

# Ensure at least one provider API key is present
if not GEMINI_API_KEY and not OPENAI_API_KEY:
    raise ValueError(
        "Missing required environment variable: GEMINI_API_KEY or OPENAI_API_KEY. "
        "Please set at least one API key in your .env file or environment variables."
    )
