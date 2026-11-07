/* رهن، اجاره و قسط قرض‌الحسنه — همان فرمول‌های rahn-vam.html.
   نرخ ۴٪ و مبالغ وام در خود صفحه مانده‌اند؛ این فایل فقط حساب می‌کند. */
(function (global) {
  "use strict";

  function num(n) { return Number(n) || 0; }

  function convertRent(opts) {
    var mode = opts.mode;
    if (mode === "cap") {
      var oldDep = num(opts.oldDeposit);
      var oldRent = num(opts.oldRent);
      var pct = num(opts.pct);
      if (!oldDep && !oldRent) return { error: "دست‌کم یکی از دو مبلغ (رهن یا اجاره) را وارد کنید." };
      var out = { mode: "cap", pct: pct };
      if (oldDep) {
        out.newDeposit = oldDep * (1 + pct / 100);
        out.depositIncrease = out.newDeposit - oldDep;
      }
      if (oldRent) {
        out.newRent = oldRent * (1 + pct / 100);
        out.rentIncrease = out.newRent - oldRent;
      }
      return out;
    }
    var ratePct = num(opts.ratePercent);
    var rate = ratePct / 100;
    if (!rate) return { error: "نرخ تبدیل را وارد کنید." };
    if (mode === "r2a") {
      var deposit = num(opts.deposit);
      if (!deposit) return { error: "مبلغ رهن را وارد کنید." };
      return { mode: mode, ratePercent: ratePct, rent: deposit * rate };
    }
    if (mode === "a2r") {
      var rentIn = num(opts.rent);
      if (!rentIn) return { error: "مبلغ اجاره را وارد کنید." };
      return { mode: mode, ratePercent: ratePct, deposit: rentIn / rate };
    }
    var full = num(opts.fullDeposit);
    var cash = num(opts.cashDeposit);
    if (!full || !cash) return { error: "هر دو مبلغ را وارد کنید." };
    if (cash > full) return { error: "رهن نقد نمی‌تواند از رهن کامل بیشتر باشد." };
    var diff = full - cash;
    return { mode: "mix", ratePercent: ratePct, diff: diff, cash: cash, rent: diff * rate };
  }

  /* معادل ماهانه یک آگهی = اجاره نقد + رهن × نرخ. برای مقایسه دو آگهی. */
  function monthlyEquivalent(deposit, rent, ratePercent) {
    var rate = num(ratePercent) / 100;
    if (!rate) return { error: "نرخ تبدیل را وارد کنید." };
    return { equivalent: num(rent) + num(deposit) * rate };
  }

  /* فرمول فعلی صفحه: کارمزد کل = مبلغ × نرخ سالانه × (تعداد اقساط + ۱) ÷ ۲۴۰۰
     سپس قسط = (مبلغ + کارمزد) ÷ تعداد اقساط.
     روش «۱۱۰ قسط اصل + ماه کارمزد» در این کد نیست. */
  function qardInstallment(amount, months, annualPercent) {
    amount = num(amount);
    months = num(months);
    annualPercent = num(annualPercent);
    if (!amount) return { error: "مبلغ وام را وارد کنید." };
    if (!months) return { error: "تعداد اقساط را وارد کنید." };
    var fee = amount * annualPercent * (months + 1) / 2400;
    var total = amount + fee;
    return {
      amount: amount,
      months: months,
      annualPercent: annualPercent,
      fee: fee,
      total: total,
      installment: total / months
    };
  }

  global.ABHousing = {
    convertRent: convertRent,
    monthlyEquivalent: monthlyEquivalent,
    qardInstallment: qardInstallment
  };
})(typeof window !== "undefined" ? window : global);
