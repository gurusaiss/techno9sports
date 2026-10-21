import { describe, expect, it } from "vitest"
import type { CategoryNode } from "@t9/types"
import { buildNav, categoryHref, resolveCategoryHandle } from "../nav"

const node = (handle: string, name: string, children: CategoryNode[] = []): CategoryNode => ({
  id: handle,
  name,
  handle,
  children,
})
const tree: CategoryNode[] = [
  node("frames", "Frames", [node("frames-wrap", "Wrap"), node("frames-round", "Round")]),
  node("men", "Men", [
    node("men-t-shirts", "T-shirts"),
    node("men-joggers", "Joggers"),
    node("men-innerwear", "Innerwear"),
    node("men-socks", "Socks"),
  ]),
  node("unisex", "Unisex", [node("unisex-t-shirts", "T-shirts")]),
]
const tech = [{ handle: "t9-dry", name: "T9 Dry", tagline: "Pulls sweat away", description: null }]

describe("categoryHref", () => {
  it("turns parent-child handles into nested paths", () => {
    expect(categoryHref("men-t-shirts", "men")).toBe("/men/t-shirts")
    expect(categoryHref("men")).toBe("/men")
    expect(categoryHref("odd", "men")).toBe("/odd")
  })
})

describe("buildNav", () => {
  const nav = buildNav(tree, tech)

  it("orders sections Men, Unisex, Frames and ends with Sale and New", () => {
    expect(nav.map((n) => n.label)).toEqual(["Men", "Unisex", "Frames", "Sale", "New"])
    expect(nav.find((n) => n.label === "Sale")?.highlight).toBe(true)
  })

  it("groups known children into columns and puts the rest under More", () => {
    const men = nav.find((n) => n.label === "Men")!
    expect(men.columns?.map((c) => c.title)).toEqual(["Tops", "Bottoms", "More"])
    expect(men.columns?.[0]?.links).toEqual([{ label: "T-shirts", href: "/men/t-shirts" }])
    expect(men.columns?.[2]?.links.map((l) => l.label)).toEqual(["Innerwear", "Socks"])
  })

  it("adds the sport filter links to Frames and a technology tile to Men", () => {
    const frames = nav.find((n) => n.label === "Frames")!
    expect(frames.columns?.at(-1)?.links[0]).toEqual({
      label: "Running",
      href: "/frames?sport=Running",
    })
    expect(nav.find((n) => n.label === "Men")?.feature).toMatchObject({
      title: "T9 Dry",
      href: "/technology/t9-dry",
    })
  })

  it("renders a section with no known children as a plain link", () => {
    const unisex = nav.find((n) => n.label === "Unisex")!
    expect(unisex.href).toBe("/unisex")
    expect(unisex.columns?.[0]?.title).toBe("Shop")
  })
})

describe("resolveCategoryHandle", () => {
  it("resolves real categories and rejects everything else", () => {
    expect(resolveCategoryHandle(["men"], tree)).toBe("men")
    expect(resolveCategoryHandle(["men", "t-shirts"], tree)).toBe("men-t-shirts")
    expect(resolveCategoryHandle(["men", "nope"], tree)).toBeNull()
    expect(resolveCategoryHandle(["nope"], tree)).toBeNull()
    expect(resolveCategoryHandle(["men", "t-shirts", "x"], tree)).toBeNull()
    expect(resolveCategoryHandle([], tree)).toBeNull()
  })
})
