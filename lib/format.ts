import { currencyByCode } from '@/constants/currencies'

/** NPR paisa — two decimal places. */
export function roundPaisa(amount: number): number {
  return Math.round(amount * 100) / 100
}

let activeCurrency = 'NPR'

export function setActiveCurrency(code: string) {
  const next = currencyByCode(code).code
  activeCurrency = next
}

export function getActiveCurrency(): string {
  return activeCurrency
}

function groupSouthAsian(intPart: number): string {
  const str = String(intPart)
  if (str.length <= 3) return str
  const last3 = str.slice(-3)
  const rest = str.slice(0, -3)
  return rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3
}

function groupWestern(intPart: number): string {
  return String(intPart).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/** Number only, in the active currency's grouping. Omits trailing zeros. */
export function formatAmount(amount: number, code = activeCurrency): string {
  if (amount < 0) return '-' + formatAmount(-amount, code)
  const currency = currencyByCode(code)
  const digits = currency.decimals
  const factor = 10 ** digits
  const scaled = Math.round(amount * factor)
  const intPart = Math.floor(scaled / factor)
  const fracPart = scaled % factor
  const grouped = currency.southAsian ? groupSouthAsian(intPart) : groupWestern(intPart)
  if (digits === 0 || fracPart === 0) return grouped
  const frac = fracPart.toString().padStart(digits, '0').replace(/0+$/, '')
  return `${grouped}.${frac}`
}

export function formatNPR(amount: number): string {
  return formatAmount(amount)
}

export function formatAmountShort(amount: number, code = activeCurrency): string {
  const currency = currencyByCode(code)
  const sign = amount < 0 ? '-' : ''
  const abs = Math.abs(amount)
  if (currency.southAsian) {
    if (abs >= 100000) return sign + (abs / 100000).toFixed(2) + 'L'
    if (abs >= 1000) return sign + (abs / 1000).toFixed(2) + 'K'
    return sign + formatAmount(abs, code)
  }
  if (abs >= 1_000_000) return sign + (abs / 1_000_000).toFixed(2) + 'M'
  if (abs >= 1000) return sign + (abs / 1000).toFixed(2) + 'K'
  return sign + formatAmount(abs, code)
}

export function formatNPRShort(amount: number): string {
  return formatAmountShort(amount)
}

export function formatMoney(amount: number, code = activeCurrency): string {
  const currency = currencyByCode(code).code
  if (amount < 0) return `-${currency} ${formatAmount(-amount, currency)}`
  return `${currency} ${formatAmount(amount, currency)}`
}

export function formatMoneyShort(amount: number, code = activeCurrency): string {
  const currency = currencyByCode(code).code
  if (amount < 0) return `-${currency} ${formatAmountShort(-amount, currency)}`
  return `${currency} ${formatAmountShort(amount, currency)}`
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const FULL_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

// "15 Apr"
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`
}

// "April 2026"
export function formatMonth(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return `${FULL_MONTHS[d.getMonth()]} ${d.getFullYear()}`
}
