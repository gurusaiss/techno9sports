import { createHmac, randomInt, timingSafeEqual } from "node:crypto"

export const OTP_LENGTH = 6
export const OTP_TTL_MS = 10 * 60 * 1000
export const OTP_MAX_ATTEMPTS = 5
export const OTP_RESEND_COOLDOWN_MS = 30 * 1000

export function generateOtp(): string {
  return randomInt(0, 10 ** OTP_LENGTH)
    .toString()
    .padStart(OTP_LENGTH, "0")
}

/** Keyed hash bound to phone + purpose, so a stolen hash can't be replayed elsewhere. Only this is stored. */
export function hashOtp(secret: string, phone: string, purpose: string, code: string): string {
  return createHmac("sha256", secret).update(`${purpose}:${phone}:${code}`).digest("hex")
}

export function otpMatches(expectedHash: string, actualHash: string): boolean {
  const a = Buffer.from(expectedHash, "hex")
  const b = Buffer.from(actualHash, "hex")
  return a.length === b.length && timingSafeEqual(a, b)
}

export type OtpVerdict =
  "ok" | "expired" | "too_many_attempts" | "already_used" | "wrong_code" | "no_challenge"

export interface ChallengeState {
  code_hash: string
  expires_at: Date | string
  attempts: number
  consumed_at: Date | string | null
}

/** Decides a verification attempt. The caller persists the attempt count and consumption. */
export function judgeOtp(
  challenge: ChallengeState | undefined,
  candidateHash: string,
  now = new Date(),
): OtpVerdict {
  if (!challenge) return "no_challenge"
  if (challenge.consumed_at) return "already_used"
  if (new Date(challenge.expires_at).getTime() <= now.getTime()) return "expired"
  if (challenge.attempts >= OTP_MAX_ATTEMPTS) return "too_many_attempts"
  return otpMatches(challenge.code_hash, candidateHash) ? "ok" : "wrong_code"
}
