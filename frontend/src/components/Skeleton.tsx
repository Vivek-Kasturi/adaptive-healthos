// ── Reusable skeleton loader primitives ──────────────────────────────────────

function Bone({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:400%_100%] rounded-xl ${className}`}
      style={{ backgroundImage: 'linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%)', animation: 'shimmer 1.5s infinite' }}
    />
  )
}

// ── Page-level skeletons ──────────────────────────────────────────────────────

export function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-2">
          <Bone className="h-8 w-56" />
          <Bone className="h-4 w-36" />
        </div>
        <Bone className="h-14 w-24" />
      </div>
      {/* XP bar */}
      <Bone className="h-16 w-full" />
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Bone className="h-20" />
        <Bone className="h-20" />
        <Bone className="h-20" />
      </div>
      {/* Quick log */}
      <Bone className="h-28 w-full" />
      {/* Agent status */}
      <Bone className="h-44 w-full" />
    </div>
  )
}

export function PlansSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Bone className="h-7 w-32" />
        <Bone className="h-9 w-24" />
      </div>
      <Bone className="h-11 w-full rounded-2xl" />
      <Bone className="h-52 w-full" />
      <Bone className="h-36 w-full" />
      <Bone className="h-28 w-full" />
    </div>
  )
}

export function ProgressSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Bone className="h-7 w-28" />
          <Bone className="h-4 w-52" />
        </div>
        <Bone className="h-8 w-28 rounded-full" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Bone className="h-24" />
        <Bone className="h-24" />
        <Bone className="h-24" />
      </div>
      <Bone className="h-16 w-full" />
      <Bone className="h-60 w-full" />
      <Bone className="h-40 w-full" />
    </div>
  )
}

export function AchievementsSkeleton() {
  return (
    <div className="space-y-4">
      <Bone className="h-7 w-44" />
      <Bone className="h-28 w-full" />
      <div className="grid grid-cols-3 gap-3">
        <Bone className="h-20" />
        <Bone className="h-20" />
        <Bone className="h-20" />
      </div>
      <div>
        <div className="flex items-center justify-between mb-3">
          <Bone className="h-5 w-40" />
          <Bone className="h-6 w-24 rounded-full" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Bone key={i} className="h-24" />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Inline error / empty states ───────────────────────────────────────────────

export function ErrorState({ message, onRetry }: { message?: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center space-y-4">
      <div className="w-16 h-16 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-3xl">
        ⚠️
      </div>
      <div>
        <p className="text-slate-800 font-semibold">Couldn't load data</p>
        <p className="text-slate-400 text-sm mt-1">{message || 'Check your connection and try again.'}</p>
      </div>
      <button
        onClick={onRetry}
        className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-sm"
      >
        ↺ Retry
      </button>
    </div>
  )
}

export function EmptyState({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center space-y-3">
      <div className="w-16 h-16 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-3xl">
        {icon}
      </div>
      <div>
        <p className="text-slate-700 font-semibold">{title}</p>
        <p className="text-slate-400 text-sm mt-1">{body}</p>
      </div>
    </div>
  )
}
