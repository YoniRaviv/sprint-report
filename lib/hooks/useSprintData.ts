import { useQuery } from '@tanstack/react-query'
import { fetchSprintReport } from '@/lib/services/jiraApi'
import { useConfigStore } from '@/lib/stores/configStore'

export const useSprintData = () => {
  const sprintId = useConfigStore((state) => state.sprintId)

  return useQuery({
    queryKey: ['sprint-report', sprintId],
    queryFn: () => {
      if (!sprintId) {
        throw new Error('Sprint ID is required')
      }
      return fetchSprintReport(sprintId)
    },
    enabled: Boolean(sprintId),
    staleTime: 30_000,
    retry: 1,
  })
}

