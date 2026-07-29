(() => {
  const sessionKey = "yoru-mado-session-v1";
  const visitKey = "yoru-mado-last-visit-v1";
  const pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  const getSessionId = () => {
    try {
      const current = localStorage.getItem(sessionKey) || "";
      if (pattern.test(current)) return current;
      const created = crypto.randomUUID();
      localStorage.setItem(sessionKey, created);
      return created;
    } catch {
      return crypto.randomUUID();
    }
  };

  const sessionId = getSessionId();
  const telemetry = (name, context = "") =>
    fetch("/api/telemetry", {
      body: JSON.stringify({ context, name, sessionId }),
      headers: { "content-type": "application/json" },
      keepalive: true,
      method: "POST",
    }).catch(() => undefined);

  document.querySelectorAll(".session-field").forEach((field) => {
    field.value = sessionId;
  });

  const today = new Date().toISOString().slice(0, 10);
  let previous = "";
  try {
    previous = localStorage.getItem(visitKey) || "";
    localStorage.setItem(visitKey, today);
  } catch {
    previous = "";
  }
  void telemetry("visited", location.search ? "filtered" : "home");
  if (previous && previous !== today) void telemetry("returned", "visitor");

  window.yoruMado = { sessionId, telemetry };
})();
