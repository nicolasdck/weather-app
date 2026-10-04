import { GlassCard } from './GlassCard'

function Bone({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-white/20 ${className}`} />
}

export function WeatherSkeleton() {
  return (
    <div role="status" aria-busy="true" className="space-y-4">
      <span className="sr-only">Chargement de la météo…</span>

      <GlassCard className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Bone className="h-7 w-40" />
            <Bone className="h-4 w-28" />
          </div>
          <Bone className="h-8 w-28 rounded-full" />
        </div>
        <div className="mt-6 flex items-center justify-between">
          <div className="space-y-3">
            <Bone className="h-20 w-36 rounded-2xl" />
            <Bone className="h-5 w-44" />
            <Bone className="h-4 w-52" />
          </div>
          <Bone className="size-24 rounded-full sm:size-32" />
        </div>
        <Bone className="mt-6 h-46.5 rounded-2xl" />
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Bone key={index} className="h-26 rounded-2xl" />
          ))}
        </div>
        <Bone className="mt-3 h-17.5 rounded-2xl" />
      </GlassCard>

      <GlassCard>
        <Bone className="mb-4 h-4 w-44" />
        <div className="space-y-3">
          {Array.from({ length: 7 }, (_, index) => (
            <Bone key={index} className="h-10" />
          ))}
        </div>
      </GlassCard>
    </div>
  )
}
