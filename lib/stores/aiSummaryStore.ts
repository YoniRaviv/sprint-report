import { create } from 'zustand'
import type { AISummaryResponse } from '@/types/jira'

type AISummaryState = {
  summary: AISummaryResponse | null
  setSummary: (summary: AISummaryResponse | null) => void
  clearSummary: () => void
}

export const useAISummaryStore = create<AISummaryState>()((set) => ({
  summary: null,
  setSummary: (summary) => set({ summary }),
  clearSummary: () => set({ summary: null }),
}))

