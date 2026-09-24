import { createClient } from '@supabase/supabase-js'

// 어드민 프로젝트 (document_nodes, user_node_access) — service role, 서버 전용.
export const supabaseAdminDb = createClient(
  process.env.NEXT_PUBLIC_ADMIN_SUPABASE_URL!,
  process.env.ADMIN_SUPABASE_SERVICE_ROLE_KEY!
)
