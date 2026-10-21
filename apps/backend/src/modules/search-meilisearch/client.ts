/**
 * Minimal Meilisearch REST client. The official JS package is ESM-only and this backend is
 * CommonJS, and we only need a handful of endpoints.
 */
export class MeiliError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message)
    this.name = "MeiliError"
  }
}

export interface MeiliTask {
  taskUid: number
}
export interface MeiliTaskResult {
  uid: number
  status: "enqueued" | "processing" | "succeeded" | "failed" | "canceled"
  error?: { message: string; code?: string }
}
export interface MeiliIndexInfo {
  uid: string
  primaryKey: string | null
  createdAt: string
  updatedAt: string
}

export class MeiliClient {
  constructor(
    private readonly host: string,
    private readonly apiKey: string,
  ) {}

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(new URL(path, this.host.endsWith("/") ? this.host : `${this.host}/`), {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
    const text = await res.text()
    const json = text ? JSON.parse(text) : undefined
    if (!res.ok) {
      throw new MeiliError(json?.message ?? `Meilisearch ${res.status}`, res.status, json?.code)
    }
    return json as T
  }

  getIndex(uid: string) {
    return this.request<MeiliIndexInfo>("GET", `indexes/${encodeURIComponent(uid)}`)
  }
  createIndex(uid: string, primaryKey: string) {
    return this.request<MeiliTask>("POST", "indexes", { uid, primaryKey })
  }
  deleteIndex(uid: string) {
    return this.request<MeiliTask>("DELETE", `indexes/${encodeURIComponent(uid)}`)
  }
  updateSettings(uid: string, settings: Record<string, unknown>) {
    return this.request<MeiliTask>("PATCH", `indexes/${encodeURIComponent(uid)}/settings`, settings)
  }
  getSettings(uid: string) {
    return this.request<Record<string, unknown>>(
      "GET",
      `indexes/${encodeURIComponent(uid)}/settings`,
    )
  }
  listIndexes() {
    return this.request<{ results: MeiliIndexInfo[] }>("GET", "indexes?limit=1000")
  }
  async documentCount(uid: string) {
    const s = await this.request<{ numberOfDocuments: number }>(
      "GET",
      `indexes/${encodeURIComponent(uid)}/stats`,
    )
    return s.numberOfDocuments
  }
  addDocuments(uid: string, documents: unknown[], primaryKey: string) {
    return this.request<MeiliTask>(
      "POST",
      `indexes/${encodeURIComponent(uid)}/documents?primaryKey=${encodeURIComponent(primaryKey)}`,
      documents,
    )
  }
  deleteDocumentsByIds(uid: string, ids: string[]) {
    return this.request<MeiliTask>(
      "POST",
      `indexes/${encodeURIComponent(uid)}/documents/delete-batch`,
      ids,
    )
  }
  deleteDocumentsByFilter(uid: string, filter: string) {
    return this.request<MeiliTask>("POST", `indexes/${encodeURIComponent(uid)}/documents/delete`, {
      filter,
    })
  }
  deleteAllDocuments(uid: string) {
    return this.request<MeiliTask>("DELETE", `indexes/${encodeURIComponent(uid)}/documents`)
  }
  search<T = Record<string, unknown>>(uid: string, params: Record<string, unknown>) {
    return this.request<T>("POST", `indexes/${encodeURIComponent(uid)}/search`, params)
  }

  async waitForTask(uid: number, timeoutMs: number): Promise<MeiliTaskResult> {
    const deadline = Date.now() + timeoutMs
    for (;;) {
      const task = await this.request<MeiliTaskResult>("GET", `tasks/${uid}`)
      if (task.status === "succeeded" || task.status === "failed" || task.status === "canceled") {
        return task
      }
      if (Date.now() > deadline) {
        throw new MeiliError(`Timed out waiting for Meilisearch task ${uid}`, 408)
      }
      await new Promise((r) => setTimeout(r, 50))
    }
  }
}
