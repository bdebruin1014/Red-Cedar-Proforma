import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center">
        <div className="w-16 h-16 rounded-xl bg-cedar-600 flex items-center justify-center mx-auto mb-6">
          <span className="text-white font-display text-2xl">RC</span>
        </div>
        <h1 className="font-display text-3xl text-slate-100 mb-2">Red Cedar Platform</h1>
        <p className="text-slate-500 mb-10">Underwriting and project management tools</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/sl" className="card p-6 hover:border-cedar-600/40 transition-all duration-200 text-left group">
            <div className="text-xs text-cedar-400 uppercase tracking-wider font-medium mb-2">RCH</div>
            <h2 className="font-display text-xl text-slate-100 mb-2 group-hover:text-cedar-300 transition-colors">SL Deal Analyzer</h2>
            <p className="text-sm text-slate-500">Scattered lot buy/build/sell underwriting. Individual lot analysis with floor plan selection, cost modeling, and sensitivity analysis.</p>
          </Link>

          <Link href="/btr" className="card p-6 hover:border-cedar-600/40 transition-all duration-200 text-left group">
            <div className="text-xs text-cedar-400 uppercase tracking-wider font-medium mb-2">RCC</div>
            <h2 className="font-display text-xl text-slate-100 mb-2 group-hover:text-cedar-300 transition-colors">BTR Proforma</h2>
            <p className="text-sm text-slate-500">Build-to-rent project underwriting. Development budgets, unit mix, S-curve timelines, questionnaire intake, and bid tracking.</p>
          </Link>
        </div>
      </div>
    </div>
  )
}
