/**
 * Calculate Orthodox Easter date for a given year using the Julian calendar computus.
 * Also known as the Meeus Julian algorithm.
 * Returns a Date object in the Gregorian calendar.
 */
export function getOrthodoxEasterDate(year: number): Date {
  const a = year % 4
  const b = year % 7
  const c = year % 19
  const d = (19 * c + 15) % 30
  const e = (2 * a + 4 * b - d + 34) % 7
  const month = Math.floor((d + e + 114) / 31) // 3 = March, 4 = April (Julian)
  const day = ((d + e + 114) % 31) + 1

  // Convert from Julian to Gregorian calendar
  // For years 2000-2099, the difference is 13 days
  const julianDate = new Date(year, month - 1, day)
  const centuryOffset = getJulianToGregorianOffset(year)
  julianDate.setDate(julianDate.getDate() + centuryOffset)

  return julianDate
}

/**
 * Get the number of days to add to convert Julian date to Gregorian date.
 * This offset changes per century based on the Gregorian calendar reform.
 */
function getJulianToGregorianOffset(year: number): number {
  // Century-based offset table
  if (year >= 2100) return 14
  if (year >= 1900) return 13
  if (year >= 1800) return 12
  if (year >= 1700) return 11
  if (year >= 1582) return 10
  return 0 // Before Gregorian reform
}
