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
