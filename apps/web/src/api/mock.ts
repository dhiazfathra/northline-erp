// shortcut: in-memory fixtures with fake latency; swap each queryFn for the Hono `hc<AppType>` client call.
export function mock<T>(data: T, ms = 350): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(structuredClone(data)), ms))
}
