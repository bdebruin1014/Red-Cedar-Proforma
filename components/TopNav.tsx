'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function TopNav() {
  const pathname = usePathname()
  const isSL = pathname.startsWith('/sl') || pathname.startsWith('/deal')
  const isBTR = pathname.startsWith('/btr')

  return (
    <header className="border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo + Platform Name */}
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cedar-600 flex items-center justify-center">
              <span className="text-white font-display text-sm">RC</span>
            </div>
            <span className="font-display text-lg text-slate-100">Red Cedar</span>
          </Link>

          {/* Module Tabs */}
          <nav className="flex items-center gap-1">
            <Link
              href="/sl"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                isSL
                  ? 'bg-cedar-600/20 text-cedar-300 border border-cedar-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              SL Deal Analyzer
            </Link>
            <Link
              href="/btr"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                isBTR
                  ? 'bg-cedar-600/20 text-cedar-300 border border-cedar-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              BTR Proforma
            </Link>
          </nav>

          {/* Right side placeholder for user menu */}
          <div className="w-8" />
        </div>
      </div>
    </header>
  )
}
