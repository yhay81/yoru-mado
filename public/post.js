(() => {
  const form = document.querySelector("#post-form");
  if (!form || !window.yoruMado) return;

  const message = document.querySelector("#form-message");
  const platformLabels = { cluster: "cluster", resonite: "Resonite", vrchat: "VRChat" };
  const categoryLabels = {
    creative: "創作",
    game: "ゲーム",
    learning: "学び",
    music: "音楽",
    other: "その他",
    performance: "公演",
    social: "交流",
  };
  const accessLabels = {
    friend: "Friend / Join",
    group: "Group",
    invite: "招待制",
    public: "公開",
  };
  const urlHelp = {
    cluster: "cluster.mu/e/... の公式イベントURL",
    resonite: "go.resonite.com または events.resonite.com の公式URL",
    vrchat: "vrc.group または vrchat.com の公式URL",
  };

  const text = (selector, value) => {
    const element = document.querySelector(selector);
    if (element) element.textContent = value;
  };

  const localDate = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "日時未設定";
    return new Intl.DateTimeFormat("ja-JP", {
      day: "numeric",
      month: "numeric",
      weekday: "short",
    }).format(date);
  };

  const localTime = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "--:--";
    return new Intl.DateTimeFormat("ja-JP", {
      hour: "2-digit",
      hour12: false,
      minute: "2-digit",
    }).format(date);
  };

  const updatePreview = () => {
    const data = new FormData(form);
    const platformValue = data.get("platform");
    const platform = typeof platformValue === "string" ? platformValue : "vrchat";
    const devices = [
      ...(data.get("devicePc") ? ["PCVR"] : []),
      ...(data.get("deviceStandalone") ? ["Quest"] : []),
      ...(data.get("deviceMobile") ? ["Mobile"] : []),
    ];
    text("[data-preview-platform]", platformLabels[platform] || platform);
    text("[data-preview-category]", categoryLabels[data.get("category")] || "その他");
    text("[data-preview-title]", data.get("title") || "月曜の静かなワールド巡り");
    text("[data-preview-organizer]", data.get("organizer") || "夜歩き部");
    text("[data-preview-date]", localDate(data.get("startsAt")));
    text(
      "[data-preview-time]",
      `${localTime(data.get("startsAt"))} — ${localTime(data.get("endsAt"))}`,
    );
    text("[data-preview-device]", devices.join(" · ") || "端末未設定");
    text("[data-preview-access]", accessLabels[data.get("accessMethod")] || "参加方法");
    text(
      "[data-preview-summary]",
      data.get("summary") || "会場の雰囲気と参加条件がここに入ります。",
    );
    const beginner = document.querySelector("[data-preview-beginner]");
    if (beginner) beginner.hidden = !data.get("beginnerWelcome");
    const badge = document.querySelector(".preview-window .platform-badge");
    const windowCard = document.querySelector(".preview-window");
    if (badge) badge.className = `platform-badge ${platform}`;
    if (windowCard) windowCard.className = `event-window preview-window ${platform}`;
    const glyph = badge?.querySelector(".platform-glyph");
    if (glyph) glyph.className = `platform-glyph ${platform}`;
    const helper = document.querySelector("[data-url-help]");
    if (helper) helper.textContent = urlHelp[platform] || "";
  };

  form.addEventListener("input", updatePreview);
  form.addEventListener("change", updatePreview);
  updatePreview();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    message.className = "form-message";
    message.textContent = "窓を準備しています…";
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    const data = new FormData(form);
    const starts = new Date(data.get("startsAt"));
    const ends = new Date(data.get("endsAt"));
    if (Number.isNaN(starts.getTime()) || Number.isNaN(ends.getTime())) {
      message.className = "form-message error";
      message.textContent = "開始と終了の日時を確認してください。";
      button.disabled = false;
      return;
    }
    const payload = {
      accessMethod: data.get("accessMethod"),
      beginnerWelcome: Boolean(data.get("beginnerWelcome")),
      category: data.get("category"),
      confirmedPublic: Boolean(data.get("confirmedPublic")),
      devices: {
        mobile: Boolean(data.get("deviceMobile")),
        pc: Boolean(data.get("devicePc")),
        standalone: Boolean(data.get("deviceStandalone")),
      },
      endsAt: ends.toISOString(),
      frequency: data.get("frequency"),
      joinUrl: data.get("joinUrl"),
      organizer: data.get("organizer"),
      platform: data.get("platform"),
      sessionId: window.yoruMado.sessionId,
      startsAt: starts.toISOString(),
      summary: data.get("summary"),
      title: data.get("title"),
      website: data.get("website"),
    };
    try {
      const response = await fetch("/api/events", {
        body: JSON.stringify(payload),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const result = await response.json();
      if (!response.ok) {
        const copy = {
          invalid_event:
            "入力内容を確認してください。公式URL、日時、端末、全年齢の公開条件が必要です。",
          rate_limited: "1日に登録できるイベントは3件までです。",
        };
        throw new Error(copy[result.error] || "イベントを登録できませんでした。");
      }
      location.assign(`/manage/${result.eventId}#${result.ownerToken}`);
    } catch (error) {
      message.className = "form-message error";
      message.textContent = error instanceof Error ? error.message : "通信を確認してください。";
      button.disabled = false;
    }
  });
})();
