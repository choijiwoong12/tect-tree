import { create } from 'zustand'

interface AppState {
  rpBalance: number
  setRpBalance: (balance: number) => void
  recentNodeId: string | null
  setRecentNodeId: (id: string) => void
}

export const useAppStore = create<AppState>((set) => ({
  rpBalance: 0,
  setRpBalance: (balance) => set({ rpBalance: balance }),
  recentNodeId: null,
  setRecentNodeId: (id) => set({ recentNodeId: id }),
}))
