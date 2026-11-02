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
      dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.add("drag"); })
    );
    ["dragleave", "drop"].forEach((evt) =>
      dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.remove("drag"); })
    );
    dropzone.addEventListener("drop", (e) => { addFiles(Array.from(e.dataTransfer.files)); });
    input.addEventListener("change", () => { addFiles(Array.from(input.files)); input.value = ""; });

    function addFiles(newFiles) {
      if (!multi) files = newFiles.slice(0, 1);
      else files = files.concat(newFiles);
      renderList();
    }
    function renderList() {
      fileListEl.innerHTML = "";
      files.forEach((f, i) => {
        const li = document.createElement("li");
        li.innerHTML = `<span>${escapeHtml(f.name)}</span> <button type="button" data-i="${i}" aria-label="remove">×</button>`;
        li.querySelector("button").addEventListener("click", () => { files.splice(i, 1); renderList(); });
        fileListEl.appendChild(li);
      });
      convertBtn.disabled = files.length < minFiles;
      statusEl.textContent = "";
    }

    convertBtn.addEventListener("click", () => {
      if (files.length < minFiles) return;
      const fd = new FormData();
      if (multi) files.forEach((f) => fd.append("files", f));
      else fd.append("file", files[0]);
      if (targetEl) fd.append("target", targetEl.value);
      if (rangesEl && rangesEl.value) fd.append("ranges", rangesEl.value);

      convertBtn.disabled = true;
      statusEl.textContent = "در حال تبدیل...";
      if (progressEl) { progressEl.hidden = false; progressBarEl.style.width = "15%"; }

      const xhr = new XMLHttpRequest();
      xhr.open("POST", endpoint);
      xhr.responseType = "blob";
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && progressBarEl) {
          progressBarEl.style.width = Math.round((e.loaded / e.total) * 70) + "%";
        }
      };
      xhr.onload = async () => {
        if (progressBarEl) progressBarEl.style.width = "100%";
        if (xhr.status >= 200 && xhr.status < 300) {
          const name = resolveFilename(xhr, endpoint);
          downloadBlob(xhr.response, name);
          statusEl.textContent = "دانلود شروع شد.";
        } else {
          const err = await parseErrorBlob(xhr.response);
          statusEl.textContent = err || ("خطا: " + xhr.status);
        }
        convertBtn.disabled = files.length < minFiles;
        setTimeout(() => { if (progressEl) progressEl.hidden = true; }, 600);
      };
      xhr.onerror = () => {
        statusEl.textContent = "خطای شبکه";
        convertBtn.disabled = files.length < minFiles;
      };
      xhr.send(fd);
    });
  }

  const MIME_EXT = { "application/pdf": "pdf", "application/zip": "zip", "image/jpeg": "jpg", "image/png": "png" };
  const ENDPOINT_DEFAULT = {
    "/api/convert/merge-pdf": "merged.pdf",
    "/api/convert/split-pdf": "split.zip",
    "/api/convert/pdf-to-image": "pages.zip",
    "/api/convert/office": "converted.pdf",
    "/api/compress": "compressed",
  };
  function resolveFilename(xhr, endpoint) {
    const disp = xhr.getResponseHeader("Content-Disposition") || "";
    let name = "";
    const star = disp.match(/filename\*=(?:UTF-8'')?([^;]+)/i);
    const plain = disp.match(/filename="?([^\";]+)"?/i);
    try { if (star) name = decodeURIComponent(star[1].trim()); } catch {}
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
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  async function parseErrorBlob(blob) {
    try { const data = JSON.parse(await blob.text()); return data && data.error; } catch { return null; }
  }
  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) => ({ "&": "&", "<": "<", ">": ">", '"': """, "'": "&#39;" }[c]));
  }
  const header = document.querySelector(".site-header");
  if (header) {
    const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }
})();
