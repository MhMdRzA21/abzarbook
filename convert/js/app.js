(() => {
  const tabs = document.querySelectorAll(".tab");
  const panels = document.querySelectorAll(".panel");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      panels.forEach((p) => (p.hidden = true));
      tab.classList.add("active");
      const target = document.getElementById(tab.dataset.panel);
      target.hidden = false;
      // A tab's target can itself contain nested .panel steps (e.g. a
      // multi-step workflow) — those got hidden by the loop above too,
      // so un-hide them along with their container.
      target.querySelectorAll(".panel").forEach((p) => (p.hidden = false));
    });
  });

  panels.forEach(initPanel);

  function initPanel(panel) {
    const dropzone = panel.querySelector(".dropzone");
    if (!dropzone) return;
    const input = dropzone.querySelector("input[type=file]");
    const fileListEl = panel.querySelector(".filelist");
    const convertBtn = panel.querySelector(".btn-convert");
    const statusEl = panel.querySelector(".status");
    const progressEl = panel.querySelector(".progress");
    const progressBarEl = panel.querySelector(".progress-bar");
    const multi = panel.dataset.multi === "true";
    const endpoint = panel.dataset.endpoint;
    const minFiles = parseInt(panel.dataset.minFiles || "1", 10);
    const targetEl = panel.querySelector("select, input[name=target]");
    const rangesEl = panel.querySelector("input[name=ranges]");

    let files = [];

    dropzone.addEventListener("click", () => input.click());
    dropzone.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") input.click();
    });

    ["dragenter", "dragover"].forEach((evt) =>
      dropzone.addEventListener(evt, (e) => {
        e.preventDefault();
        dropzone.classList.add("drag");
      })
    );
    ["dragleave", "drop"].forEach((evt) =>
      dropzone.addEventListener(evt, (e) => {
        e.preventDefault();
        dropzone.classList.remove("drag");
      })
    );
    dropzone.addEventListener("drop", (e) => {
      addFiles(Array.from(e.dataTransfer.files));
    });
    input.addEventListener("change", () => {
      addFiles(Array.from(input.files));
      input.value = "";
    });

    function addFiles(newFiles) {
      if (!multi) {
        files = newFiles.slice(0, 1);
      } else {
        files = files.concat(newFiles);
      }
      renderList();
    }

    function renderList() {
      fileListEl.innerHTML = "";
      files.forEach((f, idx) => {
        const li = document.createElement("li");
        const ext = f.name.split(".").pop().toUpperCase();
        li.innerHTML = `<span>${escapeHtml(f.name)} <span class="ext-tag">${ext}</span></span>`;
        const rm = document.createElement("button");
        rm.textContent = "حذف";
        rm.addEventListener("click", () => {
          files.splice(idx, 1);
          renderList();
        });
        li.appendChild(rm);
        fileListEl.appendChild(li);
      });
      convertBtn.disabled = files.length === 0 || files.length < minFiles;
      statusEl.className = "status";
      statusEl.textContent =
        files.length > 0 && files.length < minFiles
          ? `حداقل ${minFiles} فایل اضافه کنید`
          : "";
    }

    convertBtn.addEventListener("click", () => {
      if (files.length === 0 || files.length < minFiles) return;
      convertBtn.disabled = true;
      statusEl.className = "status";
      statusEl.textContent = "در حال آپلود...";
      showProgress(0);

      const form = new FormData();
      if (multi) {
        files.forEach((f) => form.append("files", f));
      } else {
        form.append("file", files[0]);
      }
      if (targetEl) form.append("target", targetEl.value);
      if (rangesEl && rangesEl.value.trim()) form.append("ranges", rangesEl.value.trim());
      // any extra inputs marked data-field="name" are sent as form fields
      panel.querySelectorAll("[data-field]").forEach((el) => {
        if (el.value.trim()) form.append(el.dataset.field, el.value.trim());
      });

      const xhr = new XMLHttpRequest();
      xhr.open("POST", endpoint);
      xhr.responseType = "blob";

      xhr.upload.addEventListener("progress", (e) => {
        if (!e.lengthComputable) return;
        const pct = Math.round((e.loaded / e.total) * 100);
        showProgress(pct);
        statusEl.textContent = pct < 100 ? `در حال آپلود... ${pct}%` : "در حال پردازش...";
      });

      xhr.addEventListener("load", () => {
        hideProgress();
        if (xhr.status >= 200 && xhr.status < 300) {
          downloadBlob(xhr.response, resolveFilename(xhr, endpoint));
          statusEl.className = "status ok";
          statusEl.textContent = "انجام شد — " + summarizeSavings(xhr) + "دانلود شروع شد.";
          convertBtn.disabled = files.length === 0 || files.length < minFiles;
        } else {
          parseErrorBlob(xhr.response).then((message) => {
            statusEl.className = "status error";
            statusEl.textContent = message || `خطای سرور (کد ${xhr.status})`;
            convertBtn.disabled = files.length === 0 || files.length < minFiles;
          });
        }
      });

      xhr.addEventListener("error", () => {
        hideProgress();
        statusEl.className = "status error";
        statusEl.textContent = "خطای شبکه؛ لطفاً دوباره تلاش کنید.";
        convertBtn.disabled = files.length === 0 || files.length < minFiles;
      });

      xhr.send(form);
    });

    function showProgress(pct) {
      if (!progressEl || !progressBarEl) return;
      progressEl.hidden = false;
      progressBarEl.style.width = pct + "%";
    }

    function hideProgress() {
      if (!progressEl) return;
      progressEl.hidden = true;
      progressBarEl.style.width = "0%";
    }
  }

  // Picks the download name from the server header, and guarantees a real
  // extension (from the file type) even if the header is missing or odd.
  const MIME_EXT = {
    "application/pdf": "pdf", "application/zip": "zip", "image/jpeg": "jpg", "image/png": "png",
    "image/webp": "webp", "image/gif": "gif", "image/avif": "avif", "image/tiff": "tiff", "image/bmp": "bmp",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
    "video/mp4": "mp4",
  };
  const ENDPOINT_DEFAULT = {
    "/api/convert/merge-pdf": "merged.pdf", "/api/convert/image-to-pdf": "converted.pdf",
    "/api/convert/split-pdf": "split.zip", "/api/convert/pdf-to-image": "pages.zip",
  };
  function resolveFilename(xhr, endpoint) {
    const disp = xhr.getResponseHeader("Content-Disposition") || "";
    let name = "";
    const star = disp.match(/filename\*=(?:UTF-8'')?([^;]+)/i);
    const plain = disp.match(/filename="?([^";]+)"?/i);
    try { if (star) name = decodeURIComponent(star[1].trim()); } catch { /* ignore */ }
    if (!name && plain) name = plain[1].trim();
    if (!name) name = ENDPOINT_DEFAULT[endpoint] || "converted";
    if (!/\.[A-Za-z0-9]{2,5}$/.test(name)) {
      const type = (xhr.response && xhr.response.type || "").split(";")[0];
      if (MIME_EXT[type]) name += "." + MIME_EXT[type];
    }
    return name;
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000); // revoking immediately can cut the download to 0 bytes
  }

  function summarizeSavings(xhr) {
    if (xhr.getResponseHeader("X-Target-Met") === "0") {
      return "به حجم انتخابی نرسید؛ این کوچک‌ترین نسخه‌ای است که ساختیم. ";
    }
    const before = Number(xhr.getResponseHeader("X-Original-Size"));
    const after = Number(xhr.getResponseHeader("X-Compressed-Size"));
    if (!before || !after) return "";
    const pct = Math.max(0, Math.round((1 - after / before) * 100));
    const fmt = (n) => (n >= 1024 * 1024 ? (n / (1024 * 1024)).toFixed(1) + " MB" : (n / 1024).toFixed(0) + " KB");
    return pct > 0
      ? `حجم ${pct}٪ کم شد (${fmt(before)} → ${fmt(after)}) — `
      : `حجم از قبل بهینه بود و کاهشی ممکن نشد — `;
  }

  async function parseErrorBlob(blob) {
    try {
      const text = await blob.text();
      const data = JSON.parse(text);
      return data && data.error;
    } catch {
      return null;
    }
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }
  // Sticky header gets a subtle shadow once the page scrolls.
  const header = document.querySelector(".site-header");
  if (header) {
    const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }
})();
