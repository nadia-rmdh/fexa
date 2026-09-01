import type { ReactNode } from 'react'

interface TileProps {
  label: string
  imageUrl?: string
  badge?: ReactNode
  disabled?: boolean
  onClick: () => void
}

export function Tile({ label, imageUrl, badge, disabled, onClick }: TileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="relative flex aspect-square flex-col items-center justify-end overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 text-center shadow-sm active:scale-95 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-800"
    >
      {imageUrl ? (
        <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center text-3xl font-semibold text-zinc-400">
          {label.charAt(0).toUpperCase()}
        </span>
      )}
      {badge && <span className="absolute right-1 top-1 z-10">{badge}</span>}
      <span className="relative z-10 w-full bg-black/60 px-1 py-1 text-xs font-medium text-white">{label}</span>
    </button>
  )
}
