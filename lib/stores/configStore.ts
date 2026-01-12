import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type ConfigState = {
  boardId?: number
  sprintId?: number
  setBoardId: (boardId?: number) => void
  setSprintId: (sprintId?: number) => void
  reset: () => void
}

export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      boardId: undefined,
      sprintId: undefined,
      setBoardId: (boardId) => set({ boardId, sprintId: undefined }),
      setSprintId: (sprintId) => set({ sprintId }),
      reset: () =>
        set({
          boardId: undefined,
          sprintId: undefined,
        }),
    }),
    {
      name: 'sprint-report-config',
      partialize: (state) => ({
        boardId: state.boardId,
        sprintId: state.sprintId,
      }),
    },
  ),
)

