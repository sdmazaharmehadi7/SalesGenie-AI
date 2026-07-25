import { createBrowserRouter, Navigate } from 'react-router-dom'

import Layout from '@/components/layout/Layout'
import AiAssistantPage from '@/pages/ai-assistant/AiAssistantPage'
import AnalyticsPage from '@/pages/analytics/AnalyticsPage'
import CompaniesPage from '@/pages/companies/CompaniesPage'
import ConversationSummaryPage from '@/pages/conversations/ConversationSummaryPage'
import LeadIntelligencePage from '@/pages/intelligence/LeadIntelligencePage'
import LeadsPage from '@/pages/leads/LeadsPage'
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
    element: <Layout />,
    children: [
      { index: true, element: <Navigate replace to="/dashboard" /> },
      {
        path: '/dashboard',
        lazy: async () => {
          const { default: Component } = await import('@/pages/dashboard/DashboardPage')
          return { Component }
        },
      },
      { path: '/leads', element: <LeadsPage /> },
      { path: '/companies', element: <CompaniesPage /> },
      { path: '/lead-intelligence', element: <LeadIntelligencePage /> },
      { path: '/ai-assistant', element: <AiAssistantPage /> },
      { path: '/outreach-generator', element: <OutreachGeneratorPage /> },
      { path: '/conversation-summary', element: <ConversationSummaryPage /> },
      { path: '/analytics', element: <AnalyticsPage /> },
      { path: '/settings', element: <SettingsPage /> },
      { path: '/profile', element: <ProfilePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
