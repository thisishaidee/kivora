const TAVILY_ENDPOINT = "https://api.tavily.com/search";
const MAX_QUERY_CHARS = 600;
const MAX_RESULTS = 5;
const REQUEST_TIMEOUT_MS = 8000;

/** @param {unknown} value */
const safeUrl = (value) => {
  try {
    if (typeof value !== "string") return null;
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/\.$/, "");
    const isIpv4 = /^(?:\d{1,3}\.){3}\d{1,3}$/.test(host);
    const isLocal = host === "localhost" || host.endsWith(".localhost") ||
      host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".test");
    if (url.protocol !== "https:" || url.username || url.password || !host.includes(".") ||
        isIpv4 || host.includes(":") || isLocal) return null;
    if (!/^[a-z0-9.-]+$/.test(host) ||
        host.split(".").some(label => !label || label.startsWith("-") || label.endsWith("-"))) return null;
    return url.toString();
  } catch {
    return null;
  }
};

/** @param {unknown} value @param {number} max */
const cleanText = (value, max) =>
  typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";

/**
 * Search the web for source leads. Tavily results are deliberately NOT trusted
 * evidence: a qualified reviewer must approve material before it can support
 * technical instructions.
 * @param {{ query: string, apiKey: string, fetchImpl?: typeof fetch }} input
 * @returns {Promise<
 *   | { ok: true, sources: Array<{ title: string, url: string, excerpt: string, sourceType: "web_search_result", reviewStatus: "unverified_lead", evidenceEligible: false }> }
 *   | { ok: false, error: string }
 * >}
 */
export async function searchTavilyLeads({ query, apiKey, fetchImpl = fetch }) {
  const normalizedQuery = cleanText(query, MAX_QUERY_CHARS);
  if (normalizedQuery.length < 3) return { ok: false, error: "invalid_query" };
  if (!apiKey || typeof apiKey !== "string") return { ok: false, error: "research_unavailable" };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetchImpl(TAVILY_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query: normalizedQuery,
        search_depth: "basic",
        topic: "general",
        max_results: MAX_RESULTS,
        include_answer: false,
        include_raw_content: false,
      }),
      signal: controller.signal,
    });
    if (!response.ok) return { ok: false, error: response.status === 429 ? "research_rate_limited" : "research_upstream_error" };

    const payload = await response.json();
    /** @type {unknown[]} */
    const rows = Array.isArray(payload?.results) ? payload.results : [];
    const sources = rows.slice(0, MAX_RESULTS).flatMap((row) => {
      if (!row || typeof row !== "object") return [];
      const record = /** @type {Record<string, unknown>} */ (row);
      const url = safeUrl(record.url);
      const title = cleanText(record.title, 240);
      const excerpt = cleanText(record.content, 700);
      if (!url || !title || !excerpt) return [];
      return [{
        title,
        url,
        excerpt,
        sourceType: /** @type {"web_search_result"} */ ("web_search_result"),
        reviewStatus: /** @type {"unverified_lead"} */ ("unverified_lead"),
        evidenceEligible: /** @type {false} */ (false),
      }];
    });
    return { ok: true, sources };
  } catch (error) {
    return { ok: false, error: error instanceof Error && error.name === "AbortError" ? "research_timeout" : "research_unavailable" };
  } finally {
    clearTimeout(timeout);
  }
}
