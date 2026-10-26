const BASE =
  process.env.MEDUSA_BACKEND_URL ??
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ??
  "http://localhost:9000"
const KEY =
  process.env.MEDUSA_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""

/**
 * GET /api/invoice/:id — proxies the backend's invoice PDF. The backend's /store routes require a
 * publishable API key header that a plain browser `<a href>` can't send, so this adds it server-side.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const res = await fetch(`${BASE}/store/orders/${id}/invoice`, {
    headers: { "x-publishable-api-key": KEY },
  })
  if (!res.ok) return new Response("Not found", { status: res.status })
  return new Response(res.body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": res.headers.get("content-disposition") ?? "inline",
      "Cache-Control": "private, no-store",
    },
  })
}
