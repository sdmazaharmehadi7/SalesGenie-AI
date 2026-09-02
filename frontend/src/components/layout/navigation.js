import {
  Activity,
  BarChart3,
  Briefcase,
  Building2,
  LayoutDashboard,
  ListTodo,
  Mail,
  Settings,
  Sparkles,
  TrendingUp,
  User,
  Users,
} from '@/components/ui/icons'

export const primaryNavigation = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard' },
  { label: 'CRM Overview', icon: Sparkles, to: '/crm' },
  { label: 'Pipeline', icon: TrendingUp, to: '/pipeline' },
  { label: 'Opportunities', icon: Briefcase, to: '/opportunities' },
  { label: 'Accounts', icon: Building2, to: '/accounts' },
  { label: 'Contacts', icon: User, to: '/contacts' },
  { label: 'Tasks', icon: ListTodo, to: '/tasks' },
  { label: 'Leads', icon: Users, to: '/leads' },
  { label: 'Lead Intelligence', icon: Activity, to: '/lead-intelligence' },
  { label: 'AI Assistant', icon: Activity, to: '/ai-assistant' },
  { label: 'Outreach Generator', icon: Mail, to: '/outreach-generator' },
  { label: 'Conversation Summary', icon: Mail, to: '/conversation-summary' },
  { label: 'Analytics', icon: BarChart3, to: '/analytics' },
]

export const managerNavigation = [
  { label: 'Team Tracking', icon: Activity, to: '/manage/team', badge: 'Manager' },
  { label: 'Team Management', icon: Users, to: '/settings/workspace', badge: 'Manager' },
  { label: 'Workspace Management', icon: Building2, to: '/settings/general', badge: 'Manager' },
]

// Visible to ALL workspace members (non-personal), both Team Members and Managers
export const workspaceNavigation = [
  { label: 'Workspace & Team', icon: Building2, to: '/workspace/team' },
]

export const secondaryNavigation = [
  { label: 'Settings', icon: Settings, to: '/settings' },
]
