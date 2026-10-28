/* ابزاربوک — فرمت‌کننده اعداد و تبدیل عدد به حروف فارسی (مشترک بین صفحات) */
(function (global) {
  "use strict";

  var FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

  // تبدیل ارقام فارسی/عربی تایپ‌شده به ارقام لاتین (برای پردازش عددی)
  function toEn(s) {
    return String(s)
      .replace(/[۰-۹]/g, function (d) { return FA_DIGITS.indexOf(d); })
      .replace(/[^\d.-]/g, "");
  }

  // نمایش عدد با جداکننده هزارگان لاتین، مثل 45,000,000
  function fmt(n) {
    n = Math.round(Number(n) || 0);
    return n.toLocaleString("en-US");
  }

  // نمایش عدد پولی با جداکننده و واحد تومان، مثل "45,000,000 تومان"
  function fmtToman(n) {
    return fmt(n) + " تومان";
  }

  var ONES = ["", "یک", "دو", "سه", "چهار", "پنج", "شش", "هفت", "هشت", "نه"];
  var TEENS = ["ده", "یازده", "دوازده", "سیزده", "چهارده", "پانزده", "شانزده", "هفده", "هجده", "نوزده"];
  var TENS = ["", "", "بیست", "سی", "چهل", "پنجاه", "شصت", "هفتاد", "هشتاد", "نود"];
  var HUNDREDS = ["", "صد", "دویست", "سیصد", "چهارصد", "پانصد", "ششصد", "هفتصد", "هشتصد", "نهصد"];
  var SCALES = ["", "هزار", "میلیون", "میلیارد", "تریلیون"];

  function threeDigitToWords(num) {
    var parts = [];
    var h = Math.floor(num / 100);
    var rem = num % 100;
    if (h) parts.push(HUNDREDS[h]);
    if (rem >= 10 && rem < 20) {
      parts.push(TEENS[rem - 10]);
    } else {
      var t = Math.floor(rem / 10);
      var o = rem % 10;
      if (t) parts.push(TENS[t]);
      if (o) parts.push(ONES[o]);
    }
    return parts.join(" و ");
  }

  // تبدیل عدد صحیح به حروف فارسی، مثل 45000000 -> "چهل و پنج میلیون"
  function toWords(num) {
    num = Math.round(Number(num) || 0);
    if (num === 0) return "صفر";
    var negative = num < 0;
    num = Math.abs(num);

    var groups = [];
    while (num > 0) {
      groups.push(num % 1000);
      num = Math.floor(num / 1000);
    }
    if (groups.length > SCALES.length) {
      // عدد خیلی بزرگ‌تر از پشتیبانی این تابع (فراتر از هزاران میلیارد تومان)
      return (negative ? "منفی " : "") + fmt(num);
    }
    var parts = [];
    for (var i = groups.length - 1; i >= 0; i--) {
      if (groups[i] === 0) continue;
      var text = threeDigitToWords(groups[i]);
      if (SCALES[i]) text += " " + SCALES[i];
      parts.push(text);
    }
    return (negative ? "منفی " : "") + parts.join(" و ");
  }

  // تبدیل عدد پولی به حروف با واحد تومان، مثل "چهل و پنج میلیون تومان"
  function wordsToman(n) {
    return toWords(n) + " تومان";
  }

  // فعال‌سازی جداکننده هزارگان زنده روی اینپوت‌های عددی (هنگام تایپ)
  function liveFormat(el) {
    el.addEventListener("input", function () {
      var n = toEn(el.value);
      el.value = n ? Number(n).toLocaleString("en-US") : "";
    });
  }

  global.AB = {
    toEn: toEn,
    fmt: fmt,
    fmtToman: fmtToman,
    toWords: toWords,
    wordsToman: wordsToman,
    liveFormat: liveFormat
  };
})(window);
