'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { useEffect } from 'react'

export default function StorePage() {
  const router = useRouter()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/')
    }
  }, [user, loading, router])

  if (loading || !user) return <div className="p-12">Loading...</div>

  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold mb-4">RP 보급소</h1>
        <p className="text-fg/70">노드를 해금하기 위한 연구 포인트(RP)를 충전하세요.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { rp: 5000, price: '₩5,000' },
          { rp: 10000, price: '₩10,000' },
          { rp: 50000, price: '₩50,000' },
        ].map(item => (
          <div key={item.rp} className="bg-card border border-border p-8 rounded-xl text-center hover:border-accent transition-colors flex flex-col justify-between">
            <div>
              <h2 className="text-3xl font-mono text-accent font-bold mb-2">{item.rp.toLocaleString()}</h2>
              <p className="text-fg/50 text-sm mb-6">RP 충전</p>
            </div>
            
            <button 
              onClick={() => router.push('/checkout')} // For now, the checkout page hardcodes a 5000 KRW test item
              className="w-full py-3 bg-white text-black font-bold rounded hover:bg-neutral-200 transition-colors"
            >
              {item.price} 결제하기
            </button>
          </div>
        ))}
      </div>
    </main>
  )
}
