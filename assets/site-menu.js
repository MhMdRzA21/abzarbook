(function(){
  if(location.pathname.indexOf("/convert")===0) return;
  if(document.getElementById("abzarBar")) return;
  const link=document.createElement("link");
  link.rel="stylesheet"; link.href="/assets/site-menu.css?v=10";
  document.head.appendChild(link);
  const bar=document.createElement("header");
  bar.id="abzarBar";
  bar.innerHTML=`<a class="ab-brand" href="/"><img src="/icon-192.png" alt="" width="28" height="28">ابزاربوک</a>
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
      <a href="/#tools">ابزارها</a>
      <a href="/about.html">درباره</a>
      <a href="https://t.me/abzarbook" target="_blank" rel="noopener">تماس با ما</a>
      <button class="block" id="themeToggle" type="button">حالت روشن</button>
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
  const themeBtn=document.getElementById("themeToggle");
  const apply=mode=>{
    document.documentElement.setAttribute("data-theme",mode);
    localStorage.setItem("ab-theme",mode);
    themeBtn.textContent=mode==="dark"?"حالت روشن":"حالت تاریک";
  };
  apply(localStorage.getItem("ab-theme")||(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"));
  themeBtn.onclick=()=>apply(document.documentElement.getAttribute("data-theme")==="dark"?"light":"dark");
  let deferred;
  window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferred=e});
  document.getElementById("installBtn").onclick=async()=>{
    if(deferred){deferred.prompt();deferred=null;return}
    alert("از منوی مرورگر، افزودن به صفحه اصلی را بزن.");
  };
})();
