import type { MedusaResponse, MedusaStoreRequest } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError, QueryContext } from "@medusajs/framework/utils"
import { STORE_PRODUCT_FIELDS, toStoreProduct } from "../../../../../lib/store-product"

const HANDLE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/**
 * GET /store/catalog/products/:handle
 * The product page in one request: INR prices, availability, colour-tagged images, fabric
 * technology and size chart. Only published products in the publishable key's sales channels.
 */
export async function GET(req: MedusaStoreRequest, res: MedusaResponse) {
  const handle = String(req.params.handle ?? "")
  if (!HANDLE.test(handle)) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Product not found")
  }
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const channelIds = req.publishable_key_context?.sales_channel_ids ?? []

  const { data } = await query.graph({
    entity: "product",
    fields: STORE_PRODUCT_FIELDS,
    filters: {
      handle,
      status: "published",
      ...(channelIds.length ? { sales_channels: { id: channelIds } } : {}),
    } as Record<string, unknown>,
    context: { variants: { calculated_price: QueryContext({ currency_code: "inr" }) } },
  })

  const product = data[0]
  if (!product) throw new MedusaError(MedusaError.Types.NOT_FOUND, "Product not found")

  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=30, stale-while-revalidate=300")
  res.json({ product: toStoreProduct(product) })
}
