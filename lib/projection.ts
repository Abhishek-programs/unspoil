import { addMonths, format } from 'date-fns'

interface ProjectionResult {
  monthsRemaining: number
  projectedDate: string
  nudge?: {
    amount: number
    monthsSaved: number
  }
}

/**
 * Projects a goal's completion date based on current contribution.
 * Simple linear math: (Target - Current) / MonthlyContribution
 */
export function projectGoal(params: {
  target: number
  current: number
  monthly: number
}): ProjectionResult {
  const { target, current, monthly } = params
  
  if (monthly <= 0) {
    return { monthsRemaining: Infinity, projectedDate: 'Never' }
  }

  const remaining = Math.max(0, target - current)
  const monthsRemaining = Math.ceil(remaining / monthly)
  const projectedDate = format(addMonths(new Date(), monthsRemaining), 'MMM yyyy')

  // Generate a sensitivity nudge: "What if I added NPR 2,000?"
  // Only nudge if it reduces the timeline by at least 1 month and we are at least 3 months away
  let nudge
  if (monthsRemaining >= 3) {
    const nudgeAmount = 2000 // Fixed nudge increment for now
    const hypotheticalMonths = Math.ceil(remaining / (monthly + nudgeAmount))
    const monthsSaved = monthsRemaining - hypotheticalMonths
    
    if (monthsSaved >= 1) {
      nudge = {
        amount: nudgeAmount,
        monthsSaved
      }
    }
  }

  return {
    monthsRemaining,
    projectedDate,
    nudge
  }
}
