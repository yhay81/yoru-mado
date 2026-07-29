import { beforeEach, describe, expect, it, vi } from "vitest";

import { app, type Bindings, type EventRow, normalizeOfficialUrl } from "../src/worker";

const eventId = "a".repeat(32);
const sessionId = "7c0dbe70-8c47-4fc0-aa62-52427133c612";
const ownerToken = "1".repeat(64);
const officialUrl = "https://vrc.group/NIGHT.1234";

type State = {
  dailyCount?: number;
  event?: EventRow | null;
  events?: EventRow[];
  previousDay?: boolean;
  reportCount?: number;
};

const hash = async (value: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

const defaultEvent = async (status: "active" | "closed" | "hidden" = "active") => ({
  access_method: "group",
  beginner_welcome: 1,
  category: "social",
  created_at: Math.floor(Date.now() / 1000),
  creator_session_id: sessionId,
  device_mobile: 0,
  device_pc: 1,
  device_standalone: 1,
  ends_at: Math.floor(Date.now() / 1000) + 90_000,
  frequency: "weekly",
  id: eventId,
  join_url: officialUrl,
  organizer: "夜歩き部",
  owner_token_hash: await hash(ownerToken),
  platform: "vrchat",
  starts_at: Math.floor(Date.now() / 1000) + 86_400,
  status,
  summary: "静かなワールドを二つ巡ります",
  title: "月曜の静かなワールド巡り",
  updated_at: Math.floor(Date.now() / 1000),
});

const makeBindings = (state: State = {}) => {
  const calls: Array<{ arguments: unknown[]; sql: string }> = [];
  const batch = vi.fn(() => Promise.resolve([]));
  const prepare = vi.fn((sql: string) => {
    const call = { arguments: [] as unknown[], sql };
    calls.push(call);
    const statement = {
      all: vi.fn(async () => {
        if (sql.includes("frequency != 'once'")) return { results: [] };
        if (sql.includes("FROM events")) return { results: state.events ?? [] };
        return { results: [] };
      }),
      bind: vi.fn((...arguments_: unknown[]) => {
        call.arguments = arguments_;
        return statement;
      }),
      first: vi.fn(async () => {
        if (sql.includes("COUNT(*) AS count FROM events")) {
          return { count: state.dailyCount ?? 0 };
        }
        if (sql.includes("SELECT 1 AS found FROM events")) {
          return state.previousDay ? { found: 1 } : null;
        }
        if (sql.includes("COUNT(*) AS count FROM reports")) {
          return { count: state.reportCount ?? 1 };
        }
        if (sql.includes("FROM events")) return state.event ?? null;
        return null;
      }),
      run: vi.fn(() => Promise.resolve({ success: true })),
    };
    return statement;
  });
  return {
    batch,
    bindings: {
      ASSETS: { fetch: () => Promise.resolve(new Response("not used")) },
      DB: { batch, prepare },
    } as unknown as Bindings,
    calls,
  };
};

const jsonHeaders = {
  "content-type": "application/json",
  "sec-fetch-site": "same-origin",
};

const validPayload = {
  accessMethod: "group",
  beginnerWelcome: true,
  category: "social",
  confirmedPublic: true,
  devices: { mobile: false, pc: true, standalone: true },
  endsAt: new Date(Date.now() + 90_000_000).toISOString(),
  frequency: "weekly",
  joinUrl: `${officialUrl}?utm_source=sample#ignored`,
  organizer: "夜歩き部",
  platform: "vrchat",
  sessionId,
  startsAt: new Date(Date.now() + 86_400_000).toISOString(),
  summary: "静かなワールドを二つ巡ります",
  title: "月曜の静かなワールド巡り",
  website: "",
};

describe("よる窓 worker", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("renders a compact visual timeline without experiment copy", async () => {
    const event = await defaultEvent();
    const response = await app.request("/", undefined, makeBindings({ events: [event] }).bindings);
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-security-policy")).toContain("default-src 'self'");
    expect(html).toContain('lang="ja"');
    expect(html).toContain('class="timeline-board"');
    expect(html).toContain('class="event-window"');
    expect(html).toContain("月曜の静かなワールド巡り");
    expect(html).not.toContain("data-template-surface");
    expect(html).not.toContain('class="hero"');
    expect(html).not.toContain("成功条件");
  });

  it("shows an honest empty timeline instead of invented events", async () => {
    const response = await app.request("/", undefined, makeBindings().bindings);
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain("この時間割には、まだ灯りがありません");
    expect(html).toContain("0件");
    expect(html).not.toContain("月曜の静かなワールド巡り");
  });

  it("renders event details without exposing the official URL", async () => {
    const event = await defaultEvent();
    const response = await app.request(
      `/events/${eventId}`,
      undefined,
      makeBindings({ event }).bindings,
    );
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("x-robots-tag")).toContain("noindex");
    expect(html).toContain("月曜の静かなワールド巡り");
    expect(html).toContain(`action="/go/${eventId}"`);
    expect(html).toContain(`action="/calendar/${eventId}"`);
    expect(html).not.toContain(officialUrl);
  });

  it("creates a future event with a normalized official URL and owner secret", async () => {
    const { batch, bindings, calls } = makeBindings();
    const response = await app.request(
      "/api/events",
      { body: JSON.stringify(validPayload), headers: jsonHeaders, method: "POST" },
      bindings,
    );
    const body = await response.json<{ eventId: string; ownerToken: string }>();

    expect(response.status).toBe(201);
    expect(body.eventId).toMatch(/^[0-9a-f]{32}$/);
    expect(body.ownerToken).toMatch(/^[0-9a-f]{64}$/);
    expect(batch).toHaveBeenCalledTimes(2);
    const insert = calls.find((call) => call.sql.includes("INSERT INTO events"));
    expect(insert?.arguments).toContain(officialUrl);
    expect(JSON.stringify(insert?.arguments)).not.toContain("utm_source");
    expect(calls.some((call) => call.sql.includes("'event_created'"))).toBe(true);
  });

  it("rejects contacts, adult content, unsafe URLs, invalid time, and cross-site creation", async () => {
    const invalidPayloads = [
      { ...validPayload, joinUrl: "https://discord.gg/unsafe" },
      { ...validPayload, summary: "連絡は @night_owner へ" },
      { ...validPayload, title: "R18イベント" },
      { ...validPayload, devices: { mobile: false, pc: false, standalone: false } },
      { ...validPayload, endsAt: new Date(Date.now() + 9 * 3_600_000).toISOString() },
      { ...validPayload, website: "filled-by-bot" },
    ];
    for (const payload of invalidPayloads) {
      const response = await app.request(
        "/api/events",
        { body: JSON.stringify(payload), headers: jsonHeaders, method: "POST" },
        makeBindings().bindings,
      );
      expect(response.status).toBe(400);
    }
    const crossSite = await app.request(
      "/api/events",
      {
        body: JSON.stringify(validPayload),
        headers: { ...jsonHeaders, "sec-fetch-site": "cross-site" },
        method: "POST",
      },
      makeBindings().bindings,
    );
    expect(crossSite.status).toBe(403);
  });

  it("accepts only platform-matched official URLs and strips tracking", () => {
    expect(normalizeOfficialUrl("vrchat", `${officialUrl}/?utm_source=test#fragment`)).toBe(
      officialUrl,
    );
    expect(normalizeOfficialUrl("cluster", "https://cluster.mu/e/01234567-abcd")).toBe(
      "https://cluster.mu/e/01234567-abcd",
    );
    expect(
      normalizeOfficialUrl("resonite", "https://go.resonite.com/session/S-U-example:world"),
    ).toBe("https://go.resonite.com/session/S-U-example:world");
    expect(normalizeOfficialUrl("cluster", officialUrl)).toBe("");
    expect(normalizeOfficialUrl("vrchat", "http://vrc.group/NIGHT.1234")).toBe("");
    expect(normalizeOfficialUrl("vrchat", "https://evil.example/NIGHT.1234")).toBe("");
  });

  it("limits one browser to three new events per day", async () => {
    const response = await app.request(
      "/api/events",
      { body: JSON.stringify(validPayload), headers: jsonHeaders, method: "POST" },
      makeBindings({ dailyCount: 3 }).bindings,
    );
    expect(response.status).toBe(429);
  });

  it("returns management data only with the owner secret", async () => {
    const event = await defaultEvent();
    const valid = await app.request(
      `/api/events/${eventId}/manage`,
      { headers: { authorization: `Bearer ${ownerToken}` } },
      makeBindings({ event }).bindings,
    );
    const invalid = await app.request(
      `/api/events/${eventId}/manage`,
      { headers: { authorization: `Bearer ${"2".repeat(64)}` } },
      makeBindings({ event }).bindings,
    );
    const body = await valid.json<Record<string, unknown>>();

    expect(valid.status).toBe(200);
    expect(body.joinUrl).toBe(officialUrl);
    expect(body).not.toHaveProperty("owner_token_hash");
    expect(invalid.status).toBe(403);
  });

  it("tracks an official outbound and redirects without a referrer", async () => {
    const event = await defaultEvent();
    const { bindings, calls } = makeBindings({ event });
    const response = await app.request(
      `/go/${eventId}`,
      {
        body: new URLSearchParams({ sessionId }).toString(),
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          "sec-fetch-site": "same-origin",
        },
        method: "POST",
      },
      bindings,
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(officialUrl);
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(calls.some((call) => call.arguments.includes("join_opened"))).toBe(true);
  });

  it("produces a recurring iCal file and tracks the calendar job", async () => {
    const event = await defaultEvent();
    const { bindings, calls } = makeBindings({ event });
    const response = await app.request(
      `/calendar/${eventId}`,
      {
        body: new URLSearchParams({ sessionId }).toString(),
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          "sec-fetch-site": "same-origin",
        },
        method: "POST",
      },
      bindings,
    );
    const ics = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/calendar");
    expect(response.headers.get("content-disposition")).toContain(".ics");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("RRULE:FREQ=WEEKLY");
    expect(ics).not.toContain(officialUrl);
    expect(calls.some((call) => call.arguments.includes("calendar_added"))).toBe(true);
  });

  it("hides the official URL after three distinct reports", async () => {
    const event = await defaultEvent();
    const { bindings, calls } = makeBindings({ event, reportCount: 3 });
    const response = await app.request(
      `/api/events/${eventId}/report`,
      {
        body: JSON.stringify({ reason: "unsafe", sessionId }),
        headers: jsonHeaders,
        method: "POST",
      },
      bindings,
    );

    expect(response.status).toBe(200);
    expect(
      calls.some(
        (call) => call.sql.includes("status = 'hidden'") && call.sql.includes("join_url = ''"),
      ),
    ).toBe(true);
  });

  it("documents actual collection, deletion, and retention boundaries", async () => {
    const response = await app.request("/privacy", undefined, makeBindings().bindings);
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain("各VRSNSの公式URL");
    expect(html).toContain("Cookie、氏名、IPアドレス、User-Agent");
    expect(html).toContain("終了24時間後");
    expect(html).toContain("120日以内");
  });

  it("serves HTML for missing pages and JSON for missing API routes", async () => {
    const page = await app.request("/missing", undefined, makeBindings().bindings);
    const api = await app.request("/api/missing", undefined, makeBindings().bindings);
    const pageHtml = await page.text();
    const apiBody = await api.json<{ error: string; requestId: string }>();

    expect(page.status).toBe(404);
    expect(pageHtml).toContain("この窓は閉じています");
    expect(pageHtml).toContain('content="noindex,nofollow,noarchive"');
    expect(api.status).toBe(404);
    expect(apiBody.error).toBe("not_found");
    expect(apiBody.requestId).toBeTruthy();
  });

  it("exposes a non-sensitive health response", async () => {
    const response = await app.request("/healthz", undefined, makeBindings().bindings);
    const body = await response.json<{ healthy: boolean; service: string }>();

    expect(response.status).toBe(200);
    expect(body).toEqual(expect.objectContaining({ healthy: true, service: "yoru-mado" }));
  });
});
