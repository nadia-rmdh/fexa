import { NavLink, Outlet } from 'react-router-dom'

const ADMIN_TABS = [
  { to: 'categories', label: 'Categories' },
  { to: 'fandoms', label: 'Fandoms' },
  { to: 'characters', label: 'Characters' },
  { to: 'items', label: 'Items' },
  { to: 'bundle-rules', label: 'Bundle Rules' },
  { to: 'events', label: 'Events' },
  { to: 'backup', label: 'Backup' },
]

export function AdminLayout() {
  return (
    <div className="flex h-full flex-col">
      <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-zinc-200 px-2 pt-2 dark:border-zinc-800">
        {ADMIN_TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `shrink-0 rounded-t-lg px-3 py-2 text-sm font-medium ${
                isActive
                  ? 'bg-white text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
      <div className="min-h-0 flex-1 overflow-auto bg-white dark:bg-zinc-800">
        <Outlet />
      </div>
    </div>
  )
}
