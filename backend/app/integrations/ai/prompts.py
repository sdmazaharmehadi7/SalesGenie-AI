"""
Prompt templates for the OpenAI-backed `AIProvider` implementation.

Kept separate from `openai_client.py` so prompts can be reviewed, tuned,
and version-controlled independently of the HTTP/parsing plumbing around
them. Every prompt instructs the model to respond with a single JSON
object matching a specific shape, since `openai_client.py` calls the API
with `response_format={"type": "json_object"}` and parses the result
directly into the corresponding Pydantic schema.
"""

COMPANY_INSIGHT_SYSTEM_PROMPT = (
    "You are a B2B sales intelligence analyst. Given a company's name, "
    "industry, and primary contact, produce a concise analysis a sales "
    "rep can use to qualify and approach the account. "
    "Respond ONLY with a JSON object with exactly these keys: "
    '"business_needs" (string, 1-3 sentences on likely pain points), '
    '"opportunities" (string, 1-3 sentences on where this platform could '
    "help), \"industry_analysis\" (string, 1-2 sentences of industry "
    "context relevant to the sale). Do not include any text outside the "
    "JSON object."
)


def build_company_insight_user_prompt(
    company_name: str, industry: str | None, contact_name: str | None
) -> str:
    return (
        f"Company: {company_name}\n"
        f"Industry: {industry or 'unknown'}\n"
        f"Primary contact: {contact_name or 'unknown'}"
    )


LEAD_SCORE_SYSTEM_PROMPT = (
    "You are a B2B lead qualification model. Given a company's profile "
    "and (optionally) an existing analysis of it, estimate how promising "
    "this lead is. Respond ONLY with a JSON object with exactly these "
    'keys: "lead_score" (integer 0-100, overall qualification score), '
    '"conversion_probability" (number 0.0-1.0, estimated probability of '
    "closing). Do not include any text outside the JSON object."
)


def build_lead_score_user_prompt(
    company_name: str, industry: str | None, insight: dict | None
) -> str:
    lines = [f"Company: {company_name}", f"Industry: {industry or 'unknown'}"]
    if insight:
        lines.append(f"Business needs: {insight.get('business_needs', 'n/a')}")
        lines.append(f"Opportunities: {insight.get('opportunities', 'n/a')}")
    return "\n".join(lines)


OUTREACH_EMAIL_SYSTEM_PROMPT = (
    "You are an expert B2B SDR writing a first-touch cold outreach email. "
    "Keep it short (under 150 words), personalized, and value-first — no "
    "generic filler. Respond ONLY with a JSON object with exactly these "
    'keys: "email_subject" (string, under 12 words), "email_content" '
    "(string, the full email body, plain text, no markdown). Do not "
    "include any text outside the JSON object."
)


def build_outreach_email_user_prompt(
    company_name: str,
    contact_name: str | None,
    industry: str | None,
    insight: dict | None,
) -> str:
    lines = [
        f"Company: {company_name}",
        f"Contact: {contact_name or 'there'}",
        f"Industry: {industry or 'unknown'}",
    ]
    if insight:
        lines.append(f"Known business needs: {insight.get('business_needs', 'n/a')}")
        lines.append(f"Opportunity angle: {insight.get('opportunities', 'n/a')}")
    return "\n".join(lines)


CONVERSATION_SUMMARY_SYSTEM_PROMPT = (
    "You summarize sales call/meeting transcripts for a CRM. Respond ONLY "
    'with a JSON object with exactly these keys: "summary" (string, 2-4 '
    'sentences), "action_items" (array of short strings, each a concrete '
    "next step with an owner if mentioned). Do not include any text "
    "outside the JSON object."
)


def build_conversation_summary_user_prompt(transcript: str) -> str:
    return f"Transcript:\n{transcript}"
