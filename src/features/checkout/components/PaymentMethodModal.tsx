import { useState } from 'react'
import { submitCheckout, InsufficientStockError, InsufficientCashError } from '@/domain/inventory/checkout'
import { formatMoney } from '@/domain/pricing/money'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import type { CartLine } from '@/stores/cartStore'
import type { Transaction } from '@/db/schema-types'

interface PaymentMethodModalProps {
  eventId: string
  lines: CartLine[]
  total: number
  onClose: () => void
  onComplete: (transaction: Transaction) => void
}

export function PaymentMethodModal({ eventId, lines, total, onClose, onComplete }: PaymentMethodModalProps) {
  const [method, setMethod] = useState<'cash' | 'qr' | null>(null)
  const [cashReceivedInput, setCashReceivedInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Blank means "gave exact change" — no cashReceived at all, not zero. A non-blank
  // value that still fails to parse (e.g. a bare "-" or "e" mid-entry) is neither
  // blank nor a valid number — don't silently treat it as either.
  const cashInputTrimmed = cashReceivedInput.trim()
  const cashReceived = cashInputTrimmed === '' ? undefined : Number(cashInputTrimmed)
  const cashInvalid = cashInputTrimmed !== '' && !Number.isFinite(cashReceived)
  const changeDue = cashReceived !== undefined && cashReceived >= total ? cashReceived - total : null
  const cashTooLow = cashReceived !== undefined && Number.isFinite(cashReceived) && cashReceived < total

  async function handleConfirm() {
    if (!method) return
    if (method === 'cash' && cashInvalid) {
      setError('Enter a valid cash amount, or leave it blank for exact change.')
      return
    }
    if (method === 'cash' && cashTooLow) {
      setError('Cash received is less than the total.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const transaction = await submitCheckout({
        eventId,
        lines,
        paymentMethod: method,
        cashReceived: method === 'cash' ? cashReceived : undefined,
      })
      onComplete(transaction)
    } catch (e) {
      if (e instanceof InsufficientStockError) {
        setError('Stock changed since you added this item — go back and adjust the cart.')
      } else if (e instanceof InsufficientCashError) {
        // The total was recomputed fresh at submit time and came out higher than what
        // was shown when cash was entered (rules/stock changed mid-checkout) — the
        // amount typed is now short, so ask the operator to re-enter rather than retry.
        setError(`Total changed to ${formatMoney(e.totalPrice, 'IDR')} — re-enter the cash received.`)
      } else {
        // submitCheckout already retried once internally — this is the second failure,
        // so show real diagnostic detail (screenshot-able) rather than a bare "try again".
        console.error('Checkout failed after retry', e)
        const detail = e instanceof Error ? `${e.name}: ${e.message}` : String(e)
        setError(`Checkout failed — ${detail}. Please try again.`)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open title="Payment Method" onClose={onClose}>
      <div className="mb-4 text-center text-2xl font-semibold">{formatMoney(total, 'IDR')}</div>
      <div className="mb-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setMethod('cash')}
          className={`rounded-xl border-2 py-6 text-lg font-medium ${
            method === 'cash' ? 'border-zinc-900 bg-zinc-100 dark:border-zinc-50 dark:bg-zinc-700' : 'border-zinc-200 dark:border-zinc-700'
          }`}
        >
          Cash
        </button>
        <button
          type="button"
          onClick={() => setMethod('qr')}
          className={`rounded-xl border-2 py-6 text-lg font-medium ${
            method === 'qr' ? 'border-zinc-900 bg-zinc-100 dark:border-zinc-50 dark:bg-zinc-700' : 'border-zinc-200 dark:border-zinc-700'
          }`}
        >
          QR
        </button>
      </div>

      {method === 'cash' && (
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Cash received (leave blank for exact change)
          </label>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            autoFocus
            placeholder={formatMoney(total, 'IDR')}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-base text-zinc-900 focus:border-zinc-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
            value={cashReceivedInput}
            onChange={(e) => setCashReceivedInput(e.target.value)}
          />
          {changeDue !== null && (
            <p className="mt-2 text-sm text-zinc-500">Change due: {formatMoney(changeDue, 'IDR')}</p>
          )}
          {cashTooLow && <p className="mt-2 text-sm text-red-600">That's less than the total.</p>}
        </div>
      )}

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button onClick={handleConfirm} disabled={!method || submitting || (method === 'cash' && (cashTooLow || cashInvalid))}>
          {submitting ? 'Processing…' : 'Confirm'}
        </Button>
      </div>
    </Modal>
  )
}
