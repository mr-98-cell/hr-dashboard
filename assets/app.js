/* ===========================================================
   داشبورد إدارة استقطاب المواهب — مركز أداء
   تطبيق صفحة واحدة (SPA) بتوجيه عبر الـ hash
   =========================================================== */
(function () {
  const CFG = window.APP_CONFIG || {};
  const MONTHS = ["ينا", "فبر", "مار", "أبر", "ماي", "يون", "يول", "أغس", "سبت", "أكت", "نوف", "ديس"];
  const MONTHS_EN = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const MONTHS_FULL = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
  const WEEKDAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  // yyyy-mm-dd → اسم اليوم؛ يتجاهل القيم القديمة المكتوبة نصًا
  function dayOf(d) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(d || ""));
    if (!m) return "";
    const dt = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return isNaN(dt) ? "" : WEEKDAYS[dt.getDay()];
  }
  // yyyy-mm-dd → "٢٨ يوليو ٢٠٢٦" للعرض
  function fmtDate(d) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(d || ""));
    if (!m) return String(d || "");
    return `${Number(m[3])} ${MONTHS_FULL[Number(m[2]) - 1]} ${m[1]}`;
  }
  const STAGES = ["المقابلة", "العرض الأولي", "المسح الأمني", "الفحص الطبي", "العرض النهائي", "الانضمام"];
  const PALETTE = ["var(--g-800)", "var(--emerald)", "var(--g-700)", "var(--g-600)", "var(--g-500)", "var(--gold)", "var(--g-400)"];

  const state = {
    page: "index",
    tab: null,
    node: "root",
    user: null,
    filters: { unit: "", year: 2026, month: 0 }, // month=0 يعني كل الأشهر
    lang: "ar",
    stage: null,   // مرحلة التوظيف المختارة من شريط المراحل
    status: {},    // الحالة المختارة لكل جدول (المتدربون/تمهير)
    edit: false,
  };

  /* ---------------- أدوات ---------------- */
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  // للقيم التي تُوضع داخل نص JS في خاصية onclick — تُهرَّب مرتين: كنص JS ثم كخاصية HTML
  const jsq = (s) => esc(String(s == null ? "" : s).replace(/[\\'"]/g, "\\$&").replace(/[\r\n]/g, " "));
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  const db = () => DB.cache;
  const canEdit = () => state.user && (state.user.role === "editor" || state.user.role === "owner");
  const canEditTitles = () => state.user && state.user.role === "owner";
  const ROLE_LABEL = { owner: "مالك الداشبورد", editor: "مُدخِل بيانات", viewer: "عرض فقط" };

  const ICONS = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>',
    users: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 20c0-3.3 2.5-5.5 5.5-5.5s5.5 2.2 5.5 5.5"/><path d="M16 5.2a3 3 0 0 1 0 5.6M17.5 20c0-2.4-1-4.2-2.6-5"/>',
    cap: '<path d="M12 4 22 9l-10 5L2 9z"/><path d="M6 11v5c0 1.4 2.7 2.6 6 2.6s6-1.2 6-2.6v-5"/>',
    exit: '<path d="M15 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9"/><path d="M11 12h9M17 8l4 4-4 4"/>',
    group: '<circle cx="12" cy="6.5" r="3"/><path d="M6.5 19.5c0-3 2.5-5.5 5.5-5.5s5.5 2.5 5.5 5.5"/><path d="M5 12.5a2.3 2.3 0 1 1 1.6-3.9M19 12.5a2.3 2.3 0 1 0-1.6-3.9"/><path d="M2 19.5c0-2 1.2-3.6 3-3.6M22 19.5c0-2-1.2-3.6-3-3.6"/>',
    office: '<path d="M3 21h18M5 21V6a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v15M13 21V10h5a1 1 0 0 1 1 1v10"/><path d="M8 9h2M8 13h2M8 17h2M16 14h.01M16 17h.01"/>',
    pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/>',
    sheet: '<path d="M4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"/><path d="M3 9.5h18M3 15h18M9.5 9.5V20M15 9.5V20"/>',
    file: '<path d="M6 2.5h7L18.5 8v13a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1z"/><path d="M13 2.5V8h5.5"/><path d="M8.5 13.5h7M8.5 17h4.5"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18z"/>',
  };
  const icon = (n) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[n] || ""}</svg>`;
  const CHEV = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>';

  /* ---------------- الهيكل التنظيمي ---------------- */
  function units() { return db().org_units || []; }
  function unitById(id) { return units().find((u) => u.id === id); }
  function childrenOf(id) { return units().filter((u) => (u.parent_id || null) === (id || null)); }
  function roots() { return childrenOf(null); }

  function aggregate(id) {
    const t = { approved: 0, filled: 0, junior: 0, senior: 0, male: 0, female: 0 };
    const kids = childrenOf(id);
    if (!kids.length) {
      const u = unitById(id);
      if (u) for (const k in t) t[k] = Number(u[k] || 0);
      return t;
    }
    for (const k of kids) {
      const s = aggregate(k.id);
      for (const key in t) t[key] += s[key];
    }
    return t;
  }
  function aggregateAll() {
    const t = { approved: 0, filled: 0, junior: 0, senior: 0, male: 0, female: 0 };
    for (const r of roots()) {
      const s = aggregate(r.id);
      for (const k in t) t[k] += s[k];
    }
    return t;
  }
  function pathOf(id) {
    const out = [];
    let cur = id;
    while (cur) { out.unshift(cur); const u = unitById(cur); cur = u ? u.parent_id : null; }
    return out;
  }
  // يرجّع القطاع الجذر لأي وحدة
  function rootOf(id) { const p = pathOf(id); return p[0] || id; }

  /* الوحدات التي تُجمَّع عليها الرسوم — تتبع فلتر «القطاع / الإدارة» */
  function groupUnits() {
    const f = state.filters.unit;
    if (!f) return roots();
    const kids = childrenOf(f);
    if (kids.length) return kids;
    const u = unitById(f);
    return u ? [u] : roots();
  }
  /* أي وحدة من groupUnits() ينتمي إليها سجل ما */
  function groupOf(id) {
    if (!id) return null;
    const path = pathOf(id);
    const g = groupUnits().find((x) => path.includes(x.id));
    return g ? g.id : null;
  }
  /* توزيع عدّي على وحدات المجموعة */
  function distBy(list, count) {
    return groupUnits().map((g, i) => [
      uname(g),
      count ? list.filter((x) => groupOf(x.unit_id) === g.id).reduce((sum, x) => sum + Number(x[count] || 0), 0)
            : list.filter((x) => x.unit_id && groupOf(x.unit_id) === g.id).length,
      PALETTE[i % PALETTE.length],
    ]);
  }

  /* ---------------- الفلاتر ---------------- */
  function inPeriod(r) {
    if (!r) return false;
    if (state.filters.year && Number(r.year) !== Number(state.filters.year)) return false;
    if (state.filters.month && Number(r.month) !== Number(state.filters.month)) return false;
    return true;
  }
  function inUnit(r) {
    const f = state.filters.unit;
    if (!f) return true;
    if (!r.unit_id) return true;
    return pathOf(r.unit_id).includes(f);
  }
  const rows = (t) => (db()[t] || []).filter((r) => inPeriod(r) && inUnit(r));

  /* ---------------- الرسوم ---------------- */
  function donut(segs, ctop, cbot, opts) {
    opts = opts || {};
    const size = opts.size || 200;
    const total = segs.reduce((s, x) => s + x[1], 0) || 1;
    let ang = -90, paths = "";
    const R = 74, r = 49, cx = 94, cy = 94;
    for (const [lab, v, col] of segs) {
      const sw = (v / total) * 360;
      const a0 = (ang * Math.PI) / 180, a1 = ((ang + sw) * Math.PI) / 180;
      const x0 = cx + R * Math.cos(a0), y0 = cy + R * Math.sin(a0);
      const x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1);
      const xi1 = cx + r * Math.cos(a1), yi1 = cy + r * Math.sin(a1);
      const xi0 = cx + r * Math.cos(a0), yi0 = cy + r * Math.sin(a0);
      const lg = sw > 180 ? 1 : 0;
      paths += `<path d="M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${R} ${R} 0 ${lg} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} L ${xi1.toFixed(2)} ${yi1.toFixed(2)} A ${r} ${r} 0 ${lg} 0 ${xi0.toFixed(2)} ${yi0.toFixed(2)} Z" fill="${col}" style="stroke:var(--panel)" stroke-width="2.5"/>`;
      ang += sw;
    }
    const svg = `<svg viewBox="0 0 188 188" width="${size}" height="${size}">${paths}
      <text x="94" y="88" text-anchor="middle" style="font-size:30px;font-weight:800;font-family:Noto Kufi Arabic;fill:var(--g-800)">${ctop}</text>
      <text x="94" y="110" text-anchor="middle" style="font-size:13px;fill:var(--muted)">${cbot}</text></svg>`;
    const leg = segs.map(([l, v, c]) => `<div class="it"><span class="sw" style="background:${c}"></span>${esc(t(l))} <b>(${v})</b></div>`).join("");
    return `<div class="donut-wrap${opts.stack ? " stack" : ""}">${svg}<div class="legend${opts.row ? " row" : ""}">${leg}</div></div>`;
  }

  function ring(p, col, label, note, size) {
    const R = 60, C = 2 * Math.PI * R, off = C * (1 - p / 100);
    return `<div class="ring-wrap"><svg viewBox="0 0 154 154" width="${size || 240}" height="${size || 240}">
      <circle cx="77" cy="77" r="${R}" fill="none" stroke="var(--ringtrack,var(--g-50))" stroke-width="15"/>
      <circle cx="77" cy="77" r="${R}" fill="none" stroke="${col}" stroke-width="15" stroke-linecap="round" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" transform="rotate(-90 77 77)"/>
      <text x="77" y="72" text-anchor="middle" style="font-size:32px;font-weight:800;font-family:Noto Kufi Arabic;fill:var(--g-800)">${p}%</text>
      <text x="77" y="95" text-anchor="middle" style="font-size:12px;fill:var(--muted)">${esc(t(label))}</text></svg>
      ${note ? `<div class="ring-note">${esc(note)}</div>` : ""}</div>`;
  }

  function colbars(items, maxh) {
    maxh = maxh || 190;
    const mx = Math.max(...items.map((i) => i[1]), 1);
    const cols = items.map(([l, v, c]) => `<div class="cb"><div class="cbv">${v}</div>
      <div class="cbcol" style="height:${Math.max(14, (v / mx) * maxh).toFixed(0)}px;background:${c}"></div>
      <div class="cbl">${esc(t(l))}</div></div>`).join("");
    return `<div class="cbars">${cols}</div>`;
  }

  function splitbar(parts) {
    const tot = parts.reduce((s, p) => s + p[1], 0) || 1;
    const bars = parts.map(([l, v, c]) => `<i style="width:${((v / tot) * 100).toFixed(1)}%;background:${c}">${v}</i>`).join("");
    const lg = parts.map(([l, v, c]) => `<div class="i"><span class="sw" style="background:${c}"></span>${esc(t(l))}</div>`).join("");
    return `<div class="split">${bars}</div><div class="slg">${lg}</div>`;
  }

  /* شريط حالات قابل للضغط — يعرض من هم في كل حالة */
  function statusChips(key, list, statuses) {
    const cur = state.status[key] || "";
    const chip = (val, label, n) =>
      `<div class="sc${cur === val ? " on" : ""}" onclick="APP.setStatus('${jsq(key)}','${jsq(val)}')">${esc(t(label))}<b>${n}</b></div>`;
    return `<div class="statchips">${chip("", "الكل", list.length)}
      ${statuses.map((st) => chip(st, st, list.filter((r) => r.status === st).length)).join("")}</div>`;
  }
  const byStatus = (key, list) => (state.status[key] ? list.filter((r) => r.status === state.status[key]) : list);

  /* ---------------- بطاقات الأشخاص ---------------- */
  function pcard(name, pos, metas, badge, act) {
    const m = metas.filter(([k, v]) => v && v !== "—")
      .map(([k, v]) => `<div class="mi"><span class="k">${esc(t(k))}</span><span class="v">${esc(t(v))}</span></div>`).join("");
    const b = badge ? `<span class="badge ${badge[1]}">${esc(t(badge[0]))}</span>` : "";
    const acts = act && canEdit()
      ? `<span class="iact" title="${esc(t("تعديل"))}" onclick="APP.openForm('${jsq(act.form)}','${jsq(act.id)}')">${icon("pen")}</span>
         <span class="iact del" title="${esc(t("حذف"))}" onclick="APP.removeRow('${jsq(act.table)}','${jsq(act.id)}')">${icon("trash")}</span>` : "";
    return `<div class="prow"><div class="pav">${esc((name || "?").trim()[0])}</div>
      <div class="pid"><div class="pn">${esc(name)}</div><div class="pp">${esc(pos)}</div></div>
      <div class="pmeta">${m}</div><div class="pend hact">${b}${acts}</div></div>`;
  }

  function plist(title, chip, cards, add) {
    const a = add && canEdit() ? `<button class="btn btn-p" onclick="APP.openForm('${jsq(add[1])}')">${icon("plus")} ${esc(t(add[0]))}</button>` : "";
    return `<div class="card"><div class="tbl-h"><h3 class="ttl-edit" data-tk="1" data-k="${esc(title)}">${esc(t(title))}</h3>
      <div class="hact"><span class="chip2">${esc(chip)}</span>${a}</div></div>
      <div class="plist">${cards || `<div class="empty">${esc(t("لا توجد بيانات مطابقة للفلاتر الحالية"))}</div>`}</div></div>`;
  }

  /* ---------------- الصفحات ---------------- */
  // اللوحة الرئيسية
  function pageIndex() {
    const vac = rows("vacancies");
    const totalVac = vac.reduce((s, v) => s + Number(v.count || 0), 0);
    const received = vac.reduce((s, v) => s + Number(v.received || 0), 0);
    const cands = rows("candidates");
    const done = cands.filter((c) => c.stage >= 5).length;
    const inprog = cands.filter((c) => c.stage < 5).length;
    const trainees = rows("trainees");
    const resg = rows("resignations");
    const target = Number((db().settings.find((s) => s.key === "training_target") || {}).value || 80);
    const trDone = trainees.filter((t) => t.status === "مكتمل").length;
    const trProg = trainees.filter((t) => t.status === "تحت الإجراء").length;
    const trOn = trainees.filter((t) => t.status === "قائم").length;
    const tamheer = rows("tamheer");
    const tmDone = tamheer.filter((t) => t.status === "مكتمل").length;
    const tmProg = tamheer.filter((t) => t.status === "تحت الإجراء").length;
    const tmOn = tamheer.filter((t) => t.status === "قائم").length;

    const bySector = distBy(resg);

    const cards = [
      ["recruitment", "users", received, "طلبات التوظيف المستلمة"],
      ["training", "cap", trainees.length, "طلبات التدريب"],
      ["tamheer", "group", tamheer.length, "طلبات تمهير"],
      ["resignations", "exit", resg.length, "الاستقالات"],
    ].map(([href, ic, v, l]) => `<a class="tcard" href="#/${href}"><div class="ic">${icon(ic)}</div>
      <div><div class="v">${v}</div><div class="l">${esc(t(l))}</div></div></a>`).join("");

    const panels = [
      ["توزيع حالة طلبات التوظيف", `من إجمالي ${totalVac + inprog + done}`,
        donut([["شاغرة", totalVac, "var(--g-400)"], ["تحت الإجراء", inprog, "var(--g-600)"], ["مكتملة", done, "var(--g-800)"]],
          totalVac + inprog + done, "إجمالي", { size: 240 })],
      ["توزيع حالة طلبات التدريب", `من إجمالي ${trainees.length}`,
        donut([["مكتملة", trDone, "var(--emerald)"], ["تحت الإجراء", trProg, "var(--g-600)"], ["قائم", trOn, "var(--g-400)"]],
          trainees.length, "طلب", { size: 240 })],
      ["توزيع حالة طلبات تمهير", `من إجمالي ${tamheer.length}`,
        donut([["مكتملة", tmDone, "var(--emerald)"], ["تحت الإجراء", tmProg, "var(--g-600)"], ["قائم", tmOn, "var(--g-400)"]],
          tamheer.length, "طلب", { size: 240 })],
      ["توزيع الاستقالات حسب القطاع", `الإجمالي ${resg.length}`, colbars(bySector)],
    ].map((p, i, arr) => `<div class="panel"${i === arr.length - 1 && arr.length % 2 === 1 ? ' style="grid-column:1/-1"' : ""}>
      <div class="p-h"><h3 class="ttl-edit" data-tk="1" data-k="${esc(p[0])}">${esc(t(p[0]))}</h3><span class="hint">${esc(p[1])}</span></div>
      <div class="body">${p[2]}</div></div>`).join("");

    return `<div class="tcards">${cards}</div><div class="mrow full"><div class="vgrid">${panels}</div></div>`;
  }

  // التوظيف
  function pageRecruitment() {
    const vac = rows("vacancies");
    const cands = rows("candidates");
    const ivs = rows("interviews");
    const totalVac = vac.reduce((s, v) => s + Number(v.count || 0), 0);
    const received = vac.reduce((s, v) => s + Number(v.received || 0), 0);
    const done = cands.filter((c) => c.stage >= 5).length;
    const rate = pct(done, totalVac);

    const bySectorVac = distBy(vac, "count");

    const ivDone = ivs.filter((i) => i.status === "تمت").length;
    const ivRej = ivs.filter((i) => i.status === "مرفوضة").length;
    const ivSch = ivs.filter((i) => i.status === "مجدولة").length;

    // ثلاث دوائر: الإجمالي · قيد الإجراء · المكتملة — كل واحدة تُقارن بالإجمالي
    // مصادر المرشحين — من أين يأتي المتقدمون فعلًا
    const srcSegs = (() => {
      const m = {};
      ivs.forEach((r) => { const k = (r.cand_source || "").trim(); if (k) m[k] = (m[k] || 0) + 1; });
      return Object.keys(m).sort((a, b) => m[b] - m[a]).map((k, i) => [k, m[k], PALETTE[i % PALETTE.length]]);
    })();
    const ov = `<div class="vgrid three">
      <div class="panel"><div class="p-h"><h3 class="ttl-edit" data-tk="1" data-k="عدد طلبات المقابلات">${esc(t("عدد طلبات المقابلات"))}</h3></div>
        <div class="body">${donut([["مجدولة", ivSch, "var(--amber)"], ["مكتملة", ivDone, "var(--g-800)"], ["مرفوضة", ivRej, "var(--red)"]], ivs.length, "مقابلة", { size: 176 })}</div></div>
      <div class="panel"><div class="p-h"><h3 class="ttl-edit" data-tk="1" data-k="وظائف قيد الإجراء">${esc(t("وظائف قيد الإجراء"))}</h3><span class="hint">من ${ivs.length}</span></div>
        <div class="body">${donut([["المكتمل", ivDone, "var(--g-800)"], ["الباقي", Math.max(ivs.length - ivDone, 0), "var(--g-100)"]], ivs.length - ivDone, "متبقٍ", { size: 176 })}</div></div>
      <div class="panel"><div class="p-h"><h3 class="ttl-edit" data-tk="1" data-k="مصادر المرشحين">${esc(t("مصادر المرشحين"))}</h3><span class="hint">${esc(t("الإجمالي"))} ${ivs.length}</span></div>
        <div class="body">${srcSegs.length ? donut(srcSegs, ivs.length, "مرشح", { size: 176 }) : `<div class="empty">${esc(t("لا توجد بيانات"))}</div>`}</div></div>
      </div>
      <div class="vgrid" style="margin-top:20px">
      <div class="panel" style="grid-column:1/-1"><div class="p-h"><h3 class="ttl-edit" data-tk="1" data-k="الوظائف الشاغرة حسب القطاع">${esc(t("الوظائف الشاغرة حسب القطاع"))}</h3><span class="hint">${esc(t("الإجمالي"))} ${totalVac}</span></div>
        <div class="body">${colbars(bySectorVac)}</div></div></div>`;

    // المقابلات
    const ivCards = ivs.map((r) => pcard(r.candidate, r.position, [
      ["الإدارة", uname(unitById(r.unit_id))], ["مالك الوظيفة", r.owner],
      ["التاريخ", r.date ? fmtDate(r.date) + ((r.day || dayOf(r.date)) ? " · " + (r.day || dayOf(r.date)) : "") : ""], ["الوقت", r.time],
      ["مصدر الوظيفة", r.job_source], ["مصدر المرشح", r.cand_source_name ? r.cand_source + " · " + r.cand_source_name : r.cand_source],
      ["تقييم الموارد البشرية", r.hr_rating], ["تقييم الإدارة", r.mgr_rating],
    ], [r.status, r.status === "تمت" ? "b-good" : r.status === "مرفوضة" ? "b-crit" : "b-info"],
      { form: "interview", id: r.id, table: "interviews" })).join("");

    // المراحل
    const atStage = (i) => cands.filter((c) => Number(c.stage) === i);
    const sum = STAGES.map((s, i) => `<div class="sum${state.stage === i ? " on" : ""}" onclick="APP.setStage(${i})" title="اعرض من في هذه المرحلة">
      <div class="n">${atStage(i).length}</div><div class="l">${esc(t(s))}</div></div>`).join("");
    const shownCands = state.stage == null ? cands : atStage(state.stage);
    const stageNote = state.stage == null ? "" :
      `<div class="stagenote">تعرض الآن مرحلة «${esc(STAGES[state.stage])}» — ${shownCands.length} مرشح
        <button class="btn btn-x" onclick="APP.setStage(${state.stage})">عرض كل المراحل</button></div>`;
    const accs = shownCands.map((c, i) => {
      const steps = STAGES.map((s, si) => {
        const cls = si < c.stage ? "done" : si === c.stage ? "cur" : "";
        return `<div class="step ${cls}"><div class="c">${si < c.stage ? "✓" : si + 1}</div><div class="t">${esc(t(s))}</div></div>`;
      }).join("");
      const upd = canEdit() ? `<button class="btn btn-g" onclick="APP.openForm('candidate','${jsq(c.id)}')">${icon("pen")} تحديث المرحلة</button>` : "";
      return `<div class="acc ${i === 0 ? "open" : ""}"><div class="head" onclick="this.parentElement.classList.toggle('open')">
        <span class="nm">${esc(c.name)}</span><span class="pos">${esc(c.position)}</span>
        <span class="badge b-info">${esc(t(STAGES[c.stage] || ""))}</span><span class="chev">${CHEV}</span></div>
        <div class="body"><div class="stepper">${steps}</div>
        <div style="display:flex;align-items:center;gap:10px;margin-top:14px;flex-wrap:wrap">
        <div class="note" style="margin:0">آخر تحديث: ${esc(c.note || "—")}</div>${upd}</div></div></div>`;
    }).join("");
    const addCand = canEdit() ? `<div style="display:flex;margin-bottom:14px"><button class="btn btn-p" onclick="APP.openForm('candidate')">${icon("plus")} إضافة مرشح</button></div>` : "";

    const onbCards = rows("onboarding").map((r) => pcard(r.name, r.position, [
      ["الدرجة", r.grade], ["تاريخ المباشرة", r.start_date], ["الملاحظات", r.notes],
    ], null, { form: "onboarding", id: r.id, table: "onboarding" })).join("");

    const flow = addCand + `<div class="sumrow">${sum}</div>` + stageNote +
      (accs || '<div class="empty">لا يوجد مرشحون في هذه المرحلة</div>') +
      `<div style="margin-top:22px"></div>` + plist("مرحلة الانضمام", rows("onboarding").length + " منضم", onbCards, ["إضافة منضم", "onboarding"]);

    const views = [
      ["ov", ov],
      ["iv", plist("جدول المقابلات", ivs.length + " مقابلة", ivCards, ["إضافة مقابلة", "interview"])],
      ["flow", flow],
    ];
    const side = `<div class="s-h"><h3 class="ttl-edit" data-tk="1" data-k="نسبة إنجاز التوظيف">${esc(t("نسبة إنجاز التوظيف"))}</h3></div>
      <div class="hero">${ring(rate, "var(--g-700)", "إنجاز التوظيف", `${done} مكتمل من ${totalVac} شاغرة`, 290)}</div>`;

    return tabbed([["ov", "نظرة عامة"], ["iv", "المقابلات"], ["flow", "مراحل التوظيف"]], views, side);
  }

  // التدريب
  function pageTraining() {
    const tr = rows("trainees");
    const target = Number((db().settings.find((s) => s.key === "training_target") || {}).value || 80);
    const done = tr.filter((t) => t.status === "مكتمل").length;
    const prog = tr.filter((t) => t.status === "تحت الإجراء").length;
    const on = tr.filter((t) => t.status === "قائم").length;
    const dist = distBy(tr);

    const ov = `<div class="vgrid">
      <div class="panel"><div class="p-h"><h3 class="ttl-edit" data-tk="1" data-k="حالة طلبات التدريب">${esc(t("حالة طلبات التدريب"))}</h3><span class="hint">من إجمالي ${tr.length}</span></div>
        <div class="body">${donut([["مكتملة", done, "var(--emerald)"], ["تحت الإجراء", prog, "var(--g-600)"], ["قائم", on, "var(--g-400)"]], tr.length, "طلب", { size: 190 })}</div></div>
      <div class="panel"><div class="p-h"><h3 class="ttl-edit" data-tk="1" data-k="نسبة الإنجاز من الطلبات">${esc(t("نسبة الإنجاز من الطلبات"))}</h3></div>
        <div class="body">${ring(pct(done, tr.length), "var(--emerald)", "من الطلبات", `${done} مكتمل من ${tr.length}`, 200)}</div></div>
      <div class="panel" style="grid-column:1/-1"><div class="p-h"><h3 class="ttl-edit" data-tk="1" data-k="توزيع المتدربين على القطاعات">${esc(t("توزيع المتدربين على القطاعات"))}</h3><span class="hint">الإجمالي ${tr.length}</span></div>
        <div class="body">${colbars(dist)}</div></div></div>`;

    const trShown = byStatus("trainees", tr);
    const cards = statusChips("trainees", tr, ["قائم", "تحت الإجراء", "مكتمل"]) + trShown.map((r) => pcard(r.name, r.university, [
      ["المشرف التدريبي", r.supervisor], ["الإدارة", uname(unitById(r.unit_id))],
      ["بداية التدريب", r.start_date], ["نهاية التدريب", r.end_date], ["رقم الجوال", r.phone],
    ], [r.status, r.status === "مكتمل" ? "b-info" : r.status === "تحت الإجراء" ? "b-warn" : "b-good"],
      { form: "trainee", id: r.id, table: "trainees" })).join("");

    const side = `<div class="s-h"><h3 class="ttl-edit" data-tk="1" data-k="المحقق من المستهدف">${esc(t("المحقق من المستهدف"))}</h3></div>
      <div class="hero">${ring(pct(tr.length, target), "var(--g-700)", "من المستهدف", `${tr.length} من مستهدف ${target}`, 290)}</div>`;

    return tabbed([["ov", "نظرة عامة"], ["tt", "المتدربون"]],
      [["ov", ov], ["tt", plist("جدول المتدربين", trShown.length + " متدرب", cards, ["إضافة متدرب", "trainee"])]], side);
  }

  // طلبات تمهير
  function pageTamheer() {
    const tm = rows("tamheer");
    const target = Number((db().settings.find((s) => s.key === "tamheer_target") || {}).value || 40);
    const done = tm.filter((t) => t.status === "مكتمل").length;
    const prog = tm.filter((t) => t.status === "تحت الإجراء").length;
    const on = tm.filter((t) => t.status === "قائم").length;
    const dist = distBy(tm);

    const ov = `<div class="vgrid">
      <div class="panel"><div class="p-h"><h3 class="ttl-edit" data-tk="1" data-k="حالة طلبات تمهير">${esc(t("حالة طلبات تمهير"))}</h3><span class="hint">من إجمالي ${tm.length}</span></div>
        <div class="body">${donut([["مكتملة", done, "var(--emerald)"], ["تحت الإجراء", prog, "var(--g-600)"], ["قائم", on, "var(--g-400)"]], tm.length, "طلب", { size: 190 })}</div></div>
      <div class="panel"><div class="p-h"><h3 class="ttl-edit" data-tk="1" data-k="نسبة الإنجاز من طلبات تمهير">نسبة الإنجاز من الطلبات</h3></div>
        <div class="body">${ring(pct(done, tm.length), "var(--emerald)", "من الطلبات", `${done} مكتمل من ${tm.length}`, 200)}</div></div>
      <div class="panel" style="grid-column:1/-1"><div class="p-h"><h3 class="ttl-edit" data-tk="1" data-k="توزيع متدربي تمهير على القطاعات">${esc(t("توزيع متدربي تمهير على القطاعات"))}</h3><span class="hint">الإجمالي ${tm.length}</span></div>
        <div class="body">${colbars(dist)}</div></div></div>`;

    const tmShown = byStatus("tamheer", tm);
    const cards = statusChips("tamheer", tm, ["قائم", "تحت الإجراء", "مكتمل"]) + tmShown.map((r) => pcard(r.name, r.university, [
      ["المشرف التدريبي", r.supervisor], ["الإدارة", uname(unitById(r.unit_id))],
      ["بداية البرنامج", r.start_date], ["نهاية البرنامج", r.end_date], ["رقم الجوال", r.phone],
    ], [r.status, r.status === "مكتمل" ? "b-info" : r.status === "تحت الإجراء" ? "b-warn" : "b-good"],
      { form: "tamheer", id: r.id, table: "tamheer" })).join("");

    const side = `<div class="s-h"><h3 class="ttl-edit" data-tk="1" data-k="المحقق من مستهدف تمهير">المحقق من المستهدف</h3></div>
      <div class="hero">${ring(pct(tm.length, target), "var(--g-700)", "من المستهدف", `${tm.length} من مستهدف ${target}`, 290)}</div>`;

    return tabbed([["ov", "نظرة عامة"], ["tm", "المتقدمون"]],
      [["ov", ov], ["tm", plist("جدول طلبات تمهير", tmShown.length + " طلب", cards, ["إضافة طلب تمهير", "tamheer"])]], side);
  }

  // الاستقالات
  function pageResignations() {
    const rs = rows("resignations");
    const dist = distBy(rs);
    const grades = {};
    rs.forEach((r) => { if (r.grade) grades[r.grade] = (grades[r.grade] || 0) + 1; });
    const gsegs = Object.keys(grades).map((g, i) => [g, grades[g], PALETTE[i % PALETTE.length]]);
    const thisMonth = rs.filter((r) => Number(r.month) === new Date().getMonth() + 1).length;
    const top = dist.slice().sort((a, b) => b[1] - a[1])[0] || ["—", 0];

    const ov = `<div class="vgrid">
      <div class="panel" style="grid-column:1/-1"><div class="p-h"><h3 class="ttl-edit" data-tk="1" data-k="حسب الدرجة">${esc(t("حسب الدرجة"))}</h3></div>
        <div class="body">${gsegs.length ? donut(gsegs, rs.length, "استقالة", { size: 190 }) : '<div class="empty">لا توجد بيانات</div>'}</div></div>
      <div class="panel" style="grid-column:1/-1"><div class="p-h"><h3 class="ttl-edit" data-tk="1" data-k="توزيع الاستقالات حسب القطاع">${esc(t("توزيع الاستقالات حسب القطاع"))}</h3><span class="hint">الإجمالي ${rs.length}</span></div>
        <div class="body">${colbars(dist)}</div></div></div>`;

    const cards = rs.map((r) => pcard(r.name, r.position, [
      ["الدرجة", r.grade], ["الإدارة", uname(unitById(r.unit_id))], ["آخر يوم عمل", r.last_day], ["السبب", r.reason],
    ], null, { form: "resignation", id: r.id, table: "resignations" })).join("");

    const side = `<div class="s-h"><h3 class="ttl-edit" data-tk="1" data-k="عدد الاستقالات">${esc(t("عدد الاستقالات"))}</h3></div>
      <div class="hero"><div class="hero-circle"><span class="hero-n">${rs.length}</span><span class="hero-l">استقالة حتى اليوم</span></div>
      <div class="hero-facts"><div class="hf"><span>استقالات الشهر الحالي</span><b>${thisMonth}</b></div>
      <div class="hf"><span>أعلى قطاع</span><b>${esc(top[0])} · ${top[1]}</b></div></div></div>`;

    return tabbed([["ov", "نظرة عامة"], ["rd", "تفاصيل الاستقالات"]],
      [["ov", ov], ["rd", plist("جدول الاستقالات", rs.length + " استقالة", cards, ["تسجيل استقالة", "resignation"])]], side);
  }

  // القطاعات
  function pageSectors() {
    const nid = state.node;
    const isRoot = nid === "root";
    const a = isRoot ? aggregateAll() : aggregate(nid);
    const kids = isRoot ? roots() : childrenOf(nid);
    const name = isRoot ? t("الجهة كاملة") : uname(unitById(nid));
    const vac = a.approved - a.filled;

    const path = isRoot ? [] : pathOf(nid);
    const crumbs = `<div class="crumbs">
      ${isRoot ? '<span class="cur">الجهة كاملة</span>' : `<a onclick="APP.goNode('root')">الجهة كاملة</a><span class="sep">›</span>`}
      ${path.map((x, i) => (i === path.length - 1
        ? `<span class="cur">${esc(uname(unitById(x)))}</span>`
        : `<a onclick="APP.goNode('${jsq(x)}')">${esc(uname(unitById(x)))}</a><span class="sep">›</span>`)).join("")}
    </div>`;

    const chips = `<div class="dchips">
      <div class="dchip">${esc(t("الوظائف المعتمدة"))}<b>${a.approved}</b></div>
      <div class="dchip">${esc(t("المشغولة"))}<b>${a.filled}</b></div>
      <div class="dchip">${esc(t("الشاغرة"))}<b>${vac}</b></div>
      <div class="dchip hot">${esc(t("نسبة الإشغال"))}<b>${pct(a.filled, a.approved)}٪</b></div></div>`;

    const occ = pct(a.filled, a.approved);
    const charts = `<div class="d3">
      <div class="dbox occ"><div class="bt ttl-edit" data-k="نسبة الإشغال">${esc(t("نسبة الإشغال"))}</div>
        ${ring(occ, occ >= 90 ? "var(--emerald)" : occ >= 70 ? "var(--g-700)" : "var(--gold)", "إشغال", `${a.filled} مشغولة · ${vac} شاغرة`, 186)}</div>
      <div class="dbox"><div class="bt ttl-edit" data-k="الشواغر">${esc(t("الشواغر"))}</div>${splitbar([["مشغولة", a.filled, "var(--g-700)"], ["شاغرة", vac, "var(--g-400)"]])}</div>
      <div class="dbox"><div class="bt ttl-edit" data-k="الجنس">${esc(t("الجنس"))}</div>${splitbar([["ذكور", a.male, "var(--g-600)"], ["إناث", a.female, "var(--gold)"]])}</div></div>`;

    let ch = "";
    if (kids.length) {
      const cardsHtml = kids.map((k) => {
        const s = aggregate(k.id);
        const sub = childrenOf(k.id).length;
        const editIc = canEdit() ? `<span class="iact" title="تعديل" onclick="event.stopPropagation();APP.openForm('unit','${jsq(k.id)}')">${icon("pen")}</span>` : "";
        return `<div class="dcard" onclick="APP.goNode('${jsq(k.id)}')">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">
          <div class="dn">${esc(uname(k))}</div>${editIc}</div>
          <div class="dm"><span class="b">${s.filled}</span><span class="s">من ${s.approved} وظيفة معتمدة</span></div>
          <div class="dbar"><span style="width:${pct(s.filled, s.approved)}%"></span></div>
          <div class="dpct">إشغال ${pct(s.filled, s.approved)}٪ · شاغر ${s.approved - s.filled}${sub ? ` · ${sub} وحدات ↙` : ""}</div></div>`;
      }).join("");
      const addBtn = canEdit() ? `<button class="btn btn-p" onclick="APP.openForm('unit')">${icon("plus")} إضافة إدارة / قسم</button>` : "";
      ch = `<div style="margin-top:18px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;flex-wrap:wrap;gap:10px">
        <div class="bt ttl-edit" style="font-size:13.5px;color:var(--g-900);margin:0">${esc(t("الإدارات / الأقسام التابعة"))}</div>${addBtn}</div>
        <div class="dgrid" style="margin-bottom:0">${cardsHtml}</div></div>`;
    }

    const sub = kids.length
      ? `<div class="dsub">${state.lang === "en" ? `${kids.length} sub-units · statistics aggregated` : `يضم ${kids.length} إدارة/قسم · الإحصائيات مجمّعة على الكل`}</div>`
      : `<div class="dsub">${esc(t("وحدة تنظيمية نهائية"))}</div>`;

    return `<div class="mrow full"><div class="vhost"><div class="view show">
      ${crumbs}<div class="dhead"><h3>${esc(name)}</h3>${chips}</div>${sub}${charts}${ch}</div></div></div>`;
  }

  /* ---------------- غلاف التبويبات ---------------- */
  function tabbed(tabs, views, side) {
    const active = state.tab || tabs[0][0];
    const tb = tabs.map(([k, l]) => `<div class="ptab ${k === active ? "on" : ""}" onclick="APP.setTab('${jsq(k)}')">${esc(t(l))}</div>`).join("");
    const v = views.map(([k, html]) => `<div class="view ${k === active ? "show" : ""}" id="v-${k}">${html}</div>`).join("");
    return `<div class="ptabs">${tb}</div>
      <div class="mrow${side ? "" : " full"}"><div class="vhost">${v}</div>
      ${side ? `<div class="panel side-panel">${side}</div>` : ""}</div>`;
  }

  /* تنبيه أمني يظهر للمالك وحده — لا يراه بقية المستخدمين */
  function secWarn() {
    if (!canEditTitles() || DB.isRemote) return "";
    if (!AUTH.plaintextCodesInUse()) return "";
    return `<div class="secwarn">⚠️ رموز الدخول مكتوبة نصًا صريحًا في <code>assets/config.js</code> —
      أي شخص يفتح مصدر الصفحة يقدر يقرأها. استبدلها ببصمات من <code>tools/hash-code.html</code>.</div>`;
  }

  /* ---------------- التصدير: Excel و PDF ---------------- */
  // أعمدة كل جدول كما تُصدَّر
  const EXPORT = {
    org_units:    { title: "الهيكل التنظيمي", cols: [["name","الوحدة"],["parentName","التبعية"],["approved","المعتمدة"],["filled","المشغولة"],["vacant","الشاغرة"],["occ","نسبة الإشغال %"],["male","ذكور"],["female","إناث"]] },
    vacancies:    { title: "الوظائف الشاغرة", cols: [["title","المسمى"],["unitName","الإدارة"],["count","عدد الشواغر"],["received","الطلبات المستلمة"],["status","الحالة"],["period","الفترة"]] },
    candidates:   { title: "المرشحون", cols: [["name","الاسم"],["position","المنصب"],["unitName","الإدارة"],["stageName","المرحلة"],["note","ملاحظة"],["period","الفترة"]] },
    interviews:   { title: "المقابلات", cols: [["candidate","المرشح"],["position","المنصب"],["unitName","الإدارة"],["owner","مالك الوظيفة"],["dateTxt","التاريخ"],["day","اليوم"],["time","الوقت"],["status","الحالة"],["job_source","مصدر الوظيفة"],["cand_source","مصدر المرشح"],["hr_rating","تقييم الموارد البشرية"],["mgr_rating","تقييم الإدارة"],["period","الفترة"]] },
    onboarding:   { title: "مرحلة الانضمام", cols: [["name","الاسم"],["position","المنصب"],["grade","الدرجة"],["start_date","تاريخ المباشرة"],["notes","ملاحظات"],["period","الفترة"]] },
    trainees:     { title: "المتدربون", cols: [["name","الاسم"],["university","الجامعة"],["supervisor","المشرف"],["unitName","الإدارة"],["start_date","البداية"],["end_date","النهاية"],["phone","الجوال"],["status","الحالة"],["period","الفترة"]] },
    tamheer:      { title: "طلبات تمهير", cols: [["name","الاسم"],["university","الجامعة"],["supervisor","المشرف"],["unitName","الإدارة"],["start_date","البداية"],["end_date","النهاية"],["phone","الجوال"],["status","الحالة"],["period","الفترة"]] },
    resignations: { title: "الاستقالات", cols: [["name","الاسم"],["position","المنصب"],["grade","الدرجة"],["unitName","الإدارة"],["last_day","آخر يوم عمل"],["reason","السبب"],["period","الفترة"]] },
  };

  // يضيف الحقول المشتقة التي لا تُخزَّن (اسم الإدارة، الفترة، نسبة الإشغال…)
  function exportRow(table, r) {
    const u = unitById(r.unit_id) || {};
    const out = Object.assign({}, r, {
      unitName: u.name || "",
      period: r.year ? `${MONTHS_FULL[(Number(r.month) || 1) - 1]} ${r.year}` : "",
      stageName: STAGES[Number(r.stage)] || "",
      dateTxt: fmtDate(r.date),
    });
    if (table === "org_units") {
      const a = aggregate(r.id);
      out.parentName = (unitById(r.parent_id) || {}).name || "—";
      out.approved = a.approved; out.filled = a.filled;
      out.vacant = a.approved - a.filled;
      out.occ = pct(a.filled, a.approved);
      out.male = a.male; out.female = a.female;
    }
    return out;
  }

  // الجداول المصدَّرة، مع تطبيق الفلاتر الحالية (عدا الهيكل فيُصدَّر كاملًا)
  function exportTables() {
    return Object.keys(EXPORT).map((t) => {
      const list = t === "org_units" ? units() : rows(t);
      return { table: t, title: EXPORT[t].title, cols: EXPORT[t].cols, rows: list.map((r) => exportRow(t, r)) };
    });
  }

  function filterLabel() {
    const u = state.filters.unit ? uname(unitById(state.filters.unit)) : t("الكل");
    const m = state.filters.month ? MONTHS_FULL[state.filters.month - 1] : "كل الأشهر";
    return `${u} · ${m} ${state.filters.year}`;
  }

  function download(name, mime, text) {
    const blob = new Blob(["\ufeff" + text], { type: mime + ";charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  /* Excel — ملف SpreadsheetML بورقة لكل جدول، يفتح في Excel مباشرة */
  function exportExcel() {
    const xesc = (v) => String(v == null ? "" : v).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
    const sheets = exportTables().map(({ title, cols, rows: rs }) => {
      const head = cols.map(([, l]) => `<Cell ss:StyleID="h"><Data ss:Type="String">${xesc(l)}</Data></Cell>`).join("");
      const body = rs.map((r) => "<Row>" + cols.map(([k]) => {
        const v = r[k];
        const num = typeof v === "number" || (v !== "" && v != null && !isNaN(v) && /^-?\d+(\.\d+)?$/.test(String(v)));
        return `<Cell><Data ss:Type="${num ? "Number" : "String"}">${xesc(v)}</Data></Cell>`;
      }).join("") + "</Row>").join("");
      return `<Worksheet ss:Name="${xesc(title).slice(0, 31)}"><Table>
        <Row>${head}</Row>${body}</Table>
        <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><DisplayRightToLeft/></WorksheetOptions></Worksheet>`;
    }).join("");
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Styles><Style ss:ID="h"><Font ss:Bold="1"/><Interior ss:Color="#00584C" ss:Pattern="Solid"/>
<Font ss:Color="#FFFFFF" ss:Bold="1"/></Style></Styles>${sheets}</Workbook>`;
    download(`تقرير-استقطاب-المواهب-${new Date().toISOString().slice(0, 10)}.xls`,
      "application/vnd.ms-excel", xml);
    toast("جارٍ تنزيل ملف Excel");
  }

  /* الرسوم التي تدخل تقرير PDF — نفس دوال الرسم المستخدمة في الشاشة */
  function exportCharts() {
    const vac = rows("vacancies"), cands = rows("candidates"), ivs = rows("interviews");
    const tr = rows("trainees"), tm = rows("tamheer"), rs = rows("resignations");
    const totalVac = vac.reduce((a, v) => a + Number(v.count || 0), 0);
    const done = cands.filter((c) => c.stage >= 5).length;
    const inprog = cands.filter((c) => c.stage < 5).length;
    const cnt = (list, st) => list.filter((x) => x.status === st).length;
    const a = state.filters.unit ? aggregate(state.filters.unit) : aggregateAll();
    const vacant = a.approved - a.filled;

    const gradeSegs = (() => {
      const g = {};
      rs.forEach((r) => { if (r.grade) g[r.grade] = (g[r.grade] || 0) + 1; });
      return Object.keys(g).map((k, i) => [k, g[k], PALETTE[i % PALETTE.length]]);
    })();

    const secs = [
      ["نظرة عامة", [
        ["توزيع حالة طلبات التوظيف", donut([["شاغرة", totalVac, "var(--g-400)"], ["تحت الإجراء", inprog, "var(--g-600)"], ["مكتملة", done, "var(--g-800)"]], totalVac + inprog + done, "إجمالي", { size: 200 })],
        ["توزيع الاستقالات حسب القطاع", colbars(distBy(rs))],
      ]],
      ["المقابلات", [
        ["عدد طلبات المقابلات", donut([["مجدولة", cnt(ivs, "مجدولة"), "var(--amber)"], ["مكتملة", cnt(ivs, "تمت"), "var(--g-800)"], ["مرفوضة", cnt(ivs, "مرفوضة"), "var(--red)"]], ivs.length, "مقابلة", { size: 200 })],
        ["الوظائف الشاغرة حسب القطاع", colbars(distBy(vac, "count"))],
      ]],
      ["التدريب وتمهير", [
        ["حالة طلبات التدريب", donut([["مكتملة", cnt(tr, "مكتمل"), "var(--emerald)"], ["تحت الإجراء", cnt(tr, "تحت الإجراء"), "var(--g-600)"], ["قائم", cnt(tr, "قائم"), "var(--g-400)"]], tr.length, "طلب", { size: 190 })],
        ["حالة طلبات تمهير", donut([["مكتملة", cnt(tm, "مكتمل"), "var(--emerald)"], ["تحت الإجراء", cnt(tm, "تحت الإجراء"), "var(--g-600)"], ["قائم", cnt(tm, "قائم"), "var(--g-400)"]], tm.length, "طلب", { size: 190 })],
        ["توزيع المتدربين على القطاعات", colbars(distBy(tr))],
      ]],
      ["الاستقالات", [
        ["حسب الدرجة", gradeSegs.length ? donut(gradeSegs, rs.length, "استقالة", { size: 200 }) : ""],
      ]],
      ["الشواغر والإشغال", [
        ["نسبة الإشغال", ring(pct(a.filled, a.approved), "var(--g-700)", "إشغال", `${a.filled} مشغولة · ${vacant} شاغرة`, 210)],
        ["الشواغر", splitbar([["مشغولة", a.filled, "var(--g-700)"], ["شاغرة", vacant, "var(--g-400)"]])],
        ["الجنس", splitbar([["ذكور", a.male, "var(--g-600)"], ["إناث", a.female, "var(--gold)"]])],
      ]],
    ];

    return secs.map(([title, boxes]) => {
      const inner = boxes.filter(([, html]) => html).map(([bt, html]) =>
        `<div class="cbox"><div class="cbt">${esc(t(bt))}</div>${html}</div>`).join("");
      return inner ? `<section><h2>${esc(t(title))}</h2><div class="cgrid">${inner}</div></section>` : "";
    }).join("");
  }

  /* PDF — نافذة طباعة بصفحة مستقلة لكل جدول؛ يحفظها المتصفح PDF */
  function exportPDF() {
    const esc2 = esc;
    const sections = exportTables().map(({ title, cols, rows: rs }) => `
      <section>
        <h2>${esc2(title)}</h2>
        ${rs.length ? `<table><thead><tr>${cols.map(([, l]) => `<th>${esc2(l)}</th>`).join("")}</tr></thead>
        <tbody>${rs.map((r) => `<tr>${cols.map(([k]) => `<td>${esc2(r[k])}</td>`).join("")}</tr>`).join("")}</tbody></table>`
        : `<p class="none">لا توجد بيانات ضمن الفلاتر الحالية.</p>`}
      </section>`).join("");
    const w = window.open("", "_blank");
    if (!w) { alert("المتصفح منع فتح نافذة الطباعة — اسمح بالنوافذ المنبثقة ثم أعد المحاولة"); return; }
    const chartHTML = exportCharts();
    w.document.write(`<!doctype html><html lang="${state.lang}" dir="${state.lang === "en" ? "ltr" : "rtl"}"><head><meta charset="utf-8">
      <title>تقرير استقطاب المواهب</title><style>
      @page{size:A4 landscape;margin:14mm}
      *{box-sizing:border-box}
      body{font-family:"Noto Sans Arabic","Segoe UI",sans-serif;color:#132420;margin:0}
      header{border-bottom:3px solid #00584c;padding-bottom:10px;margin-bottom:16px}
      h1{font-size:20px;margin:0 0 4px;color:#00584c}
      .meta{font-size:12px;color:#4b5a55}
      section{break-after:page;page-break-after:always}
      section:last-child{break-after:auto;page-break-after:auto}
      h2{font-size:15px;color:#00584c;margin:0 0 10px;border-right:4px solid #00584c;padding-right:9px}
      table{width:100%;border-collapse:collapse;font-size:10.5px}
      th{background:#00584c;color:#fff;text-align:right;padding:6px 7px;font-weight:700}
      td{border-bottom:1px solid #e6efec;padding:5px 7px;text-align:right}
      tr:nth-child(even) td{background:#f4f9f8}
      .none{font-size:12px;color:#8a9a95}
      /* ألوان الهوية — تُعرَّف هنا لأن نافذة الطباعة لا ترث أنماط التطبيق */
      :root{--g-900:#003b33;--g-800:#00584c;--g-700:#016b5f;--g-600:#008b84;--g-500:#3ba295;
        --g-400:#5aaba2;--g-100:#d6e6e3;--g-50:#eef6f4;--gold:#e0a200;--emerald:#00b288;
        --amber:#e0971a;--red:#d34a4a;--ink-2:#4b5a55;--line:#e6efec;--panel:#fff;--ringtrack:#eef6f4}
      .cgrid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}
      .cbox{border:1px solid #e6efec;border-radius:12px;padding:12px 14px;break-inside:avoid}
      .cbox:only-child{grid-column:1/-1}
      .cbt{font-size:12.5px;font-weight:700;color:#00584c;margin-bottom:8px;text-align:center}
      .donut-wrap{display:flex;align-items:center;gap:20px;flex-wrap:wrap;justify-content:center}
      .legend{display:flex;flex-direction:column;gap:7px;font-size:11px;color:#4b5a55}
      .legend .it{display:flex;align-items:center;gap:7px}
      .legend .sw{width:11px;height:11px;border-radius:3px;flex:0 0 11px}
      .legend b{color:#003b33}
      .ring-wrap{display:flex;flex-direction:column;align-items:center;gap:4px}
      .ring-note{font-size:11px;color:#4b5a55;text-align:center}
      .cbars{display:flex;align-items:flex-end;justify-content:space-around;gap:8px;padding:8px 4px 0;min-height:190px}
      .cb{display:flex;flex-direction:column;align-items:center;gap:6px;flex:1;min-width:0}
      .cb .cbv{font-weight:800;font-size:12px;color:#00584c}
      .cb .cbcol{width:30px;border-radius:7px 7px 3px 3px}
      .cb .cbl{font-size:9px;color:#4b5a55;text-align:center;line-height:1.3;min-height:26px}
      .split{display:flex;height:28px;border-radius:8px;overflow:hidden;border:1px solid #e6efec}
      .split i{display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:800;font-style:normal}
      .slg{display:flex;justify-content:center;gap:14px;margin-top:8px;font-size:10.5px;color:#4b5a55}
      .slg .i{display:flex;align-items:center;gap:5px}
      .slg .sw{width:9px;height:9px;border-radius:3px}
      </style></head><body>
      <header><h1>تقرير متابعة إدارة استقطاب المواهب</h1>
      <div class="meta">${esc2(CFG.ORG_NAME || "")} · ${esc2(filterLabel())} · صدر في ${esc(fmtDate(new Date().toISOString().slice(0, 10)))}</div></header>
      ${chartHTML}${sections}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 600);
  }

  /* ---------------- الهيكل العام ---------------- */
  function shell(title, body) {
    const nav = [["index", "الرئيسية", "home"], ["recruitment", "التوظيف", "users"], ["training", "التدريب", "cap"],
    ["tamheer", "طلبات تمهير", "group"], ["resignations", "الاستقالات", "exit"], ["sectors", "القطاعات", "office"]];
    const rail = nav.map(([p, tt, ic]) => `<a href="#/${p === "index" ? "" : p}" class="${state.page === p ? "on" : ""}"><span class="tip">${esc(t(tt))}</span>${icon(ic)}</a>`).join("");

    const unitOpts = `<option value="">${esc(t("الكل"))}</option>` + units().map((u) =>
      `<option value="${esc(u.id)}" ${state.filters.unit === u.id ? "selected" : ""}>${esc((u.parent_id ? "— " : "") + uname(u))}</option>`).join("");
    const yearOpts = (CFG.YEARS || [2026]).map((y) => `<option value="${y}" ${Number(state.filters.year) === y ? "selected" : ""}>${y}</option>`).join("");
    const monthOpts = `<option value="0">${esc(t("كل الأشهر"))}</option>` + MONTHS_FULL.map((m, i) =>
      `<option value="${i + 1}" ${Number(state.filters.month) === i + 1 ? "selected" : ""}>${esc(state.lang === "en" ? MONTHS_EN[i] : m)}</option>`).join("");

    const editBtn = canEditTitles() ? `<button class="btn btn-g" onclick="APP.toggleEdit()">${icon("pen")} ${esc(t("تعديل العناوين"))}</button>` : "";
    const today = new Date();
    const dateTxt = `${today.getDate()} ${state.lang === "en" ? MONTHS_EN[today.getMonth()] : MONTHS_FULL[today.getMonth()]} ${today.getFullYear()}`;

    return `<div class="shell"><div class="board">
      <div class="rail">${rail}</div>
      <div class="content">
        <div class="chead">
          <div class="ttl"><img class="hlogo" src="assets/adaa-logo.png" alt="أداء"><div class="div"></div>
            <div><h1>${esc(title)}</h1><div class="crumb">${esc(CFG.ORG_NAME || "")}</div></div></div>
          <div class="who"><div class="meta"><div class="nm">${esc(state.user.name)}</div>
            <div class="rl">${esc(t(ROLE_LABEL[state.user.role] || ""))}</div></div>
            <div class="av">${esc((state.user.name || "?").trim()[0])}</div>
            <button class="iact logout" title="${esc(t("تسجيل الخروج"))}" onclick="APP.logout()">${icon("logout")}</button></div>
        </div>
        <div class="toolbar">
          <label class="tb sel-wrap"><span class="k">${esc(t("القطاع / الإدارة"))}</span>
            <select onchange="APP.setFilter('unit',this.value)">${unitOpts}</select>${CHEV}</label>
          <label class="tb sel-wrap"><span class="k">${esc(t("السنة"))}</span>
            <select onchange="APP.setFilter('year',this.value)">${yearOpts}</select>${CHEV}</label>
          <label class="tb sel-wrap"><span class="k">${esc(t("الشهر"))}</span>
            <select onchange="APP.setFilter('month',this.value)">${monthOpts}</select>${CHEV}</label>
          <div class="sp"></div>
          <button class="btn btn-g" onclick="APP.toggleLang()" title="Arabic / English">${icon("globe")} ${state.lang === "en" ? "عربي" : "EN"}</button>
          <button class="btn btn-g" onclick="APP.exportExcel()" title="تصدير كل الجداول إلى Excel">${icon("sheet")} Excel</button>
          <button class="btn btn-g" onclick="APP.exportPDF()" title="تصدير التقرير PDF — صفحة لكل جدول">${icon("file")} PDF</button>
${editBtn}
          <div class="tb">📅 <b>${dateTxt}</b></div>
        </div>
        ${body}
      </div></div>
      ${secWarn()}
      <div class="foot">${esc(t(DB.isRemote ? "متصل بقاعدة البيانات" : "وضع تجريبي محلي — البيانات محفوظة في هذا المتصفح"))}</div>
      <div class="editbar"><span>وضع تعديل العناوين مُفعّل — اضغط على أي عنوان وعدّله</span>
        <button class="btn btn-p" onclick="APP.saveTitles()">حفظ التعديلات</button>
        <button class="btn btn-x" onclick="APP.toggleEdit()">إلغاء</button></div>
      <div class="mask" id="formMask"><div class="sheet" id="formSheet"></div></div>
    </div>`;
  }

  /* ---------------- النماذج ---------------- */
  const unitSelect = (val) => units().map((u) => `<option value="${esc(u.id)}" ${val === u.id ? "selected" : ""}>${esc((u.parent_id ? "— " : "") + uname(u))}</option>`).join("");
  const opts = (arr, val) => arr.map((o) => `<option value="${esc(o)}" ${String(val) === String(o) ? "selected" : ""}>${esc(o)}</option>`).join("");

  const FORMS = {
    interview: {
      table: "interviews", title: "بيانات المقابلة",
      fields: (r) => [
        ["candidate", "اسم المرشح", "text", r.candidate, null, false],
        ["position", "المنصب", "text", r.position, null, false],
        ["unit_id", "الإدارة", "select", r.unit_id, unitSelect(r.unit_id), false],
        ["owner", "مالك الوظيفة", "text", r.owner, null, false],
        ["date", "التاريخ", "date", r.date, null, false],
        ["time", "الوقت", "time", r.time, null, false],
        ["status", "الحالة", "select", r.status, opts(["مجدولة", "تمت", "مرفوضة"], r.status), false],
        ["job_source", "مصدر الوظيفة", "select", r.job_source, opts(["توظيف مباشر", "إعلان داخلي", "إعلان خارجي", "منصة توظيف"], r.job_source), false],
        ["cand_source", "مصدر المرشح", "select", r.cand_source, opts(["لينكدإن", "توصية", "أخرى"], r.cand_source), false],
        ["cand_source_name", "اسم مصدر المرشح", "text", r.cand_source_name, null, false],
        ["hr_rating", "تقييم الموارد البشرية", "select", r.hr_rating, opts(["", "ممتاز", "جيد جدًا", "جيد", "مقبول", "ضعيف"], r.hr_rating), false],
        ["mgr_rating", "تقييم الإدارة", "select", r.mgr_rating, opts(["", "ممتاز", "جيد جدًا", "جيد", "مقبول", "ضعيف"], r.mgr_rating), false],
      ],
    },
    candidate: {
      table: "candidates", title: "المرشح والمرحلة",
      fields: (r) => [
        ["name", "اسم المرشح", "text", r.name, null, false],
        ["position", "المنصب", "text", r.position, null, false],
        ["unit_id", "الإدارة", "select", r.unit_id, unitSelect(r.unit_id), false],
        ["stage", "المرحلة الحالية", "select", r.stage == null ? 0 : r.stage,
          STAGES.map((s, i) => `<option value="${i}" ${Number(r.stage) === i ? "selected" : ""}>${s}</option>`).join(""), false],
        ["note", "آخر تحديث / ملاحظة", "text", r.note, null, true],
      ],
    },
    onboarding: {
      table: "onboarding", title: "مرحلة الانضمام",
      fields: (r) => [
        ["name", "اسم المرشح", "text", r.name, null, false],
        ["position", "المنصب", "text", r.position, null, false],
        ["grade", "الدرجة", "select", r.grade, opts(["الخامسة", "السادسة", "السابعة", "الثامنة", "التاسعة", "العاشرة"], r.grade), false],
        ["start_date", "تاريخ المباشرة", "text", r.start_date, null, false],
        ["notes", "الملاحظات", "text", r.notes, null, true],
      ],
    },
    trainee: {
      table: "trainees", title: "بيانات المتدرب",
      fields: (r) => [
        ["name", "اسم المتدرب", "text", r.name, null, false],
        ["university", "الجامعة", "text", r.university, null, false],
        ["supervisor", "المشرف التدريبي", "text", r.supervisor, null, false],
        ["unit_id", "القطاع / الإدارة", "select", r.unit_id, unitSelect(r.unit_id), false],
        ["start_date", "بداية التدريب", "text", r.start_date, null, false],
        ["end_date", "نهاية التدريب", "text", r.end_date, null, false],
        ["phone", "رقم الجوال", "text", r.phone, null, false],
        ["status", "حالة التدريب", "select", r.status, opts(["قائم", "تحت الإجراء", "مكتمل"], r.status), false],
      ],
    },
    tamheer: {
      table: "tamheer", title: "بيانات طلب تمهير",
      fields: (r) => [
        ["name", "اسم المتقدم", "text", r.name, null, false],
        ["university", "الجامعة", "text", r.university, null, false],
        ["supervisor", "المشرف التدريبي", "text", r.supervisor, null, false],
        ["unit_id", "القطاع / الإدارة", "select", r.unit_id, unitSelect(r.unit_id), false],
        ["start_date", "بداية البرنامج", "text", r.start_date, null, false],
        ["end_date", "نهاية البرنامج", "text", r.end_date, null, false],
        ["phone", "رقم الجوال", "text", r.phone, null, false],
        ["status", "حالة الطلب", "select", r.status, opts(["قائم", "تحت الإجراء", "مكتمل"], r.status), false],
      ],
    },
    resignation: {
      table: "resignations", title: "بيانات الاستقالة",
      fields: (r) => [
        ["name", "الاسم", "text", r.name, null, false],
        ["position", "المنصب", "text", r.position, null, false],
        ["grade", "الدرجة", "select", r.grade, opts(["الخامسة", "السادسة", "السابعة", "الثامنة", "التاسعة", "العاشرة"], r.grade), false],
        ["unit_id", "القطاع / الإدارة", "select", r.unit_id, unitSelect(r.unit_id), false],
        ["last_day", "آخر يوم عمل", "text", r.last_day, null, false],
        ["reason", "السبب (اختياري)", "text", r.reason, null, true],
      ],
    },
    unit: {
      table: "org_units", title: "إدارة / قسم",
      noPeriod: true,
      fields: (r) => [
        ["name", "اسم الإدارة / القسم", "text", r.name, null, true],
        ["parent_id", "التبعية", "select", r.parent_id, `<option value="">— بلا تبعية (قطاع رئيسي)</option>` + unitSelect(r.parent_id), false],
        ["approved", "الوظائف المعتمدة", "number", r.approved, null, false],
        ["filled", "الوظائف المشغولة", "number", r.filled, null, false],
        ["male", "عدد الذكور", "number", r.male, null, false],
        ["female", "عدد الإناث", "number", r.female, null, false],
      ],
    },
  };

  function openForm(kind, id) {
    if (!canEdit()) return;
    const F = FORMS[kind];
    const row = id ? (db()[F.table] || []).find((r) => r.id === id) || {} : {};
    const fh = F.fields(row).map(([k, lbl, type, val, sel, full]) => {
      const inp = sel != null
        ? `<select class="inp" data-k="${esc(k)}">${sel}</select>`
        : `<input class="inp" data-k="${esc(k)}" type="${esc(type)}" value="${esc(val == null ? "" : val)}"
             ${type === "date" ? 'lang="ar-u-ca-gregory"' : ""} placeholder="${esc(t("اكتب هنا…"))}">`;
      return `<div class="fld2 ${full ? "full" : ""}"><label>${esc(t(lbl))}</label>${inp}</div>`;
    }).join("");

    const period = F.noPeriod ? "" : `
      <div class="fld2"><label>السنة</label><select class="inp" data-k="year">
        ${(CFG.YEARS || [2026]).map((y) => `<option value="${y}" ${Number(row.year || state.filters.year) === y ? "selected" : ""}>${y}</option>`).join("")}
      </select></div>
      <div class="fld2"><label>الشهر</label><select class="inp" data-k="month">
        ${MONTHS_FULL.map((m, i) => `<option value="${i + 1}" ${Number(row.month || new Date().getMonth() + 1) === i + 1 ? "selected" : ""}>${m}</option>`).join("")}
      </select></div>`;

    $("#formSheet").innerHTML = `
      <div class="sheet-h"><h3>${esc(t(id ? "تعديل" : "إضافة"))} — ${esc(t(F.title))}</h3>
        <button class="xbtn" onclick="APP.closeForm()">✕</button></div>
      <div class="sheet-b"><div class="frm">${fh}${period}</div></div>
      <div class="sheet-f"><button class="btn btn-p" onclick="APP.saveForm('${jsq(kind)}','${jsq(id || "")}')">${icon("check")} حفظ</button>
        <button class="btn btn-x" onclick="APP.closeForm()">إلغاء</button></div>`;
    $("#formMask").classList.add("open");
  }

  async function saveForm(kind, id) {
    const F = FORMS[kind];
    const payload = {};
    $("#formSheet").querySelectorAll("[data-k]").forEach((el) => {
      let v = el.value;
      if (el.type === "number" || ["stage", "year", "month", "approved", "filled", "junior", "senior", "male", "female"].includes(el.dataset.k)) {
        v = v === "" ? null : Number(v);
      }
      payload[el.dataset.k] = v;
    });
    if (kind === "interview") payload.day = dayOf(payload.date);  // اليوم يتبع التاريخ دائمًا
    try {
      if (id) await DB.update(F.table, id, payload);
      else await DB.insert(F.table, payload);
      closeForm();
      render();
      toast(id ? "تم حفظ التعديلات" : "تمت الإضافة بنجاح");
    } catch (e) {
      alert("تعذّر الحفظ: " + e.message);
    }
  }

  async function removeRow(table, id) {
    if (!confirm("هل تريد حذف هذا السجل؟")) return;
    try { await DB.remove(table, id); render(); toast("تم الحذف"); }
    catch (e) { alert("تعذّر الحذف: " + e.message); }
  }

  const closeForm = () => $("#formMask") && $("#formMask").classList.remove("open");

  function toast(msg) {
    let t = $(".toast");
    if (!t) { t = document.createElement("div"); t.className = "toast"; document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 2200);
  }

  /* ---------------- تعديل العناوين ---------------- */
  function toggleEdit() {
    if (!canEditTitles()) return;
    state.edit = !state.edit;
    document.body.classList.toggle("edit", state.edit);
    document.querySelectorAll(".ttl-edit, .chead h1, .dhead h3").forEach((el) => {
      el.classList.toggle("editable", state.edit);
      el.contentEditable = state.edit ? "true" : "false";
    });
  }
  async function saveTitles() {
    const map = {};
    document.querySelectorAll(".ttl-edit").forEach((el) => { if (el.dataset.k) map[el.dataset.k] = el.textContent.trim(); });
    try {
      const rec = (db().settings || []).find((s) => s.key === "titles");
      if (rec) await DB.update("settings", rec.id, { value: JSON.stringify(map) });
      else await DB.insert("settings", { key: "titles", value: JSON.stringify(map) });
      toast("تم حفظ العناوين");
    } catch (e) { alert("تعذّر الحفظ: " + e.message); }
    toggleEdit();
  }
  function applyTitles() {
    if (state.lang !== "ar") return;   // مفاتيح العناوين المحفوظة عربية
    let map = {};
    try { map = JSON.parse(((db().settings || []).find((s) => s.key === "titles") || {}).value || "{}"); } catch (e) {}
    document.querySelectorAll(".ttl-edit").forEach((el) => {
      const k = el.dataset.k;
      if (k && map[k]) el.textContent = map[k];
    });
  }

  /* ---------------- اللغة: عربي / English ---------------- */
  const STR = {
    // التنقل والصفحات
    "الرئيسية": "Home", "التوظيف": "Recruitment", "التدريب": "Training",
    "طلبات تمهير": "Tamheer Requests", "الاستقالات": "Resignations", "القطاعات": "Departments",
    "اللوحة الرئيسية": "Dashboard",
    // شريط الأدوات
    "القطاع / الإدارة": "Department", "السنة": "Year", "الشهر": "Month",
    "الكل": "All", "كل الأشهر": "All months", "تعديل العناوين": "Edit titles",
    // الصلاحيات
    "مالك الداشبورد": "Dashboard owner", "مُدخِل بيانات": "Data entry", "عرض فقط": "View only",
    "تسجيل الخروج": "Sign out",
    // بطاقات ولوحات
    "طلبات التوظيف المستلمة": "Applications received", "طلبات التدريب": "Training requests",
    "توزيع حالة طلبات التوظيف": "Recruitment requests by status",
    "توزيع حالة طلبات التدريب": "Training requests by status",
    "توزيع حالة طلبات تمهير": "Tamheer requests by status",
    "توزيع الاستقالات حسب القطاع": "Resignations by department",
    "عدد طلبات المقابلات": "Interview requests", "قيد الإجراء": "In progress", "المكتملة": "Completed",
    "وظائف قيد الإجراء": "Positions in progress", "المكتمل": "Completed", "متبقٍ": "remaining",
    "مصادر المرشحين": "Candidate sources", "مرشح": "candidates",
    "لينكدإن": "LinkedIn", "توصية": "Referral", "أخرى": "Other",
    "الوظائف الشاغرة حسب القطاع": "Vacancies by department",
    "نظرة عامة": "Overview", "المقابلات": "Interviews", "مراحل التوظيف": "Recruitment stages",
    "المتدربون": "Trainees", "المتقدمون": "Applicants", "تفاصيل الاستقالات": "Resignation details",
    "حالة طلبات التدريب": "Training requests status", "حالة طلبات تمهير": "Tamheer requests status",
    "نسبة الإنجاز من الطلبات": "Completion rate", "المحقق من المستهدف": "Achieved vs target",
    "توزيع المتدربين على القطاعات": "Trainees by department",
    "توزيع متدربي تمهير على القطاعات": "Tamheer trainees by department",
    "حسب الدرجة": "By grade", "عدد الاستقالات": "Resignations count",
    "نسبة الإشغال": "Occupancy rate", "الشواغر": "Positions", "الجنس": "Gender",
    // جداول وأزرار
    "جدول المقابلات": "Interviews table", "مرحلة الانضمام": "Onboarding",
    "جدول المتدربين": "Trainees table", "جدول طلبات تمهير": "Tamheer requests table",
    "جدول الاستقالات": "Resignations table",
    "إضافة مقابلة": "Add interview", "إضافة مرشح": "Add candidate", "إضافة منضم": "Add onboarding",
    "إضافة متدرب": "Add trainee", "إضافة طلب تمهير": "Add Tamheer request",
    "تسجيل استقالة": "Record resignation", "إضافة إدارة / قسم": "Add unit",
    "تحديث المرحلة": "Update stage", "حفظ": "Save", "إلغاء": "Cancel",
    "تعديل": "Edit", "حذف": "Delete",
    // الهيكل
    "الجهة كاملة": "Entire organization", "الوظائف المعتمدة": "Approved positions",
    "المشغولة": "Filled", "الشاغرة": "Vacant", "مشغولة": "Filled", "شاغرة": "Vacant",
    "ذكور": "Male", "إناث": "Female", "الإدارات / الأقسام التابعة": "Sub-units",
    "وحدة تنظيمية نهائية": "Leaf unit", "إشغال": "occupancy",
    // الحالات والمراحل
    "مجدولة": "Scheduled", "تمت": "Completed", "مرفوضة": "Rejected",
    "قائم": "Active", "تحت الإجراء": "In progress", "مكتمل": "Completed", "مكتملة": "Completed",
    "المقابلة": "Interview", "العرض الأولي": "Initial offer", "المسح الأمني": "Security screening",
    "الفحص الطبي": "Medical exam", "العرض النهائي": "Final offer", "الانضمام": "Onboarding",
    // رسائل
    "لا توجد بيانات مطابقة للفلاتر الحالية": "No records match the current filters",
    "لا يوجد مرشحون في هذه المرحلة": "No candidates at this stage",
    "لا توجد بيانات": "No data", "الباقي": "Remaining", "الإجمالي": "Total", "إجمالي": "Total",
    "من إجمالي": "of", "من": "of", "طلب": "requests", "مقابلة": "interviews",
    "متدرب": "trainees", "استقالة": "resignations", "منضم": "onboarding",
    "عرض كل المراحل": "Show all stages", "اعرض من في هذه المرحلة": "Show candidates at this stage",
    "وضع تجريبي محلي — البيانات محفوظة في هذا المتصفح": "Local demo mode — data stored in this browser",
    "متصل بقاعدة البيانات": "Connected to the database",
  };
  // t() يترجم عند اختيار الإنجليزية، ويعيد النص كما هو إن لم توجد ترجمة
  function t(x) {
    if (state.lang !== "en") return x;
    return Object.prototype.hasOwnProperty.call(STR, x) ? STR[x] : x;
  }
  // اسم الوحدة بلغة العرض
  function uname(u) {
    if (!u) return "";
    return state.lang === "en" ? (u.name_en || u.name) : u.name;
  }
  function applyLang(lang) {
    state.lang = lang === "en" ? "en" : "ar";
    const en = state.lang === "en";
    document.documentElement.setAttribute("lang", en ? "en" : "ar");
    document.documentElement.setAttribute("dir", en ? "ltr" : "rtl");
    try { localStorage.setItem("adaa_hr_lang", state.lang); } catch (e) {}
  }
  function initLang() {
    let saved = null;
    try { saved = localStorage.getItem("adaa_hr_lang"); } catch (e) {}
    applyLang(saved || "ar");
  }

  /* ---------------- التوجيه والعرض ---------------- */
  const PAGES = {
    index: { title: "اللوحة الرئيسية", render: pageIndex },
    recruitment: { title: "التوظيف", render: pageRecruitment },
    training: { title: "التدريب", render: pageTraining },
    tamheer: { title: "طلبات تمهير", render: pageTamheer },
    resignations: { title: "الاستقالات", render: pageResignations },
    sectors: { title: "القطاعات", render: pageSectors },
  };

  function readHash() {
    const h = (location.hash || "#/").replace(/^#\/?/, "").split("/")[0];
    state.page = PAGES[h] ? h : "index";
  }

  function render() {
    const P = PAGES[state.page];
    document.getElementById("app").innerHTML = shell(t(P.title), P.render());
    document.title = t(P.title) + " · " + (state.lang === "en" ? "Adaa" : "أداء");
    applyTitles();
    if (state.edit) { state.edit = false; toggleEdit(); }
  }

  /* ---------------- الدخول ---------------- */
  function loginScreen(msg) {
    const demo = !DB.isRemote;
    document.getElementById("app").innerHTML = `
      <div class="login-wrap"><div class="login-card">
        <img src="assets/adaa-logo.png" alt="أداء" class="login-logo">
        <h2>متابعة إدارة استقطاب المواهب</h2>
        <p class="login-sub">${demo ? "أدخل اسمك ورمز الدخول" : "سجّل الدخول بحساب المركز"}</p>
        ${msg ? `<div class="login-err">${esc(msg)}</div>` : ""}
        ${demo ? `
          <div class="fld2 full"><label>الاسم</label>
            <input class="inp" id="dname" placeholder="مثال: أحمد الغانم" autocomplete="name"></div>
          <div class="fld2 full"><label>رمز الدخول</label>
            <input class="inp code-inp" id="dcode" type="password" inputmode="numeric" maxlength="32"
              placeholder="••••••••••" autocomplete="off"></div>
          <button class="btn btn-p login-btn" onclick="APP.demoLogin()">دخول</button>`
        : `
          <div class="fld2 full"><label>البريد الإلكتروني</label>
            <input class="inp" id="email" type="email" placeholder="name@adaa.gov.sa" autocomplete="username"></div>
          <div class="fld2 full"><label>كلمة المرور</label>
            <input class="inp" id="pass" type="password" placeholder="••••••••" autocomplete="current-password"></div>
          <button class="btn btn-p login-btn" onclick="APP.login()">تسجيل الدخول</button>`}
      </div></div>`;
    const first = document.getElementById(demo ? "dname" : "email");
    if (first) {
      first.focus();
      document.querySelectorAll(".login-card .inp").forEach((el) => {
        el.addEventListener("keydown", (e) => { if (e.key === "Enter") (demo ? APP.demoLogin() : APP.login()); });
      });
    }
  }

  /* ---------------- الواجهة العامة ---------------- */
  window.APP = {
    setTab(k) { state.tab = k; render(); },
    setStage(i) { state.stage = state.stage === i ? null : i; render(); },
    exportExcel, exportPDF,
    toggleLang() { applyLang(state.lang === "en" ? "ar" : "en"); render(); },
    setStatus(key, v) { state.status[key] = v || null; render(); },
    goNode(id) { state.node = id; state.filters.unit = id === "root" ? "" : id; render(); },
    setFilter(k, v) {
      state.filters[k] = k === "unit" ? v : Number(v);
      if (k === "unit") state.node = v || "root";   // شجرة القطاعات تتبع الاختيار
      render();
    },
    toggleEdit, saveTitles, openForm, saveForm, closeForm, removeRow,
    async demoLogin() {
      const name = document.getElementById("dname").value.trim();
      const code = document.getElementById("dcode").value.trim();
      if (!name) return loginScreen("فضلًا أدخل الاسم");
      if (!code) return loginScreen("فضلًا أدخل رمز الدخول");
      const btn = $(".login-btn");
      if (btn) { btn.disabled = true; btn.textContent = "جارٍ التحقق…"; }
      try { state.user = await AUTH.demoSignIn(name, code); }
      catch (e) { return loginScreen(e.message); }
      await boot();
    },
    async login() {
      try {
        state.user = await AUTH.signIn(document.getElementById("email").value.trim(), document.getElementById("pass").value);
        await boot();
      } catch (e) { loginScreen(e.message); }
    },
    async logout() { await AUTH.signOut(); state.user = null; loginScreen(); },
  };

  async function boot() {
    try {
      await DB.loadAll();
      readHash();
      render();
    } catch (e) {
      loginScreen("تعذّر تحميل البيانات: " + e.message);
    }
  }

  window.addEventListener("hashchange", () => { if (state.user) { state.tab = null; readHash(); render(); } });

  (async function init() {
    initLang();
    state.user = await AUTH.current();
    if (state.user) await boot();
    else loginScreen();
  })();
})();
