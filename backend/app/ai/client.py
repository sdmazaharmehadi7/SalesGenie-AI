"""
client.py — Reusable OpenAI Client
====================================
Initialises the OpenAI SDK client once at import time and exposes a
single ``openai_client`` object that can be imported anywhere in the
backend.

Usage:
    from app.ai.client import openai_client

    response = openai_client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[{"role": "user", "content": "Hello!"}],
    )

Keeping a single client instance avoids the overhead of re-authenticating
on every request and makes it easy to swap the underlying provider later.
"""

from openai import OpenAI

# ---------------------------------------------------------------------------
# Pull validated configuration constants from config.py.
# config.py already calls load_dotenv() and raises ValueError if the API
# key is absent, so no additional validation is needed here.
# ---------------------------------------------------------------------------
from app.ai.config import OPENAI_API_KEY, OPENAI_MODEL  # noqa: F401 – re-export MODEL for convenience

# ---------------------------------------------------------------------------
# Initialise the OpenAI client once.
#
# The `OpenAI` constructor accepts the API key directly so the client is
# self-contained and does not rely on the OPENAI_API_KEY environment
# variable being read again at the SDK level.
# ---------------------------------------------------------------------------
openai_client: OpenAI = OpenAI(api_key=OPENAI_API_KEY)
