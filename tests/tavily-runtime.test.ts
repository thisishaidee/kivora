import { describe, expect, it, vi } from "vitest";
import { searchTavilyLeads } from "../worker/src/tavily-runtime.js";

const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("Tavily research leads", () => {
  it("fails closed when the server key is missing", async () => {
    const fetchImpl = vi.fn();
    const result = await searchTavilyLeads({ query: "cabinet hinge installation", apiKey: "", fetchImpl });
    expect(result).toEqual({ ok: false, error: "research_unavailable" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("returns capped, sanitized results as unverified leads", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response({
      results: [
        { title: " Manufacturer guide ", url: "https://example.com/manual", content: "  Check the hinge model.\\nUse the correct plate. " },
        { title: "Bad scheme", url: "javascript:alert(1)", content: "not allowed" },
        { title: "Credential URL", url: "https://user:pass@example.com/", content: "not allowed" },
        { title: "Insecure HTTP", url: "http://manual.example.com/guide", content: "not allowed" },
      ],
    }));
    const result = await searchTavilyLeads({ query: "cabinet hinge installation", apiKey: "server-secret", fetchImpl });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.sources).toHaveLength(1);
    expect(result.sources[0]).toMatchObject({
      title: "Manufacturer guide",
      url: "https://example.com/manual",
      excerpt: "Check the hinge model. Use the correct plate.",
      reviewStatus: "unverified_lead",
      evidenceEligible: false,
    });
    const request = fetchImpl.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(request.body))).toMatchObject({
      api_key: "server-secret",
      search_depth: "basic",
      max_results: 5,
      include_answer: false,
      include_raw_content: false,
    });
  });

  it("does not expose upstream response bodies or credentials on rate limits", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("secret-bearing upstream body", { status: 429 }));
    const result = await searchTavilyLeads({ query: "pump maintenance", apiKey: "server-secret", fetchImpl });
    expect(result).toEqual({ ok: false, error: "research_rate_limited" });
    expect(JSON.stringify(result)).not.toContain("secret");
  });

  it("handles malformed upstream payloads without trusting them", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response({ results: "not-an-array" }));
    const result = await searchTavilyLeads({ query: "air conditioner fault", apiKey: "server-secret", fetchImpl });
    expect(result).toEqual({ ok: true, sources: [] });
  });

  it("rejects too-short queries before calling Tavily", async () => {
    const fetchImpl = vi.fn();
    const result = await searchTavilyLeads({ query: "  ", apiKey: "server-secret", fetchImpl });
    expect(result).toEqual({ ok: false, error: "invalid_query" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("rejects plain HTTP source links even when search returns useful-looking content", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response({
      results: [{ title: "Manual", url: "http://manufacturer.example/manual", content: "Installation notes." }],
    }));
    const result = await searchTavilyLeads({ query: "manufacturer manual", apiKey: "server-secret", fetchImpl });
    expect(result).toEqual({ ok: true, sources: [] });
  });

  it("does not return technical evidence as reviewed", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response({
      results: [{ title: "Manual", url: "https://example.com", content: "Install the component." }],
    }));
    const result = await searchTavilyLeads({ query: "install component", apiKey: "server-secret", fetchImpl });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.sources[0].reviewStatus).toBe("unverified_lead");
    expect(result.sources[0].evidenceEligible).toBe(false);
    expect(result.sources[0]).not.toHaveProperty("reviewed", true);
  });
});
