import { parse } from "csv-parse/sync"
import { z } from "@medusajs/framework/zod"
import { findState } from "./india-states"

export const isPincode = (v: string) => /^[1-9]\d{5}$/.test(v)

const Row = z.object({
  pincode: z.string().refine(isPincode, "pincode must be 6 digits"),
  city: z.string().min(1),
  district: z.string().optional().default(""),
  state: z.string().min(1),
  serviceable: z.enum(["true", "false"]).default("true"),
  cod_allowed: z.enum(["true", "false"]).default("true"),
  days_min: z.coerce.number().int().min(0).default(3),
  days_max: z.coerce.number().int().min(0).default(7),
})

export interface PincodeRecord {
  pincode: string
  city: string
  district: string | null
  state: string
  state_code: string
  serviceable: boolean
  cod_allowed: boolean
  days_min: number
  days_max: number
}

export function parsePincodeCsv(text: string): { rows: PincodeRecord[]; errors: string[] } {
  const raw: Record<string, string>[] = parse(text, {
    columns: (h: string[]) => h.map((c) => c.trim().toLowerCase()),
    skip_empty_lines: true,
    trim: true,
    bom: true,
  })
  const rows: PincodeRecord[] = []
  const errors: string[] = []
  const seen = new Set<string>()
  raw.forEach((r, i) => {
    const line = i + 2
    const parsed = Row.safeParse(r)
    if (!parsed.success) {
      errors.push(
        `line ${line}: ${parsed.error.issues.map((x) => `${x.path.join(".")} ${x.message}`).join("; ")}`,
      )
      return
    }
    const d = parsed.data
    const state = findState(d.state)
    if (!state) return void errors.push(`line ${line}: unknown state "${d.state}"`)
    if (d.days_max < d.days_min) return void errors.push(`line ${line}: days_max is below days_min`)
    if (seen.has(d.pincode)) return void errors.push(`line ${line}: duplicate pincode ${d.pincode}`)
    seen.add(d.pincode)
    rows.push({
      pincode: d.pincode,
      city: d.city,
      district: d.district || null,
      state: state.name,
      state_code: state.code,
      serviceable: d.serviceable === "true",
      cod_allowed: d.cod_allowed === "true",
      days_min: d.days_min,
      days_max: d.days_max,
    })
  })
  return { rows, errors }
}

export function deliveryWindow(from: Date, daysMin: number, daysMax: number) {
  const add = (n: number) => new Date(from.getTime() + n * 86_400_000)
  return {
    earliest: add(daysMin).toISOString().slice(0, 10),
    latest: add(daysMax).toISOString().slice(0, 10),
  }
}
