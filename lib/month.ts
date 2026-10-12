// Returns the start and end Date for the current "month" based on the user's month start day.
// e.g. if monthStartDay = 25, the month runs from the 25th of last month to the 24th of this month.
export function getMonthRange(monthStartDay: number): { start: Date; end: Date } {
  const now = new Date()
  const today = now.getDate()

  let start: Date
  if (today >= monthStartDay) {
    start = new Date(now.getFullYear(), now.getMonth(), monthStartDay, 0, 0, 0, 0)
  } else {
    // Start day hasn't arrived yet this calendar month — use last month's start day
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, monthStartDay, 0, 0, 0, 0)
    start = prevMonth
  }

  // End = day before next period's start
  const end = new Date(start.getFullYear(), start.getMonth() + 1, monthStartDay - 1, 23, 59, 59, 999)
  return { start, end }
}
