import { useMemo } from 'react'
import type { SprintReportData } from '@/types/jira'
import { formatDate, formatHours } from '@/lib/utils/timeFormat'
import styles from './ReportPreview.module.scss'

type ReportPreviewProps = {
  data?: SprintReportData
  isLoading: boolean
  error?: unknown
  onExport: () => Promise<void>
}

const ReportPreview = ({ data, isLoading, error, onExport }: ReportPreviewProps) => {
  const statusEntries = useMemo(() => {
    if (!data) return []
    const entries = Object.entries(data.aggregates.statusCounts)
    return entries.sort((a, b) => b[1] - a[1])
  }, [data])

  const utilizationPercentage = useMemo(() => {
    if (!data) return null
    const { originalEstimateSeconds, timeSpentSeconds } = data.aggregates
    if (originalEstimateSeconds <= 0) return null
    return Math.round((timeSpentSeconds / originalEstimateSeconds) * 100)
  }, [data])

  const totalIssues = data?.aggregates.issueCount ?? 0

  const handleExport = async () => {
    if (!data) return
    try {
      await onExport()
    } catch (error) {
      console.error('Failed to export PDF:', error)
    }
  }

  return (
    <section className={styles.panel}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Preview</p>
          <h2 className={styles.title}>Sprint report</h2>
          {data?.sprint && (
            <p className={styles.subtitle}>
              {data.sprint.name} · {formatDate(data.sprint.startDate)} —{' '}
              {formatDate(data.sprint.endDate)} · {data.sprint.goal ?? 'No goal set'}
            </p>
          )}
        </div>
        <button
          className={styles.export}
          type="button"
          disabled={!data || isLoading}
          onClick={handleExport}
        >
          Generate PDF
        </button>
      </header>

      {Boolean(error) && (
        <p className={styles.error}>Unable to load data. Check your connection.</p>
      )}

      {isLoading && <p className={styles.loading}>Loading sprint data...</p>}

      {!data && !isLoading && <p className={styles.placeholder}>Select a sprint to see preview.</p>}

      {data && (
        <div className={styles.grid}>
          <div className={styles.card}>
            <p className={styles.label}>Tasks assigned</p>
            <h3 className={styles.metric}>{data.aggregates.issueCount}</h3>
            <p className={styles.submetric}>
              {data.aggregates.completedIssues} done · {data.aggregates.incompleteIssues} open
            </p>
          </div>

          <div className={styles.card}>
            <p className={styles.label}>Original estimate</p>
            <h3 className={styles.metric}>{formatHours(data.aggregates.originalEstimateSeconds)}</h3>
            <p className={styles.submetric}>Remaining {formatHours(data.aggregates.remainingEstimateSeconds)}</p>
          </div>

          <div className={styles.card}>
            <p className={styles.label}>Time spent</p>
            <h3 className={styles.metric}>{formatHours(data.aggregates.timeSpentSeconds)}</h3>
            <p className={styles.submetric}>
              Utilization {utilizationPercentage !== null ? `${utilizationPercentage}%` : 'N/A'}
            </p>
          </div>

          {typeof data.aggregates.storyPointsTotal === 'number' && (
            <div className={styles.card}>
              <p className={styles.label}>Story points</p>
              <h3 className={styles.metric}>{data.aggregates.storyPointsTotal}</h3>
              <p className={styles.submetric}>Total in sprint scope</p>
            </div>
          )}
        </div>
      )}

      {data && (
        <div className={styles.statusSection}>
          <div className={styles.statusHeader}>
            <p className={styles.label}>Status distribution</p>
            <span className={styles.total}>{totalIssues} issues</span>
          </div>

          <div className={styles.statusBar}>
            {statusEntries.map(([status, count]) => {
              const width = Math.max((count / Math.max(totalIssues, 1)) * 100, 6)
              return (
                <span key={status} style={{ width: `${width}%` }}>
                  <em>{status}</em>
                  <strong>{count}</strong>
                </span>
              )
            })}
          </div>

          <div className={styles.issueList}>
            {data.issues.map((issue) => {
              const issueType = issue.fields.issuetype?.name?.toLowerCase() ?? 'task'
              return (
                <div key={issue.id} className={styles.issueRow}>
                  <div className={styles.issueInfo}>
                    <span className={`${styles.typeBadge} ${styles[`type_${issueType.replace(/[^a-z]/g, '')}`] || ''}`}>
                      {issue.fields.issuetype?.name ?? 'Task'}
                    </span>
                    <div>
                      <p className={styles.issueKey}>{issue.key}</p>
                      <p className={styles.issueSummary}>{issue.fields.summary}</p>
                    </div>
                  </div>
                  <div className={styles.issueMeta}>
                    <span className={styles.badge}>{issue.fields.status?.name ?? 'Unknown'}</span>
                    <span className={styles.time}>
                      {formatHours(issue.fields.timespent)} / {formatHours(issue.fields.timeoriginalestimate)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

    </section>
  )
}

export default ReportPreview

