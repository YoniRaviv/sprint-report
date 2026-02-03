import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { checkAIStatus, fetchEnrichedSprintData, generateAISummary } from '@/lib/services/jiraApi'
import { useAISummaryStore } from '@/lib/stores/aiSummaryStore'
import type { EnrichedSprintData, AIProvider, AIProviderStatus } from '@/types/jira'
import {
  formatInlineMarkdown,
  isBulletPoint,
  removeBulletMarker,
  removeLeadingEmoji,
} from '@/lib/utils/markdownParser'
import styles from './AISummary.module.scss'

type AISummaryProps = {
  sprintId?: number
}

type SummarySection = {
  title: string
  icon: string
  content: string[]
}

const getProviderInfo = (provider: AIProvider) => {
  switch (provider) {
    case 'gemini':
      return { label: '✨ Gemini AI', badge: '🌐 Cloud AI', color: '#4285f4' }
    case 'ollama':
      return { label: '🤖 Ollama', badge: '💻 Local AI', color: '#22c55e' }
    case 'rule-based':
      return { label: '📊 Rule-based', badge: '📊 Analysis', color: '#f59e0b' }
  }
}

const getStatusMessage = (providers: AIProviderStatus[]): string => {
  const gemini = providers.find(p => p.name === 'gemini')
  const ollama = providers.find(p => p.name === 'ollama')
  
  if (gemini?.available) {
    return `Gemini connected (${gemini.model ?? 'gemini-2.5-flash-lite'})`
  }
  if (ollama?.available) {
    const model = ollama.models?.[0] ?? 'local model'
    return `Ollama connected (${model})`
  }
  return 'Using rule-based analysis'
}

const getSectionIcon = (title: string): string => {
  const lower = title.toLowerCase()
  if (lower.includes('accomplishment') || lower.includes('overview')) return '🎯'
  if (lower.includes('problem') || lower.includes('blocker') || lower.includes('issue')) return '⚠️'
  if (lower.includes('bug') || lower.includes('quality')) return '🐛'
  if (lower.includes('insight') || lower.includes('root cause')) return '💡'
  if (lower.includes('recommend') || lower.includes('action')) return '📋'
  if (lower.includes('time')) return '⏰'
  if (lower.includes('observation')) return '👀'
  return '📌'
}

const parseSummaryIntoSections = (text: string): SummarySection[] => {
  const sections: SummarySection[] = []
  const lines = text.split('\n')
  let currentSection: SummarySection | null = null
  
  for (const line of lines) {
    const trimmed = line.trim()
    
    if (trimmed.startsWith('## ')) {
      if (currentSection) {
        sections.push(currentSection)
      }
      const title = removeLeadingEmoji(trimmed.slice(3).replace(/[*_`]/g, ''))
      currentSection = {
        title,
        icon: getSectionIcon(title),
        content: [],
      }
      continue
    }
    
    if (currentSection && trimmed) {
      currentSection.content.push(trimmed)
    }
  }
  
  if (currentSection) {
    sections.push(currentSection)
  }
  
  return sections
}

const AccordionSection = ({ 
  section, 
  isOpen, 
  onToggle 
}: { 
  section: SummarySection
  isOpen: boolean
  onToggle: () => void 
}) => {
  const renderContent = (lines: string[]) => {
    return lines.map((line, i) => {
      if (isBulletPoint(line)) {
        return (
          <li key={i} dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(removeBulletMarker(line)) }} />
        )
      }
      return (
        <p key={i} dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(line) }} />
      )
    })
  }

  const hasBullets = section.content.some(isBulletPoint)
  const bulletCount = section.content.filter(isBulletPoint).length

  return (
    <div className={`${styles.accordion} ${isOpen ? styles.open : ''}`}>
      <button className={styles.accordionHeader} onClick={onToggle} type="button">
        <span className={styles.accordionIcon}>{section.icon}</span>
        <span className={styles.accordionTitle}>{section.title}</span>
        {!isOpen && bulletCount > 0 && (
          <span className={styles.accordionCount}>{bulletCount}</span>
        )}
        <span className={styles.accordionChevron}>{isOpen ? '▲' : '▼'}</span>
      </button>
      {isOpen && (
        <div className={styles.accordionContent}>
          {hasBullets ? <ul>{renderContent(section.content)}</ul> : renderContent(section.content)}
        </div>
      )}
    </div>
  )
}

const AISummary = ({ sprintId }: AISummaryProps) => {
  const { summary, setSummary, clearSummary } = useAISummaryStore()
  const [openSections, setOpenSections] = useState<Set<number>>(new Set([0]))
  const [lastSprintId, setLastSprintId] = useState<number | undefined>(sprintId)

  useEffect(() => {
    if (sprintId !== lastSprintId) {
      setLastSprintId(sprintId)
      clearSummary()
      setOpenSections(new Set([0]))
    }
  }, [sprintId, lastSprintId, clearSummary])

  const { data: aiStatus } = useQuery({
    queryKey: ['ai-status'],
    queryFn: checkAIStatus,
    staleTime: 60_000,
    retry: false,
  })

  const {
    mutate: generateSummary,
    isPending: isGenerating,
    error: generateError,
    reset: resetError,
  } = useMutation({
    mutationFn: async () => {
      if (!sprintId) {
        throw new Error('No sprint selected')
      }
      try {
        const enrichedData: EnrichedSprintData = await fetchEnrichedSprintData(sprintId)
        if (!enrichedData) {
          throw new Error('Failed to fetch sprint data')
        }
        const summary = await generateAISummary(enrichedData)
        if (!summary) {
          throw new Error('Failed to generate summary')
        }
        return summary
      } catch (error) {
        console.error('Error generating AI summary:', error)
        throw error
      }
    },
    onSuccess: (data) => {
      if (data) {
        setSummary(data)
        setOpenSections(new Set([0]))
      }
    },
  })

  const handleGenerate = useCallback(() => {
    resetError()
    generateSummary()
  }, [generateSummary, resetError])

  const toggleSection = useCallback((index: number) => {
    setOpenSections(prev => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }, [])

  const providerInfo = summary ? getProviderInfo(summary.source) : null
  const hasAI = aiStatus?.providers?.some(p => p.name !== 'rule-based' && p.available)
  const geminiAvailable = aiStatus?.providers?.find(p => p.name === 'gemini')?.available
  const ollamaAvailable = aiStatus?.providers?.find(p => p.name === 'ollama')?.available
  
  const sections = useMemo(() => {
    return summary?.summary ? parseSummaryIntoSections(summary.summary) : []
  }, [summary?.summary])

  const expandAll = useCallback(() => {
    if (sections.length === 0) return
    setOpenSections(new Set(sections.map((_, i) => i)))
  }, [sections])

  const collapseAll = useCallback(() => {
    setOpenSections(new Set())
  }, [])

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.icon}>✨</span>
          <div className={styles.titleGroup}>
            <h3 className={styles.title}>AI Sprint Summary</h3>
            <p className={styles.subtitle}>
              {aiStatus?.providers 
                ? getStatusMessage(aiStatus.providers)
                : 'Checking AI availability...'
              }
            </p>
          </div>
        </div>
        {summary && providerInfo && (
          <span className={styles.sourceBadge} data-source={summary.source}>
            {providerInfo.badge}
          </span>
        )}
      </header>

      <div className={styles.content}>
        {!sprintId && (
          <p className={styles.placeholder}>Select a sprint to generate AI summary</p>
        )}

        {sprintId && !summary && !isGenerating && !generateError && (
          <>
            <button
              className={styles.generateBtn}
              onClick={handleGenerate}
              type="button"
            >
              <span className={styles.sparkle}>✨</span>
              Generate AI Summary
            </button>

            <div className={styles.providerList}>
              <div className={styles.providerItem}>
                <span className={styles.statusDot} data-active={geminiAvailable} />
                <span>Gemini (Cloud)</span>
                {geminiAvailable && <span className={styles.primaryBadge}>Primary</span>}
              </div>
              <div className={styles.providerItem}>
                <span className={styles.statusDot} data-active={ollamaAvailable} />
                <span>Ollama (Local)</span>
                {ollamaAvailable && !geminiAvailable && <span className={styles.primaryBadge}>Primary</span>}
              </div>
              <div className={styles.providerItem}>
                <span className={styles.statusDot} data-active={true} />
                <span>Rule-based (Fallback)</span>
                {!hasAI && <span className={styles.primaryBadge}>Primary</span>}
              </div>
            </div>

            {!hasAI && (
              <div className={styles.installHint}>
                <strong>💡 Enable AI-powered summaries:</strong>
                <div className={styles.setupOptions}>
                  <div className={styles.setupOption}>
                    <strong>Option 1: Gemini (Recommended)</strong>
                    <ol>
                      <li>Get a free API key from <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">Google AI Studio</a></li>
                      <li>Add <code>GEMINI_API_KEY=your-key</code> to <code>.env.local</code></li>
                      <li>Restart the server</li>
                    </ol>
                  </div>
                  <div className={styles.setupOption}>
                    <strong>Option 2: Ollama (Local)</strong>
                    <ol>
                      <li>Install from <a href="https://ollama.ai" target="_blank" rel="noopener noreferrer">ollama.ai</a></li>
                      <li>Run <code>ollama pull llama3.2</code></li>
                      <li>Start with <code>ollama serve</code></li>
                    </ol>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {sprintId && isGenerating && (
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <p className={styles.loadingText}>
              {hasAI 
                ? 'AI is analyzing your sprint data...'
                : 'Analyzing sprint patterns...'
              }
            </p>
          </div>
        )}

        {sprintId && generateError && (
          <div className={styles.error}>
            <span className={styles.errorIcon}>⚠️</span>
            <p className={styles.errorText}>
              Failed to generate summary. Please try again.
            </p>
            <button className={styles.retryBtn} onClick={handleGenerate} type="button">
              Retry
            </button>
          </div>
        )}

        {summary && !isGenerating && sections.length > 0 && (
          <div className={styles.summaryAccordions}>
            <div className={styles.accordionControls}>
              <button type="button" onClick={expandAll} className={styles.controlBtn}>
                Expand all
              </button>
              <button type="button" onClick={collapseAll} className={styles.controlBtn}>
                Collapse all
              </button>
            </div>
            {sections.map((section, index) => (
              <AccordionSection
                key={index}
                section={section}
                isOpen={openSections.has(index)}
                onToggle={() => toggleSection(index)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default AISummary
