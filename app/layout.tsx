import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Red Cedar Platform',
  description: 'RCH Deal Analyzer + RCC BTR Proforma',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300..700;1,9..40,300..700&family=DM+Serif+Display&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-slate-950 text-slate-100 font-body antialiased min-h-screen">
        {children}
      </body>
    </html>
  )
}
