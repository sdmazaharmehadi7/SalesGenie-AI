"""
config.py — AI Service Configuration
=====================================
Loads and validates environment variables required by the OpenAI client.

Usage:
    from app.ai.config import OPENAI_API_KEY, OPENAI_MODEL

This module is designed to be imported once at startup; the values are
module-level constants so they are resolved only on first import and
then reused across the entire backend without additional I/O.
"""

import os

from dotenv import load_dotenv

# ---------------------------------------------------------------------------
# Load environment variables from the nearest .env file.
# `override=False` means existing OS-level env vars take precedence, which
# is the desired behaviour in production (where secrets are injected by the
# host environment rather than a file).
# ---------------------------------------------------------------------------
load_dotenv(override=False)


# ---------------------------------------------------------------------------
# OPENAI_API_KEY — required
# ---------------------------------------------------------------------------
OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")

if not OPENAI_API_KEY:
    raise ValueError(
        "Missing required environment variable: OPENAI_API_KEY. "
        "Please set it in your .env file or as an OS environment variable."
    )


# ---------------------------------------------------------------------------
# OPENAI_MODEL — optional, defaults to "gpt-5"
# ---------------------------------------------------------------------------
OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-5")
