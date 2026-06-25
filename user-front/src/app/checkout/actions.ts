'use server'

import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export interface OrderInput {
  code: string // 상품 코드 (find-or-create 키)
  name: string // 상품/주문명 (Toss orderName)
  price: number // 결제 금액 (KRW)
  rpAmount: number // 지급 RP (구독은 0)
}

// 상품(find-or-create) + pending 주문 생성. RP 충전·정기구독 공용.
export async function createOrder(input: OrderInput) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('로그인이 필요합니다.')

  // 1. 상품 find-or-create
  let { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('code', input.code)
    .single()

  if (!product) {
    const { data: newProduct, error } = await supabaseAdmin
      .from('products')
      .insert({
        code: input.code,
        name: input.name,
        price_amount: input.price,
        rp_amount: input.rpAmount,
        status: 'active',
      })
      .select()
      .single()

    if (error) throw new Error('상품 생성 실패: ' + error.message)
    product = newProduct
  }

  // 2. pending 주문 생성 (금액·RP는 DB 상품 기준 — URL 신뢰 안 함)
  const orderNo = `ORDER_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
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
      expires_at: expiresAt,
    })
    .select()
    .single()

  if (orderError) throw new Error('주문 생성 실패: ' + orderError.message)

  const { data: profile } = await supabase
    .from('users')
    .select('nickname')
    .eq('id', user.id)
    .single()

  return {
    orderId: order.order_no,
    orderName: product.name,
    amount: order.amount,
    customerName: profile?.nickname || '회원',
    customerEmail: user.email,
  }
}
