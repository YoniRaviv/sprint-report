export type JiraBoardType = 'scrum' | 'kanban'

export type JiraBoard = {
  id: number
  name: string
  type: JiraBoardType
}

export type JiraBoardListResponse = {
  values: JiraBoard[]
  startAt: number
  maxResults: number
  total?: number
  isLast?: boolean
}

export type JiraSprintState = 'active' | 'closed' | 'future'

export type JiraSprint = {
  id: number
  name: string
  state: JiraSprintState
  startDate?: string
  endDate?: string
  goal?: string
}

export type JiraSprintListResponse = {
  values: JiraSprint[]
  startAt: number
  maxResults: number
  isLast?: boolean
}

export type JiraIssueType = {
  id: string
  name: string
  iconUrl?: string
}

export type JiraIssueFields = {
  summary: string
  status: { name: string; statusCategory?: { key: string } }
  issuetype?: JiraIssueType
  timeoriginalestimate?: number
  timespent?: number
  timeestimate?: number
  /**
   * Jira cloud defaults to customfield_10016 for story points in company-managed projects.
   * If your instance uses a different field, this may be undefined.
   */
  customfield_10016?: number
}

export type JiraIssue = {
  id: string
  key: string
  fields: JiraIssueFields
}

export type SprintAggregates = {
  issueCount: number
  statusCounts: Record<string, number>
  originalEstimateSeconds: number
  timeSpentSeconds: number
  remainingEstimateSeconds: number
  storyPointsTotal?: number
  completedIssues: number
  incompleteIssues: number
}

export type SprintReportData = {
  sprint?: JiraSprint
  issues: JiraIssue[]
  aggregates: SprintAggregates
}

// AI Summary types
export type StatusChange = {
  from: string
  to: string
  date: string
  author?: string
}

export type CommentSummary = {
  author?: string
  date: string
  text: string
}

export type EnrichedIssue = {
  key: string
  summary: string
  type: string
  status: string
  originalEstimate?: number
  timeSpent?: number
  statusChanges: StatusChange[]
  comments: CommentSummary[]
}

export type EnrichedSprintData = {
  sprint: JiraSprint
  issues: EnrichedIssue[]
  totalIssues: number
}

export type AIProvider = 'gemini' | 'ollama' | 'rule-based'

export type AISummaryResponse = {
  summary: string
  source: AIProvider
}

export type AIProviderStatus = {
  name: AIProvider
  available: boolean
  type: 'cloud' | 'local' | 'fallback'
  model?: string
  models?: string[]
  reason?: string
}

export type AIStatus = {
  available: boolean
  providers: AIProviderStatus[]
  primary: AIProvider | null
}

