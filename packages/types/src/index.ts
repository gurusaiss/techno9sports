export type Currency = "INR"
export type PaymentMethod = "razorpay" | "cod"
/** Money is always integer paise at API boundaries. */
export type Paise = number

export * from "./catalog"
