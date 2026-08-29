export async function responseErrorMessage(res: Response): Promise<string> {
  const fallback = `${res.status} ${res.statusText}`.trim();
  const contentType = res.headers.get("content-type") || "";
  const body = await res.text();
  const trimmed = body.trim();

  if (!trimmed) return fallback;

  if (contentType.includes("text/html") || /^<!doctype html/i.test(trimmed)) {
    return fallback;
  }

  return trimmed.length > 500 ? `${trimmed.slice(0, 500)}...` : trimmed;
}
