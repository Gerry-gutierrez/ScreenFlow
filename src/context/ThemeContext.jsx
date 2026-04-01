import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  const [darkMode, setDarkMode] = useState(false)
  const [userId, setUserId] = useState(null)
  const [dbSupported, setDbSupported] = useState(true)

  // Listen for auth state changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id)
        loadThemeFromDb(session.user.id)
      } else {
        setUserId(null)
        setDarkMode(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUserId(session.user.id)
        loadThemeFromDb(session.user.id)
      } else {
        // User logged out — revert to light mode
        setUserId(null)
        setDarkMode(false)
        localStorage.removeItem('screenflow-dark-mode')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const loadThemeFromDb = async (uid) => {
    const { data, error } = await supabase
      .from('operator_profile')
      .select('dark_mode')
      .eq('user_id', uid)
      .single()

    if (error && error.message?.includes('dark_mode')) {
      // Column doesn't exist yet — fall back to localStorage
      setDbSupported(false)
      const saved = localStorage.getItem('screenflow-dark-mode')
      setDarkMode(saved === 'true')
      return
    }

    const pref = data?.dark_mode === true
    setDarkMode(pref)
    localStorage.setItem('screenflow-dark-mode', String(pref))
  }

  // Apply dark class to HTML element
  useEffect(() => {
    const root = document.documentElement
    if (darkMode) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [darkMode])

  const toggleDarkMode = useCallback(async () => {
    const newValue = !darkMode
    setDarkMode(newValue)
    localStorage.setItem('screenflow-dark-mode', String(newValue))

    // Persist to database if logged in and column exists
    if (userId && dbSupported) {
      await supabase
        .from('operator_profile')
        .update({ dark_mode: newValue })
        .eq('user_id', userId)
    }
  }, [darkMode, userId, dbSupported])

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within a ThemeProvider')
  return context
}
