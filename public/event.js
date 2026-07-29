(() => {
  const stage = document.querySelector(".event-stage");
  if (!stage || !window.yoruMado) return;
  const eventId = stage.dataset.eventId;
  const message = stage.querySelector("[data-dock-message]");

  window.yoruMado.telemetry("event_viewed", eventId);

  const goForm = stage.querySelector("[data-go-form]");
  if (goForm) {
    goForm.addEventListener("submit", () => {
      message.textContent = "公式ページを新しい画面で開きます。";
    });
  }

  const shareButton = stage.querySelector("[data-share]");
  if (shareButton) {
    shareButton.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(stage.dataset.shareText || "");
        message.textContent = "共有文をコピーしました。";
        window.yoruMado.telemetry("share_copied", eventId);
      } catch {
        message.textContent = "コピーできませんでした。ブラウザの権限を確認してください。";
      }
    });
  }

  const toggle = stage.querySelector("[data-report-toggle]");
  const reportForm = stage.querySelector("[data-report-form]");
  if (toggle && reportForm) {
    toggle.addEventListener("click", () => {
      reportForm.hidden = !reportForm.hidden;
    });
    reportForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const reportMessage = reportForm.querySelector("[data-report-message]");
      const data = new FormData(reportForm);
      reportMessage.className = "";
      reportMessage.textContent = "送信しています…";
      try {
        const response = await fetch(`/api/events/${eventId}/report`, {
          body: JSON.stringify({
            reason: data.get("reason"),
            sessionId: window.yoruMado.sessionId,
          }),
          headers: { "content-type": "application/json" },
          method: "POST",
        });
        if (!response.ok) throw new Error();
        reportMessage.textContent = "報告を受け付けました。";
        reportForm.querySelector("button").disabled = true;
      } catch {
        reportMessage.className = "error";
        reportMessage.textContent = "報告を送れませんでした。";
      }
    });
  }
})();
