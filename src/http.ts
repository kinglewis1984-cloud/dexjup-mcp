export class HttpError extends Error {
  status: number;
  body: string;
  constructor(status: number, url: string, body: string) {
    super(`HTTP ${status} from ${url}: ${body.slice(0, 300)}`);
    this.name = "HttpError";
    this.status = status;
    this.body = body;
  }
}

export async function fetchJson<T>(url: string, init?: RequestInit, timeoutMs = 10_000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    const text = await res.text();
    if (!res.ok) {
      throw new HttpError(res.status, url, text);
    }
    return JSON.parse(text) as T;
  } finally {
    clearTimeout(timer);
  }
}
