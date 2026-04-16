export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

export const prettyJson = (value: unknown): string => JSON.stringify(value, null, 2);

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const text = await res.text();
  const json = text ? (JSON.parse(text) as unknown) : null;

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}\n${prettyJson(json)}`);
  }

  return json as T;
}
