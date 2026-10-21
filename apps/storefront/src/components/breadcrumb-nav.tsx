"use client"

import Link from "next/link"
import { Breadcrumb, type BreadcrumbProps } from "@t9/ui"

/** Breadcrumb that uses next/link. A client wrapper, because a function can't cross from server. */
export function BreadcrumbNav(props: Omit<BreadcrumbProps, "linkAs">) {
  return <Breadcrumb {...props} linkAs={Link} />
}
