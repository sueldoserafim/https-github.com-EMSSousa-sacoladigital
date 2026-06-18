import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'

interface UserProfile {
  id: string
  organization_id: string
  full_name: string
  role: string
}

interface Organization {
  id: string
  name: string
  slug: string
}

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: UserProfile | null
  organization: Organization | null
  loading: boolean
  signOut: () => Promise<{ error: any }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfileAndOrg = async (userId: string) => {
    try {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*, organizations(*)')
        .eq('id', userId)
        .single()

      if (error) throw error

      if (profileData) {
        const { organizations, ...rest } = profileData
        setProfile(rest as UserProfile)
        setOrganization(organizations as unknown as Organization)
      }
    } catch (err) {
      console.error('Error fetching profile', err)
      setProfile(null)
      setOrganization(null)
    }
  }

  useEffect(() => {
    let mounted = true

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (!mounted) return
      setSession(currentSession)
      setUser(currentSession?.user ?? null)
      if (!currentSession?.user) {
        setProfile(null)
        setOrganization(null)
        setLoading(false)
      }
    })

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (!mounted) return
      setSession(initialSession)
      setUser(initialSession?.user ?? null)
      if (!initialSession?.user) {
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    let mounted = true
    if (user) {
      setLoading(true)
      fetchProfileAndOrg(user.id).finally(() => {
        if (mounted) setLoading(false)
      })
    }
    return () => {
      mounted = false
    }
  }, [user])

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  return (
    <AuthContext.Provider value={{ user, session, profile, organization, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  )
}
