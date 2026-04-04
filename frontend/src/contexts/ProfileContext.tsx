import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

export type { FarmProfile } from '@/contexts/AuthContext'

export interface Region {
  id: string
  name: string
}

interface ProfileContextType {
  farms: import('@/contexts/AuthContext').FarmProfile[]
  regions: Region[]
  loading: boolean
  refreshFarms: () => Promise<void>
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined)

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [farms, setFarms] = useState<import('@/contexts/AuthContext').FarmProfile[]>([])
  const [regions, setRegions] = useState<Region[]>([])
  const [loading, setLoading] = useState(false)

  const refreshFarms = useCallback(async () => {
    if (!user) { setFarms([]); return }
    setLoading(true)
    try {
      const res = await api.get('/api/profile/farms')
      setFarms(res.data || [])
    } catch {
      setFarms([])
    } finally {
      setLoading(false)
    }
  }, [user])

  // Load farms whenever user changes
  useEffect(() => {
    refreshFarms()
  }, [refreshFarms])

  // Load regions once on mount (public endpoint)
  useEffect(() => {
    api.get('/api/profile/regions').then((res) => {
      setRegions(res.data || [])
    }).catch(() => setRegions([]))
  }, [])

  return (
    <ProfileContext.Provider value={{ farms, regions, loading, refreshFarms }}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  const ctx = useContext(ProfileContext)
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider')
  return ctx
}
