import { Hono } from "hono";
import type { Context } from "hono";
import { requestId } from "hono/request-id";

import { securityHeaders } from "./middleware/security";
import {
  EventPage,
  GuidePage,
  HomePage,
  ManagePage,
  MissingPage,
  PostPage,
  PrivacyPage,
} from "./ui/pages";
import type { EventView, Filters } from "./ui/pages";

export type Bindings = {
  ASSETS: Fetcher;
  DB: D1Database;
};

export type EventStatus = "active" | "closed" | "hidden";

export type EventRow = {
  access_method: string;
  beginner_welcome: number;
  category: string;
  created_at: number;
  creator_session_id: string;
  device_mobile: number;
  device_pc: number;
  device_standalone: number;
  ends_at: number;
  frequency: string;
  id: string;
  join_url: string;
  organizer: string;
  owner_token_hash: string;
  platform: string;
  starts_at: number;
  status: EventStatus;
  summary: string;
  title: string;
  updated_at: number;
};

type AppContext = Context<{ Bindings: Bindings }>;

class ApiError extends Error {
  constructor(
    readonly code: string,
    readonly status: 400 | 403 | 404 | 409 | 413 | 415 | 429,
  ) {
    super(code);
  }
}

const app = new Hono<{ Bindings: Bindings }>();
const idPattern = /^[0-9a-f]{32}$/i;
const secretPattern = /^[0-9a-f]{64}$/i;
const sessionPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const platforms = new Set(["vrchat", "cluster", "resonite"]);
const categories = new Set([
  "social",
  "music",
  "game",
  "creative",
  "learning",
  "performance",
  "other",
]);
const accessMethods = new Set(["public", "group", "friend", "invite"]);
const frequencies = new Set(["once", "weekly", "biweekly"]);
const reportReasons = new Set(["dead", "contact", "adult", "fake", "spam", "unsafe"]);
const telemetryNames = new Set([
  "visited",
  "filters_used",
  "event_created",
  "event_viewed",
  "share_copied",
  "calendar_added",
  "join_opened",
  "participation_confirmed",
  "returned",
]);
const unsafeTextPattern =
  /(?:https?:\/\/|www\.|[\w.+-]+@[\w.-]+\.[a-z]{2,}|(?:\+?81[- ]?|0)\d{1,4}[- ]?\d{1,4}[- ]?\d{3,4}|(?:discord|ディスコード|line|ライン)\s*(?:id|ｉｄ|招待|サーバー)?|@[a-z0-9_]{3,}|(?:nsfw|r[- ]?18|成人向け|性的|出会い目的|個人連絡先|dmください))/iu;

const randomHex = (byteLength: number) => {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  return [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("");
};

const sha256 = async (value: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

const sameHash = (left: string, right: string) => {
  if (left.length !== right.length) {
    return false;
  }
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
};

const cleanText = (value: unknown, maximumLength: number) => {
  if (typeof value !== "string") {
    return "";
  }
  const withoutControls = Array.from(value)
    .map((character) => {
      const code = character.charCodeAt(0);
      return code < 32 || code === 127 ? " " : character;
    })
    .join("");
  return Array.from(withoutControls.replaceAll(/\s+/g, " ").trim())
    .slice(0, maximumLength)
    .join("");
};

const isSafeVisibleText = (value: string) => !unsafeTextPattern.test(value);

const enforceSameOrigin = (c: AppContext) => {
  const fetchSite = c.req.header("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin") {
    throw new ApiError("cross_site_request", 403);
  }
  const origin = c.req.header("origin");
  if (origin && origin !== new URL(c.req.url).origin) {
    throw new ApiError("cross_site_request", 403);
  }
};

const parseJson = async (c: AppContext, maximumBytes: number) => {
  const contentType = c.req.header("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    throw new ApiError("unsupported_media_type", 415);
  }
  const contentLength = Number(c.req.header("content-length") ?? "0");
  if (contentLength > maximumBytes) {
    throw new ApiError("payload_too_large", 413);
  }
  const rawBody = await c.req.text();
  if (new TextEncoder().encode(rawBody).byteLength > maximumBytes) {
    throw new ApiError("payload_too_large", 413);
  }
  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    throw new ApiError("invalid_json", 400);
  }
};

const parseOptionalSession = async (c: AppContext) => {
  const contentType = c.req.header("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/x-www-form-urlencoded")) {
    throw new ApiError("unsupported_media_type", 415);
  }
  const rawBody = await c.req.text();
  if (new TextEncoder().encode(rawBody).byteLength > 1024) {
    throw new ApiError("payload_too_large", 413);
  }
  const sessionId = new URLSearchParams(rawBody).get("sessionId") ?? "";
  return sessionPattern.test(sessionId) ? sessionId : "";
};

export const normalizeOfficialUrl = (platform: string, value: unknown) => {
  if (typeof value !== "string" || value.length > 500) {
    return "";
  }
  try {
    const parsed = new URL(value.trim());
    if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
      return "";
    }
    const host = parsed.hostname.toLowerCase();
    let allowed = false;
    if (platform === "vrchat") {
      allowed =
        (host === "vrc.group" && /^\/[a-z0-9-]{3,12}\.\d{4}\/?$/i.test(parsed.pathname)) ||
        (host === "vrchat.com" &&
          (/^\/home\/group\/grp_[a-z0-9-]+/i.test(parsed.pathname) ||
            /^\/home\/launch/i.test(parsed.pathname)));
    } else if (platform === "cluster") {
      allowed = host === "cluster.mu" && /^\/e\/[a-z0-9-]{8,}\/?$/i.test(parsed.pathname);
    } else if (platform === "resonite") {
      allowed =
        (host === "go.resonite.com" &&
          /^\/(?:session|world)\/[^/]{3,250}\/?$/i.test(parsed.pathname)) ||
        (host === "events.resonite.com" && parsed.pathname !== "/");
    }
    if (!allowed) {
      return "";
    }
    parsed.hash = "";
    parsed.search = "";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
};

const eventSelect = `SELECT id, owner_token_hash, creator_session_id, title, organizer,
  platform, starts_at, ends_at, frequency, device_pc, device_standalone,
  device_mobile, category, access_method, beginner_welcome, summary, join_url,
  status, created_at, updated_at FROM events`;

const getEvent = (db: D1Database, eventId: string, includeClosed = false) =>
  db
    .prepare(
      `${eventSelect}
       WHERE id = ? ${includeClosed ? "AND status != 'hidden'" : "AND status = 'active'"}`,
    )
    .bind(eventId)
    .first<EventRow>();

const publicEvent = (event: EventRow): EventView => ({
  accessMethod: event.access_method,
  beginnerWelcome: Boolean(event.beginner_welcome),
  category: event.category,
  devices: {
    mobile: Boolean(event.device_mobile),
    pc: Boolean(event.device_pc),
    standalone: Boolean(event.device_standalone),
  },
  endsAt: new Date(event.ends_at * 1000).toISOString(),
  frequency: event.frequency,
  id: event.id,
  organizer: event.organizer,
  platform: event.platform,
  startsAt: new Date(event.starts_at * 1000).toISOString(),
  status: event.status,
  summary: event.summary,
  title: event.title,
});

const advanceRecurringEvents = async (db: D1Database) => {
  const expired = await db
    .prepare(
      `${eventSelect}
       WHERE status = 'active' AND frequency != 'once' AND ends_at <= unixepoch()
       LIMIT 100`,
    )
    .all<EventRow>();
  if (!expired.results.length) {
    return;
  }
  const now = Math.floor(Date.now() / 1000);
  const statements = expired.results.map((event) => {
    const step = event.frequency === "weekly" ? 7 * 86_400 : 14 * 86_400;
    let startsAt = event.starts_at;
    let endsAt = event.ends_at;
    while (endsAt <= now) {
      startsAt += step;
      endsAt += step;
    }
    return db
      .prepare(
        "UPDATE events SET starts_at = ?, ends_at = ?, updated_at = unixepoch() WHERE id = ?",
      )
      .bind(startsAt, endsAt, event.id);
  });
  await db.batch(statements);
};

const cleanup = async (db: D1Database) => {
  await advanceRecurringEvents(db);
  await db.batch([
    db.prepare(
      `UPDATE events
       SET status = 'closed', join_url = '', updated_at = unixepoch()
       WHERE frequency = 'once' AND status = 'active' AND ends_at <= unixepoch() - 86400`,
    ),
    db.prepare(
      `DELETE FROM events
       WHERE (frequency = 'once' AND ends_at < unixepoch() - (30 * 86400))
          OR (status != 'active' AND updated_at < unixepoch() - (30 * 86400))`,
    ),
    db.prepare("DELETE FROM product_events WHERE created_at < unixepoch() - (120 * 86400)"),
  ]);
};

const bearerToken = (c: AppContext) => {
  const authorization = c.req.header("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!secretPattern.test(token)) {
    throw new ApiError("access_denied", 403);
  }
  return token;
};

const requireOwner = async (c: AppContext, eventId: string) => {
  const token = bearerToken(c);
  const event = await getEvent(c.env.DB, eventId, true);
  if (!event || !sameHash(await sha256(token), event.owner_token_hash)) {
    throw new ApiError("access_denied", 403);
  }
  return event;
};

const startOfJstDay = (timestamp: number) => {
  const shifted = new Date(timestamp + 9 * 3_600_000);
  return (
    Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()) - 9 * 3_600_000
  );
};

const readEvents = async (c: AppContext) => {
  await cleanup(c.env.DB);
  const windowValue = ["today", "tomorrow", "week"].includes(c.req.query("when") ?? "")
    ? (c.req.query("when") ?? "today")
    : "today";
  const platform = platforms.has(c.req.query("platform") ?? "")
    ? (c.req.query("platform") ?? "")
    : "";
  const device = ["pc", "standalone", "mobile"].includes(c.req.query("device") ?? "")
    ? (c.req.query("device") ?? "")
    : "";
  const category = categories.has(c.req.query("category") ?? "")
    ? (c.req.query("category") ?? "")
    : "";
  const beginner = c.req.query("beginner") === "1";
  const now = Date.now();
  const today = startOfJstDay(now);
  const start =
    windowValue === "tomorrow" ? today + 86_400_000 : windowValue === "week" ? now : now;
  const end =
    windowValue === "today"
      ? today + 86_400_000
      : windowValue === "tomorrow"
        ? today + 2 * 86_400_000
        : now + 7 * 86_400_000;
  const clauses = ["status = 'active'", "ends_at > ?", "starts_at < ?"];
  const values: Array<number | string> = [Math.floor(start / 1000), Math.floor(end / 1000)];
  if (platform) {
    clauses.push("platform = ?");
    values.push(platform);
  }
  if (device) {
    clauses.push(`device_${device} = 1`);
  }
  if (category) {
    clauses.push("category = ?");
    values.push(category);
  }
  if (beginner) {
    clauses.push("beginner_welcome = 1");
  }
  const result = await c.env.DB.prepare(
    `${eventSelect}
     WHERE ${clauses.join(" AND ")}
     ORDER BY starts_at ASC, id ASC
     LIMIT 80`,
  )
    .bind(...values)
    .all<EventRow>();
  const filters: Filters = {
    beginner,
    category,
    device,
    platform,
    when: windowValue,
  };
  return { events: result.results.map(publicEvent), filters };
};

const recordEvent = (db: D1Database, sessionId: string, name: string, context: string) =>
  db
    .prepare(
      `INSERT OR IGNORE INTO product_events
       (session_id, name, context, occurred_on) VALUES (?, ?, ?, ?)`,
    )
    .bind(sessionId, name, context, new Date().toISOString().slice(0, 10))
    .run();

const formatIcsDate = (iso: string) =>
  new Date(iso)
    .toISOString()
    .replaceAll(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");

const escapeIcs = (value: string) =>
  value
    .replaceAll("\\", "\\\\")
    .replaceAll("\n", "\\n")
    .replaceAll(",", "\\,")
    .replaceAll(";", "\\;");

const createIcs = (event: EventRow, origin: string) => {
  const view = publicEvent(event);
  const repeat =
    event.frequency === "weekly"
      ? "\r\nRRULE:FREQ=WEEKLY"
      : event.frequency === "biweekly"
        ? "\r\nRRULE:FREQ=WEEKLY;INTERVAL=2"
        : "";
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//yoru-mado.yhay81.com//Yoru Mado//JA",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.id}@yoru-mado.yhay81.com`,
    `DTSTAMP:${formatIcsDate(new Date().toISOString())}`,
    `DTSTART:${formatIcsDate(view.startsAt)}`,
    `DTEND:${formatIcsDate(view.endsAt)}${repeat}`,
    `SUMMARY:${escapeIcs(event.title)}`,
    `DESCRIPTION:${escapeIcs(`${event.summary}\n主催: ${event.organizer}`)}`,
    `LOCATION:${escapeIcs(event.platform)}`,
    `URL:${origin}/events/${event.id}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
};

app.use("*", requestId());
app.use("*", securityHeaders);

app.get("/", async (c) => {
  const { events, filters } = await readEvents(c);
  c.header("Cache-Control", "public, max-age=20");
  return c.html(<HomePage events={events} filters={filters} />);
});
app.get("/post", (c) => c.html(<PostPage />));
app.get("/guide", (c) => c.html(<GuidePage />));
app.get("/privacy", (c) => c.html(<PrivacyPage />));

app.get("/events/:eventId", async (c) => {
  const eventId = c.req.param("eventId");
  c.header("Cache-Control", "no-store");
  c.header("X-Robots-Tag", "noindex, nofollow, noarchive");
  if (!idPattern.test(eventId)) {
    return c.html(<MissingPage />, 404);
  }
  await cleanup(c.env.DB);
  const event = await getEvent(c.env.DB, eventId);
  if (!event || event.ends_at <= Math.floor(Date.now() / 1000)) {
    return c.html(<MissingPage />, 404);
  }
  return c.html(<EventPage event={publicEvent(event)} planned={c.req.query("planned") === "1"} />);
});

app.get("/manage/:eventId", (c) => {
  const eventId = c.req.param("eventId");
  c.header("Cache-Control", "no-store");
  c.header("X-Robots-Tag", "noindex, nofollow, noarchive");
  return idPattern.test(eventId)
    ? c.html(<ManagePage eventId={eventId} />)
    : c.html(<MissingPage />, 404);
});

app.post("/api/events", async (c) => {
  enforceSameOrigin(c);
  const payload = await parseJson(c, 6144);
  if (!payload || typeof payload !== "object") {
    throw new ApiError("invalid_event", 400);
  }
  const source = payload as Record<string, unknown>;
  const title = cleanText(source.title, 40);
  const organizer = cleanText(source.organizer, 30);
  const summary = cleanText(source.summary, 160);
  const platform = typeof source.platform === "string" ? source.platform : "";
  const category = typeof source.category === "string" ? source.category : "";
  const accessMethod = typeof source.accessMethod === "string" ? source.accessMethod : "";
  const frequency = typeof source.frequency === "string" ? source.frequency : "";
  const startsAt = Date.parse(typeof source.startsAt === "string" ? source.startsAt : "");
  const endsAt = Date.parse(typeof source.endsAt === "string" ? source.endsAt : "");
  const joinUrl = normalizeOfficialUrl(platform, source.joinUrl);
  const devices =
    source.devices && typeof source.devices === "object"
      ? (source.devices as Record<string, unknown>)
      : {};
  const devicePc = devices.pc === true;
  const deviceStandalone = devices.standalone === true;
  const deviceMobile = devices.mobile === true;
  const beginnerWelcome = source.beginnerWelcome === true;
  const confirmedPublic = source.confirmedPublic === true;
  const sessionId = typeof source.sessionId === "string" ? source.sessionId : "";
  const honeypot = cleanText(source.website, 100);
  const now = Date.now();
  if (
    !title ||
    !organizer ||
    !platforms.has(platform) ||
    !categories.has(category) ||
    !accessMethods.has(accessMethod) ||
    !frequencies.has(frequency) ||
    !joinUrl ||
    !Number.isFinite(startsAt) ||
    !Number.isFinite(endsAt) ||
    startsAt < now - 5 * 60_000 ||
    startsAt > now + 180 * 86_400_000 ||
    endsAt <= startsAt ||
    endsAt - startsAt > 8 * 3_600_000 ||
    (!devicePc && !deviceStandalone && !deviceMobile) ||
    !sessionPattern.test(sessionId) ||
    !confirmedPublic ||
    honeypot ||
    !isSafeVisibleText(title) ||
    !isSafeVisibleText(organizer) ||
    !isSafeVisibleText(summary)
  ) {
    throw new ApiError("invalid_event", 400);
  }

  await cleanup(c.env.DB);
  const dailyCount = await c.env.DB.prepare(
    "SELECT COUNT(*) AS count FROM events WHERE creator_session_id = ? AND created_at > unixepoch() - 86400",
  )
    .bind(sessionId)
    .first<{ count: number }>();
  if (Number(dailyCount?.count ?? 0) >= 3) {
    throw new ApiError("rate_limited", 429);
  }
  const previousDay = await c.env.DB.prepare(
    `SELECT 1 AS found FROM events
     WHERE creator_session_id = ? AND date(created_at, 'unixepoch') < date('now')
     LIMIT 1`,
  )
    .bind(sessionId)
    .first<{ found: number }>();

  const eventId = randomHex(16);
  const ownerToken = randomHex(32);
  const statements = [
    c.env.DB.prepare(
      `INSERT INTO events
       (id, owner_token_hash, creator_session_id, title, organizer, platform,
        starts_at, ends_at, frequency, device_pc, device_standalone, device_mobile,
        category, access_method, beginner_welcome, summary, join_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      eventId,
      await sha256(ownerToken),
      sessionId,
      title,
      organizer,
      platform,
      Math.floor(startsAt / 1000),
      Math.floor(endsAt / 1000),
      frequency,
      devicePc ? 1 : 0,
      deviceStandalone ? 1 : 0,
      deviceMobile ? 1 : 0,
      category,
      accessMethod,
      beginnerWelcome ? 1 : 0,
      summary,
      joinUrl,
    ),
    c.env.DB.prepare(
      `INSERT OR IGNORE INTO product_events
       (session_id, name, context, occurred_on)
       VALUES (?, 'event_created', ?, ?)`,
    ).bind(sessionId, eventId, new Date().toISOString().slice(0, 10)),
  ];
  if (previousDay) {
    statements.push(
      c.env.DB.prepare(
        `INSERT OR IGNORE INTO product_events
         (session_id, name, context, occurred_on)
         VALUES (?, 'returned', 'organizer', ?)`,
      ).bind(sessionId, new Date().toISOString().slice(0, 10)),
    );
  }
  await c.env.DB.batch(statements);
  c.header("Cache-Control", "no-store");
  return c.json({ eventId, ownerToken }, 201);
});

app.get("/api/events/:eventId/manage", async (c) => {
  const eventId = c.req.param("eventId");
  if (!idPattern.test(eventId)) {
    throw new ApiError("not_found", 404);
  }
  await cleanup(c.env.DB);
  const event = await requireOwner(c, eventId);
  c.header("Cache-Control", "no-store");
  return c.json({ ...publicEvent(event), joinUrl: event.join_url });
});

app.patch("/api/events/:eventId/status", async (c) => {
  enforceSameOrigin(c);
  const eventId = c.req.param("eventId");
  if (!idPattern.test(eventId)) {
    throw new ApiError("not_found", 404);
  }
  const event = await requireOwner(c, eventId);
  const payload = await parseJson(c, 1024);
  const status =
    payload && typeof payload === "object" ? (payload as Record<string, unknown>).status : "";
  if (status !== "active" && status !== "closed") {
    throw new ApiError("invalid_status", 400);
  }
  if (status === "active" && (!event.join_url || event.ends_at <= Math.floor(Date.now() / 1000))) {
    throw new ApiError("event_expired", 409);
  }
  await c.env.DB.prepare("UPDATE events SET status = ?, updated_at = unixepoch() WHERE id = ?")
    .bind(status, eventId)
    .run();
  return c.json({ status });
});

app.delete("/api/events/:eventId", async (c) => {
  enforceSameOrigin(c);
  const eventId = c.req.param("eventId");
  if (!idPattern.test(eventId)) {
    throw new ApiError("not_found", 404);
  }
  await requireOwner(c, eventId);
  await c.env.DB.prepare("DELETE FROM events WHERE id = ?").bind(eventId).run();
  return c.json({ deleted: true });
});

app.post("/api/events/:eventId/report", async (c) => {
  enforceSameOrigin(c);
  const eventId = c.req.param("eventId");
  if (!idPattern.test(eventId) || !(await getEvent(c.env.DB, eventId))) {
    throw new ApiError("not_found", 404);
  }
  const payload = await parseJson(c, 1024);
  if (!payload || typeof payload !== "object") {
    throw new ApiError("invalid_report", 400);
  }
  const source = payload as Record<string, unknown>;
  const sessionId = typeof source.sessionId === "string" ? source.sessionId : "";
  const reason = typeof source.reason === "string" ? source.reason : "";
  if (!sessionPattern.test(sessionId) || !reportReasons.has(reason)) {
    throw new ApiError("invalid_report", 400);
  }
  await c.env.DB.prepare(
    "INSERT OR IGNORE INTO reports (event_id, reporter_session_id, reason) VALUES (?, ?, ?)",
  )
    .bind(eventId, sessionId, reason)
    .run();
  const result = await c.env.DB.prepare("SELECT COUNT(*) AS count FROM reports WHERE event_id = ?")
    .bind(eventId)
    .first<{ count: number }>();
  if (Number(result?.count ?? 0) >= 3) {
    await c.env.DB.prepare(
      "UPDATE events SET status = 'hidden', join_url = '', updated_at = unixepoch() WHERE id = ?",
    )
      .bind(eventId)
      .run();
  }
  return c.json({ reported: true });
});

app.post("/go/:eventId", async (c) => {
  enforceSameOrigin(c);
  const eventId = c.req.param("eventId");
  if (!idPattern.test(eventId)) {
    throw new ApiError("not_found", 404);
  }
  const event = await getEvent(c.env.DB, eventId);
  if (!event?.join_url || event.ends_at <= Math.floor(Date.now() / 1000)) {
    throw new ApiError("not_found", 404);
  }
  const sessionId = await parseOptionalSession(c);
  if (sessionId) {
    await recordEvent(c.env.DB, sessionId, "join_opened", eventId);
  }
  c.header("Cache-Control", "no-store");
  c.header("Referrer-Policy", "no-referrer");
  return c.redirect(event.join_url, 303);
});

app.post("/calendar/:eventId", async (c) => {
  enforceSameOrigin(c);
  const eventId = c.req.param("eventId");
  const event = idPattern.test(eventId) ? await getEvent(c.env.DB, eventId) : null;
  if (!event) {
    throw new ApiError("not_found", 404);
  }
  const sessionId = await parseOptionalSession(c);
  if (sessionId) {
    await recordEvent(c.env.DB, sessionId, "calendar_added", `${eventId}:ics`);
  }
  c.header("Cache-Control", "no-store");
  c.header("Content-Disposition", `attachment; filename="yoru-mado-${eventId}.ics"`);
  return c.body(createIcs(event, new URL(c.req.url).origin), 200, {
    "Content-Type": "text/calendar; charset=utf-8",
  });
});

app.post("/calendar/google/:eventId", async (c) => {
  enforceSameOrigin(c);
  const eventId = c.req.param("eventId");
  const event = idPattern.test(eventId) ? await getEvent(c.env.DB, eventId) : null;
  if (!event) {
    throw new ApiError("not_found", 404);
  }
  const sessionId = await parseOptionalSession(c);
  if (sessionId) {
    await recordEvent(c.env.DB, sessionId, "calendar_added", `${eventId}:google`);
  }
  const origin = new URL(c.req.url).origin;
  const query = new URLSearchParams({
    action: "TEMPLATE",
    dates: `${formatIcsDate(new Date(event.starts_at * 1000).toISOString())}/${formatIcsDate(
      new Date(event.ends_at * 1000).toISOString(),
    )}`,
    details: `${event.summary}\n${origin}/events/${event.id}`,
    location: event.platform,
    text: event.title,
  });
  c.header("Cache-Control", "no-store");
  c.header("Referrer-Policy", "no-referrer");
  return c.redirect(`https://calendar.google.com/calendar/render?${query.toString()}`, 303);
});

app.post("/confirm/:eventId", async (c) => {
  enforceSameOrigin(c);
  const eventId = c.req.param("eventId");
  if (!idPattern.test(eventId) || !(await getEvent(c.env.DB, eventId))) {
    throw new ApiError("not_found", 404);
  }
  const sessionId = await parseOptionalSession(c);
  if (sessionId) {
    await recordEvent(c.env.DB, sessionId, "participation_confirmed", eventId);
  }
  return c.redirect(`/events/${eventId}?planned=1`, 303);
});

app.post("/api/telemetry", async (c) => {
  enforceSameOrigin(c);
  const payload = await parseJson(c, 1024);
  if (!payload || typeof payload !== "object") {
    throw new ApiError("invalid_event", 400);
  }
  const source = payload as Record<string, unknown>;
  const sessionId = typeof source.sessionId === "string" ? source.sessionId : "";
  const name = typeof source.name === "string" ? source.name : "";
  const rawContext = typeof source.context === "string" ? source.context : "";
  const context = idPattern.test(rawContext)
    ? rawContext
    : ["home", "filtered", "visitor"].includes(rawContext)
      ? rawContext
      : "";
  if (!sessionPattern.test(sessionId) || !telemetryNames.has(name)) {
    throw new ApiError("invalid_event", 400);
  }
  await recordEvent(c.env.DB, sessionId, name, context);
  return c.body(null, 204);
});

app.get("/healthz", (c) =>
  c.json({
    healthy: true,
    service: "yoru-mado",
    time: new Date().toISOString(),
  }),
);

app.notFound((c) => {
  if (c.req.path.startsWith("/api/")) {
    return c.json({ error: "not_found", requestId: c.get("requestId") }, 404);
  }
  c.header("X-Robots-Tag", "noindex, nofollow, noarchive");
  return c.html(<MissingPage />, 404);
});

app.onError((error, c) => {
  if (error instanceof ApiError) {
    return c.json({ error: error.code, requestId: c.get("requestId") }, error.status);
  }
  console.error(
    JSON.stringify({
      event: "request_failed",
      message: error.message,
      requestId: c.get("requestId"),
    }),
  );
  return c.json({ error: "internal_error", requestId: c.get("requestId") }, 500);
});

export { app };

export default {
  fetch: app.fetch,
  scheduled(_controller: ScheduledController, env: Bindings, context: ExecutionContext) {
    context.waitUntil(cleanup(env.DB));
  },
} satisfies ExportedHandler<Bindings>;
