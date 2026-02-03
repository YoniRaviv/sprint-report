import { pdf } from '@react-pdf/renderer'
import type { SprintReportData } from '@/types/jira'
import { SprintReportDocument } from './SprintReportDocument'

export const exportSprintPdf = async (data: SprintReportData, aiSummary?: string) => {
  if (!data) {
    throw new Error('No sprint data provided for PDF export')
  }

  try {
    const instance = pdf(<SprintReportDocument data={data} aiSummary={aiSummary} />)
    const blob = await instance.toBlob()
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = `${data.sprint?.name ?? 'sprint-report'}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    setTimeout(() => {
      URL.revokeObjectURL(url)
    }, 100)
  } catch (error) {
    console.error('PDF export failed:', error)
    throw new Error('Failed to generate PDF. Please try again.')
  }
}

