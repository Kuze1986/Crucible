"use client"

import { useEffect, useState } from "react"

import KuzeChatWidget from "@/components/kuze/KuzeChatWidget"
import { createBrowserSupabaseClient } from "@/lib/supabase/client"

export function KuzeWidgetProvider() {
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createBrowserSupabaseClient()

    let mounted = true
    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setToken(data.session?.access_token ?? null)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setToken(session?.access_token ?? null)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  return (
    <KuzeChatWidget
      accessToken={token}
      mode="debrief"
      appLabel="Crucible"
      contextOverride="User is currently in The Crucible workforce behavior platform."
    />
  )
}
