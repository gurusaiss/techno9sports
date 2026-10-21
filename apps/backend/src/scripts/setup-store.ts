import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  createApiKeysWorkflow,
  createRegionsWorkflow,
  createShippingOptionsWorkflow,
  createStockLocationsWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateSalesChannelsWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows"

/**
 * India / INR store setup. Safe to run repeatedly: every step checks before it creates.
 *   pnpm --filter @t9/backend exec medusa exec ./src/scripts/setup-store.ts
 *
 * Business values here (warehouse address, delivery price) are placeholders the owner edits in
 * the admin. GST rates and shipping rules arrive in Phases 3 and 5.
 */
export default async function setupStore({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const storeModule = container.resolve(Modules.STORE)
  const salesChannelModule = container.resolve(Modules.SALES_CHANNEL)
  const regionModule = container.resolve(Modules.REGION)
  const taxModule = container.resolve(Modules.TAX)
  const pricingModule = container.resolve(Modules.PRICING)
  const apiKeyModule = container.resolve(Modules.API_KEY)
  const stockLocationModule = container.resolve(Modules.STOCK_LOCATION)
  const fulfillmentModule = container.resolve(Modules.FULFILLMENT)

  // Sales channel
  let [channel] = await salesChannelModule.listSalesChannels({}, { take: 1 })
  if (!channel)
    throw new Error("No sales channel found. Run `pnpm --filter @t9/backend migrate` first.")
  if (channel.name !== "Techno9Sports Web") {
    await updateSalesChannelsWorkflow(container).run({
      input: {
        selector: { id: channel.id },
        update: { name: "Techno9Sports Web", description: "techno9sports.in storefront" },
      },
    })
    ;[channel] = await salesChannelModule.listSalesChannels({ id: channel.id })
    logger.info("Renamed the sales channel")
  }

  // Store: INR only
  const [store] = await storeModule.listStores({}, { take: 1, relations: ["supported_currencies"] })
  if (!store) throw new Error("No store found")
  const currencies = store.supported_currencies ?? []
  if (
    currencies.length !== 1 ||
    currencies[0]?.currency_code !== "inr" ||
    store.name !== "Techno9Sports"
  ) {
    await updateStoresWorkflow(container).run({
      input: {
        selector: { id: store.id },
        update: {
          name: "Techno9Sports",
          supported_currencies: [{ currency_code: "inr", is_default: true }],
          default_sales_channel_id: channel!.id,
        },
      },
    })
    logger.info("Store set to INR")
  }

  // Region + tax region
  let [region] = await regionModule.listRegions({ name: "India" })
  if (!region) {
    const { result } = await createRegionsWorkflow(container).run({
      input: {
        regions: [
          {
            name: "India",
            currency_code: "inr",
            countries: ["in"],
            payment_providers: ["pp_system_default"],
          },
        ],
      },
    })
    region = result[0]!
    logger.info("Created region India")
  }
  const taxRegions = await taxModule.listTaxRegions({ country_code: "in" })
  if (!taxRegions.length) {
    await createTaxRegionsWorkflow(container).run({
      input: [{ country_code: "in", provider_id: "tp_system" }],
    })
    logger.info("Created tax region IN (GST rates are configured in Phase 3)")
  }

  // Prices are GST-inclusive
  const prefs = await pricingModule.listPricePreferences({
    attribute: "currency_code",
    value: "inr",
  })
  if (!prefs.length) {
    await pricingModule.createPricePreferences({
      attribute: "currency_code",
      value: "inr",
      is_tax_inclusive: true,
    })
    logger.info("INR prices are tax-inclusive")
  }

  // Publishable key for the storefront
  let [key] = await apiKeyModule.listApiKeys({ type: "publishable", title: "Storefront" })
  if (!key) {
    const { result } = await createApiKeysWorkflow(container).run({
      input: { api_keys: [{ title: "Storefront", type: "publishable", created_by: "" }] },
    })
    key = result[0]!
    await linkSalesChannelsToApiKeyWorkflow(container).run({
      input: { id: key.id, add: [channel!.id] },
    })
    logger.info("Created publishable API key")
  }

  // Warehouse, fulfillment and one placeholder delivery option
  let [location] = await stockLocationModule.listStockLocations({ name: "Visakhapatnam warehouse" })
  if (!location) {
    const { result } = await createStockLocationsWorkflow(container).run({
      input: {
        locations: [
          {
            name: "Visakhapatnam warehouse",
            address: {
              address_1: "Placeholder address",
              city: "Visakhapatnam",
              province: "Andhra Pradesh",
              postal_code: "530001",
              country_code: "IN",
            },
          },
        ],
      },
    })
    location = result[0]!
    await link.create({
      [Modules.STOCK_LOCATION]: { stock_location_id: location.id },
      [Modules.FULFILLMENT]: { fulfillment_provider_id: "manual_manual" },
    })
    await linkSalesChannelsToStockLocationWorkflow(container).run({
      input: { id: location.id, add: [channel!.id] },
    })

    const { data: profiles } = await query.graph({ entity: "shipping_profile", fields: ["id"] })
    const fulfillmentSet = await fulfillmentModule.createFulfillmentSets({
      name: "India delivery",
      type: "shipping",
      service_zones: [{ name: "India", geo_zones: [{ country_code: "in", type: "country" }] }],
    })
    await link.create({
      [Modules.STOCK_LOCATION]: { stock_location_id: location.id },
      [Modules.FULFILLMENT]: { fulfillment_set_id: fulfillmentSet.id },
    })
    await createShippingOptionsWorkflow(container).run({
      input: [
        {
          name: "Standard delivery",
          price_type: "flat",
          provider_id: "manual_manual",
          service_zone_id: fulfillmentSet.service_zones[0]!.id,
          shipping_profile_id: profiles[0]!.id,
          type: { label: "Standard", description: "Delivered in 3 to 7 days.", code: "standard" },
          prices: [
            { currency_code: "inr", amount: 49 },
            { region_id: region.id, amount: 49 },
          ],
          rules: [
            { attribute: "enabled_in_store", value: "true", operator: "eq" },
            { attribute: "is_return", value: "false", operator: "eq" },
          ],
        },
      ],
    })
    logger.info("Created warehouse, fulfillment set and a placeholder delivery option")
  }

  logger.info(`Publishable API key: ${key.token}`)
}
