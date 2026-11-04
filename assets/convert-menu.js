(function(){
  if(location.pathname.indexOf("/convert")!==0) return;
  if(document.getElementById("convertMenu")) return;
  const link=document.createElement("link");
  link.rel="stylesheet"; link.href="/assets/convert-menu.css?v=11";
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
  const tabs=document.querySelector(".tabs");
  if(tabs){
    const active=tabs.querySelector(".tab.active")||tabs.querySelector(".tab");
    if(active){
      const fit=()=>{
        const br=tabs.getBoundingClientRect();
        const ar=active.getBoundingClientRect();
        if(ar.left<br.left) tabs.scrollBy({left:ar.left-br.left});
        else if(ar.right>br.right) tabs.scrollBy({left:ar.right-br.right});
      };
      requestAnimationFrame(fit);
    }
  }
  document.getElementById("cvClose").onclick=close;
  scrim.onclick=close;
  root.querySelectorAll("a").forEach(a=>a.addEventListener("click", close));
  const themeBtn=document.getElementById("cvTheme");
  const apply=mode=>{
    document.documentElement.setAttribute("data-theme",mode);
    localStorage.setItem("ab-theme",mode);
    themeBtn.textContent=mode==="dark"?"حالت روشن":"حالت تاریک";
  };
  apply(localStorage.getItem("ab-theme-chosen")==="1"?(localStorage.getItem("ab-theme")||"light"):"light");
  themeBtn.onclick=()=>{
    const next=document.documentElement.getAttribute("data-theme")==="dark"?"light":"dark";
    localStorage.setItem("ab-theme-chosen","1");
    apply(next);
  };
})();
