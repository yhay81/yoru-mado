(() => {
  const stage = document.querySelector(".manage-stage");
  if (!stage) return;
  const eventId = stage.dataset.eventId;
  const panel = stage.querySelector("[data-manage-panel]");
  const token = location.hash.slice(1);
  const tokenPattern = /^[0-9a-f]{64}$/i;
  const escapeHtml = (value) =>
    String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  if (!tokenPattern.test(token)) {
    panel.innerHTML =
      '<p class="form-message error">管理鍵が見つかりません。作成時の管理URLをそのまま開いてください。</p>';
    return;
  }

  const request = async (path, options = {}) => {
    const response = await fetch(path, {
      ...options,
      headers: {
        ...options.headers,
        authorization: `Bearer ${token}`,
      },
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "request_failed");
    return result;
  };

  const date = (iso) =>
    new Intl.DateTimeFormat("ja-JP", {
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      month: "numeric",
      timeZone: "Asia/Tokyo",
      weekday: "short",
    }).format(new Date(iso));

  const render = (event) => {
    const active = event.status === "active";
    panel.innerHTML = `
      <section class="manage-card">
        <header>
          <div>
            <h2>${escapeHtml(event.title)}</h2>
            <p>${escapeHtml(event.organizer)}</p>
          </div>
          <span class="status-seal ${active ? "" : "closed"}">${active ? "公開中" : "終了"}</span>
        </header>
        <div class="manage-facts">
          <div><span>開催</span><b>${escapeHtml(date(event.startsAt))}</b></div>
          <div><span>VRSNS</span><b>${escapeHtml(event.platform)}</b></div>
          <div><span>繰り返し</span><b>${escapeHtml(event.frequency)}</b></div>
        </div>
        <div class="manage-actions">
          <a class="button soft" href="/events/${eventId}">公開ページ</a>
          <button class="button soft" data-status="${active ? "closed" : "active"}" type="button">
            ${active ? "公開を終了" : "もう一度公開"}
          </button>
          <button class="button danger" data-delete type="button">完全に削除</button>
        </div>
        <p class="form-message" data-manage-feedback></p>
      </section>
    `;
    const feedback = panel.querySelector("[data-manage-feedback]");
    panel.querySelector("[data-status]").addEventListener("click", async (clickEvent) => {
      const button = clickEvent.currentTarget;
      button.disabled = true;
      feedback.textContent = "更新しています…";
      try {
        await request(`/api/events/${eventId}/status`, {
          body: JSON.stringify({ status: button.dataset.status }),
          headers: { "content-type": "application/json" },
          method: "PATCH",
        });
        await load();
      } catch (error) {
        feedback.className = "form-message error";
        feedback.textContent =
          error instanceof Error && error.message === "event_expired"
            ? "終了日時を過ぎたイベントは再公開できません。"
            : "公開状態を更新できませんでした。";
        button.disabled = false;
      }
    });
    panel.querySelector("[data-delete]").addEventListener("click", async (clickEvent) => {
      if (!confirm("このイベントを完全に削除します。元に戻せません。")) return;
      clickEvent.currentTarget.disabled = true;
      feedback.textContent = "削除しています…";
      try {
        await request(`/api/events/${eventId}`, { method: "DELETE" });
        location.replace("/");
      } catch {
        feedback.className = "form-message error";
        feedback.textContent = "削除できませんでした。";
        clickEvent.currentTarget.disabled = false;
      }
    });
  };

  const load = async () => {
    try {
      render(await request(`/api/events/${eventId}/manage`));
    } catch {
      panel.innerHTML =
        '<p class="form-message error">イベントを確認できません。管理URLが正しいか確認してください。</p>';
    }
  };

  void load();
})();
