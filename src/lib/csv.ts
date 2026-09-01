/** Escapes a single CSV field per RFC 4180: wrap in quotes and double up any quotes
 *  if the value contains a comma, quote, or newline; otherwise return it as-is. */
export function csvEscape(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return ''
  const str = String(value)
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function csvRow(values: (string | number | undefined | null)[]): string {
  return values.map(csvEscape).join(',')
}
