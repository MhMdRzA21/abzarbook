(() => {
  // Shared icon set for every tool card across the site (tools.html, the
  // home page's related tools, and every guide/tool page's "Related tools"
  // grid). One map here means a new tool page automatically gets a matching
  // icon without hand-editing every HTML file it's linked from.
  const ICONS = {
    svg: '<path d="M12 16V8"/><path d="m8.5 11.5 3.5-3.5 3.5 3.5"/><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/>',
    pdf: '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><path d="M14 2v6h6"/>',
    merge: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
    split: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/>',
    compress: '<path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/><path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/>',
    word: '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h6"/>',
    pdf2img: '<rect x="3" y="7" width="13" height="13" rx="2"/><path d="M7 3h11a2 2 0 0 1 2 2v11"/><circle cx="8.5" cy="12.5" r="1.3"/><path d="m16 20-3.2-3.2a1.6 1.6 0 0 0-2.3 0L8 19"/>',
    rotate: '<path d="M21 12a9 9 0 1 1-3.5-7.1"/><path d="M21 3v6h-6"/>',
    delete: '<path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/>',
    reorder: '<path d="M3 7h11M3 12h7M3 17h11"/><path d="m17 17 4-4-4-4"/>',
    protect: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    unlock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    compare: '<path d="M8 3v18M16 3v18"/><path d="M4 8h4M16 8h4M4 16h4M16 16h4"/>',
    guide: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
    default: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5l3 2"/>',
  };

  // href substring -> icon key, most specific first.
  const RULES = [
    [/merge-pdf/, "merge"],
    [/split-pdf/, "split"],
    [/compress-file|\/compress\//, "compress"],
    [/word-to-pdf|pdf-to-word/, "word"],
    [/jpg-to-pdf|pdf-to-jpg|pdf-to-image/, "pdf2img"],
    [/rotate-pdf/, "rotate"],
    [/delete-pdf-pages/, "delete"],
    [/reorder-pdf-pages/, "reorder"],
    [/unlock-pdf/, "unlock"],
    [/protect-pdf/, "protect"],
    [/\/compress\//, "target"],
    [/alternative|compared|converters-compared/, "compare"],
    [/\/guides\//, "guide"],
    [/\/convert\//, "pdf"],
  ];

  // Fallback keyword match against the card's own text, for links that point
  // somewhere generic (like a tab anchor on the home page) rather than a
  // dedicated tool URL.
  const TEXT_RULES = [
    [/image (format )?convert/i, "image"],
    [/merge/i, "merge"],
    [/split/i, "split"],
    [/compress|shrink/i, "compress"],
    [/word/i, "word"],
    [/jpg|jpeg|image/i, "image"],
    [/rotate/i, "rotate"],
    [/delete/i, "delete"],
    [/reorder/i, "reorder"],
    [/unlock/i, "unlock"],
    [/protect|password/i, "protect"],
    [/alternative|compared/i, "compare"],
  ];

  function iconFor(href, text) {
    for (const [re, key] of RULES) if (re.test(href)) return ICONS[key];
    for (const [re, key] of TEXT_RULES) if (re.test(text)) return ICONS[key];
    return ICONS.default;
  }

  function badge(href, text) {
    const span = document.createElement("span");
    span.className = "card-icon";
    span.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
      iconFor(href, text) +
      "</svg>";
    return span;
  }

  document.querySelectorAll(".related-card, .tools-grid a").forEach((card) => {
    if (card.querySelector(".card-icon")) return;
    const href = card.getAttribute("href") || "";
    const text = card.querySelector("strong")?.textContent || card.textContent || "";
    card.insertBefore(badge(href, text), card.firstChild);
  });
})();
