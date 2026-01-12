import type {
  AIProvider,
  AIProviderStatus,
  AIStatus,
  AISummaryResponse,
  EnrichedIssue,
  EnrichedSprintData,
  StatusChange,
} from '@/types/jira'

const getEnv = (key: string, fallback?: string) => process.env[key] || fallback

const getAIPrompt = (context: string) => `You are an expert Agile coach analyzing a developer's personal sprint report. Analyze this sprint data and provide a CONCISE summary. Be brief but insightful.

## OUTPUT FORMAT (use exactly these section headers):

## 🎯 Sprint Summary
- 1-4 bullets: What was accomplished (reference issue keys)
- Completion rate and any notable achievements

## ⚠️ Problem Areas  
- Only list issues that had real problems (QA returns, blockers, overtime)
- Format: **ISSUE-KEY**: One-line explanation of what went wrong
- Skip this section if no problems found

## 🐛 Quality Issues
- Bugs found or QA returns (max 4 items)
- Skip if none

## 💡 Key Insight
- ONE most important observation from workflow/comments
- Focus on root cause, not symptoms

## 📋 Action Item
- specific recommendations for next sprint
- Make it actionable, not generic

## RULES:
- MAX 2-4 bullets per section
- Reference issue keys (e.g., PROJ-123)
- Skip empty sections entirely
- Total response under 600 words
- No generic advice - only data-driven insights

SPRINT DATA:
${context}

ANALYSIS:`

export const extractTextFromADF = (adf: unknown): string => {
  if (!adf || typeof adf !== 'object') return ''

  const extractFromNode = (node: any): string => {
    if (!node) return ''
    if (node.type === 'text') return node.text ?? ''
    if (Array.isArray(node.content)) {
      return node.content.map(extractFromNode).join(' ')
    }
    return ''
  }

  return extractFromNode(adf).slice(0, 500)
}

export const analyzeWorkflow = (statusChanges?: StatusChange[]) => {
  if (!statusChanges?.length) return null

  const patterns = {
    returnedFromQA: false,
    returnedFromReview: false,
    reopened: false,
    backAndForth: false,
    blockedAtSomePoint: false,
    totalTransitions: statusChanges.length,
  }

  const qaStatuses = ['qa', 'testing', 'test', 'in qa', 'ready for qa', 'in testing']
  const reviewStatuses = ['review', 'code review', 'in review', 'pr review']
  const todoStatuses = ['to do', 'todo', 'open', 'backlog', 'new']
  const inProgressStatuses = ['in progress', 'in development', 'dev', 'development']
  const blockedStatuses = ['blocked', 'on hold', 'waiting', 'impediment']

  for (const change of statusChanges) {
    const from = change.from?.toLowerCase() || ''
    const to = change.to?.toLowerCase() || ''

    if (
      qaStatuses.some((s) => from.includes(s)) &&
      (todoStatuses.some((s) => to.includes(s)) || inProgressStatuses.some((s) => to.includes(s)))
    ) {
      patterns.returnedFromQA = true
    }

    if (
      reviewStatuses.some((s) => from.includes(s)) &&
      (todoStatuses.some((s) => to.includes(s)) || inProgressStatuses.some((s) => to.includes(s)))
    ) {
      patterns.returnedFromReview = true
    }

    if ((from.includes('done') || from.includes('closed') || from.includes('resolved')) && !to.includes('done')) {
      patterns.reopened = true
    }

    if (blockedStatuses.some((s) => from.includes(s) || to.includes(s))) {
      patterns.blockedAtSomePoint = true
    }
  }

  patterns.backAndForth = patterns.totalTransitions > 4 || patterns.returnedFromQA || patterns.returnedFromReview

  return patterns
}

export const buildSprintContext = (data: EnrichedSprintData) => {
  const { sprint, issues, totalIssues } = data

  let context = `=== SPRINT ANALYSIS DATA ===\n\n`
  context += `SPRINT INFO:\n`
  context += `- Name: ${sprint.name}\n`
  context += `- Goal: ${sprint.goal || 'No goal set'}\n`
  context += `- Duration: ${sprint.startDate} to ${sprint.endDate}\n`
  context += `- Total Issues Assigned: ${totalIssues}\n`
  context += `- Issues Analyzed Below: ${issues.length}\n\n`

  const issuesWithQAReturn: string[] = []
  const issuesWithReviewReturn: string[] = []
  const issuesReopened: string[] = []
  const issuesBlocked: string[] = []
  const issuesOverTime: { key: string; ratio: number }[] = []
  const bugs: string[] = []

  context += `=== DETAILED ISSUE BREAKDOWN ===\n`

  for (const issue of issues) {
    const workflow = analyzeWorkflow(issue.statusChanges)

    if (workflow?.returnedFromQA) issuesWithQAReturn.push(issue.key)
    if (workflow?.returnedFromReview) issuesWithReviewReturn.push(issue.key)
    if (workflow?.reopened) issuesReopened.push(issue.key)
    if (workflow?.blockedAtSomePoint) issuesBlocked.push(issue.key)
    if (issue.timeSpent && issue.originalEstimate && issue.timeSpent > issue.originalEstimate * 1.3) {
      issuesOverTime.push({ key: issue.key, ratio: Math.round((issue.timeSpent / issue.originalEstimate) * 100) })
    }
    if (issue.type?.toLowerCase().includes('bug')) bugs.push(issue.key)

    context += `\n────────────────────────────────────────\n`
    context += `ISSUE: ${issue.key}\n`
    context += `Summary: ${issue.summary}\n`
    context += `Type: ${issue.type} | Current Status: ${issue.status}\n`

    if (issue.originalEstimate || issue.timeSpent) {
      const est = issue.originalEstimate ? `${Math.round(issue.originalEstimate / 3600)}h` : 'Not estimated'
      const spent = issue.timeSpent ? `${Math.round(issue.timeSpent / 3600)}h` : '0h'
      const variance =
        issue.originalEstimate && issue.timeSpent
          ? ` (${Math.round((issue.timeSpent / issue.originalEstimate) * 100)}% of estimate)`
          : ''
      context += `Time: Estimated ${est} | Spent ${spent}${variance}\n`
    }

    if (issue.statusChanges?.length > 0) {
      context += `\nWORKFLOW HISTORY (${issue.statusChanges.length} transitions):\n`
      for (const change of issue.statusChanges) {
        const date = change.date ? new Date(change.date).toLocaleDateString() : ''
        context += `  • ${change.from} → ${change.to} (${date}${change.author ? `, by ${change.author}` : ''})\n`
      }

      if (workflow) {
        context += `\nWORKFLOW INSIGHTS:\n`
        if (workflow.returnedFromQA) context += `  ⚠️ RETURNED FROM QA - Bug found or requirements issue\n`
        if (workflow.returnedFromReview) context += `  ⚠️ RETURNED FROM CODE REVIEW - Code changes needed\n`
        if (workflow.reopened) context += `  ⚠️ REOPENED - Was marked done but reopened\n`
        if (workflow.blockedAtSomePoint) context += `  ⚠️ WAS BLOCKED at some point during sprint\n`
        if (workflow.backAndForth) context += `  ⚠️ COMPLEX WORKFLOW - Multiple back-and-forth transitions\n`
      }
    }

    if (issue.comments?.length > 0) {
      context += `\nCOMMENTS (${issue.comments.length} total):\n`
      for (const c of issue.comments.slice(0, 5)) {
        const date = c.date ? new Date(c.date).toLocaleDateString() : ''
        const text = c.text?.slice(0, 400) || '[empty]'
        context += `  [${date}] ${c.author || 'Unknown'}:\n`
        context += `    "${text}${c.text?.length > 400 ? '...' : ''}"\n`
      }
    }
  }

  context += `\n\n=== PATTERN SUMMARY ===\n`
  if (issuesWithQAReturn.length > 0) {
    context += `🔴 Issues returned from QA: ${issuesWithQAReturn.join(', ')}\n`
  }
  if (issuesWithReviewReturn.length > 0) {
    context += `🟠 Issues returned from Code Review: ${issuesWithReviewReturn.join(', ')}\n`
  }
  if (issuesReopened.length > 0) {
    context += `🟡 Issues reopened after completion: ${issuesReopened.join(', ')}\n`
  }
  if (issuesBlocked.length > 0) {
    context += `⛔ Issues that were blocked: ${issuesBlocked.join(', ')}\n`
  }
  if (issuesOverTime.length > 0) {
    context += `⏰ Issues over time estimate: ${issuesOverTime.map((i) => `${i.key} (${i.ratio}%)`).join(', ')}\n`
  }
  if (bugs.length > 0) {
    context += `🐛 Bugs in sprint: ${bugs.join(', ')}\n`
  }

  return context
}

const generateRuleBasedSummary = (data: EnrichedSprintData): string => {
  const { sprint, issues, totalIssues } = data

  const bugs = issues.filter((i) => i.type?.toLowerCase().includes('bug'))
  const overTimeIssues = issues.filter(
    (i) => i.timeSpent && i.originalEstimate && i.timeSpent > i.originalEstimate * 1.3,
  )
  const blockerMentions = issues.filter((i) =>
    i.comments?.some((c) => c.text?.toLowerCase().match(/block|waiting|depend|stuck|delay|impediment/)),
  )

  const qaReturns: EnrichedIssue[] = []
  const reviewReturns: EnrichedIssue[] = []
  const reopened: EnrichedIssue[] = []
  const complexWorkflows: EnrichedIssue[] = []

  for (const issue of issues) {
    const workflow = analyzeWorkflow(issue.statusChanges)
    if (workflow?.returnedFromQA) qaReturns.push(issue)
    if (workflow?.returnedFromReview) reviewReturns.push(issue)
    if (workflow?.reopened) reopened.push(issue)
    if (workflow?.backAndForth) complexWorkflows.push(issue)
  }

  const completedCount = issues.filter((i) => i.status?.toLowerCase().match(/done|closed|resolved/)).length

  let summary = `## 🎯 Sprint Accomplishments\n`
  summary += `**${sprint.name}** - ${completedCount}/${totalIssues} issues completed.\n`
  if (sprint.goal) {
    summary += `Goal: ${sprint.goal}\n`
  }
  summary += `\n`

  summary += `## ⚠️ Issues That Had Problems\n`
  const problemIssues = [...new Set([...qaReturns, ...reviewReturns, ...reopened, ...blockerMentions])]
  if (problemIssues.length > 0) {
    for (const issue of problemIssues.slice(0, 5)) {
      const reasons: string[] = []
      if (qaReturns.includes(issue)) reasons.push('returned from QA')
      if (reviewReturns.includes(issue)) reasons.push('returned from code review')
      if (reopened.includes(issue)) reasons.push('was reopened')
      if (blockerMentions.includes(issue)) reasons.push('had blockers mentioned')
      summary += `- **${issue.key}**: ${issue.summary}\n  *Issue: ${reasons.join(', ')}*\n`
    }
  } else {
    summary += `- No major workflow issues detected\n`
  }

  summary += `\n## 🐛 Quality & Bugs\n`
  if (bugs.length > 0) {
    summary += `**Bugs logged:** ${bugs.map((i) => i.key).join(', ')}\n`
  }
  if (qaReturns.length > 0) {
    summary += `**Returned from QA:** ${qaReturns.map((i) => i.key).join(', ')} - Check these for quality patterns\n`
  }
  if (reviewReturns.length > 0) {
    summary += `**Returned from Code Review:** ${reviewReturns.map((i) => i.key).join(', ')}\n`
  }
  if (bugs.length === 0 && qaReturns.length === 0 && reviewReturns.length === 0) {
    summary += `- No bugs or quality issues detected in workflow\n`
  }

  summary += `\n## ⏰ Time Analysis\n`
  if (overTimeIssues.length > 0) {
    for (const issue of overTimeIssues.slice(0, 5)) {
      const ratio = Math.round((issue.timeSpent! / issue.originalEstimate!) * 100)
      summary += `- **${issue.key}**: Took ${ratio}% of estimated time\n`
    }
  } else {
    summary += `- Most issues completed within reasonable time estimates\n`
  }

  summary += `\n## 💡 Key Observations\n`
  if (complexWorkflows.length > 0) {
    summary += `- ${complexWorkflows.length} issue(s) had complex workflows with multiple status changes\n`
  }
  if (blockerMentions.length > 0) {
    summary += `- ${blockerMentions.length} issue(s) had blockers or dependencies mentioned in comments\n`
  }
  if (qaReturns.length > 0) {
    summary += `- ${qaReturns.length} issue(s) returned from QA - consider improving testing before QA handoff\n`
  }

  summary += `\n*Note: Add GEMINI_API_KEY for AI-powered deeper insights*`

  return summary
}

const generateGeminiSummary = async (context: string) => {
  const GEMINI_API_KEY = getEnv('GEMINI_API_KEY')
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured')
  }

  const GEMINI_MODEL = getEnv('GEMINI_MODEL', 'gemini-2.5-flash-lite')
  const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`

  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: getAIPrompt(context),
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.5,
        maxOutputTokens: 1000,
        topP: 0.85,
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      ],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(`Gemini request failed: ${response.status} - ${errorText}`)
  }

  const result = await response.json()
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) {
    throw new Error('No content in Gemini response')
  }

  return text as string
}

const generateOllamaSummary = async (context: string) => {
  const OLLAMA_URL = getEnv('OLLAMA_URL', 'http://localhost:11434')
  const OLLAMA_MODEL = getEnv('OLLAMA_MODEL', 'llama3.2')

  const response = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt: getAIPrompt(context),
      stream: false,
      options: {
        temperature: 0.5,
        num_predict: 1000,
        top_p: 0.85,
      },
    }),
  })

  if (!response.ok) {
    throw new Error(`Ollama request failed: ${response.status}`)
  }

  const result = await response.json()
  return result.response as string
}

export const generateAISummary = async (
  enrichedData: EnrichedSprintData,
  preferredProvider?: AIProvider,
): Promise<AISummaryResponse> => {
  if (!enrichedData?.sprint) {
    throw new Error('Missing enriched sprint data')
  }

  const sprintContext = buildSprintContext(enrichedData)
  const providers = preferredProvider
    ? [preferredProvider, 'gemini', 'ollama', 'rule-based']
    : ['gemini', 'ollama', 'rule-based']

  for (const provider of [...new Set(providers)]) {
    try {
      if (provider === 'gemini' && getEnv('GEMINI_API_KEY')) {
        const summary = await generateGeminiSummary(sprintContext)
        return { summary, source: 'gemini' }
      }

      if (provider === 'ollama') {
        const summary = await generateOllamaSummary(sprintContext)
        return { summary, source: 'ollama' }
      }

      if (provider === 'rule-based') {
        const summary = generateRuleBasedSummary(enrichedData)
        return { summary, source: 'rule-based' }
      }
    } catch (error) {
      console.warn(`${provider} failed:`, (error as Error).message)
      continue
    }
  }

  const summary = generateRuleBasedSummary(enrichedData)
  return { summary, source: 'rule-based' }
}

export const getAIStatus = async (): Promise<AIStatus> => {
  const status: AIStatus = {
    available: false,
    providers: [],
    primary: null,
  }

  if (getEnv('GEMINI_API_KEY')) {
    const keyValid = (getEnv('GEMINI_API_KEY') || '').length > 20
    if (keyValid) {
      status.providers.push({
        name: 'gemini',
        available: true,
        model: getEnv('GEMINI_MODEL', 'gemini-2.5-flash-lite'),
        type: 'cloud',
      })
      status.available = true
      status.primary = 'gemini'
    }
  }

  const OLLAMA_URL = getEnv('OLLAMA_URL', 'http://localhost:11434')
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000)

    const response = await fetch(`${OLLAMA_URL}/api/tags`, {
      method: 'GET',
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (response.ok) {
      const data = await response.json()
      const models = data.models?.map((m: { name: string }) => m.name) ?? []
      status.providers.push({
        name: 'ollama',
        available: true,
        models,
        type: 'local',
      })
      status.available = true
      if (!status.primary) {
        status.primary = 'ollama'
      }
    }
  } catch {
    status.providers.push({
      name: 'ollama',
      available: false,
      reason: 'Not running',
      type: 'local',
    })
  }

  status.providers.push({
    name: 'rule-based',
    available: true,
    type: 'fallback',
  })

  if (!status.primary) {
    status.primary = 'rule-based'
    status.available = true
  }

  return status
}

