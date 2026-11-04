(function(){
  if(location.pathname.indexOf("/convert")!==0) return;
  if(document.getElementById("convertMenu")) return;
  const link=document.createElement("link");
  link.rel="stylesheet"; link.href="/assets/convert-menu.css?v=10";
  document.head.appendChild(link);
  const wrap=document.querySelector(".site-header .wrap")||document.querySelector(".site-header");
  if(wrap){
    const btn=document.createElement("button");
    btn.className="cv-menu-btn";
    btn.id="cvMenuOpen";
    btn.setAttribute("aria-label","منوی مبدل");
    btn.innerHTML=`<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
    wrap.appendChild(btn);
  }
  const root=document.createElement("div");
  root.id="convertMenu";
  root.innerHTML=`
    <div class="cv-scrim" id="cvScrim"></div>
    <aside class="cv-drawer" id="cvDrawer">
      <div class="cv-top"><strong>مبدل</strong><button class="cv-close" id="cvClose" aria-label="بستن">×</button></div>
      <p class="cv-kicker">فقط تبدیل فایل</p>
      <a href="/convert/">خانه مبدل</a>
      <a href="/convert/tools.html">ابزارهای تبدیل</a>
      <a href="/convert/guides/">راهنماها</a>
      <a href="/convert/pages/faq.html">سوالات</a>
      <a href="/convert/pages/about.html">درباره</a>
      <a href="/convert/pages/contact.html">تماس</a>
      <button class="block" id="cvTheme" type="button">حالت روشن</button>
    </aside>`;
  document.body.appendChild(root);
  const drawer=document.getElementById("cvDrawer");
  const scrim=document.getElementById("cvScrim");
  const open=()=>{drawer.classList.add("open");scrim.classList.add("open");document.body.style.overflow="hidden"};
  const close=()=>{drawer.classList.remove("open");scrim.classList.remove("open");document.body.style.overflow=""};
  const opener=document.getElementById("cvMenuOpen");
  if(opener) opener.onclick=open;
  document.getElementById("cvClose").onclick=close;
  scrim.onclick=close;
  root.querySelectorAll("a").forEach(a=>a.addEventListener("click", close));
  const themeBtn=document.getElementById("cvTheme");
  const apply=mode=>{
    document.documentElement.setAttribute("data-theme",mode);
    localStorage.setItem("ab-theme",mode);
    themeBtn.textContent=mode==="dark"?"حالت روشن":"حالت تاریک";
  };
  apply(localStorage.getItem("ab-theme")||(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"));
  themeBtn.onclick=()=>apply(document.documentElement.getAttribute("data-theme")==="dark"?"light":"dark");
})();
