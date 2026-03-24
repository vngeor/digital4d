// Input validation constants and helpers for API routes.

export const MAX_NAME = 100
export const MAX_EMAIL = 254 // RFC 5321
export const MAX_PASSWORD = 128 // bcrypt truncates at 72 bytes; prevent CPU waste
export const MAX_PHONE = 20
export const MAX_MESSAGE = 5000
export const MAX_ADDRESS = 500
export const MAX_CITY = 100
export const MAX_COUNTRY = 100

/**
 * Validates that a string does not exceed the maximum length.
 * Returns an error message string if validation fails, or null if valid.
 */
export function validateLength(
  value: string | null | undefined,
  fieldName: string,
  maxLength: number
): string | null {
  if (!value) return null // null/undefined/empty are valid (required checks are separate)
  if (value.length > maxLength) {
    return `${fieldName} must be ${maxLength} characters or less`
  }
  return null
}

/**
 * Validates a birth date string.
 * Returns an error message if invalid, or null if valid.
 */
export function validateBirthDate(value: string | null | undefined): string | null {
  if (!value) return null
  const date = new Date(value)
  if (isNaN(date.getTime())) {
    return "Invalid date format"
  }
  const now = new Date()
  if (date > now) {
    return "Birth date cannot be in the future"
  }
  const minDate = new Date("1900-01-01")
  if (date < minDate) {
    return "Invalid birth date"
  }
  return null
}

/**
 * Run multiple validations and return the first error, or null if all pass.
 */
export function firstError(...errors: (string | null)[]): string | null {
  return errors.find((e) => e !== null) ?? null
}
