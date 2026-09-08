import { NavLink, Outlet } from 'react-router-dom'
import { UpdateToast } from '@/components/ui/UpdateToast'

const NAV_ITEMS = [
  { to: '/checkout', label: 'Checkout' },
  { to: '/admin', label: 'Admin' },
  { to: '/sync', label: 'Sync' },
  { to: '/reports', label: 'Reports' },
]

export function AppLayout() {
  return (
    <div className="relative flex h-dvh flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-50">
      {/* Brand mascot watermark — fixed to the viewport (not a layout child) so it sits
          behind every screen consistently. main/nav have no background of their own, so
          it quietly shows through wherever a screen doesn't cover it with an opaque card.
          No z-index here on purpose: a *negative* one (tried first) sinks the element
          behind this div's own background paint, since this div is `relative` with no
          z-index of its own and so never opens a stacking context — z-index:auto plus
          DOM order (this is the first child) is what keeps it above the background but
          below every sibling that follows. */}
      <img
        src="/mascot.png"
        alt=""
        aria-hidden="true"
        className="pointer-events-none fixed bottom-0 left-0 h-1/3 w-auto select-none opacity-10"
      />
      <UpdateToast />
      <main className="min-h-0 flex-1 overflow-auto">
        <Outlet />
      </main>
      <nav className="flex shrink-0 border-t border-zinc-200 dark:border-zinc-800">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex-1 py-4 text-center text-lg font-medium ${
                isActive
                  ? 'bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900'
                  : 'text-zinc-600 dark:text-zinc-400'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
