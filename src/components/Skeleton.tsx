/** Skeleton (loading) barrinha cinza animada. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-zinc-800 rounded ${className}`} />
}

/** Card placeholder para listas de conversas/áudios/templates. */
export function CardSkeleton() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-10" />
      </div>
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-8 w-full mt-2" />
    </div>
  )
}

/** Linha vazia genérica (uma conversa na lista lateral). */
export function RowSkeleton() {
  return (
    <div className="px-4 py-3.5 border-b border-zinc-800/60 flex items-center gap-2.5">
      <Skeleton className="w-9 h-9 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-2.5 w-full" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  )
}

/** Mensagem vazia genérica reutilizável. */
export function EmptyState({ icon, title, hint, action }: {
  icon: React.ReactNode
  title: string
  hint?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4">
      <div className="w-14 h-14 rounded-2xl bg-zinc-800/60 border border-zinc-800 flex items-center justify-center text-zinc-600 mb-3">
        {icon}
      </div>
      <p className="text-sm font-medium text-zinc-300">{title}</p>
      {hint && <p className="text-xs text-zinc-500 mt-1 max-w-xs">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
