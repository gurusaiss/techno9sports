import type { FilterGroup, FilterState } from "@t9/ui"
import { colorHex } from "@/config/colors"
import type { ListingParams } from "@/lib/listing-params"
import type { FacetKey, FacetValue, ListingResult } from "@/lib/search-result"

/** The filter groups that edit one URL field each. */
type OptionKey =
  "size" | "color" | "fit" | "sleeve" | "neck" | "shape" | "sport" | "tech" | "gender"

const FACET_FOR: Record<OptionKey, FacetKey> = {
  size: "sizes_available",
  color: "colors",
  fit: "fit",
  sleeve: "sleeve",
  neck: "neck",
  shape: "shape",
  sport: "sport",
  tech: "technologies",
  gender: "gender",
}

const LABELS: Record<OptionKey, string> = {
  size: "Size",
  color: "Colour",
  fit: "Fit",
  sleeve: "Sleeve",
  neck: "Neck",
  shape: "Frame shape",
  sport: "Sport",
  tech: "Technology",
  gender: "For",
}

const DISCOUNTS = [20, 30, 40, 50]
const GENDER_LABEL: Record<string, string> = { men: "Men", women: "Women", unisex: "Unisex" }

export function stateFromParams(p: ListingParams): FilterState {
  return {
    options: {
      size: p.sizes,
      color: p.colors,
      fit: p.fits,
      sleeve: p.sleeves,
      neck: p.necks,
      shape: p.shapes,
      sport: p.sports,
      tech: p.techs,
      gender: p.genders,
      discount: p.discountMin ? [String(p.discountMin)] : [],
      stock: p.inStockOnly ? ["1"] : [],
    },
    ranges: { price: { min: p.priceMin, max: p.priceMax } },
  }
}

export function paramsFromState(state: FilterState, base: ListingParams): ListingParams {
  const o = (k: string) => state.options[k] ?? []
  const price = state.ranges.price ?? {}
  const discounts = o("discount").map(Number).filter(Number.isFinite)
  const priceMin = price.min
  const priceMax =
    priceMin !== undefined && price.max !== undefined && price.max < priceMin ? priceMin : price.max
  return {
    ...base,
    sizes: o("size"),
    colors: o("color"),
    fits: o("fit"),
    sleeves: o("sleeve"),
    necks: o("neck"),
    shapes: o("shape"),
    sports: o("sport"),
    techs: o("tech"),
    genders: o("gender"),
    discountMin: discounts.length ? Math.max(...discounts) : undefined,
    inStockOnly: o("stock").includes("1"),
    priceMin,
    priceMax,
    page: 1,
  }
}

export function groupsFromFacets(
  result: Pick<ListingResult, "facets" | "price">,
  opts: { techNames: Record<string, string>; showGender: boolean },
): FilterGroup[] {
  const groups: FilterGroup[] = []
  const add = (key: OptionKey, map?: (v: FacetValue) => { label: string; swatch?: string }) => {
    if (key === "gender" && !opts.showGender) return
    const values = result.facets[FACET_FOR[key]]
    if (!values.length) return
    groups.push({
      id: key,
      label: LABELS[key],
      kind: "options",
      options: values.map((v) => ({
        value: v.value,
        count: v.count,
        label: map ? map(v).label : v.value,
        swatch: map ? map(v).swatch : undefined,
      })),
    })
  }
  add("size")
  add("color", (v) => ({ label: v.value, swatch: colorHex(v.value) }))
  add("fit")
  add("sleeve")
  add("neck")
  add("shape")
  add("sport")
  add("tech", (v) => ({ label: opts.techNames[v.value] ?? v.value }))
  add("gender", (v) => ({ label: GENDER_LABEL[v.value] ?? v.value }))
  groups.push({
    id: "discount",
    label: "Discount",
    kind: "options",
    options: DISCOUNTS.map((d) => ({ value: String(d), label: `${d}% or more` })),
  })
  if (result.price && result.price.max > result.price.min) {
    groups.push({
      id: "price",
      label: "Price",
      kind: "range",
      min: Math.floor(result.price.min),
      max: Math.ceil(result.price.max),
      unit: "₹",
    })
  }
  groups.push({
    id: "stock",
    label: "Availability",
    kind: "options",
    options: [{ value: "1", label: "In stock only" }],
  })
  return groups
}

export interface ActiveChip {
  key: string
  label: string
  remove: (state: FilterState) => FilterState
}

/** One removable chip per active filter value. */
export function activeChips(
  p: ListingParams,
  groups: FilterGroup[],
  techNames: Record<string, string>,
): ActiveChip[] {
  const state = stateFromParams(p)
  const chips: ActiveChip[] = []
  const labelOf = (groupId: string, value: string) => {
    const g = groups.find((x) => x.id === groupId)
    const opt = g && g.kind === "options" ? g.options.find((o) => o.value === value) : undefined
    return opt?.label ?? (groupId === "tech" ? (techNames[value] ?? value) : value)
  }
  for (const [groupId, values] of Object.entries(state.options)) {
    for (const v of values) {
      chips.push({
        key: `${groupId}:${v}`,
        label: groupId === "stock" ? "In stock only" : labelOf(groupId, v),
        remove: (s) => ({
          ...s,
          options: { ...s.options, [groupId]: (s.options[groupId] ?? []).filter((x) => x !== v) },
        }),
      })
    }
  }
  if (p.priceMin !== undefined || p.priceMax !== undefined) {
    const lo = p.priceMin !== undefined ? `₹${p.priceMin}` : "Any"
    const hi = p.priceMax !== undefined ? `₹${p.priceMax}` : "any"
    chips.push({
      key: "price",
      label: `${lo} to ${hi}`,
      remove: (s) => ({ ...s, ranges: { ...s.ranges, price: {} } }),
    })
  }
  return chips
}
