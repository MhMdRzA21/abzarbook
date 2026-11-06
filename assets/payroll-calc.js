/* محاسبه حقوق — همان ثابت‌ها و فرمول‌هایی که قبلاً داخل hoghoogh-dastmazd.html بودند.
   رقم رسمی تازه‌ای اینجا اضافه نشده است. جایی که بخشنامه در مخزن نیست، تابع آن را حدس نمی‌زند. */
(function (global) {
  "use strict";

  var CFG = {
    eydiDays: 60,
    sanavatDaysPerYear: 30,
    daysPerMonth: 30,
    taxExemptMonthly: 40000000,
    eydiExempt: 40000000,
    eydiExcessRate: 0.10,
    govEydiFixed: 10000000,
    govEndServiceCapYears: 30,
    govEndServiceCap: 750000000,
    brackets: [
      [80000000, 0.10],
      [100000000, 0.15],
      [120000000, 0.20],
      [140000000, 0.25],
      [Infinity, 0.30]
    ]
  };

  function calcEydiLabor(base, months, days) {
    base = Number(base) || 0;
    months = Number(months) || 0;
    days = Number(days) || 0;
    if (!base) return { error: "حقوق پایه را وارد کنید." };
    if (months > 12 || days > 30 || (months * 30 + days) > 360) {
      return { error: "مدت کار نباید بیش از ۱۲ ماه باشد." };
    }
    var daily = base / CFG.daysPerMonth;
    var ratio = (months * 30 + days) / 360;
    var gross = daily * CFG.eydiDays * ratio;
    var taxable = Math.max(0, gross - CFG.eydiExempt);
    var tax = taxable * CFG.eydiExcessRate;
    return {
      daily: daily,
      ratio: ratio,
      gross: gross,
      taxable: taxable,
      tax: tax,
      net: gross - tax,
      exempt: CFG.eydiExempt,
      days: CFG.eydiDays
    };
  }

  function calcSanavatLabor(last, years, months, days) {
    last = Number(last) || 0;
    years = Number(years) || 0;
    months = Number(months) || 0;
    days = Number(days) || 0;
    if (!last) return { error: "آخرین حقوق ماهانه را وارد کنید." };
    if (!(years || months || days)) return { error: "سابقه کار را وارد کنید." };
    var daily = last / CFG.daysPerMonth;
    var y = years + months / 12 + days / 360;
    return {
      daily: daily,
      years: y,
      total: daily * CFG.sanavatDaysPerYear * y,
      daysPerYear: CFG.sanavatDaysPerYear
    };
  }

  function calcGovEndService(last, years) {
    last = Number(last) || 0;
    years = Number(years) || 0;
    if (!last) return { error: "آخرین حقوق و مزایای مستمر را وارد کنید." };
    if (!years) return { error: "سنوات خدمت را وارد کنید." };
    var cappedYears = Math.min(years, CFG.govEndServiceCapYears);
    var raw = last * cappedYears;
    var capped = raw > CFG.govEndServiceCap;
    return {
      cappedYears: cappedYears,
      raw: raw,
      total: capped ? CFG.govEndServiceCap : raw,
      capped: capped,
      cap: CFG.govEndServiceCap
    };
  }

  function calcSalaryTax(gross) {
    gross = Number(gross) || 0;
    if (!gross) return { error: "حقوق ناخالص را وارد کنید." };
    var remaining = Math.max(0, gross - CFG.taxExemptMonthly);
    var lower = CFG.taxExemptMonthly;
    var tax = 0;
    var lines = [];
    for (var i = 0; i < CFG.brackets.length; i++) {
      var upper = CFG.brackets[i][0];
      var rate = CFG.brackets[i][1];
      if (remaining <= 0) break;
      var band = Math.min(remaining, upper - lower);
      if (band > 0) {
        var t = band * rate;
        tax += t;
        lines.push({ lower: lower, upper: upper, rate: rate, band: band, tax: t });
        remaining -= band;
      }
      lower = upper;
    }
    return {
      gross: gross,
      tax: tax,
      net: gross - tax,
      lines: lines,
      exemptApplied: Math.min(gross, CFG.taxExemptMonthly)
    };
  }

  /* جمع اقلامی که کاربر وارد کرده، منهای بیمه‌ای که خودش نرخش را داده، سپس همان جدول مالیات.
     نرخ سهم بیمه‌شده و سقف دستمزد مشمول بیمه در مخزن نیست و پیش‌فرض نمی‌شود. */
  function calcNetPay(parts, insuranceRatePercent, insurableBase) {
    var gross = 0;
    for (var i = 0; i < parts.length; i++) gross += Number(parts[i]) || 0;
    if (!gross) return { error: "دست‌کم حقوق پایه را وارد کنید." };
    var rate = Number(insuranceRatePercent) || 0;
    if (rate < 0 || rate > 100) return { error: "نرخ بیمه باید بین ۰ و ۱۰۰ باشد." };
    var insurable = Number(insurableBase) > 0 ? Number(insurableBase) : gross;
    var insurance = insurable * (rate / 100);
    var afterIns = Math.max(0, gross - insurance);
    var taxResult = calcSalaryTax(afterIns);
    return {
      gross: gross,
      insurance: insurance,
      insurable: insurable,
      rate: rate,
      afterIns: afterIns,
      tax: taxResult.tax,
      lines: taxResult.lines,
      exemptApplied: taxResult.exemptApplied,
      net: gross - insurance - taxResult.tax
    };
  }

  global.ABPayroll = {
    CFG: CFG,
    calcEydiLabor: calcEydiLabor,
    calcSanavatLabor: calcSanavatLabor,
    calcGovEndService: calcGovEndService,
    calcSalaryTax: calcSalaryTax,
    calcNetPay: calcNetPay
  };
})(typeof window !== "undefined" ? window : global);
