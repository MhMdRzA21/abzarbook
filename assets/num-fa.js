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

  // نمایش عدد با جداکننده و امکان اعشار (برای درصد و واحدها)
  function fmtDec(n, digits) {
    n = Number(n) || 0;
    if (digits == null) digits = 2;
    return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: digits });
  }

  // نمایش عدد پولی با جداکننده و واحد تومان، مثل "45,000,000 تومان"
  function fmtToman(n) {
    return fmt(n) + " تومان";
  }

  var ONES = ["", "یک", "دو", "سه", "چهار", "پنج", "شش", "هفت", "هشت", "نه"];
  var TEENS = ["ده", "یازده", "دوازده", "سیزده", "چهارده", "پانزده", "شانزده", "هفده", "هجده", "نوزده"];
  var TENS = ["", "", "بیست", "سی", "چهل", "پنجاه", "شصت", "هفتاد", "هشتاد", "نود"];
  var HUNDREDS = ["", "صد", "دویست", "سیصد", "چهارصد", "پانصد", "ششصد", "هفتصد", "هشتصد", "نهصد"];
  var SCALES = ["", "هزار", "میلیون", "میلیارد", "تریلیون", "کوادریلیون"];

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
    var abs = Math.abs(num);

    var groups = [];
    var temp = abs;
    while (temp > 0) {
      groups.push(temp % 1000);
      temp = Math.floor(temp / 1000);
    }
    if (groups.length > SCALES.length) {
      return (negative ? "منفی " : "") + fmt(abs);
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
  // پشتیبانی از حفظ موقعیت نشانگر و ارقام فارسی
  function liveFormat(el) {
    if (!el || el._abLive) return;
    el._abLive = true;
    el.setAttribute("inputmode", "numeric");
    if (el.type === "number") el.type = "text"; // type=number کاما را رد می‌کند
    el.addEventListener("input", function () {
      var raw = el.value;
      var cursor = el.selectionStart || 0;
      var digitsBefore = toEn(raw.slice(0, cursor)).replace(/[^\d]/g, "").length;
      var n = toEn(raw).replace(/[^\d]/g, ""); // فقط ارقام برای پول
      if (!n) {
        el.value = "";
        return;
      }
      // جلوگیری از اعداد خیلی بزرگ که دقت float را از دست می‌دهند
      if (n.length > 15) n = n.slice(0, 15);
      var formatted = Number(n).toLocaleString("en-US");
      el.value = formatted;
      // بازگرداندن تقریبی نشانگر
      var newCursor = formatted.length;
      var digitCount = 0;
      for (var i = 0; i < formatted.length; i++) {
        if (/\d/.test(formatted[i])) {
          digitCount++;
          if (digitCount >= digitsBefore) {
            newCursor = i + 1;
            break;
          }
        }
      }
      try { el.setSelectionRange(newCursor, newCursor); } catch (e) {}
    });
  }

  // نسخه برای اعداد اعشاری (مثل درصد، ساعت، وزن)
  function liveFormatDec(el, maxDigits) {
    if (!el || el._abLive) return;
    el._abLive = true;
    el.setAttribute("inputmode", "decimal");
    if (el.type === "number") el.type = "text";
    maxDigits = maxDigits || 4;
    el.addEventListener("input", function () {
      var raw = el.value;
      var cursor = el.selectionStart || 0;
      var before = toEn(raw.slice(0, cursor));
      var digitsBefore = before.replace(/[^\d]/g, "").length;
      var hasDotBefore = before.indexOf(".") >= 0;
      var cleaned = toEn(raw);
      // اجازه یک نقطه اعشار
      var parts = cleaned.split(".");
      var intPart = (parts[0] || "").replace(/[^\d]/g, "");
      var decPart = parts.length > 1 ? parts.slice(1).join("").replace(/[^\d]/g, "").slice(0, maxDigits) : "";
      if (!intPart && !decPart) {
        el.value = "";
        return;
      }
      var formatted = intPart ? Number(intPart).toLocaleString("en-US") : "0";
      if (parts.length > 1 || (raw.indexOf(".") >= 0 && !decPart && raw.slice(-1) === ".")) {
        formatted += "." + decPart;
      }
      el.value = formatted;
      var newCursor = formatted.length;
      var digitCount = 0;
      for (var i = 0; i < formatted.length; i++) {
        if (/\d/.test(formatted[i])) {
          digitCount++;
          if (digitCount >= digitsBefore && (!hasDotBefore || formatted[i + 1] === "." || i + 1 >= formatted.length)) {
            newCursor = i + 1;
            break;
          }
        }
      }
      try { el.setSelectionRange(newCursor, newCursor); } catch (e) {}
    });
  }

  global.AB = {
    toEn: toEn,
    fmt: fmt,
    fmtDec: fmtDec,
    fmtToman: fmtToman,
    toWords: toWords,
    wordsToman: wordsToman,
    liveFormat: liveFormat,
    liveFormatDec: liveFormatDec
  };
})(window);
