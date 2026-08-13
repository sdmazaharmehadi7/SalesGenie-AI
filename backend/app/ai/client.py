"""
client.py — Gemini AI Client Singleton
========================================
Initializes the Google Gemini SDK client once at import time
and exposes shared client objects for use across the service layer.

Usage:
    from app.ai.client import gemini_client, PRIMARY_MODEL, PROVIDER
"""

import logging
import google.generativeai as genai

from app.ai.config import GEMINI_API_KEY, GEMINI_MODEL

logger = logging.getLogger(__name__)

gemini_client: genai.GenerativeModel | None = None
PROVIDER: str = "gemini"
PRIMARY_MODEL: str = GEMINI_MODEL

# Initialize Gemini client
try:
    genai.configure(api_key=GEMINI_API_KEY)
    gemini_client = genai.GenerativeModel(model_name=GEMINI_MODEL)
    logger.info("Initialized Google Gemini client with model: %s", GEMINI_MODEL)
except Exception as exc:
    logger.error("Failed to initialize Gemini client: %s", exc)
    raise
