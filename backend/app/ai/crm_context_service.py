"""
crm_context_service.py — Token-Efficient, Isolated CRM Context Builder
========================================================================
Analyzes user questions and builds minimal, compact, user- and workspace-
authorized CRM context for the AI Assistant.

Key Design Principles:
1. Strict Authorization & Isolation: Queries data strictly through LeadService,
   OpportunityService, and ActivityService using verified current_user and ws_ctx.
2. Token Optimization: Max 5 leads, 3 opportunities, 5 activities. Compact format.
3. No Hallucinations: Clearly states when data is absent.
4. Hard Length Cap: Strictly limits total context characters to preserve token quota.
"""

from __future__ import annotations

import re
import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import WorkspaceContext
from app.models.user import User
from app.services.activity_service import ActivityService
from app.services.lead_service import LeadService
from app.services.opportunity_service import OpportunityService

MAX_CONTEXT_CHARS = 2000


class CRMContextService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.lead_service = LeadService(db)
        self.opportunity_service = OpportunityService(db)
        self.activity_service = ActivityService(db)

    def _extract_search_keywords(self, query: str) -> str | None:
        """
        Extracts potential entity/company/contact names from the query,
        ignoring common English stopwords and conversational words.
        """
        stopwords = {
            "what", "where", "when", "which", "who", "whom", "whose", "why", "how",
            "is", "are", "was", "were", "be", "been", "being", "have", "has", "had",
            "do", "does", "did", "can", "could", "should", "would", "may", "might",
            "shall", "will", "a", "an", "the", "and", "or", "but", "if", "then",
            "else", "so", "than", "to", "of", "in", "for", "on", "with", "at",
            "by", "from", "up", "about", "into", "over", "after", "my", "our",
            "your", "their", "his", "her", "its", "me", "us", "you", "them",
            "i", "we", "he", "she", "it", "they", "this", "that", "these", "those",
            "tell", "show", "give", "list", "get", "find", "summarize", "analyze",
            "help", "know", "see", "look", "check", "explain", "describe", "update",
            "leads", "lead", "deal", "deals", "opportunity", "opportunities",
            "activities", "activity", "sales", "crm", "pipeline", "today", "week",
            "status", "score", "scores", "risk", "next", "steps", "contact",
        }
        tokens = re.findall(r"[a-zA-Z0-9_-]+", query)
        filtered = [t for t in tokens if t.lower() not in stopwords and len(t) > 2]
        if filtered:
            # Return first 2 relevant keywords joined
            return " ".join(filtered[:2])
        return None

    def _detect_intent(self, query: str) -> set[str]:
        """Detects what CRM entities are relevant to the user's question."""
        q = query.lower()
        intents = set()

        # Lead indicators
        if any(w in q for w in ["lead", "prospect", "contact", "score", "reach out", "qualified", "new"]):
            intents.add("leads")

        # Opportunity / Deal indicators
        if any(w in q for w in ["deal", "opportunity", "opp", "pipeline", "revenue", "stage", "won", "lost", "negotiation", "proposal", "risk", "close date", "value"]):
            intents.add("opportunities")

        # Activity / Timeline indicators
        if any(w in q for w in ["activity", "activities", "call", "email", "meeting", "note", "touchpoint", "history", "recent", "happened", "yesterday", "week"]):
            intents.add("activities")

        # Overview / General question
        if not intents or any(w in q for w in ["summary", "overview", "everything", "status", "what should i do", "pipeline", "dashboard", "help me"]):
            intents.add("leads")
            intents.add("opportunities")
            intents.add("activities")

        return intents

    async def build_crm_context(
        self,
        query: str,
        current_user: User,
        ws_ctx: WorkspaceContext | None = None,
        *,
        lead_id: uuid.UUID | None = None,
        opportunity_id: uuid.UUID | None = None,
    ) -> str:
        """
        Builds a compact, authorized CRM context string to inject into the AI prompt.
        """
        search_keyword = self._extract_search_keywords(query)
        intents = self._detect_intent(query)
        lines: list[str] = []

        # Context Header
        if ws_ctx and not ws_ctx.is_personal and ws_ctx.workspace_id:
            role_desc = "Manager" if ws_ctx.is_manager else "Team Member"
            lines.append(f"[CONTEXT: Active Workspace | Role: {role_desc}]")
        else:
            lines.append("[CONTEXT: Personal Area]")

        has_data = False

        # ------------------------------------------------------------------
        # 1. SPECIFIC ENTITY LOOKUPS (If lead_id / opportunity_id provided)
        # ------------------------------------------------------------------
        if lead_id:
            try:
                lead = await self.lead_service.get_lead(lead_id, current_user, ws_ctx=ws_ctx)
                if lead:
                    val_str = f"${lead.deal_value:,.0f}" if lead.deal_value else "N/A"
                    status_str = lead.lead_status.value if lead.lead_status else "New"
                    lines.append(
                        f"TARGET LEAD: {lead.company_name} (Contact: {lead.contact_name or 'N/A'}, Email: {lead.email or 'N/A'}) | Status: {status_str} | Value: {val_str}"
                    )
                    has_data = True
            except Exception:
                pass

        if opportunity_id:
            try:
                opp = await self.opportunity_service.get_opportunity(opportunity_id, current_user, ws_ctx=ws_ctx)
                if opp:
                    amt_str = f"${opp.amount:,.0f}" if opp.amount else "N/A"
                    prob_str = f"{opp.probability}%" if opp.probability is not None else "N/A"
                    lines.append(
                        f"TARGET OPPORTUNITY: {opp.name} | Stage: {opp.stage.value} | Amount: {amt_str} | Probability: {prob_str}"
                    )
                    has_data = True
            except Exception:
                pass

        # ------------------------------------------------------------------
        # 2. RELEVANT LEADS (Max 5)
        # ------------------------------------------------------------------
        if "leads" in intents or search_keyword:
            try:
                leads, total_leads = await self.lead_service.list_leads(
                    current_user,
                    ws_ctx=ws_ctx,
                    limit=5,
                    search=search_keyword,
                )
                # If specific keyword search yielded no leads, fallback to top leads
                if not leads and search_keyword:
                    leads, total_leads = await self.lead_service.list_leads(
                        current_user,
                        ws_ctx=ws_ctx,
                        limit=5,
                    )

                if leads:
                    has_data = True
                    lines.append(f"\nLEADS (Showing {len(leads)} of {total_leads} total):")
                    for l in leads:
                        val_str = f"${l.deal_value:,.0f}" if l.deal_value else "N/A"
                        status_str = l.lead_status.value if l.lead_status else "New"
                        contact_str = f", Contact: {l.contact_name}" if l.contact_name else ""
                        industry_str = f", Industry: {l.industry}" if l.industry else ""
                        lines.append(
                            f"- {l.company_name}{contact_str}{industry_str} | Status: {status_str} | Value: {val_str}"
                        )
            except Exception:
                pass

        # ------------------------------------------------------------------
        # 3. RELEVANT OPPORTUNITIES (Max 3)
        # ------------------------------------------------------------------
        if "opportunities" in intents or search_keyword:
            try:
                opps, total_opps = await self.opportunity_service.list_opportunities(
                    current_user,
                    ws_ctx=ws_ctx,
                    limit=3,
                    search=search_keyword,
                )
                if not opps and search_keyword:
                    opps, total_opps = await self.opportunity_service.list_opportunities(
                        current_user,
                        ws_ctx=ws_ctx,
                        limit=3,
                    )

                if opps:
                    has_data = True
                    lines.append(f"\nOPPORTUNITIES / DEALS (Showing {len(opps)} of {total_opps} total):")
                    for o in opps:
                        amt_str = f"${o.amount:,.0f}" if o.amount else "N/A"
                        prob_str = f"{o.probability}%" if o.probability is not None else "N/A"
                        close_str = f", Close: {o.expected_close_date.strftime('%Y-%m-%d')}" if o.expected_close_date else ""
                        lines.append(
                            f"- {o.name} | Stage: {o.stage.value} | Value: {amt_str} | Probability: {prob_str}{close_str}"
                        )
            except Exception:
                pass

        # ------------------------------------------------------------------
        # 4. RECENT ACTIVITIES (Max 5)
        # ------------------------------------------------------------------
        if "activities" in intents or search_keyword or lead_id or opportunity_id:
            try:
                activities = await self.activity_service.get_timeline(
                    current_user,
                    ws_ctx=ws_ctx,
                    lead_id=lead_id,
                    opportunity_id=opportunity_id,
                    limit=5,
                )
                if activities:
                    has_data = True
                    lines.append(f"\nRECENT ACTIVITIES (Last {len(activities)}):")
                    for a in activities:
                        date_str = a.interaction_date.strftime("%b %d") if a.interaction_date else "Recent"
                        summary_str = (a.summary[:100] + "…") if a.summary and len(a.summary) > 100 else (a.summary or "No summary")
                        type_str = a.interaction_type.value.upper() if a.interaction_type else "LOG"
                        lines.append(f"- [{date_str} {type_str}] {summary_str}")
            except Exception:
                pass

        if not has_data:
            lines.append("\n[NO CRM RECORDS FOUND IN ACTIVE CONTEXT]")

        context_str = "\n".join(lines).strip()

        # Hard character cap protection
        if len(context_str) > MAX_CONTEXT_CHARS:
            context_str = context_str[:MAX_CONTEXT_CHARS] + "\n...(truncated for brevity)"

        return context_str
