import { useImageUrl } from '@/hooks/useImageUrl'
import { Tile } from '@/components/ui/Tile'

interface StockAwareTileProps {
  label: string
  imageId?: string
  available: number
  low: boolean
  onTap: () => void
}

/** A tappable item tile with a stock badge: gray "Out" at zero, amber at/below the
 *  low-stock threshold, dark otherwise — shared between the tap-grid and the
 *  Frequent/Recent shelf so the same at-a-glance stock language appears everywhere. */
export function StockAwareTile({ label, imageId, available, low, onTap }: StockAwareTileProps) {
  const url = useImageUrl(imageId)
  const badgeClass = available <= 0 ? 'bg-zinc-600' : low ? 'bg-amber-500' : 'bg-zinc-900/80'
  return (
    <Tile
      label={label}
      imageUrl={url}
      disabled={available <= 0}
      onClick={onTap}
      badge={
        <span className={`rounded-full ${badgeClass} px-1.5 py-0.5 text-[10px] font-semibold text-white`}>
          {available <= 0 ? 'Out' : available}
        </span>
      }
    />
  )
}
