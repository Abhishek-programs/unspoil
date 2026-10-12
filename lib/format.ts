// Formats amount in Indian lakh notation: 150000 → "1,50,000"
// Keeps up to 3 decimals when present (150.5 → "150.5", 150.125 → "150.125"); omits .00
export function formatNPR(amount: number): string {
  if (amount < 0) return '-' + formatNPR(-amount)
  // Cap at 3 dp so float noise doesn't invent extra digits
  const scaled = Math.round(amount * 1000)
  const intPart = Math.floor(scaled / 1000)
  const fracPart = scaled % 1000
  const str = intPart.toString()
  let formatted: string
  if (str.length <= 3) {
    formatted = str
  } else {
    const last3 = str.slice(-3)
    const rest = str.slice(0, -3)
    const grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')
    formatted = grouped + ',' + last3
  }
  if (fracPart > 0) {
    formatted += '.' + fracPart.toString().padStart(3, '0').replace(/0+$/, '')
  }
  return formatted
}

// Compact format: 150000 → "1.50L", 1000 → "1.00K"
export function formatNPRShort(amount: number): string {
  if (amount >= 100000) {
    const lakhs = amount / 100000
    return lakhs.toFixed(2) + 'L'
  }
  if (amount >= 1000) {
    const k = amount / 1000
    return k.toFixed(2) + 'K'
  }
  return amount.toFixed(2)
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
