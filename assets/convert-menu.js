(function(){
  if(document.getElementById("abzarBar")) return;
  const s=document.createElement("script");
  s.src="/assets/site-menu.js?v=16";
  document.body.appendChild(s);

  function closer(){
    if(document.getElementById("tgShare") || document.querySelector(".share-row")) return;
    const row=document.createElement("div");
    row.className="share-row abzar-close";
    row.innerHTML='<a id="tgShare" class="share-btn" target="_blank" rel="noopener">📤 اشتراک در تلگرام</a><button id="copyLink" class="share-btn" type="button">🔗 کپی لینک صفحه</button>';
    const footer=document.querySelector(".site-footer");
    const wrap=document.createElement("div");
    wrap.className="wrap";
    wrap.appendChild(row);
    if(footer) footer.before(wrap); else document.body.appendChild(wrap);
    const tg=document.getElementById("tgShare");
    const cp=document.getElementById("copyLink");
    if(tg) tg.href="https://t.me/share/url?url="+encodeURIComponent(location.href)+"&text="+encodeURIComponent(document.title);
    if(cp) cp.onclick=function(){
      navigator.clipboard.writeText(location.href).then(()=>{
        cp.textContent="✓ کپی شد";
        setTimeout(()=>{cp.textContent="🔗 کپی لینک صفحه";},1500);
      }).catch(()=>{});
    };
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", closer);
  else closer();
})();
