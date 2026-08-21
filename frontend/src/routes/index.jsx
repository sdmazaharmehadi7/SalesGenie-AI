import { createBrowserRouter, Navigate } from 'react-router-dom'

import Layout from '@/components/layout/Layout'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import AiAssistantPage from '@/pages/ai-assistant/AiAssistantPage'
import AnalyticsPage from '@/pages/analytics/AnalyticsPage'
import CompaniesPage from '@/pages/companies/CompaniesPage'
import ConversationSummaryPage from '@/pages/conversations/ConversationSummaryPage'
import LeadIntelligencePage from '@/pages/intelligence/LeadIntelligencePage'
import LeadsPage from '@/pages/leads/LeadsPage'
import LeadDetailPage from '@/pages/leads/LeadDetailPage'
import CRMDashboardPage from '@/pages/crm/CRMDashboardPage'
import PipelinePage from '@/pages/pipeline/PipelinePage'
import OpportunitiesPage from '@/pages/opportunities/OpportunitiesPage'
import OpportunityDetailPage from '@/pages/opportunities/OpportunityDetailPage'
import AccountsPage from '@/pages/accounts/AccountsPage'
import AccountDetailPage from '@/pages/accounts/AccountDetailPage'
import ContactsPage from '@/pages/contacts/ContactsPage'
import ContactDetailPage from '@/pages/contacts/ContactDetailPage'
import TasksPage from '@/pages/tasks/TasksPage'
import LoginPage from '@/pages/auth/LoginPage'
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage'
import NotFoundPage from '@/pages/NotFoundPage'
import OutreachGeneratorPage from '@/pages/outreach/OutreachGeneratorPage'
import ProfilePage from '@/pages/profile/ProfilePage'
import SettingsPage from '@/pages/settings/SettingsPage'
import SignupPage from '@/pages/auth/SignupPage'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/signup',
    element: <SignupPage />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPasswordPage />,
  },
  {
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate replace to="/crm" /> },
      {
        path: '/dashboard',
        lazy: async () => {
          const { default: Component } = await import('@/pages/dashboard/DashboardPage')
          return { Component }
        },
      },
      { path: '/crm', element: <CRMDashboardPage /> },
      { path: '/pipeline', element: <PipelinePage /> },
      { path: '/opportunities', element: <OpportunitiesPage /> },
      { path: '/opportunities/:id', element: <OpportunityDetailPage /> },
      { path: '/accounts', element: <AccountsPage /> },
      { path: '/accounts/:id', element: <AccountDetailPage /> },
      { path: '/contacts', element: <ContactsPage /> },
      { path: '/contacts/:id', element: <ContactDetailPage /> },
      { path: '/tasks', element: <TasksPage /> },
      { path: '/leads', element: <LeadsPage /> },
      { path: '/leads/:id', element: <LeadDetailPage /> },
      { path: '/companies', element: <CompaniesPage /> },
      { path: '/lead-intelligence', element: <LeadIntelligencePage /> },
      { path: '/ai-assistant', element: <AiAssistantPage /> },
      { path: '/outreach-generator', element: <OutreachGeneratorPage /> },
      { path: '/conversation-summary', element: <ConversationSummaryPage /> },
      { path: '/analytics', element: <AnalyticsPage /> },
      { path: '/settings', element: <SettingsPage /> },
      { path: '/settings/:section', element: <SettingsPage /> },
      { path: '/profile', element: <ProfilePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])

