import {
  Activity,
  BarChart3,
  Building2,
  LayoutDashboard,
  Mail,
  Settings,
  Users,
} from '@/components/ui/icons'

export const primaryNavigation = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard' },
  { label: 'Leads', icon: Users, to: '/leads' },
  { label: 'Companies', icon: Building2, to: '/companies' },
  { label: 'Lead Intelligence', icon: Activity, to: '/lead-intelligence' },
  { label: 'AI Assistant', icon: Activity, to: '/ai-assistant' },
  { label: 'Outreach Generator', icon: Mail, to: '/outreach-generator' },
  { label: 'Conversation Summary', icon: Mail, to: '/conversation-summary' },
  { label: 'Analytics', icon: BarChart3, to: '/analytics' },
]

export const secondaryNavigation = [
  { label: 'Settings', icon: Settings, to: '/settings' },
]
