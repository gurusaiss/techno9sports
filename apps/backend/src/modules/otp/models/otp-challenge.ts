import { model } from "@medusajs/framework/utils"

/**
 * A one-time code sent to a phone. Only a keyed hash of the code is stored, never the code.
 * `purpose` separates sign-in from COD confirmation so a code for one cannot be used for the other.
 */
const OtpChallenge = model
  .define("otp_challenge", {
    id: model.id({ prefix: "otp" }).primaryKey(),
    phone: model.text(),
    purpose: model.enum(["login", "cod"]),
    code_hash: model.text(),
    expires_at: model.dateTime(),
    attempts: model.number().default(0),
    consumed_at: model.dateTime().nullable(),
    context: model.text().nullable(),
  })
  .indexes([{ on: ["phone", "purpose"] }])

export default OtpChallenge
