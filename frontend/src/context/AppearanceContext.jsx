/**
 * AppearanceContext.jsx
 *
 * Single source of truth for all Appearance settings:
 *   - theme: 'light' | 'dark' | 'auto'
 *   - accent: 'blue' | 'purple' | 'green' | 'red' | 'orange' | 'gray'
 *   - density: 'compact' | 'comfortable' | 'spacious'
 *   - sidebarCollapsed: boolean
 *   - animations: boolean
 *
 * Settings are persisted in localStorage under 'sg_appearance'.
 * The context applies all settings to the <html> element immediately.
 */

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

const STORAGE_KEY = 'sg_appearance'

const DEFAULTS = {
  theme: 'light',
  accent: 'blue',
  density: 'comfortable',
  sidebarCollapsed: false,
  animations: true,
}

// CSS variable palettes for each accent color (Light theme)
const LIGHT_ACCENT_PALETTES = {
  blue: {
    '--accent-50':  '#eef4ff',
    '--accent-100': '#d9e6ff',
    '--accent-200': '#bcd4ff',
    '--accent-300': '#8eb8ff',
    '--accent-400': '#5c91f6',
    '--accent-500': '#3b6eea',
    '--accent-600': '#2f56c9',
    '--accent-700': '#2947a3',
  },
  purple: {
    '--accent-50':  '#f5f3ff',
    '--accent-100': '#ede9fe',
    '--accent-200': '#ddd6fe',
    '--accent-300': '#c4b5fd',
    '--accent-400': '#a78bfa',
    '--accent-500': '#8b5cf6',
    '--accent-600': '#7c3aed',
    '--accent-700': '#6d28d9',
  },
  green: {
    '--accent-50':  '#f0fdf4',
    '--accent-100': '#dcfce7',
    '--accent-200': '#bbf7d0',
    '--accent-300': '#86efac',
    '--accent-400': '#4ade80',
    '--accent-500': '#22c55e',
    '--accent-600': '#16a34a',
    '--accent-700': '#15803d',
  },
  red: {
    '--accent-50':  '#fff1f2',
    '--accent-100': '#ffe4e6',
    '--accent-200': '#fecdd3',
    '--accent-300': '#fda4af',
    '--accent-400': '#fb7185',
    '--accent-500': '#f43f5e',
    '--accent-600': '#e11d48',
    '--accent-700': '#be123c',
  },
  orange: {
    '--accent-50':  '#fff7ed',
    '--accent-100': '#ffedd5',
    '--accent-200': '#fed7aa',
    '--accent-300': '#fdba74',
    '--accent-400': '#fb923c',
    '--accent-500': '#f97316',
    '--accent-600': '#ea580c',
    '--accent-700': '#c2410c',
  },
  gray: {
    '--accent-50':  '#f8fafc',
    '--accent-100': '#f1f5f9',
    '--accent-200': '#e2e8f0',
    '--accent-300': '#cbd5e1',
    '--accent-400': '#94a3b8',
    '--accent-500': '#64748b',
    '--accent-600': '#475569',
    '--accent-700': '#334155',
  },
}

// CSS variable palettes for each accent color (Dark editorial theme)
const DARK_ACCENT_PALETTES = {
  blue: {
    '--accent-50':  'rgba(59, 110, 234, 0.12)',
    '--accent-100': 'rgba(59, 110, 234, 0.20)',
    '--accent-200': 'rgba(59, 110, 234, 0.32)',
    '--accent-300': '#5c91f6',
    '--accent-400': '#4b7bf5',
    '--accent-500': '#3b6eea',
    '--accent-600': '#3b6eea',
    '--accent-700': '#7da6ff',
  },
  purple: {
    '--accent-50':  'rgba(124, 58, 237, 0.12)',
    '--accent-100': 'rgba(124, 58, 237, 0.20)',
    '--accent-200': 'rgba(124, 58, 237, 0.32)',
    '--accent-300': '#a78bfa',
    '--accent-400': '#9065f8',
    '--accent-500': '#7c3aed',
    '--accent-600': '#7c3aed',
    '--accent-700': '#c4b5fd',
  },
  green: {
    '--accent-50':  'rgba(22, 163, 74, 0.12)',
    '--accent-100': 'rgba(22, 163, 74, 0.20)',
    '--accent-200': 'rgba(22, 163, 74, 0.32)',
    '--accent-300': '#4ade80',
    '--accent-400': '#22c55e',
    '--accent-500': '#16a34a',
    '--accent-600': '#16a34a',
    '--accent-700': '#86efac',
  },
  red: {
    '--accent-50':  'rgba(225, 29, 72, 0.12)',
    '--accent-100': 'rgba(225, 29, 72, 0.20)',
    '--accent-200': 'rgba(225, 29, 72, 0.32)',
    '--accent-300': '#fb7185',
    '--accent-400': '#f43f5e',
    '--accent-500': '#e11d48',
    '--accent-600': '#e11d48',
    '--accent-700': '#fda4af',
  },
  orange: {
    '--accent-50':  'rgba(234, 88, 12, 0.12)',
    '--accent-100': 'rgba(234, 88, 12, 0.20)',
    '--accent-200': 'rgba(234, 88, 12, 0.32)',
    '--accent-300': '#fb923c',
    '--accent-400': '#f97316',
    '--accent-500': '#ea580c',
    '--accent-600': '#ea580c',
    '--accent-700': '#fdba74',
  },
  gray: {
    '--accent-50':  'rgba(148, 163, 184, 0.10)',
    '--accent-100': 'rgba(148, 163, 184, 0.18)',
    '--accent-200': 'rgba(148, 163, 184, 0.28)',
    '--accent-300': '#94a3b8',
    '--accent-400': '#64748b',
    '--accent-500': '#475569',
    '--accent-600': '#475569',
    '--accent-700': '#cbd5e1',
  },
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS
  } catch {
    return DEFAULTS
  }
}

function saveSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch { /* ignore */ }
}

/** Apply all appearance settings to the <html> element. */
function applyToDOM(settings) {
  const root = document.documentElement

  // ── Theme ──────────────────────────────────────────────────────────────────
  const resolvedTheme = settings.theme === 'auto'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : settings.theme

  const isDark = resolvedTheme === 'dark'
  root.classList.toggle('dark', isDark)

  // ── Accent CSS variables ───────────────────────────────────────────────────
  const sourcePalettes = isDark ? DARK_ACCENT_PALETTES : LIGHT_ACCENT_PALETTES
  const palette = sourcePalettes[settings.accent] || sourcePalettes.blue
  Object.entries(palette).forEach(([key, val]) => root.style.setProperty(key, val))

  // ── Density ────────────────────────────────────────────────────────────────
  root.setAttribute('data-density', settings.density)

  // ── Animations ────────────────────────────────────────────────────────────
  root.setAttribute('data-animations', String(settings.animations))
}

const AppearanceContext = createContext(null)

export function AppearanceProvider({ children }) {
  const [saved, setSaved] = useState(loadSettings)
  // pending = in-flight changes not yet persisted
  const [pending, setPending] = useState(null)

  const current = pending ?? saved
  const hasUnsaved = pending !== null

  // Apply to DOM whenever current settings change
  useEffect(() => {
    applyToDOM(current)
  }, [current])

  // Listen for system theme changes when 'auto' is selected
  useEffect(() => {
    if (current.theme !== 'auto') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyToDOM(current)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [current]) // eslint-disable-line react-hooks/exhaustive-deps

  /** Stage a single setting change (won't persist until saveAll). */
  const change = useCallback((key) => (value) => {
    setPending((prev) => ({ ...(prev ?? saved), [key]: value }))
  }, [saved])

  /** Persist all staged changes to localStorage. */
  const saveAll = useCallback(() => {
    if (!pending) return
    setSaved(pending)
    saveSettings(pending)
    setPending(null)
  }, [pending])

  /** Discard staged changes, restore last saved state. */
  const discard = useCallback(() => {
    setPending(null)
    applyToDOM(saved)
  }, [saved])

  /**
   * Toggle sidebar collapsed — this one bypasses the Save/Discard flow
   * because it's triggered from the sidebar's own collapse button, not Settings.
   */
  const toggleSidebar = useCallback(() => {
    const next = !current.sidebarCollapsed
    const nextSettings = { ...saved, sidebarCollapsed: next }
    setSaved(nextSettings)
    saveSettings(nextSettings)
    if (pending) {
      setPending((p) => ({ ...p, sidebarCollapsed: next }))
    }
  }, [current.sidebarCollapsed, saved, pending])

  const value = {
    // Current effective values (staged or saved)
    theme: current.theme,
    accent: current.accent,
    density: current.density,
    sidebarCollapsed: current.sidebarCollapsed,
    animations: current.animations,
    // State
    hasUnsaved,
    // Actions
    change,
    saveAll,
    discard,
    toggleSidebar,
  }

  return (
    <AppearanceContext.Provider value={value}>
      {children}
    </AppearanceContext.Provider>
  )
}

export function useAppearance() {
  const ctx = useContext(AppearanceContext)
  if (!ctx) throw new Error('useAppearance must be used within AppearanceProvider')
  return ctx
}
