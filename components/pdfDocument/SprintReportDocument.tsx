import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import type { SprintReportData } from '@/types/jira'
import { formatDate, formatHours } from '@/lib/utils/timeFormat'
import { isBulletPoint, removeBulletMarker, stripMarkdown } from '@/lib/utils/markdownParser'

type SprintReportDocumentProps = {
  data: SprintReportData
  aiSummary?: string
}

const styles = StyleSheet.create({
  page: {
    padding: 28,
    fontSize: 11,
    fontFamily: 'Helvetica',
    color: '#1f2933',
  },
  header: { marginBottom: 12 },
  title: { fontSize: 18, fontWeight: 700 },
  subtitle: { color: '#52616b', marginTop: 4 },
  grid: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  card: {
    border: '1pt solid #e5e7eb',
    borderRadius: 8,
    padding: 10,
    width: '48%',
  },
  label: { color: '#6b7280', marginBottom: 4, fontWeight: 600 },
  metric: { fontSize: 16, fontWeight: 700 },
  submetric: { color: '#52616b', marginTop: 4 },
  sectionTitle: { fontSize: 14, fontWeight: 700, marginBottom: 6, marginTop: 12 },
  statusList: { gap: 4, display: 'flex', flexDirection: 'column' },
  statusRow: {
    display: 'flex',
    justifyContent: 'space-between',
    border: '1pt solid #e5e7eb',
    borderRadius: 6,
    padding: 8,
  },
  issue: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottom: '1pt solid #f1f3f5',
    paddingVertical: 6,
  },
  issueSummary: { color: '#111827', marginTop: 2 },
  badge: {
    backgroundColor: '#e0f2fe',
    color: '#0369a1',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    fontSize: 10,
  },
  // AI Summary styles
  summarySection: {
    marginTop: 16,
    paddingTop: 12,
    borderTop: '1pt solid #e5e7eb',
  },
  summaryHeader: {
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 8,
    color: '#6366f1',
  },
  summaryHeading: {
    fontSize: 12,
    fontWeight: 700,
    marginTop: 10,
    marginBottom: 4,
    color: '#374151',
  },
  summaryText: {
    fontSize: 10,
    lineHeight: 1.5,
    color: '#4b5563',
    marginBottom: 2,
  },
  summaryBullet: {
    fontSize: 10,
    lineHeight: 1.5,
    color: '#4b5563',
    marginLeft: 12,
    marginBottom: 2,
  },
  summaryBold: {
    fontWeight: 700,
    color: '#111827',
  },
})

/**
 * Parse markdown-like AI summary into PDF elements
 */
const renderAISummary = (summary: string) => {
  const lines = summary.split('\n')
  const elements: React.ReactElement[] = []
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    if (!line) continue
    
    // Section headings (## heading)
    if (line.startsWith('## ')) {
      const text = stripMarkdown(line.slice(3))
      elements.push(
        <Text key={`h-${i}`} style={styles.summaryHeading}>
          {text}
        </Text>
      )
      continue
    }
    
    // Bullet points
    if (isBulletPoint(line)) {
      const text = stripMarkdown(removeBulletMarker(line))
      elements.push(
        <Text key={`b-${i}`} style={styles.summaryBullet}>
          • {text}
        </Text>
      )
      continue
    }
    
    // Regular text
    const text = stripMarkdown(line)
    elements.push(
      <Text key={`p-${i}`} style={styles.summaryText}>
        {text}
      </Text>
    )
  }
  
  return elements
}

export const SprintReportDocument = ({ data, aiSummary }: SprintReportDocumentProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>{data.sprint?.name ?? 'Sprint Report'}</Text>
        <Text style={styles.subtitle}>
          {formatDate(data.sprint?.startDate)} — {formatDate(data.sprint?.endDate)} ·{' '}
          {data.sprint?.goal ?? 'No goal provided'}
        </Text>
      </View>

      <View style={styles.grid}>
        <View style={styles.card}>
          <Text style={styles.label}>Tasks assigned</Text>
          <Text style={styles.metric}>{data.aggregates.issueCount}</Text>
          <Text style={styles.submetric}>
            {data.aggregates.completedIssues} completed / {data.aggregates.incompleteIssues} open
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Original estimate</Text>
          <Text style={styles.metric}>{formatHours(data.aggregates.originalEstimateSeconds)}</Text>
          <Text style={styles.submetric}>
            Remaining {formatHours(data.aggregates.remainingEstimateSeconds)}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Time spent</Text>
          <Text style={styles.metric}>{formatHours(data.aggregates.timeSpentSeconds)}</Text>
        </View>

        {typeof data.aggregates.storyPointsTotal === 'number' && (
          <View style={styles.card}>
            <Text style={styles.label}>Story points</Text>
            <Text style={styles.metric}>{data.aggregates.storyPointsTotal}</Text>
          </View>
        )}
      </View>

      <Text style={styles.sectionTitle}>Status breakdown</Text>
      <View style={styles.statusList}>
        {Object.entries(data.aggregates.statusCounts).map(([status, count]) => (
          <View key={status} style={styles.statusRow}>
            <Text>{status}</Text>
            <Text>{count}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Issues</Text>
      <View>
        {data.issues.map((issue) => (
          <View key={issue.id} style={styles.issue}>
            <View>
              <Text>{issue.key}</Text>
              <Text style={styles.issueSummary}>{issue.fields.summary}</Text>
            </View>
            <View>
              <Text style={styles.badge}>{issue.fields.status?.name ?? 'Unknown'}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* AI Summary Section */}
      {aiSummary && (
        <View style={styles.summarySection} break>
          <Text style={styles.summaryHeader}>✨ AI Sprint Analysis</Text>
          {renderAISummary(aiSummary)}
        </View>
      )}
    </Page>
  </Document>
)

