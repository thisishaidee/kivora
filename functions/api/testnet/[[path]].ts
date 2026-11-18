interface PagesContext {
  request: Request;
  params: { path?: string };
}

const UPSTREAM = "https://blockstream.info/testnet/api";
const ADDRESS = /^tb1[02-9a-hj-np-z]{20,87}$/i;

function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

/**
 * Narrow, read-only proxy for the public Bitcoin testnet Esplora API.
 * Only the three GET resources used by the wallet are reachable.
 * No arbitrary URL, query string, credential, or write operation is forwarded.
 */
export async function onRequest({ request, params }: PagesContext): Promise<Response> {
  if (request.method !== "GET") return jsonError("Method not allowed.", 405);

  const path = (params.path ?? "").replace(/^\/+|\/+$/g, "");
  let upstreamPath: string;

  if (path === "blocks/tip/height") {
    upstreamPath = "/blocks/tip/height";
  } else {
    const addressMatch = path.match(/^address\/([^/]+)(\/txs)?$/);
    if (!addressMatch) return jsonError("Unsupported testnet explorer resource.", 404);
    let address: string;
    try {
      address = decodeURIComponent(addressMatch[1]);
    } catch {
      return jsonError("Invalid testnet address encoding.", 400);
    }
    if (!ADDRESS.test(address)) return jsonError("Invalid Bitcoin testnet address.", 400);
    upstreamPath = `/address/${encodeURIComponent(address)}${addressMatch[2] ?? ""}`;
  }

  try {
    const upstream = await fetch(`${UPSTREAM}${upstreamPath}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: request.signal,
    });
    const headers = new Headers({
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    const contentType = upstream.headers.get("Content-Type");
    if (contentType) headers.set("Content-Type", contentType);
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch {
    return jsonError("The Bitcoin testnet explorer could not be reached. Please retry.", 502);
  }
}
