'use client'

import { create } from 'zustand'
import { IClaim, ClaimFilters, PaginatedResponse } from '@/types'

interface ClaimsState {
  claims: IClaim[]
  total: number
  totalPages: number
  loading: boolean
  error: string | null
  filters: ClaimFilters
  setFilters: (filters: Partial<ClaimFilters>) => void
  fetchClaims: () => Promise<void>
  reset: () => void
}

export const useClaimsStore = create<ClaimsState>((set, get) => ({
  claims: [],
  total: 0,
  totalPages: 0,
  loading: false,
  error: null,
  filters: { page: 1, limit: 10 },

  setFilters: (filters) => {
    const isPageChange = 'page' in filters && Object.keys(filters).length === 1
    set((state) => ({
      filters: { ...state.filters, ...filters, ...(isPageChange ? {} : { page: 1 }) },
    }))
    get().fetchClaims()
  },

  fetchClaims: async () => {
    set({ loading: true, error: null })
    try {
      const { filters } = get()
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          params.set(k, String(v))
        }
      })

      const res = await fetch(`/api/claims?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch claims')

      const json: PaginatedResponse<IClaim> & { success: boolean } = await res.json()
      set({
        claims: json.data,
        total: json.total,
        totalPages: json.totalPages,
        loading: false,
      })
    } catch (err) {
      set({ error: (err as Error).message, loading: false })
    }
  },

  reset: () => set({ claims: [], total: 0, totalPages: 0, filters: { page: 1, limit: 25 } }),
}))
