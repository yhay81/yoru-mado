(() => {
  if (!window.yoruMado) return;
  const query = new URLSearchParams(location.search);
  const filtered =
    (query.get("when") && query.get("when") !== "today") ||
    query.get("platform") ||
    query.get("device") ||
    query.get("category") ||
    query.get("beginner");
  if (filtered) window.yoruMado.telemetry("filters_used", "filtered");
})();
