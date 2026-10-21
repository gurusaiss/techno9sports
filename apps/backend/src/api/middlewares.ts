import {
  configureStoreSearch,
  defineMiddlewares,
  validateAndTransformBody,
} from "@medusajs/framework/http"
import { CreateBlockBody } from "./admin/content/blocks/route"
import { UpdateBlockBody } from "./admin/content/blocks/[id]/route"
import { ImportBody } from "./admin/catalog/import/route"

// The product index declares filterable `status` and `sales_channel_ids`, so
// the route narrows it to published products in the key's sales channels.
export default defineMiddlewares({
  routes: [
    {
      method: ["POST"],
      matcher: "/store/search",
      middlewares: [
        configureStoreSearch({
          allowed_indexes: {
            product: true,
          },
        }),
      ],
    },
    {
      method: ["POST"],
      matcher: "/admin/content/blocks",
      middlewares: [validateAndTransformBody(CreateBlockBody)],
    },
    {
      method: ["POST"],
      matcher: "/admin/catalog/import",
      // Sheets are up to 2 MB of text, above the default JSON body limit.
      bodyParser: { sizeLimit: "3mb" },
      middlewares: [validateAndTransformBody(ImportBody)],
    },
    {
      method: ["POST"],
      matcher: "/admin/content/blocks/:id",
      middlewares: [validateAndTransformBody(UpdateBlockBody)],
    },
  ],
})
