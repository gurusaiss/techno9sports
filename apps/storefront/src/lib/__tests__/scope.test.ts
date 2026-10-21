import { describe, expect, it } from "vitest"
import { keyToScope, scopeToKey } from "../scope"

describe("scope keys", () => {
  it("round-trips the scopes listing pages use", () => {
    for (const scope of [
      { categories: ["men-t-shirts"] },
      { collection: "everyday-essentials" },
      { tags: ["new"] },
      { technologies: ["t9-dry"] },
      { onSale: true },
      { maxPrice: 499 },
      {},
    ]) {
      expect(keyToScope(scopeToKey(scope))).toEqual(scope)
    }
  })

  it("rejects anything that isn't a known, well-formed scope", () => {
    for (const bad of [
      "",
      "category:",
      "category:Men_T",
      "category:a b",
      "nope:x",
      "under:abc",
      "under:0",
      "under:999999999",
      "category:../x",
      "tag:x;drop",
    ]) {
      expect(keyToScope(bad)).toBeNull()
    }
  })
})
