import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/db'
import { useCategories, useCharacters, useEvents, useFandoms, useItems } from '@/hooks/useLiveCatalog'
import { computeEventSummary, buildEventReportCsv } from '@/domain/reporting/eventReport'
import type { NameLookups } from '@/domain/reporting/eventReport'
import { formatMoney } from '@/domain/pricing/money'
import { Button } from '@/components/ui/Button'

function slugify(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'event'
}

export function ReportingScreen() {
  const events = useEvents()
  const categories = useCategories()
  const fandoms = useFandoms()
  const characters = useCharacters()
  const items = useItems()
  const bundleRules = useLiveQuery(() => db.bundleRules.toArray(), [], [])
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)

  const activeEventId = selectedEventId ?? events?.[0]?.id ?? null
  const event = events?.find((e) => e.id === activeEventId)

  const transactions = useLiveQuery(
    async () => (activeEventId ? db.transactions.where('eventId').equals(activeEventId).toArray() : []),
    [activeEventId],
    [],
  )
  const inventory = useLiveQuery(
    async () => (activeEventId ? db.eventInventory.where('eventId').equals(activeEventId).toArray() : []),
    [activeEventId],
    [],
  )

  const lookups: NameLookups = useMemo(
    () => ({
      categoryName: (id) => categories?.find((c) => c.id === id)?.name ?? '(deleted category)',
      fandomName: (id) => fandoms?.find((f) => f.id === id)?.name ?? '(deleted fandom)',
      characterName: (id) => characters?.find((c) => c.id === id)?.name ?? '(deleted character)',
      bundleRuleName: (id) => bundleRules?.find((r) => r.id === id)?.name ?? '(deleted rule)',
    }),
    [categories, fandoms, characters, bundleRules],
  )

  const summary = useMemo(
    () => (event ? computeEventSummary(event, transactions, inventory, items ?? [], lookups) : null),
    [event, transactions, inventory, items, lookups],
  )

  function handleExport() {
    if (!event || !summary) return
    const csv = buildEventReportCsv(summary, transactions, lookups)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${slugify(event.name)}-report.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!events?.length) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-zinc-500">
        No events yet. Start one in Admin → Events to see reports here.
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Reports</h1>
        <div className="flex items-center gap-2">
          <select
            className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900"
            value={activeEventId ?? ''}
            onChange={(e) => setSelectedEventId(e.target.value)}
          >
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} {e.status === 'active' ? '(active)' : ''}
              </option>
            ))}
          </select>
          <Button onClick={handleExport} disabled={!summary}>
            Export CSV
          </Button>
        </div>
      </div>

      {!summary ? (
        <p className="py-6 text-center text-zinc-400">Loading…</p>
      ) : summary.transactionCount === 0 ? (
        <p className="py-6 text-center text-zinc-400">No sales recorded for this event yet.</p>
      ) : (
        <div className="space-y-6">
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Transactions" value={summary.transactionCount} />
            <Stat label="Units sold" value={summary.totalUnitsSold} />
            <Stat label="Free units" value={summary.freeUnitsCount} />
            <Stat label="Total revenue" value={formatMoney(summary.totalRevenue, 'IDR')} />
          </section>

          <ReportTable
            title="Revenue by Payment Method"
            columns={['Method', 'Transactions', 'Revenue']}
            rows={summary.paymentBreakdown.map((p) => [
              p.method === 'cash' ? 'Cash' : 'QR',
              String(p.transactionCount),
              formatMoney(p.revenue, 'IDR'),
            ])}
          />

          <ReportTable
            title="Best Sellers"
            columns={['Item', 'Units Sold', 'Revenue']}
            rows={summary.bestSellers.slice(0, 10).map((i) => [i.label, String(i.unitsSold), formatMoney(i.revenue, 'IDR')])}
          />

          <ReportTable
            title="Units Sold by Category"
            columns={['Category', 'Units Sold', 'Revenue']}
            rows={summary.categoryBreakdown.map((c) => [c.name, String(c.unitsSold), formatMoney(c.revenue, 'IDR')])}
          />

          {summary.bundleUsage.length > 0 && (
            <ReportTable
              title="Bundle Usage"
              columns={['Bundle Rule', 'Times Applied', 'Total Discount Given']}
              rows={summary.bundleUsage.map((b) => [b.ruleName, String(b.timesApplied), formatMoney(b.totalDiscount, 'IDR')])}
            />
          )}

          <div>
            <ReportTable
              title="Leftover Stock"
              columns={['Item', 'Starting Qty', 'Units Sold', 'Expected Remaining']}
              rows={summary.leftoverStock.map((s) => [s.label, String(s.startingQty), String(s.unitsSold), String(s.remainingQty)])}
            />
            <p className="mt-1 text-xs text-zinc-400">
              "Expected Remaining" is what the system tracked — count what's physically left in each box and compare.
              A mismatch usually means a manual stock adjustment or a miscount somewhere.
            </p>
          </div>

          <p className="text-xs text-zinc-400">
            "Export CSV" includes everything above plus units by fandom/character and the full itemized transaction log.
          </p>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  )
}

function ReportTable({ title, columns, rows }: { title: string; columns: string[]; rows: string[][] }) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-zinc-500">{title}</h2>
      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-800">
            <tr>
              {columns.map((c) => (
                <th key={c} className="px-3 py-2 font-medium text-zinc-500">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-3 text-center text-zinc-400">
                  No data
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j} className="px-3 py-2">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
