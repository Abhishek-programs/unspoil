// Formats amount in Indian lakh notation: 150000 → "1,50,000"
export function formatNPR(amount: number): string {
  if (amount < 0) return '-' + formatNPR(-amount)
  const str = Math.round(amount).toString()
  if (str.length <= 3) return str
  const last3 = str.slice(-3)
  const rest = str.slice(0, -3)
  // Apply lakh grouping (groups of 2) to the rest
  const grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')
  return grouped + ',' + last3
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
