/**
 * Formats low-level fetch/network errors (e.g. "fetch failed" with a nested cause)
 * for logs and for surfacing a clearer message in graph output.
 */
export function formatUnknownErrorForLog(err: unknown): string {
  if (!(err instanceof Error)) {
    return String(err);
  }
  const parts: string[] = [err.name ? `${err.name}: ${err.message}` : err.message];
  const code = (err as NodeJS.ErrnoException).code;
  if (code) {
    parts.push(`errno_code=${code}`);
  }
  let cause: unknown = err.cause;
  let depth = 0;
  while (cause && depth < 6) {
    if (cause instanceof Error) {
      const c = cause as NodeJS.ErrnoException;
      const extra = c.code ? ` [${c.code}]` : "";
      parts.push(`caused by: ${cause.message}${extra}`);
      cause = cause.cause;
    } else {
      parts.push(`caused by: ${String(cause)}`);
      break;
    }
    depth += 1;
  }
  return parts.join(" | ");
}

export function logAndWrapAgentDealsError(err: unknown, context: { url: string; stage: string }): Error {
  const detail = formatUnknownErrorForLog(err);
  console.error(`[agent_deals] ${context.stage} failed`, {
    url: context.url,
    detail,
    ...(err instanceof Error && err.stack ? { stack: err.stack } : {})
  });
  return new Error(
    `${context.stage}: ${detail}. url=${context.url} (see stderr for full log)`
  );
}

export function logHttpErrorAndThrow(options: {
  url: string;
  status: number;
  statusText: string;
  bodyText: string;
}): never {
  const preview = options.bodyText.replace(/\s+/g, " ").trim().slice(0, 1200);
  console.error("[agent_deals] proxy HTTP error", {
    url: options.url,
    status: options.status,
    statusText: options.statusText,
    bodyLength: options.bodyText.length,
    bodyPreview: preview
  });
  throw new Error(
    `HTTP ${options.status} ${options.statusText} for ${options.url}. Body: ${preview.slice(0, 400)}`
  );
}
