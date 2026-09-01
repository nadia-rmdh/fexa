// All prices are stored/manipulated as integers in the catalog's minor currency
// unit (e.g. cents, or whole Rupiah since IDR has no minor unit) — never floats,
// to avoid binary floating-point rounding errors accumulating across a cart total.

export function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'IDR' ? 0 : 2,
  }).format(amount)
}
