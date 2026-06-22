'use client'

import { ReactFlowProvider } from '@xyflow/react'
import { TreeCanvas } from '@/components/tree/TreeCanvas'
import { useAuth } from '@/components/auth/AuthProvider'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function ThemeTreePage({ params }: { params: { theme_id: string } }) {
  const router = useRouter()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/')
    }
  }, [user, loading, router])

  if (loading || !user) return null

  return (
    <ReactFlowProvider>
      <TreeCanvas themeId={params.theme_id} />
    </ReactFlowProvider>
  )
}
