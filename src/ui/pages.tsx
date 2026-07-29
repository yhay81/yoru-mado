import { product } from "../config/product";
import { Layout } from "./layout";

export type EventView = {
  accessMethod: string;
  beginnerWelcome: boolean;
  category: string;
  devices: {
    mobile: boolean;
    pc: boolean;
    standalone: boolean;
  };
  endsAt: string;
  frequency: string;
  id: string;
  organizer: string;
  platform: string;
  startsAt: string;
  status: "active" | "closed" | "hidden";
  summary: string;
  title: string;
};

export type Filters = {
  beginner: boolean;
  category: string;
  device: string;
  platform: string;
  when: string;
};

const platformLabels: Record<string, string> = {
  cluster: "cluster",
  resonite: "Resonite",
  vrchat: "VRChat",
};

const categoryLabels: Record<string, string> = {
  creative: "創作",
  game: "ゲーム",
  learning: "学び",
  music: "音楽",
  other: "その他",
  performance: "公演",
  social: "交流",
};

const accessLabels: Record<string, string> = {
  friend: "Friend / Join",
  group: "Group",
  invite: "招待制",
  public: "公開",
};

const frequencyLabels: Record<string, string> = {
  biweekly: "隔週",
  once: "今回のみ",
  weekly: "毎週",
};

const dateFormatter = new Intl.DateTimeFormat("ja-JP", {
  day: "numeric",
  month: "numeric",
  timeZone: "Asia/Tokyo",
  weekday: "short",
});

const timeFormatter = new Intl.DateTimeFormat("ja-JP", {
  hour: "2-digit",
  hour12: false,
  minute: "2-digit",
  timeZone: "Asia/Tokyo",
});

const formatDate = (iso: string) => dateFormatter.format(new Date(iso));
const formatTime = (iso: string) => timeFormatter.format(new Date(iso));

const deviceLabels = (event: EventView) => [
  ...(event.devices.pc ? ["PCVR"] : []),
  ...(event.devices.standalone ? ["Quest"] : []),
  ...(event.devices.mobile ? ["Mobile"] : []),
];

function PlatformGlyph({ platform }: { platform: string }) {
  return (
    <span aria-hidden="true" class={`platform-glyph ${platform}`}>
      <i></i>
      <i></i>
      <i></i>
    </span>
  );
}

function EventCard({ event }: { event: EventView }) {
  return (
    <article class={`event-row ${event.platform}`}>
      <div class="time-post">
        <strong>{formatTime(event.startsAt)}</strong>
        <span>{formatTime(event.endsAt)}</span>
        <i></i>
      </div>
      <a
        aria-label={`${event.title}の詳細を見る`}
        class="event-window"
        href={`/events/${event.id}`}
      >
        <span class="window-glow"></span>
        <div class="event-topline">
          <span class={`platform-badge ${event.platform}`}>
            <PlatformGlyph platform={event.platform} />
            {platformLabels[event.platform]}
          </span>
          <span class="category-ticket">{categoryLabels[event.category]}</span>
        </div>
        <h2>{event.title}</h2>
        <p class="organizer-line">
          <span aria-hidden="true" class="host-dot"></span>
          {event.organizer}
        </p>
        <div class="condition-row">
          {deviceLabels(event).map((label) => (
            <span>{label}</span>
          ))}
          <span>{accessLabels[event.accessMethod]}</span>
          {event.beginnerWelcome ? <b>初参加歓迎</b> : null}
        </div>
        {event.summary ? <p class="event-summary">{event.summary}</p> : null}
        <span class="window-handle" aria-hidden="true"></span>
      </a>
    </article>
  );
}

function EmptyTimeline() {
  return (
    <section class="empty-timeline">
      <div aria-hidden="true" class="dark-building">
        {Array.from({ length: 8 }, () => (
          <i></i>
        ))}
      </div>
      <div>
        <strong>この時間割には、まだ灯りがありません</strong>
        <span>次のイベントを登録すると、最初の窓がひらきます。</span>
      </div>
      <a class="button warm" href="/post">
        イベントを登録
      </a>
    </section>
  );
}

export function HomePage({ events, filters }: { events: EventView[]; filters: Filters }) {
  const filtered = Boolean(
    filters.when !== "today" ||
    filters.platform ||
    filters.device ||
    filters.category ||
    filters.beginner,
  );
  return (
    <Layout script="/schedule.js">
      <section class="night-console">
        <div aria-hidden="true" class="orbital-clock">
          <i class="clock-hand"></i>
          <span class="clock-center"></span>
          <span class="orbit-light light-one"></span>
          <span class="orbit-light light-two"></span>
          <span class="orbit-light light-three"></span>
        </div>
        <div>
          <p class="eyebrow">VRSNS EVENT WINDOWS</p>
          <h1>{product.headline}</h1>
          <p>時間、端末、ジャンルを合わせて、参加できる窓を選びます。</p>
        </div>
        <div class="date-signal">
          <span>JST</span>
          <strong>{events.length}</strong>
          <small>OPEN WINDOWS</small>
        </div>
      </section>

      <section class="event-desk" data-schedule>
        <form aria-label="イベントを絞り込む" class="filter-console" method="get">
          <header>
            <span class="console-lamp"></span>
            <b>探索パネル</b>
            {filtered ? <a href="/">初期化</a> : null}
          </header>
          <fieldset>
            <legend>いつ</legend>
            <div class="when-switch">
              {[
                ["today", "今日"],
                ["tomorrow", "明日"],
                ["week", "7日間"],
              ].map(([value, label]) => (
                <label>
                  <input checked={filters.when === value} name="when" type="radio" value={value} />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>VRSNS</legend>
            <div class="platform-switches">
              {[
                ["", "すべて"],
                ["vrchat", "VRChat"],
                ["cluster", "cluster"],
                ["resonite", "Resonite"],
              ].map(([value, label]) => (
                <label>
                  <input
                    checked={filters.platform === value}
                    name="platform"
                    type="radio"
                    value={value}
                  />
                  <span class={value || "all"}>
                    {value ? <PlatformGlyph platform={value} /> : <i class="all-platforms"></i>}
                    {label}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <label class="select-field">
            <span>参加端末</span>
            <select name="device">
              <option value="">どの端末でも</option>
              <option selected={filters.device === "pc"} value="pc">
                PCVR
              </option>
              <option selected={filters.device === "standalone"} value="standalone">
                Quest / Standalone
              </option>
              <option selected={filters.device === "mobile"} value="mobile">
                Mobile
              </option>
            </select>
          </label>
          <label class="select-field">
            <span>ジャンル</span>
            <select name="category">
              <option value="">すべて</option>
              {Object.entries(categoryLabels).map(([value, label]) => (
                <option selected={filters.category === value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label class="check-console">
            <input checked={filters.beginner} name="beginner" type="checkbox" value="1" />
            <span aria-hidden="true" class="welcome-spark">
              ✦
            </span>
            <b>初参加歓迎だけ</b>
          </label>
          <button class="button moon" type="submit">
            時間割を合わせる
          </button>
          <div class="console-key">
            <span>
              <i class="key-dot live"></i>開催予定
            </span>
            <span>
              <i class="key-dot official"></i>公式URLのみ
            </span>
          </div>
        </form>

        <div class="timeline-board">
          <header class="timeline-heading">
            <div>
              <span class="live-pulse"></span>
              <b>
                {filters.when === "today" ? "今夜" : filters.when === "tomorrow" ? "明日" : "7日間"}
              </b>
            </div>
            <strong>{events.length}件</strong>
          </header>
          {events.length ? (
            <div class="event-list">
              {events.map((event) => (
                <section class="day-block" key={event.id}>
                  <div class="day-label">{formatDate(event.startsAt)}</div>
                  <EventCard event={event} />
                </section>
              ))}
            </div>
          ) : (
            <EmptyTimeline />
          )}
        </div>
      </section>
    </Layout>
  );
}

const defaultLocalTime = (hourOffset: number) => {
  const date = new Date(Date.now() + hourOffset * 3_600_000);
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return shifted.toISOString().slice(0, 16);
};

export function PostPage() {
  return (
    <Layout
      description="VRSNSイベントを一度登録して、告知ページ・カレンダー・共有文を作ります。"
      path="/post"
      script="/post.js"
      title={`イベントを登録 | ${product.name}`}
    >
      <section class="post-studio">
        <header class="compact-heading">
          <p class="eyebrow">OPEN A WINDOW</p>
          <h1>次の開催を、ひとつの窓に</h1>
          <p>公開するのは開催条件と各VRSNSの公式URLだけです。</p>
        </header>
        <div class="post-layout">
          <form class="post-form" id="post-form">
            <div aria-hidden="true" class="honeypot" inert>
              <label>
                Website
                <input autocomplete="off" name="website" tabindex={-1} />
              </label>
            </div>
            <label class="text-field">
              <span>イベント名</span>
              <input
                maxlength={40}
                name="title"
                placeholder="例：月曜の静かなワールド巡り"
                required
              />
              <small>40文字まで。連絡先やURLは入力できません。</small>
            </label>
            <label class="text-field">
              <span>主催者の表示名</span>
              <input maxlength={30} name="organizer" placeholder="例：夜歩き部" required />
              <small>個人SNSのIDではなく、イベントで使う表示名を入力します。</small>
            </label>
            <fieldset class="segmented-field">
              <legend>開催するVRSNS</legend>
              <div>
                <label>
                  <input checked name="platform" type="radio" value="vrchat" />
                  <span>VRChat</span>
                </label>
                <label>
                  <input name="platform" type="radio" value="cluster" />
                  <span>cluster</span>
                </label>
                <label>
                  <input name="platform" type="radio" value="resonite" />
                  <span>Resonite</span>
                </label>
              </div>
            </fieldset>
            <div class="form-pair">
              <label class="text-field">
                <span>開始</span>
                <input
                  name="startsAt"
                  required
                  type="datetime-local"
                  value={defaultLocalTime(24)}
                />
              </label>
              <label class="text-field">
                <span>終了</span>
                <input name="endsAt" required type="datetime-local" value={defaultLocalTime(25)} />
              </label>
            </div>
            <div class="form-pair">
              <label class="select-field">
                <span>繰り返し</span>
                <select name="frequency">
                  <option value="once">今回のみ</option>
                  <option value="weekly">毎週</option>
                  <option value="biweekly">隔週</option>
                </select>
              </label>
              <label class="select-field">
                <span>ジャンル</span>
                <select name="category">
                  {Object.entries(categoryLabels).map(([value, label]) => (
                    <option selected={value === "social"} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <fieldset class="device-field">
              <legend>参加できる端末</legend>
              <div>
                <label>
                  <input checked name="devicePc" type="checkbox" />
                  <span>
                    <i class="device-screen"></i>PCVR
                  </span>
                </label>
                <label>
                  <input checked name="deviceStandalone" type="checkbox" />
                  <span>
                    <i class="device-headset"></i>Quest
                  </span>
                </label>
                <label>
                  <input name="deviceMobile" type="checkbox" />
                  <span>
                    <i class="device-phone"></i>Mobile
                  </span>
                </label>
              </div>
            </fieldset>
            <label class="select-field">
              <span>参加方法</span>
              <select name="accessMethod">
                <option value="public">公開会場・公開イベント</option>
                <option selected value="group">
                  グループから参加
                </option>
                <option value="friend">主催者へFriend / Join</option>
                <option value="invite">招待制</option>
              </select>
            </label>
            <label class="text-field">
              <span>公式参加URL</span>
              <input
                inputmode="url"
                name="joinUrl"
                placeholder="https://vrc.group/ABC.1234"
                required
                type="url"
              />
              <small data-url-help>vrc.group または vrchat.com の公式URL</small>
            </label>
            <label class="text-field">
              <span>短い紹介（任意）</span>
              <textarea
                maxlength={160}
                name="summary"
                placeholder="初めての人が、会場の雰囲気と準備するものを判断できる内容"
                rows={4}
              ></textarea>
              <small>160文字まで。連絡先・招待コード・外部URLは入力できません。</small>
            </label>
            <label class="check-console wide">
              <input checked name="beginnerWelcome" type="checkbox" />
              <span aria-hidden="true" class="welcome-spark">
                ✦
              </span>
              <b>初参加の人も歓迎する</b>
            </label>
            <div class="promise-box">
              <label>
                <input name="confirmedPublic" required type="checkbox" />
                <span>全年齢で公開でき、個人連絡先や成人向け内容を含みません</span>
              </label>
            </div>
            <p aria-live="polite" class="form-message" id="form-message"></p>
            <button class="button warm large" type="submit">
              この窓をひらく
            </button>
            <p class="form-footnote">
              作成後の管理URLから公開終了・再開・削除ができます。管理URLは共有しないでください。
            </p>
          </form>

          <aside aria-label="イベント窓のプレビュー" class="preview-building">
            <span class="preview-label">WINDOW PREVIEW</span>
            <div class="preview-night">
              <div class="moon-disc"></div>
              <article class="event-window preview-window vrchat">
                <span class="window-glow"></span>
                <div class="event-topline">
                  <span class="platform-badge vrchat">
                    <PlatformGlyph platform="vrchat" />
                    <b data-preview-platform>VRChat</b>
                  </span>
                  <span class="category-ticket" data-preview-category>
                    交流
                  </span>
                </div>
                <p class="preview-date">
                  <b data-preview-date>明日</b>
                  <span data-preview-time>21:00 — 22:00</span>
                </p>
                <h2 data-preview-title>月曜の静かなワールド巡り</h2>
                <p class="organizer-line">
                  <span aria-hidden="true" class="host-dot"></span>
                  <b data-preview-organizer>夜歩き部</b>
                </p>
                <div class="condition-row">
                  <span data-preview-device>PCVR · Quest</span>
                  <span data-preview-access>Group</span>
                  <b data-preview-beginner>初参加歓迎</b>
                </div>
                <p class="event-summary" data-preview-summary>
                  会場の雰囲気と参加条件がここに入ります。
                </p>
                <span class="window-handle" aria-hidden="true"></span>
              </article>
            </div>
            <div class="output-rack">
              <span>
                <i class="mini-calendar"></i>
                iCal
              </span>
              <span>
                <i class="mini-google"></i>
                Google
              </span>
              <span>
                <i class="mini-share"></i>
                共有文
              </span>
            </div>
          </aside>
        </div>
      </section>
    </Layout>
  );
}

export function EventPage({ event, planned = false }: { event: EventView; planned?: boolean }) {
  const shareText = `${formatDate(event.startsAt)} ${formatTime(event.startsAt)}｜${event.title}｜${platformLabels[event.platform]}｜${product.url}/events/${event.id}`;
  return (
    <Layout
      description={`${event.title} — ${platformLabels[event.platform]}イベント`}
      noIndex
      path={`/events/${event.id}`}
      script="/event.js"
      title={`${event.title} | ${product.name}`}
    >
      <section class="event-stage" data-event-id={event.id} data-share-text={shareText}>
        <a class="back-link" href="/">
          ← 時間割へ戻る
        </a>
        <div class="event-focus">
          <article class={`event-window detail-window ${event.platform}`}>
            <span class="window-glow"></span>
            <div class="event-topline">
              <span class={`platform-badge ${event.platform}`}>
                <PlatformGlyph platform={event.platform} />
                {platformLabels[event.platform]}
              </span>
              <span class="category-ticket">{categoryLabels[event.category]}</span>
            </div>
            <div class="detail-time">
              <div class="calendar-tile">
                <span>{formatDate(event.startsAt)}</span>
                <strong>{formatTime(event.startsAt)}</strong>
                <small>— {formatTime(event.endsAt)}</small>
              </div>
              <span class="repeat-tag">{frequencyLabels[event.frequency]}</span>
            </div>
            <h1>{event.title}</h1>
            <p class="organizer-line">
              <span aria-hidden="true" class="host-dot"></span>
              主催 {event.organizer}
            </p>
            <div class="condition-row detail-conditions">
              {deviceLabels(event).map((label) => (
                <span>{label}</span>
              ))}
              <span>{accessLabels[event.accessMethod]}</span>
              {event.beginnerWelcome ? <b>初参加歓迎</b> : null}
            </div>
            {event.summary ? <p class="detail-summary">{event.summary}</p> : null}
            <span class="window-handle" aria-hidden="true"></span>
          </article>

          <aside class="action-dock">
            <div class="dock-light">
              <span aria-hidden="true" class="live-pulse"></span>
              <p>
                <b>開催予定</b>
                公式プラットフォームURLを確認して参加します
              </p>
            </div>
            <form action={`/go/${event.id}`} method="post" target="_blank" data-go-form>
              <input class="session-field" name="sessionId" type="hidden" />
              <button class="button platform-action large" type="submit">
                {platformLabels[event.platform]}で参加方法を見る
              </button>
            </form>
            <div class="calendar-actions">
              <form action={`/calendar/${event.id}`} method="post">
                <input class="session-field" name="sessionId" type="hidden" />
                <button class="button soft" type="submit">
                  <i class="mini-calendar"></i>iCal
                </button>
              </form>
              <form action={`/calendar/google/${event.id}`} method="post" target="_blank">
                <input class="session-field" name="sessionId" type="hidden" />
                <button class="button soft" type="submit">
                  <i class="mini-google"></i>Google
                </button>
              </form>
            </div>
            <button class="button soft share-button" data-share type="button">
              <i class="mini-share"></i>共有文をコピー
            </button>
            <p aria-live="polite" class="dock-message" data-dock-message></p>
            <section class={`plan-confirmation ${planned ? "visible" : ""}`} data-confirmation>
              {planned ? (
                <p>
                  <span>✓</span>
                  参加予定に追加しました
                </p>
              ) : (
                <form action={`/confirm/${event.id}`} method="post">
                  <input class="session-field" name="sessionId" type="hidden" />
                  <button class="plan-button" type="submit">
                    参加予定にした
                  </button>
                </form>
              )}
            </section>
            <button class="report-toggle" data-report-toggle type="button">
              このイベントを報告
            </button>
            <form class="report-form" data-report-form hidden>
              <label>
                <span>理由</span>
                <select name="reason">
                  <option value="dead">公式URLが使えない</option>
                  <option value="contact">個人連絡先を求められる</option>
                  <option value="adult">成人向けの内容がある</option>
                  <option value="fake">日時や内容が虚偽</option>
                  <option value="spam">宣伝・スパム</option>
                  <option value="unsafe">その他の安全上の問題</option>
                </select>
              </label>
              <button class="button soft" type="submit">
                報告する
              </button>
              <p aria-live="polite" data-report-message></p>
            </form>
          </aside>
        </div>
      </section>
    </Layout>
  );
}

export function ManagePage({ eventId }: { eventId: string }) {
  return (
    <Layout
      description="イベントの公開状態を管理します。"
      noIndex
      path={`/manage/${eventId}`}
      script="/manage.js"
      title={`イベント管理 | ${product.name}`}
    >
      <section class="manage-stage" data-event-id={eventId}>
        <header class="compact-heading">
          <p class="eyebrow">WINDOW KEY</p>
          <h1>イベント窓を管理する</h1>
          <p>この画面のURLは管理鍵を含みます。共有しないでください。</p>
        </header>
        <div class="manage-panel" data-manage-panel>
          <div aria-hidden="true" class="loading-window">
            <i></i>
            <i></i>
            <i></i>
          </div>
          <p aria-live="polite" data-manage-message>
            イベントを確認しています…
          </p>
        </div>
      </section>
    </Layout>
  );
}

export function GuidePage() {
  return (
    <Layout
      description="よる窓に登録できる公式URLと、安全な公開情報のガイド。"
      path="/guide"
      title={`登録ガイド | ${product.name}`}
    >
      <article class="guide-page">
        <header class="compact-heading">
          <p class="eyebrow">PUBLIC WINDOW</p>
          <h1>会場の鍵は、公式URLだけ</h1>
          <p>公開カレンダーに必要な情報だけを、一枚のイベント窓へ載せます。</p>
        </header>
        <section class="rule-board">
          <article class="rule-card allowed">
            <span aria-hidden="true">✓</span>
            <h2>載せられるもの</h2>
            <ul>
              <li>全年齢で公開できるイベント</li>
              <li>開催日時、端末、参加方法</li>
              <li>VRSNSの公式イベント・グループURL</li>
              <li>初参加者が判断できる短い紹介</li>
            </ul>
          </article>
          <article class="rule-card blocked">
            <span aria-hidden="true">×</span>
            <h2>載せられないもの</h2>
            <ul>
              <li>個人の電話番号・メール・SNS ID</li>
              <li>DiscordやLINEなど外部招待</li>
              <li>成人向け、出会い目的の内容</li>
              <li>外部販売・広告・短縮URL</li>
            </ul>
          </article>
        </section>
        <section class="official-hosts">
          <article>
            <PlatformGlyph platform="vrchat" />
            <div>
              <b>VRChat</b>
              <span>vrc.group / vrchat.com</span>
            </div>
          </article>
          <article>
            <PlatformGlyph platform="cluster" />
            <div>
              <b>cluster</b>
              <span>cluster.mu/e/...</span>
            </div>
          </article>
          <article>
            <PlatformGlyph platform="resonite" />
            <div>
              <b>Resonite</b>
              <span>go.resonite.com / events.resonite.com</span>
            </div>
          </article>
        </section>
        <section class="guide-steps">
          <div>
            <span>1</span>
            <i class="step-window"></i>
            <p>
              <b>イベントを登録</b>
              同じ情報から公開ページと共有文を作ります。
            </p>
          </div>
          <div>
            <span>2</span>
            <i class="step-calendar"></i>
            <p>
              <b>予定へ追加</b>
              iCalまたはGoogleカレンダーで時刻を保持します。
            </p>
          </div>
          <div>
            <span>3</span>
            <i class="step-door"></i>
            <p>
              <b>公式先で確認</b>
              参加条件と会場状態は各VRSNSで最終確認します。
            </p>
          </div>
        </section>
      </article>
    </Layout>
  );
}

export function PrivacyPage() {
  return (
    <Layout
      description="よる窓が扱うイベント情報、匿名記録、保存期間、削除方法。"
      path="/privacy"
      title={`プライバシー | ${product.name}`}
    >
      <article class="prose">
        <p class="eyebrow">PRIVACY</p>
        <h1>イベントに必要な情報だけを扱います</h1>
        <section>
          <h2>公開するもの</h2>
          <p>
            イベント名、主催者表示名、開催日時、VRSNS、対応端末、ジャンル、参加方法、短い紹介、各VRSNSの公式URLを保存します。個人の連絡先、画像、外部SNSやDiscordの招待は受け付けません。
          </p>
        </section>
        <section>
          <h2>匿名の利用記録</h2>
          <p>
            ブラウザ内で作る無作為な識別子を使い、訪問、絞り込み、イベント作成、詳細閲覧、共有文コピー、カレンダー追加、公式参加先への遷移、参加予定の回答を重複なく数えます。Cookie、氏名、IPアドレス、User-Agentは製品の分析データに保存しません。
          </p>
        </section>
        <section>
          <h2>保存期間と削除</h2>
          <p>
            単発イベントは終了24時間後までに公式URLを除去し、30日以内にイベント本体を削除します。定期イベントは次回日時を更新し、主催者が終了した後30日以内に削除します。匿名記録は120日以内に削除します。管理URLから即時削除できます。
          </p>
        </section>
        <section>
          <h2>外部サービス</h2>
          <p>
            公式参加先やGoogleカレンダーを開いた後は、各サービスの規約とプライバシーポリシーが適用されます。よる窓から参照元を送らない設定にしています。
          </p>
        </section>
      </article>
    </Layout>
  );
}

export function MissingPage() {
  return (
    <Layout noIndex title={`見つかりません | ${product.name}`}>
      <section class="missing-page">
        <div aria-hidden="true" class="closed-window">
          <i></i>
          <i></i>
        </div>
        <h1>この窓は閉じています</h1>
        <p>開催が終わったか、主催者が公開を終了した可能性があります。</p>
        <a class="button moon" href="/">
          時間割へ戻る
        </a>
      </section>
    </Layout>
  );
}
