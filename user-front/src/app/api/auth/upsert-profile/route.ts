import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const meta = (user.user_metadata ?? {}) as Record<string, string>
  const nickname = meta.nickname ?? meta.name ?? meta.full_name ?? user.email?.split('@')[0] ?? 'user'

  await supabaseAdmin.from('users').upsert(
    {
      id: user.id,
      email: user.email ?? '',
      nickname,
      profile_image_url: meta.avatar_url ?? meta.picture ?? null,
    },
    { onConflict: 'id' }
  )

  return NextResponse.json({ ok: true })
}
