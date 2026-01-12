'use client'

import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ConfigForm from '@/components/configForm/ConfigForm'
import ReportPreview from '@/components/reportPreview/ReportPreview'
import AISummary from '@/components/aiSummary/AISummary'
import { useSprintData } from '@/lib/hooks/useSprintData'
import { useConfigStore } from '@/lib/stores/configStore'
import { useAISummaryStore } from '@/lib/stores/aiSummaryStore'
import styles from './App.module.scss'

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  })

const PageContent = () => {
  const { data, isLoading, isFetching, error, refetch } = useSprintData()
  const sprintId = useConfigStore((state) => state.sprintId)
  const aiSummary = useAISummaryStore((state) => state.summary)

  const handleRefetch = async () => {
    await refetch()
  }

  const handleExport = async () => {
    if (!data) return
    try {
      const { exportSprintPdf } = await import('@/components/pdfDocument/exportPdf')
      await exportSprintPdf(data, aiSummary?.summary)
    } catch (error) {
      console.error('Failed to export PDF:', error)
    }
  }

  return (
    <div className={styles.app}>
      <header className={styles.hero}>
        <div>
          <p className={styles.kicker}>Sprint insights</p>
          <h1 className={styles.title}>Personal Jira sprint report</h1>
          <p className={styles.subtitle}>
            Connect to your Jira board, preview sprint stats, and export a clean PDF snapshot.
          </p>
        </div>
      </header>

      <main className={styles.layout}>
        <div className={styles.leftColumn}>
          <ConfigForm onRefresh={handleRefetch} />
          <AISummary sprintId={sprintId} />
        </div>
        <ReportPreview
          data={data}
          isLoading={isLoading || isFetching}
          error={error}
          onExport={handleExport}
        />
      </main>
    </div>
  )
}

export default function Page() {
  const [queryClient] = useState(createQueryClient)

  return (
    <QueryClientProvider client={queryClient}>
      <PageContent />
    </QueryClientProvider>
  )
}

