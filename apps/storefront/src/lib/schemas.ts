import { z } from "zod"

/** Indian mobile: 10 digits starting 6-9, with optional +91, 91 or 0 in front. Returns the 10 digits. */
export function tenDigitMobile(input: string): string | null {
  let d = input.replace(/[\s\-().]/g, "")
  if (d.startsWith("+")) d = d.slice(1)
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2)
  else if (d.length === 11 && d.startsWith("0")) d = d.slice(1)
  return /^[6-9]\d{9}$/.test(d) ? d : null
}

export const phoneField = z
  .string()
  .trim()
  .transform((v, ctx) => {
    const d = tenDigitMobile(v)
    if (!d) ctx.addIssue({ code: "custom", message: "Enter a valid 10-digit mobile number" })
    return d ?? ""
  })

export const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address")
  .max(120)

export const pincodeField = z
  .string()
  .trim()
  .regex(/^[1-9]\d{5}$/, "Enter a 6-digit pincode")

const name = z.string().trim().min(1, "Required").max(60)

export const addressSchema = z.object({
  first_name: name,
  last_name: name,
  phone: phoneField,
  address_1: z.string().trim().min(5, "Enter your house or flat and street").max(120),
  address_2: z.string().trim().max(120).optional().default(""),
  city: z.string().trim().min(2, "Enter your city").max(60),
  province: z.string().trim().min(2, "Choose your state").max(60),
  postal_code: pincodeField,
})
export type AddressInput = z.infer<typeof addressSchema>

export const passwordField = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(100)
  .refine((p) => /[a-zA-Z]/.test(p) && /\d/.test(p), "Use letters and at least one number")

export const registerSchema = z.object({
  first_name: name,
  last_name: name.optional().default(""),
  email: emailField,
  password: passwordField,
})
export const loginSchema = z.object({ email: emailField, password: z.string().min(1).max(100) })
export const otpRequestSchema = z.object({ phone: phoneField })
export const otpVerifySchema = z.object({
  phone: phoneField,
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
})
export const quantitySchema = z.coerce.number().int().min(1).max(99)
export const couponSchema = z.string().trim().min(1, "Enter a code").max(40)

export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Please check the form"
}
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const i of error.issues) {
    const k = i.path.length ? i.path.join(".") : "form"
    if (!out[k]) out[k] = i.message
  }
  return out
}
