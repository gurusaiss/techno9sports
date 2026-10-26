import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  createPaymentCollectionForCartWorkflow,
  createPaymentSessionsWorkflow,
} from "@medusajs/medusa/core-flows"

/**
 * Creates (or reuses) the cart's payment collection and attaches a COD payment session to it.
 * Shared by the OTP-gated route and the no-OTP-required route — both are the only ways a COD
 * session is ever created, so eligibility (enforced again inside the provider) is never skippable.
 */
export async function createCodPaymentSession(
  container: MedusaContainer,
  cartId: string,
  postalCode: string | null,
) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "cart",
    fields: ["id", "payment_collection.id"],
    filters: { id: cartId },
  })
  const cart = data[0] as { payment_collection?: { id: string } | null } | undefined
  let paymentCollectionId = cart?.payment_collection?.id
  if (!paymentCollectionId) {
    const { result } = await createPaymentCollectionForCartWorkflow(container).run({
      input: { cart_id: cartId },
    })
    paymentCollectionId = result.id
  }
  await createPaymentSessionsWorkflow(container).run({
    input: {
      payment_collection_id: paymentCollectionId,
      provider_id: "pp_cod_cod",
      data: { postal_code: postalCode },
    },
  })
}
