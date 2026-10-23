/**
 * Indian mobile numbers. Returns the E.164 form (+91XXXXXXXXXX) or null if the input is not a
 * valid Indian mobile (10 digits starting 6 to 9, optionally with +91, 91 or a leading 0).
 */
export function normalizeIndianMobile(input: string | null | undefined): string | null {
  if (!input) return null
  let digits = input.replace(/[\s\-().]/g, "")
  if (digits.startsWith("+")) digits = digits.slice(1)
  if (!/^\d+$/.test(digits)) return null
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2)
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1)
  return /^[6-9]\d{9}$/.test(digits) ? `+91${digits}` : null
}

/** "+919876543210" to "+91******3210" for logs/messages. */
export function maskPhone(e164: string): string {
  return `${e164.slice(0, 3)}******${e164.slice(-4)}`
}
