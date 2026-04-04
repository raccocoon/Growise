import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { api } from '@/lib/api'

export interface FarmProfile {
  id: string
  region_id: string
  region_name: string
  lat: number
  lng: number
  land_size: number
  land_size_unit: string
  water_source: string
  experience_level: string
  soil_type: string
  is_default: boolean
}

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  isReady: boolean
  token: string | null
  activeProfile: FarmProfile | null
  setActiveProfile: (p: FarmProfile | null) => void
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string, location: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

async function fetchActiveProfile(): Promise<FarmProfile | null> {
  try {
    const res = await api.get('/api/profile/farms')
    const farms: FarmProfile[] = res.data || []
    return farms.find((f) => f.is_default) ?? farms[0] ?? null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [isReady, setIsReady] = useState(false)
  const [activeProfile, setActiveProfile] = useState<FarmProfile | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        const profile = await fetchActiveProfile()
        setActiveProfile(profile)
      }
      setLoading(false)
      setIsReady(true)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        const profile = await fetchActiveProfile()
        setActiveProfile(profile)
      } else {
        setActiveProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function login(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    const profile = await fetchActiveProfile()
    setActiveProfile(profile)
  }

  async function register(
    email: string,
    password: string,
    name: string,
    location: string
  ) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, location } },
    })
    if (error) throw error
  }

  async function logout() {
    await supabase.auth.signOut()
    setActiveProfile(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isReady,
        token: session?.access_token ?? null,
        activeProfile,
        setActiveProfile,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
