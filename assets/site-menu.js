(function(){
  if(document.getElementById("abzarBar")) return;
  const link=document.createElement("link");
  link.rel="stylesheet"; link.href="/assets/site-menu.css?v=15";
  document.head.appendChild(link);
  const bar=document.createElement("header");
  bar.id="abzarBar";
  bar.innerHTML=`<a class="ab-brand" href="/"><img src="/icon-192.png" alt="" width="28" height="28">ابزاربوک</a>
    <div class="bar-actions"><button class="theme-quick" id="themeQuick" type="button" aria-label="تغییر تم روشن/تیره" title="تغییر تم">
      <svg class="ico-sun" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>
      <svg class="ico-moon" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
    </button>
    <button class="menu-btn" id="menuOpen" aria-label="منوی ابزاربوک">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
    </button>`;
  const root=document.createElement("div");
  root.id="abzarMenu";
  root.innerHTML=`
    <div class="menu-scrim" id="menuScrim"></div>
    <aside class="menu-drawer" id="menuDrawer">
      <div class="menu-top"><strong>ابزاربوک</strong><button class="menu-close" id="menuClose" aria-label="بستن">×</button></div>
      <a href="/">صفحه اصلی</a>
      <a href="/#tools">ابزار محاسبه و کاربردی</a>
      <a href="/#files">ابزار فایل</a>
      <a href="/convert/guides/">راهنما</a>
      <a href="/about.html">درباره</a>
      <a href="https://t.me/abzarbook" target="_blank" rel="noopener">تماس با ما</a>
      <button class="block" id="installBtn" type="button">نصب وب‌اپلیکیشن</button>
    </aside>`;
  document.body.prepend(bar);
  document.body.appendChild(root);
  const drawer=document.getElementById("menuDrawer");
  const scrim=document.getElementById("menuScrim");
  const open=()=>{drawer.classList.add("open");scrim.classList.add("open");document.body.style.overflow="hidden"};
  const close=()=>{drawer.classList.remove("open");scrim.classList.remove("open");document.body.style.overflow=""};
  document.getElementById("menuOpen").onclick=open;
  document.getElementById("menuClose").onclick=close;
  scrim.onclick=close;
  root.querySelectorAll("a").forEach(a=>a.addEventListener("click", close));
  const apply=mode=>{
    document.documentElement.setAttribute("data-theme",mode);
    localStorage.setItem("ab-theme",mode);
  };
  apply(localStorage.getItem("ab-theme-chosen")==="1"?(localStorage.getItem("ab-theme")||"light"):"light");
  const toggleTheme=()=>{
    const next=document.documentElement.getAttribute("data-theme")==="dark"?"light":"dark";
    localStorage.setItem("ab-theme-chosen","1");
    apply(next);
  };
  document.getElementById("themeQuick").onclick=toggleTheme;
  let deferred;
  window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferred=e});
  document.getElementById("installBtn").onclick=async()=>{
    if(deferred){deferred.prompt();deferred=null;return}
    alert("از منوی مرورگر، افزودن به صفحه اصلی را بزن.");
  };
})();
