import { useUiStore } from '@/stores/uiStore'

export function UpdateToast() {
  const updateAvailable = useUiStore((s) => s.updateAvailable)
  const applyUpdate = useUiStore((s) => s.applyUpdate)

  if (!updateAvailable) return null

  return (
    <div className="absolute inset-x-0 top-0 z-50 flex items-center justify-between gap-3 bg-amber-500 px-4 py-2 text-sm font-medium text-amber-950">
      <span>An update is ready to install.</span>
      <button
        type="button"
        onClick={() => applyUpdate?.()}
        className="rounded bg-amber-950 px-3 py-1 text-amber-50"
      >
        Update now
      </button>
    </div>
  )
}
