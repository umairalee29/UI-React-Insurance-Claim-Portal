export default function StatsLoading() {
  return (
    <div className="w-full space-y-6">
      {/* Page title */}
      <div className="space-y-1.5">
        <div className="h-7 w-32 bg-gray-200 rounded-lg animate-pulse" />
        <div className="h-4 w-56 bg-gray-100 rounded-lg animate-pulse" />
      </div>

      {/* Hero banner */}
      <div className="rounded-xl bg-gradient-to-br from-primary to-primary/75 px-8 py-6 grid grid-cols-3 divide-x divide-white/20">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-8 first:pl-0 last:pr-0">
            <div className="w-11 h-11 rounded-xl bg-white/10 shrink-0 animate-pulse" />
            <div className="space-y-2 flex-1">
              <div className="h-3 w-24 bg-white/20 rounded-full animate-pulse" />
              <div className="h-8 w-20 bg-white/30 rounded-lg animate-pulse" />
              <div className="h-3 w-36 bg-white/15 rounded-full animate-pulse" />
            </div>
          </div>
        ))}
      </div>

      {/* KPI cards grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 border-t-2 border-t-gray-200 shadow-sm p-5 flex flex-col gap-4">
            <div className="w-10 h-10 rounded-lg bg-gray-100 animate-pulse" />
            <div className="space-y-2">
              <div className="h-3 w-20 bg-gray-100 rounded-full animate-pulse" />
              <div className="h-7 w-16 bg-gray-200 rounded-lg animate-pulse" />
            </div>
          </div>
        ))}
      </div>

      {/* Chart cards */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Donut chart skeleton */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="h-4 w-36 bg-gray-200 rounded-lg animate-pulse" />
          </div>
          <div className="flex items-center gap-8 px-6 py-5">
            <div className="shrink-0 w-44 h-44 flex items-center justify-center">
              <div className="relative w-40 h-40">
                <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
                  <circle cx="80" cy="80" r="60" fill="none" stroke="#f3f4f6" strokeWidth="28" />
                  <circle
                    cx="80" cy="80" r="60" fill="none"
                    stroke="#e5e7eb" strokeWidth="28"
                    strokeDasharray="188 189"
                    className="animate-pulse"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
                  <div className="h-7 w-10 bg-gray-200 rounded-lg animate-pulse" />
                  <div className="h-3 w-8 bg-gray-100 rounded-full animate-pulse" />
                </div>
              </div>
            </div>
            <div className="flex-1 space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-200 shrink-0 animate-pulse" />
                  <div className="h-3 w-20 bg-gray-100 rounded-full animate-pulse" />
                  <div className="flex-1 h-2 bg-gray-100 rounded-full animate-pulse" />
                  <div className="h-3 w-6 bg-gray-200 rounded-full animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bar chart skeleton */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="h-4 w-32 bg-gray-200 rounded-lg animate-pulse" />
          </div>
          <div className="flex-1 flex flex-col justify-between px-6 py-5">
            {[90, 65, 45, 75, 55].map((w, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-gray-200 shrink-0 animate-pulse" />
                <div className="h-3 w-20 bg-gray-100 rounded-full animate-pulse" />
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-2 bg-gray-200 rounded-full animate-pulse"
                    style={{ width: `${w}%` }}
                  />
                </div>
                <div className="h-3 w-6 bg-gray-200 rounded-full animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
