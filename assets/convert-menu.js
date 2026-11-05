(function(){
  if(document.getElementById("abzarBar")) return;
  const s=document.createElement("script");
  s.src="/assets/site-menu.js?v=14";
  document.body.appendChild(s);

  function closer(){
    if(document.getElementById("abzarClose")) return;
    const faqs=[];
    const head=[...document.querySelectorAll("h2")].find(h=>/سؤال|سوال/.test(h.textContent||""));
    if(head){
      let n=head.nextElementSibling;
      const drop=[head];
      while(n && !/^H2$/.test(n.tagName) && !n.classList.contains("site-footer")){
        drop.push(n);
        if(n.tagName==="H3"){
          const p=n.nextElementSibling;
          faqs.push([n.textContent.trim(), p&&p.tagName==="P"?p.textContent.trim():""]);
        }
        n=n.nextElementSibling;
      }
      drop.forEach(el=>el.remove());
    }
    if(!faqs.length){
      faqs.push(
        ["فایل من ذخیره می‌شود؟","نه. فقط تا پایان کار روی سرور می‌ماند و بعد از دانلود پاک می‌شود."],
        ["واترمارک دارد؟","نه. خروجی ابزارها واترمارک ندارد."]
      );
    }
    const box=document.createElement("section");
    box.id="abzarClose";
    box.className="abzar-close";
    box.innerHTML=
      '<h2>سؤالات متداول</h2>'+
      faqs.slice(0,4).map(([q,a])=>'<details><summary>'+q+'</summary><p>'+a+'</p></details>').join("")+
      '<p class="note">این ابزار برای کار روزمره است. ابزاربوک فایل و اطلاعات شما را ذخیره یا برای دیگری ارسال نمی‌کند.</p>'+
      '<div class="share-row"><a id="tgShare" class="share-btn" target="_blank" rel="noopener">📤 اشتراک در تلگرام</a><button id="copyLink" class="share-btn" type="button">🔗 کپی لینک صفحه</button></div>'+
      '<p class="more-tools">سایر ابزارهای ابزاربوک: <a href="/convert/merge-pdf.html">ادغام PDF</a> · <a href="/convert/compress-file.html">فشرده‌سازی</a> · <a href="/convert/image-format.html">تبدیل فرمت تصویر</a> · <a href="/">صفحه اصلی</a></p>';
    const footer=document.querySelector(".site-footer");
    if(footer) footer.replaceWith(box); else document.body.appendChild(box);
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
