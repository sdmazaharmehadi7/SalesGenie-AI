"""
client.py — AI Provider Client Singleton
==========================================
Initializes AI SDK clients (Google Gemini / OpenAI) once at import time
and exposes shared client objects.

Usage:
    from app.ai.client import gemini_client, PRIMARY_MODEL, PROVIDER
"""

import logging
import google.generativeai as genai
from openai import OpenAI

from app.ai.config import GEMINI_API_KEY, GEMINI_MODEL, OPENAI_API_KEY, OPENAI_MODEL

logger = logging.getLogger(__name__)

gemini_client: genai.GenerativeModel | None = None
openai_client: OpenAI | None = None
PROVIDER: str = ""
PRIMARY_MODEL: str = ""

# Initialize Gemini if key is provided
if GEMINI_API_KEY:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        gemini_client = genai.GenerativeModel(model_name=GEMINI_MODEL)
        PROVIDER = "gemini"
        PRIMARY_MODEL = GEMINI_MODEL
        logger.info("Initialized Google Gemini client with model: %s", GEMINI_MODEL)
    except Exception as exc:
        logger.warning("Failed to initialize Gemini client: %s", exc)

# Initialize OpenAI if key is provided
if OPENAI_API_KEY:
    try:
        openai_client = OpenAI(api_key=OPENAI_API_KEY)
        if not PROVIDER:
            PROVIDER = "openai"
            PRIMARY_MODEL = OPENAI_MODEL
        logger.info("Initialized OpenAI client with model: %s", OPENAI_MODEL)
    except Exception as exc:
        logger.warning("Failed to initialize OpenAI client: %s", exc)
