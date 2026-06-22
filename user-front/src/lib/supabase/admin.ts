import { createClient } from '@supabase/supabase-js'

// Note: This client uses the Service Role key and bypasses RLS.
// It should ONLY be used in secure server environments (like API Routes or Server Actions).
// NEVER expose the Service Role key to the browser.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
