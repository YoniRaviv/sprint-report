import type { Metadata } from 'next'
import './globals.scss'

export const metadata: Metadata = {
  title: 'Sprint Report',
  description: 'Personal Jira sprint report with AI summaries',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}


