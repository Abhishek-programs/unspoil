function dateAtMonthDay(year: number, month: number, day: number): Date {
  const lastDay = new Date(year, month + 1, 0).getDate()
  return new Date(year, month, Math.min(day, lastDay), 0, 0, 0, 0)
}

function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day, 0, 0, 0, 0)
}

export function toLocalDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getNextRegularMonthStart(after: Date, monthStartDay: number): Date {
  let candidate = dateAtMonthDay(after.getFullYear(), after.getMonth(), monthStartDay)
  if (candidate.getTime() <= after.getTime()) {
    candidate = dateAtMonthDay(after.getFullYear(), after.getMonth() + 1, monthStartDay)
  }
  return candidate
}

export function getEarlyMonthEnd(earlyStart: Date, monthStartDay: number): Date {
  const skippedBoundary = getNextRegularMonthStart(earlyStart, monthStartDay)
  const followingBoundary = getNextRegularMonthStart(skippedBoundary, monthStartDay)
  return new Date(followingBoundary.getTime() - 1)
}

// Returns the current playbook period. An early start skips the imminent regular
// boundary, then expires at the following configured boundary.
export function getMonthRange(
  monthStartDay: number,
  earlyMonthStartDate?: string | null,
  now = new Date(),
): { start: Date; end: Date } {
  if (earlyMonthStartDate) {
    const earlyStart = parseLocalDate(earlyMonthStartDate)
    const earlyEnd = getEarlyMonthEnd(earlyStart, monthStartDay)
    if (now >= earlyStart && now <= earlyEnd) {
      return { start: earlyStart, end: earlyEnd }
    }
  }

  const thisMonthStart = dateAtMonthDay(now.getFullYear(), now.getMonth(), monthStartDay)
  const start =
    now >= thisMonthStart
      ? thisMonthStart
      : dateAtMonthDay(now.getFullYear(), now.getMonth() - 1, monthStartDay)
  const nextStart = getNextRegularMonthStart(start, monthStartDay)
  return { start, end: new Date(nextStart.getTime() - 1) }
}

export function getPreviousMonthRange(
  monthStartDay: number,
  earlyMonthStartDate?: string | null,
  now = new Date(),
): { start: Date; end: Date } {
  const current = getMonthRange(monthStartDay, earlyMonthStartDate, now)
  if (earlyMonthStartDate) {
    const earlyStart = parseLocalDate(earlyMonthStartDate)
    const earlyEnd = getEarlyMonthEnd(earlyStart, monthStartDay)
    if (current.start.getTime() === earlyStart.getTime()) {
      return {
        start: getMonthRange(
          monthStartDay,
          null,
          new Date(earlyStart.getTime() - 1),
        ).start,
        end: new Date(earlyStart.getTime() - 1),
      }
    }
    if (current.start.getTime() === earlyEnd.getTime() + 1) {
      return { start: earlyStart, end: earlyEnd }
    }
  }
  const previousEnd = new Date(current.start.getTime() - 1)
  return {
    start: getMonthRange(monthStartDay, null, previousEnd).start,
    end: previousEnd,
  }
}

// Walks back `offset` whole periods from the one containing `now`.
export function getMonthRangeBack(
  monthStartDay: number,
  earlyMonthStartDate: string | null | undefined,
  offset: number,
  now = new Date(),
): { start: Date; end: Date } {
  let range = getMonthRange(monthStartDay, earlyMonthStartDate, now)
  for (let i = 0; i < offset; i++) {
    range = getPreviousMonthRange(monthStartDay, earlyMonthStartDate, range.start)
  }
  return range
}

export function getDaysUntilNextRegularStart(
  monthStartDay: number,
  now = new Date(),
): number {
  const nextStart = getNextRegularMonthStart(now, monthStartDay)
  return Math.ceil((nextStart.getTime() - now.getTime()) / 86400000)
}

export function getDaysRemaining(
  monthStartDay: number,
  earlyMonthStartDate?: string | null,
): number {
  const { end } = getMonthRange(monthStartDay, earlyMonthStartDate)
  const now = new Date()
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86400000))
}
