(() => {
  const origin = location.origin.replace(/\/$/, "");
  const swap = (value) =>
    String(value || "").replace(/https?:\/\/YOURDOMAIN\.com/gi, origin);

  document.querySelectorAll('link[rel="canonical"]').forEach((el) => {
    const href = el.getAttribute("href");
    if (!href) return;
    try {
      const url = new URL(href, origin);
      el.setAttribute("href", origin + (url.pathname || "/") + url.search);
    } catch {
      el.setAttribute("href", swap(href));
    }
  });

  document.querySelectorAll('meta[property="og:url"]').forEach((el) => {
    el.setAttribute("content", swap(el.getAttribute("content") || origin + location.pathname));
  });

  document.querySelectorAll('script[type="application/ld+json"]').forEach((script) => {
    try {
      const data = JSON.parse(script.textContent || "null");
      const walk = (node) => {
        if (Array.isArray(node)) node.forEach(walk);
        else if (node && typeof node === "object") {
          for (const key of Object.keys(node)) {
            if (typeof node[key] === "string") node[key] = swap(node[key]);
            else walk(node[key]);
          }
        }
      };
      walk(data);
      script.textContent = JSON.stringify(data);
    } catch {
      /* leave original JSON-LD */
    }
  });
})();
