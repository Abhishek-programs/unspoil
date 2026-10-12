export function suggestSipTarget(monthlyIncome: number, age: number | null): number | null {
  if (age == null || age <= 0) return null
  const yearsToRetire = Math.max(10, 60 - age)
  return monthlyIncome * 12 * yearsToRetire * 0.15
}
