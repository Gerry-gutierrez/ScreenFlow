import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        // Check if this is a new browser session and keep-signed-in is off
        const keepSignedIn = localStorage.getItem('screenflow-keep-signed-in')
        const sessionMarker = sessionStorage.getItem('screenflow-session-active')

        if (keepSignedIn === 'false' && !sessionMarker) {
          // New browser session + keep-signed-in is off → sign out
          supabase.auth.signOut().then(() => {
            setUser(null)
            setLoading(false)
          })
          return
        }

        // Mark this browser session as active
        sessionStorage.setItem('screenflow-session-active', 'true')
        setUser(session.user)
      }
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        sessionStorage.setItem('screenflow-session-active', 'true')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email, password, businessName, phone = '') => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error

    // Create operator profile
    if (data.user) {
      const { error: profileError } = await supabase
        .from('operator_profile')
        .insert({
          user_id: data.user.id,
          business_name: businessName,
          email: email,
          phone: phone,
        })
      if (profileError) console.error('Profile creation error:', profileError)
    }

    // New signups default to keep-signed-in off
    localStorage.setItem('screenflow-keep-signed-in', 'false')
    sessionStorage.setItem('screenflow-session-active', 'true')

    return data
  }

  const signIn = async (email, password, keepSignedIn = false) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error

    localStorage.setItem('screenflow-keep-signed-in', keepSignedIn ? 'true' : 'false')
    sessionStorage.setItem('screenflow-session-active', 'true')

    return data
  }

  const signOut = async () => {
    localStorage.removeItem('screenflow-keep-signed-in')
    sessionStorage.removeItem('screenflow-session-active')
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const setKeepSignedIn = (value) => {
    localStorage.setItem('screenflow-keep-signed-in', value ? 'true' : 'false')
  }

  const getKeepSignedIn = () => {
    return localStorage.getItem('screenflow-keep-signed-in') === 'true'
  }

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut, setKeepSignedIn, getKeepSignedIn }}>
      {children}
    </AuthContext.Provider>
  )
}
