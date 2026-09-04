"""
Clean mock, test, and duplicated data from the SalesGenie database.
Preserves all real user accounts and real workspace data.
"""

import asyncio
import logging
from sqlalchemy import delete, func, select, text
from app.db.session import AsyncSessionLocal
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMembership, WorkspaceInvitation
from app.models.lead import Lead
from app.models.opportunity import Opportunity
from app.models.contact import Contact
from app.models.account import Account
from app.models.task import Task
from app.models.sales_interaction import SalesInteraction
from app.models.notification import Notification

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("clean_db")


async def clean_database():
    async with AsyncSessionLocal() as session:
        logger.info("Starting database cleanup of mock, test, and duplicated data...")

        # 1. Identify all test users (any email ending with @example.com or with 'test@salesgenie.ai')
        test_user_res = await session.execute(
            select(User.id, User.email).where(
                User.email.like("%@example.com") | (User.email == "test@salesgenie.ai")
            )
        )
        test_users = test_user_res.fetchall()
        test_user_ids = [u[0] for u in test_users]
        logger.info("Found %d test users to purge.", len(test_user_ids))

        # 2. Identify test workspaces
        # Workspaces created by test users or matching test naming patterns
        test_ws_res = await session.execute(
            select(Workspace.id, Workspace.name).where(
                Workspace.owner_id.in_(test_user_ids)
                | Workspace.name.in_([
                    "Notification Test Workspace",
                    "CRM Automation Workspace",
                    "Workspace Alpha",
                    "Workspace A",
                    "Workspace B",
                    "Alpha Sales HQ",
                    "Alpha Sales Team",
                    "Pipeline WS",
                    "Resilience WS",
                    "Sales Titans Workspace",
                    "SalesGenie Alpha Corp",
                ])
            )
        )
        test_workspaces = test_ws_res.fetchall()
        test_ws_ids = [w[0] for w in test_workspaces]
        logger.info("Found %d test workspaces to purge.", len(test_ws_ids))

        # 3. Identify mock/test leads
        # Leads owned by test users, in test workspaces, or known test emails / company names
        test_leads_res = await session.execute(
            select(Lead.id).where(
                Lead.owner_id.in_(test_user_ids)
                | Lead.workspace_id.in_(test_ws_ids)
                | Lead.email.in_([
                    "bob@beta.com",
                    "alice@alpha.com",
                    "alice@megacorp.com",
                    "vance@alphadefense.com",
                    "john@abccorp.com",
                    "stella@starlight.io",
                    "alice@acme.com",
                    "nate@nexus.com",
                    "gary@gamma.com",
                    "carol@gamma.com",
                ])
                | Lead.company_name.in_([
                    "Personal Project X",
                    "Alpha Corp",
                    "Beta Inc",
                    "Gamma Tech",
                    "MegaCorp",
                    "Alpha Defense",
                    "Starlight Industries",
                    "ABC Corporation",
                    "Nexus Corp",
                    "Acme Corp",
                    "Beta Prospect Corp",
                    "Robust Tech",
                    "Target Co",
                    "Personal A Solo",
                    "Lead B2 Enterprise",
                    "Lead B1 Enterprise",
                    "Lead A2 Corp",
                    "Lead A1 Corp",
                ])
            )
        )
        test_lead_ids = [l[0] for l in test_leads_res.fetchall()]
        logger.info("Found %d test leads to purge.", len(test_lead_ids))

        # 4. Identify mock/test opportunities
        test_opps_res = await session.execute(
            select(Opportunity.id).where(
                Opportunity.owner_id.in_(test_user_ids)
                | Opportunity.workspace_id.in_(test_ws_ids)
                | Opportunity.lead_id.in_(test_lead_ids)
                | Opportunity.name.in_([
                    "Big Enterprise Deal",
                    "Enterprise Deal Alpha",
                    "Alpha Stalled Deal",
                    "Beta Enterprise Deal",
                    "Beta Global Contract",
                    "Alpha Expansion Deal",
                    "Live Test Corp - Core Platform",
                    "Personal Deal 1",
                    "Personal Deal 2",
                    "Personal Deal A",
                    "Alpha Deal 1",
                    "Alpha Deal 2",
                    "Beta Deal 1",
                    "Beta Deal 2",
                ])
            )
        )
        test_opp_ids = [o[0] for o in test_opps_res.fetchall()]
        logger.info("Found %d test opportunities to purge.", len(test_opp_ids))

        # 5. Identify test accounts & contacts
        test_accs_res = await session.execute(
            select(Account.id).where(
                Account.owner_id.in_(test_user_ids)
                | Account.workspace_id.in_(test_ws_ids)
                | Account.name.in_([
                    "MegaCorp",
                    "Alpha Defense",
                    "Starlight Industries",
                    "Alpha Corp",
                    "Beta Inc",
                    "Gamma Tech",
                    "Acme Corp",
                    "Nexus Corp",
                ])
            )
        )
        test_acc_ids = [a[0] for a in test_accs_res.fetchall()]

        test_cons_res = await session.execute(
            select(Contact.id).where(
                Contact.owner_id.in_(test_user_ids)
                | Contact.workspace_id.in_(test_ws_ids)
                | Contact.account_id.in_(test_acc_ids)
                | Contact.email.in_([
                    "bob@beta.com",
                    "alice@alpha.com",
                    "alice@megacorp.com",
                    "vance@alphadefense.com",
                    "stella@starlight.io",
                    "john@abccorp.com",
                    "nate@nexus.com",
                ])
            )
        )
        test_con_ids = [c[0] for c in test_cons_res.fetchall()]

        # -------------------------------------------------------------
        # CASCADE DELETIONS (Foreign key safe order)
        # -------------------------------------------------------------
        # Delete notifications
        del_notifs = await session.execute(
            delete(Notification).where(
                Notification.user_id.in_(test_user_ids)
                | Notification.workspace_id.in_(test_ws_ids)
                | Notification.entity_id.in_(test_lead_ids + test_opp_ids)
            )
        )
        logger.info("Deleted %d test notifications.", del_notifs.rowcount)

        # Delete tasks
        del_tasks = await session.execute(
            delete(Task).where(
                Task.assigned_to.in_(test_user_ids)
                | Task.created_by.in_(test_user_ids)
                | Task.workspace_id.in_(test_ws_ids)
                | Task.lead_id.in_(test_lead_ids)
                | Task.opportunity_id.in_(test_opp_ids)
                | Task.account_id.in_(test_acc_ids)
                | Task.contact_id.in_(test_con_ids)
            )
        )
        logger.info("Deleted %d test tasks.", del_tasks.rowcount)

        # Delete interactions
        del_acts = await session.execute(
            delete(SalesInteraction).where(
                SalesInteraction.user_id.in_(test_user_ids)
                | SalesInteraction.workspace_id.in_(test_ws_ids)
                | SalesInteraction.lead_id.in_(test_lead_ids)
                | SalesInteraction.opportunity_id.in_(test_opp_ids)
                | SalesInteraction.account_id.in_(test_acc_ids)
                | SalesInteraction.contact_id.in_(test_con_ids)
            )
        )
        logger.info("Deleted %d test sales interactions.", del_acts.rowcount)

        # Delete opportunities
        del_opps = await session.execute(
            delete(Opportunity).where(Opportunity.id.in_(test_opp_ids))
        )
        logger.info("Deleted %d test opportunities.", del_opps.rowcount)

        # Delete contacts
        del_cons = await session.execute(
            delete(Contact).where(Contact.id.in_(test_con_ids))
        )
        logger.info("Deleted %d test contacts.", del_cons.rowcount)

        # Delete accounts
        del_accs = await session.execute(
            delete(Account).where(Account.id.in_(test_acc_ids))
        )
        logger.info("Deleted %d test accounts.", del_accs.rowcount)

        # Delete leads
        del_leads = await session.execute(
            delete(Lead).where(Lead.id.in_(test_lead_ids))
        )
        logger.info("Deleted %d test leads.", del_leads.rowcount)

        # Delete workspace memberships and invitations
        del_invites = await session.execute(
            delete(WorkspaceInvitation).where(
                WorkspaceInvitation.workspace_id.in_(test_ws_ids)
                | WorkspaceInvitation.email.like("%@example.com")
            )
        )
        logger.info("Deleted %d test workspace invitations.", del_invites.rowcount)

        del_members = await session.execute(
            delete(WorkspaceMembership).where(
                WorkspaceMembership.workspace_id.in_(test_ws_ids)
                | WorkspaceMembership.user_id.in_(test_user_ids)
            )
        )
        logger.info("Deleted %d test workspace memberships.", del_members.rowcount)

        # Delete workspaces
        del_ws = await session.execute(
            delete(Workspace).where(Workspace.id.in_(test_ws_ids))
        )
        logger.info("Deleted %d test workspaces.", del_ws.rowcount)

        # Delete test users
        del_users = await session.execute(
            delete(User).where(User.id.in_(test_user_ids))
        )
        logger.info("Deleted %d test users.", del_users.rowcount)

        # -------------------------------------------------------------
        # Deduplicate real user opportunities: e.g. "testone - Initial Deal"
        # -------------------------------------------------------------
        dup_opps_q = (
            select(Opportunity.name, Opportunity.workspace_id, Opportunity.owner_id, func.count(Opportunity.id))
            .group_by(Opportunity.name, Opportunity.workspace_id, Opportunity.owner_id)
            .having(func.count(Opportunity.id) > 1)
        )
        dup_opps = (await session.execute(dup_opps_q)).fetchall()
        for name, ws_id, owner_id, count in dup_opps:
            logger.info("Found duplicate opportunity: '%s' (count=%d)", name, count)
            # Fetch all copies ordered by created_at asc
            q = (
                select(Opportunity.id)
                .where(
                    Opportunity.name == name,
                    Opportunity.workspace_id == ws_id,
                    Opportunity.owner_id == owner_id,
                )
                .order_by(Opportunity.created_at.asc())
            )
            opp_ids = (await session.execute(q)).scalars().all()
            # Keep the first, delete the duplicates
            to_delete = opp_ids[1:]
            if to_delete:
                await session.execute(delete(Opportunity).where(Opportunity.id.in_(to_delete)))
                logger.info("Removed %d duplicate copies of opportunity '%s'", len(to_delete), name)

        await session.commit()
        logger.info("Database cleanup completed successfully!")


if __name__ == "__main__":
    asyncio.run(clean_database())
