import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from './App'
import { CheckoutScreen } from './features/checkout/screens/CheckoutScreen'
import { AdminLayout } from './features/admin/AdminLayout'
import { CategoriesScreen } from './features/admin/screens/CategoriesScreen'
import { FandomsScreen } from './features/admin/screens/FandomsScreen'
import { CharactersScreen } from './features/admin/screens/CharactersScreen'
import { ItemsScreen } from './features/admin/screens/ItemsScreen'
import { BundleRulesScreen } from './features/admin/screens/BundleRulesScreen'
import { EventsScreen } from './features/admin/screens/EventsScreen'
import { BackupScreen } from './features/admin/screens/BackupScreen'
import { SyncScreen } from './features/sync/screens/SyncScreen'
import { ReportingScreen } from './features/reporting/screens/ReportingScreen'

export function AppRouter() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/checkout" replace />} />
          <Route path="/checkout" element={<CheckoutScreen />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="categories" replace />} />
            <Route path="categories" element={<CategoriesScreen />} />
            <Route path="fandoms" element={<FandomsScreen />} />
            <Route path="characters" element={<CharactersScreen />} />
            <Route path="items" element={<ItemsScreen />} />
            <Route path="bundle-rules" element={<BundleRulesScreen />} />
            <Route path="events" element={<EventsScreen />} />
            <Route path="backup" element={<BackupScreen />} />
          </Route>
          <Route path="/sync" element={<SyncScreen />} />
          <Route path="/reports" element={<ReportingScreen />} />
          <Route path="*" element={<Navigate to="/checkout" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
