'use client'

import { createContext, useContext } from 'react'

// 디테일(라벨/목차/회색 노드) 표시 여부 — 줌아웃 시 false → 별자리(흰 노드+흰 엣지)만 남김.
export const DetailVisibleContext = createContext(true)
export const useDetailVisible = () => useContext(DetailVisibleContext)
