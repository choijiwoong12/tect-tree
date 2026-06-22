'use server'

import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function createTestOrder() {
  const supabase = createClient()
  
  // 1. Check Auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('로그인이 필요합니다.')
  }

  // 2. Ensure a test product exists
  let { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('code', 'TEST_RP_PACK_5000')
    .single()

  if (!product) {
    // Admin client is required to bypass RLS for creating a product
    const { data: newProduct, error } = await supabaseAdmin
      .from('products')
      .insert({
        code: 'TEST_RP_PACK_5000',
        name: '5,000 RP 충전',
        price_amount: 5000,
        rp_amount: 5000,
        status: 'active'
      })
      .select()
      .single()
      
    if (error) throw new Error('상품 생성 실패: ' + error.message)
    product = newProduct
  }

  // 3. Create a pending order
  const orderNo = `ORDER_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
  // Expire in 1 hour
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      user_id: user.id,
      product_id: product.id,
      order_no: orderNo,
      amount: product.price_amount,
      rp_amount: product.rp_amount,
      status: 'pending',
      expires_at: expiresAt
    })
    .select()
    .single()

  if (orderError) throw new Error('주문 생성 실패: ' + orderError.message)

  // 4. Also fetch user's nickname for the payment UI
  const { data: profile } = await supabase
    .from('users')
    .select('nickname')
    .eq('id', user.id)
    .single()

  return {
    orderId: order.order_no,
    orderName: product.name,
    amount: order.amount,
    customerName: profile?.nickname || '테스트 유저',
    customerEmail: user.email,
  }
}
