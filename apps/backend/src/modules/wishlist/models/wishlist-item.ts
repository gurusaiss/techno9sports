import { model } from "@medusajs/framework/utils"

/** A product a signed-in customer saved. Guests keep theirs in the browser until they sign in. */
const WishlistItem = model
  .define("wishlist_item", {
    id: model.id({ prefix: "wish" }).primaryKey(),
    customer_id: model.text(),
    product_id: model.text(),
  })
  .indexes([{ on: ["customer_id", "product_id"], unique: true }])

export default WishlistItem
