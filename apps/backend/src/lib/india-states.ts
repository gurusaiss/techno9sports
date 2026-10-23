/** GST state codes (the two-digit code on an invoice). Names match what the address form offers. */
export const INDIA_STATES: { name: string; code: string; gst: string }[] = [
  { name: "Andaman and Nicobar Islands", code: "AN", gst: "35" },
  { name: "Andhra Pradesh", code: "AP", gst: "37" },
  { name: "Arunachal Pradesh", code: "AR", gst: "12" },
  { name: "Assam", code: "AS", gst: "18" },
  { name: "Bihar", code: "BR", gst: "10" },
  { name: "Chandigarh", code: "CH", gst: "04" },
  { name: "Chhattisgarh", code: "CG", gst: "22" },
  { name: "Dadra and Nagar Haveli and Daman and Diu", code: "DH", gst: "26" },
  { name: "Delhi", code: "DL", gst: "07" },
  { name: "Goa", code: "GA", gst: "30" },
  { name: "Gujarat", code: "GJ", gst: "24" },
  { name: "Haryana", code: "HR", gst: "06" },
  { name: "Himachal Pradesh", code: "HP", gst: "02" },
  { name: "Jammu and Kashmir", code: "JK", gst: "01" },
  { name: "Jharkhand", code: "JH", gst: "20" },
  { name: "Karnataka", code: "KA", gst: "29" },
  { name: "Kerala", code: "KL", gst: "32" },
  { name: "Ladakh", code: "LA", gst: "38" },
  { name: "Lakshadweep", code: "LD", gst: "31" },
  { name: "Madhya Pradesh", code: "MP", gst: "23" },
  { name: "Maharashtra", code: "MH", gst: "27" },
  { name: "Manipur", code: "MN", gst: "14" },
  { name: "Meghalaya", code: "ML", gst: "17" },
  { name: "Mizoram", code: "MZ", gst: "15" },
  { name: "Nagaland", code: "NL", gst: "13" },
  { name: "Odisha", code: "OD", gst: "21" },
  { name: "Puducherry", code: "PY", gst: "34" },
  { name: "Punjab", code: "PB", gst: "03" },
  { name: "Rajasthan", code: "RJ", gst: "08" },
  { name: "Sikkim", code: "SK", gst: "11" },
  { name: "Tamil Nadu", code: "TN", gst: "33" },
  { name: "Telangana", code: "TS", gst: "36" },
  { name: "Tripura", code: "TR", gst: "16" },
  { name: "Uttar Pradesh", code: "UP", gst: "09" },
  { name: "Uttarakhand", code: "UK", gst: "05" },
  { name: "West Bengal", code: "WB", gst: "19" },
]

const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "")

/** Finds a state from a name or two-letter code, tolerating case, "&" and spacing. Undefined if unknown. */
export function findState(input: string | null | undefined) {
  if (!input) return undefined
  const n = norm(input.replace(/&/g, "and"))
  return INDIA_STATES.find((s) => norm(s.name) === n || norm(s.code) === n)
}
