import type {
  JiraBoardListResponse,
  JiraBoardType,
  JiraIssue,
  JiraSprint,
  JiraSprintListResponse,
  SprintReportData,
  EnrichedSprintData,
  AISummaryResponse,
  AIStatus,
} from '@/types/jira'

type SessionStatus = {
  connected: boolean
  cloudId?: string
}

const fetchJson = async <T>(path: string, init?: RequestInit): Promise<T> => {
  try {
    const response = await fetch(path, {
      credentials: 'include',
      ...init,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    })

    if (!response.ok) {
      let errorMessage = response.statusText
      try {
        const body = await response.text()
        if (body) {
          errorMessage = body
        }
      } catch {
        // Ignore parsing errors, use statusText
      }
      throw new Error(errorMessage || `Request failed with status ${response.status}`)
    }

    return response.json() as Promise<T>
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Network request failed')
  }
}

const isDoneStatus = (status?: JiraIssue['fields']['status']) => {
  if (!status) return false
  if (status.statusCategory?.key?.toLowerCase() === 'done') return true
  const name = status.name.toLowerCase()
  return name.includes('done') || name.includes('closed') || name.includes('resolved')
}

const aggregateIssues = (issues: JiraIssue[]) => {
  if (!issues || issues.length === 0) {
    return {
      issueCount: 0,
      statusCounts: {},
      originalEstimateSeconds: 0,
      timeSpentSeconds: 0,
      remainingEstimateSeconds: 0,
      storyPointsTotal: undefined,
      completedIssues: 0,
      incompleteIssues: 0,
    }
  }

  const statusCounts: Record<string, number> = {}
  let originalEstimateSeconds = 0
  let timeSpentSeconds = 0
  let remainingEstimateSeconds = 0
  let storyPointsTotal = 0
  let hasStoryPoints = false
  let completedIssues = 0
  let incompleteIssues = 0

  for (const issue of issues) {
    if (!issue?.fields) continue

    const statusName = issue.fields.status?.name ?? 'Unknown'
    statusCounts[statusName] = (statusCounts[statusName] ?? 0) + 1

    originalEstimateSeconds += issue.fields.timeoriginalestimate ?? 0
    timeSpentSeconds += issue.fields.timespent ?? 0
    remainingEstimateSeconds += issue.fields.timeestimate ?? 0

    if (typeof issue.fields.customfield_10016 === 'number') {
      hasStoryPoints = true
      storyPointsTotal += issue.fields.customfield_10016
    }

    if (isDoneStatus(issue.fields.status)) {
      completedIssues += 1
    } else {
      incompleteIssues += 1
    }
  }

  return {
    issueCount: issues.length,
    statusCounts,
    originalEstimateSeconds,
    timeSpentSeconds,
    remainingEstimateSeconds,
    storyPointsTotal: hasStoryPoints ? storyPointsTotal : undefined,
    completedIssues,
    incompleteIssues,
  }
}

export const getSessionStatus = () => fetchJson<SessionStatus>('/api/session')

export const getBoards = (type: JiraBoardType = 'scrum') =>
  fetchJson<JiraBoardListResponse>(`/api/jira/boards?type=${encodeURIComponent(type)}`)

export const getSprintsForBoard = (boardId: number, months = 12) =>
  fetchJson<JiraSprintListResponse>(`/api/jira/boards/${boardId}/sprints?months=${months}`)

export const fetchSprintReport = async (sprintId: number): Promise<SprintReportData> => {
  const { sprint, issues } = await fetchJson<{ sprint: JiraSprint; issues: JiraIssue[] }>(
    `/api/jira/sprint/${sprintId}/report`,
  )

  return {
    sprint,
    issues,
    aggregates: aggregateIssues(issues),
  }
}

/** Fetch enriched sprint data with changelogs and comments for AI analysis */
export const fetchEnrichedSprintData = (sprintId: number) =>
  fetchJson<EnrichedSprintData>(`/api/jira/sprint/${sprintId}/enriched`)

/** Generate AI summary from enriched sprint data */
export const generateAISummary = async (enrichedData: EnrichedSprintData): Promise<AISummaryResponse> =>
  fetchJson<AISummaryResponse>('/api/ai/summarize-sprint', {
    method: 'POST',
    body: JSON.stringify({ enrichedData }),
  })

/** Check if Ollama AI is available */
export const checkAIStatus = () => fetchJson<AIStatus>('/api/ai/status')

