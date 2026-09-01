import { formatMoney } from '@/domain/pricing/money'
import type { BundleGroup } from '@/domain/bundle-engine'

interface BundleBadgeProps {
  group: BundleGroup
  memberCount: number
  aLaCarteValue: number
}

export function BundleBadge({ group, memberCount, aLaCarteValue }: BundleBadgeProps) {
  const savings = aLaCarteValue - group.price
  return (
    <li className="rounded-lg border border-emerald-300 bg-emerald-50 p-2 text-sm dark:border-emerald-700 dark:bg-emerald-950">
      <div className="flex items-center justify-between font-medium text-emerald-800 dark:text-emerald-300">
        <span>
          Bundle: {group.ruleName} ({memberCount} items)
        </span>
        <span>{formatMoney(group.price, 'IDR')}</span>
      </div>
      {savings > 0 && (
        <div className="text-xs text-emerald-700 dark:text-emerald-400">Saved {formatMoney(savings, 'IDR')}</div>
      )}
    </li>
  )
}
