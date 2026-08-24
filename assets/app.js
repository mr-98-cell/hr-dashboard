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
  /* مراحل الوظيفة — «شاغرة» أولها: وظيفة فُتحت ولم يدخلها مرشح بعد.
     الوظيفة عند «الانضمام» تُعدّ مشغولة وتخرج من الشواغر. */
  const STAGES = ["شاغرة", "المقابلة", "العرض الأولي", "المسح الأمني", "الفحص الطبي", "العرض النهائي", "الانضمام"];
  const JOINED = STAGES.length - 1;              // مؤشّر مرحلة الانضمام
  const TR_STAGES = ["مقابلات", "موافقة", "الانضمام", "مكتمل", "منتهي"]; // التدريب وتمهير
  const TR_JOINED = 2;   // من بلغ «الانضمام» فما بعده باشر التدريب فعلًا
  const RS_STAGES = ["الإشعار", "منتهي"];                          // الاستقالات
  const PALETTE = ["var(--g-800)", "var(--emerald)", "var(--g-700)", "var(--g-600)", "var(--g-500)", "var(--gold)", "var(--g-400)"];
  // ألوان الحلقة الجذرية في المخطط الشعاعي — ثمانية متمايزة ضمن الهوية
  const ORG_COLORS = ["#00584c", "#00b288", "#016b5f", "#e0a200", "#008b84", "#3ba295", "#0e7c9b", "#5aaba2"];

  const state = {
    page: "index",
    tab: null,
    node: "root",
    user: null,
    filters: { unit: "", year: 2026, month: 0 }, // month=0 يعني كل الأشهر
    lang: "ar",
    occSort: "asc",  // ترتيب الإشغال: asc = الأدنى أولًا
    scope: "all",  // محتوى تقرير PDF: الكل أو قسم بعينه
    openNodes: {}, // فروع الشجرة المفتوحة في تبويب القطاعات
    onbUnit: "",   // الإدارة المختارة في تبويب الانضمام
    orgFocus: "",  // الوحدة في مركز المخطط الشعاعي
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
    // مستند بزاوية مطوية وشريط وسم في أسفله
    file: '<path d="M13.5 2.5H7A1.5 1.5 0 0 0 5.5 4v16A1.5 1.5 0 0 0 7 21.5h10a1.5 1.5 0 0 0 1.5-1.5V7.5z"/><path d="M13.5 2.5v5h5"/><path d="M8.5 11.5h4"/><rect x="8" y="14.5" width="8" height="4" rx="1.3"/>',
    // أيقونات حالات الطلبات
    stack: '<path d="M12 3.5 20.5 8 12 12.5 3.5 8z"/><path d="m3.5 12 8.5 4.5 8.5-4.5"/><path d="m3.5 16 8.5 4.5 8.5-4.5"/>',
    live: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    prog: '<path d="M7 3.5h10M7 20.5h10"/><path d="M8 3.5v3.2c0 2 4 3.4 4 5.3s-4 3.3-4 5.3v3.2"/><path d="M16 3.5v3.2c0 2-4 3.4-4 5.3s4 3.3 4 5.3v3.2"/>',
    done: '<circle cx="12" cy="12" r="8.5"/><path d="m8.2 12.2 2.6 2.6L15.8 9.8"/>',
    reject: '<circle cx="12" cy="12" r="8.5"/><path d="m9.2 9.2 5.6 5.6M14.8 9.2l-5.6 5.6"/>',
    cal: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 9.5h17M8 3.5V6.5M16 3.5V6.5"/>',
    bell: '<path d="M6.5 10a5.5 5.5 0 0 1 11 0c0 4 1.5 5.5 1.5 5.5h-14S6.5 14 6.5 10z"/><path d="M10.2 19a2 2 0 0 0 3.6 0"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18z"/>',
  };
  const icon = (n) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[n] || ""}</svg>`;
  const CHEV = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>';

  /* ---------------- الهيكل التنظيمي ---------------- */
  function units() { return db().org_units || []; }
  function unitById(id) { return units().find((u) => u.id === id); }
  function childrenOf(id) { return units().filter((u) => (u.parent_id || null) === (id || null)); }
  function roots() { return childrenOf(null); }

  /* الوظائف المفتوحة (لم تبلغ الانضمام) داخل وحدة وكل ما تحتها.
     هي مصدر «الشاغرة» الآن — لم تعد رقمًا يُكتب يدويًا. */
  function openJobsIn(id) {
    return (db().jobs || []).filter((j) =>
      Number(j.stage) < JOINED && j.unit_id && (id ? pathOf(j.unit_id).includes(id) : true)).length;
  }

  /* المعتمدة تُدخَل يدويًا على الوحدة، والشاغرة تُشتق من الوظائف،
     والمشغولة = المعتمدة − الشاغرة. */
  function aggregate(id) {
    const t = { approved: 0, junior: 0, senior: 0, male: 0, female: 0 };
    const kids = childrenOf(id);
    if (!kids.length) {
      const u = unitById(id);
      if (u) for (const k in t) t[k] = Number(u[k] || 0);
    } else {
      for (const k of kids) {
        const s = aggregate(k.id);
        for (const key in t) t[key] += s[key];
      }
    }
    t.vacant = openJobsIn(id);
    t.filled = Math.max(0, t.approved - t.vacant);
    return t;
  }
  function aggregateAll() {
    const t = { approved: 0, junior: 0, senior: 0, male: 0, female: 0 };
    for (const r of roots()) {
      const s = aggregate(r.id);
      for (const k in t) t[k] += s[k];
    }
    t.vacant = openJobsIn(null);
    t.filled = Math.max(0, t.approved - t.vacant);
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
  // ترتيب شجرة القطاعات داخل «نظرة عامة»: true = فوق الرسوم
  const ORG_FIRST = false;

  const STATUS_ICON = {
    "": "stack",
    "قائم": "live", "تحت الإجراء": "prog", "مكتمل": "done",
    "مجدولة": "cal", "تمت": "done", "مرفوضة": "reject",
  };
  function statusChips(key, list, statuses) {
    const cur = state.status[key] || "";
    const chip = (val, label, n) =>
      `<div class="sc i-${STATUS_ICON[val] || "stack"}${cur === val ? " on" : ""}" onclick="APP.setStatus('${jsq(key)}','${jsq(val)}')"
        ><span class="ci">${icon(STATUS_ICON[val] || "stack")}</span
        ><span class="cl">${esc(t(label))}</span><b>${n}</b></div>`;
    return `<div class="statchips">${chip("", "الكل", list.length)}
      ${statuses.map((st) => chip(st, st, list.filter((r) => r.status === st).length)).join("")}</div>`;
  }
  const byStatus = (key, list) => (state.status[key] ? list.filter((r) => r.status === state.status[key]) : list);

  /* ---------------- بطاقات الأشخاص ---------------- */
  function pcard(name, pos, metas, badge, act, onName) {
    const m = metas.filter(([k, v]) => v && v !== "—")
      .map(([k, v]) => `<div class="mi"><span class="k">${esc(t(k))}</span><span class="v">${esc(t(v))}</span></div>`).join("");
    const b = badge ? `<span class="badge ${badge[1]}">${esc(t(badge[0]))}</span>` : "";
    const acts = act && canEdit()
      ? `<span class="iact" title="${esc(t("تعديل"))}" onclick="APP.openForm('${jsq(act.form)}','${jsq(act.id)}')">${icon("pen")}</span>
         <span class="iact del" title="${esc(t("حذف"))}" onclick="APP.removeRow('${jsq(act.table)}','${jsq(act.id)}')">${icon("trash")}</span>` : "";
    const nm = onName
      ? `<div class="pn link" title="${esc(t("اعرض من في هذه المرحلة"))}" onclick="${onName}">${esc(name)}</div>`
      : `<div class="pn">${esc(name)}</div>`;
    return `<div class="prow"><div class="pav">${esc((name || "?").trim()[0])}</div>
      <div class="pid">${nm}<div class="pp">${esc(pos)}</div></div>
      <div class="pmeta">${m}</div><div class="pend hact">${b}${acts}</div></div>`;
  }

  function plist(title, chip, cards, add) {
    const a = add && canEdit() ? `<button class="btn btn-p" onclick="APP.openForm('${jsq(add[1])}')">${icon("plus")} ${esc(t(add[0]))}</button>` : "";
    // chip فارغ = لا شارة عدد (بطاقات الحالات فوق الجدول تغني عنها)
    const c = chip ? `<span class="chip2">${esc(chip)}</span>` : "";
    return `<div class="card"><div class="tbl-h"><h3 class="ttl-edit" data-tk="1" data-k="${esc(title)}">${esc(t(title))}</h3>
      <div class="hact">${c}${a}</div></div>
      <div class="plist">${cards || `<div class="empty">${esc(t("لا توجد بيانات مطابقة للفلاتر الحالية"))}</div>`}</div></div>`;
  }

  /* ---------------- الصفحات ---------------- */
  /* ---------------- الملخّص التنفيذي ---------------- */
  const TODAY = new Date().toISOString().slice(0, 10);
  // الشهر المرجعي: المختار من الفلتر، وإلا الشهر الجاري
  function refMonth() {
    const y = Number(state.filters.year) || new Date().getFullYear();
    const m = Number(state.filters.month) || (new Date().getFullYear() === y ? new Date().getMonth() + 1 : 12);
    return { y: y, m: m };
  }
  const prevMonth = (y, m) => (m > 1 ? { y: y, m: m - 1 } : { y: y - 1, m: 12 });
  // سجلات جدول في شهر بعينه، مع احترام فلتر الإدارة
  function inMonth(table, y, m) {
    return (db()[table] || []).filter((r) => Number(r.year) === y && Number(r.month) === m && inUnit(r));
  }

  function kpiTile(label, value, delta, note, hero) {
    const cls = delta > 0 ? "up" : delta < 0 ? "down" : "flat";
    const arrow = delta > 0 ? "▲" : delta < 0 ? "▼" : "■";
    const d = delta === null ? "" : `<div class="kpi-d ${cls}">${arrow} ${Math.abs(delta)}<span>· ${esc(note)}</span></div>`;
    return `<div class="kpi${hero ? " hero" : ""}"><div class="kpi-l">${esc(t(label))}</div>
      <div class="kpi-v">${esc(value)}</div>${d || `<div class="kpi-d flat"><span>${esc(note)}</span></div>`}</div>`;
  }

  /* ---------------- سجل التحديثات ---------------- */
  // وقت محلي بصيغة yyyy-mm-ddThh:mm — لا UTC، حتى تطابق ساعة المستخدم
  function nowLocal() {
    const d = new Date(), p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  }
  function fmtTS(ts) {
    const s = String(ts || "");
    if (s.length < 10) return "";
    const tm = s.slice(11, 16);
    return tm ? `${fmtDate(s.slice(0, 10))} · ${tm}` : fmtDate(s.slice(0, 10));
  }

  /* يُستدعى بعد كل إضافة/تعديل/حذف — الفشل هنا لا يُفشل العملية الأصلية */
  async function logUpdate(text, opts) {
    opts = opts || {};
    const d = new Date();
    try {
      await DB.insert("updates", {
        kind: opts.kind || "auto",
        text: text,
        source: opts.source || "",
        author: (state.user && state.user.name) || "",
        ts: nowLocal(),
        year: Number(state.filters.year) || d.getFullYear(),
        month: Number(state.filters.month) || d.getMonth() + 1,
      });
    } catch (e) { /* السجل مساعد — لا نُفشل الحفظ لأجله */ }
  }

  /* صندوق «التحديثات» لصفحة بعينها — يكتب في جدول updates نفسه،
     فتظهر ملاحظاته في الملخص التنفيذي تلقائيًا */
  function updatesBox(source) {
    const list = rows("updates").filter((u) => u.source === source)
      .sort((a, b) => String(b.ts || "").localeCompare(String(a.ts || "")));
    const add = canEdit()
      ? `<button class="btn btn-p sm" onclick="APP.openForm('update','','${jsq(source)}')">${icon("plus")} ${esc(t("إضافة تحديث"))}</button>` : "";
    return `<div class="panel" style="margin-bottom:18px"><div class="p-h">
        <h3 class="ttl-edit" data-tk="1" data-k="تحديثات ${esc(source)}">${esc(t("التحديثات"))}</h3>
        <div class="hact"><span class="hint">${esc(t("تظهر في الملخص التنفيذي"))}</span>${add}</div></div>
      <div class="body" style="padding-top:2px">${list.length
        ? list.map(updateRow).join("")
        : `<div class="empty">${esc(t("لا توجد تحديثات بعد"))}</div>`}</div></div>`;
  }

  function updateRow(u) {
    const manual = u.kind === "manual";
    const del = canEdit()
      ? `<span class="iact del" title="${esc(t("حذف"))}" onclick="APP.removeRow('updates','${jsq(u.id)}')">${icon("trash")}</span>` : "";
    const meta = [manual ? t("يدوي") : t("تلقائي"), u.source && t(u.source), u.author, fmtTS(u.ts)]
      .filter(Boolean).join(" · ");
    return `<div class="ex"><span class="dot" style="background:${manual ? "var(--g-700)" : "var(--g-400)"}"></span>
      <div class="txt">${esc(u.text)}<div class="sub">${esc(meta)}</div></div>
      <div class="hact">${del}</div></div>`;
  }

  function execRow(sev, title, sub, page) {
    const col = sev === "crit" ? "var(--red)" : sev === "warn" ? "var(--amber)" : "var(--muted)";
    return `<div class="ex"><span class="dot" style="background:${col}"></span>
      <div class="txt">${esc(title)}<div class="sub">${esc(sub)}</div></div>
      <a class="go" href="#/${jsq(page)}">${esc(t("عرض"))} ←</a></div>`;
  }

  function pageExec() {
    const { y, m } = refMonth();
    const pm = prevMonth(y, m);
    const monthName = MONTHS_FULL[m - 1];

    /* ١) الإنجازات = المنضمون − الاستقالات في الشهر نفسه */
    const net = (yy, mm) => inMonth("onboarding", yy, mm).length - inMonth("resignations", yy, mm).length;
    const netNow = net(y, m), netPrev = net(pm.y, pm.m);
    const joins = inMonth("onboarding", y, m).length, exits = inMonth("resignations", y, m).length;

    /* ٢) الشواغر المفتوحة — حالة قائمة، فتتبع الفلتر لا الشهر المرجعي */
    const vacNow = rows("jobs").filter((j) => Number(j.stage) < JOINED).length;
    const vacPrev = state.filters.month
      ? inMonth("jobs", pm.y, pm.m).filter((j) => Number(j.stage) < JOINED).length : null;

    /* ٣) نسبة الإشغال */
    const agg = state.filters.unit ? aggregate(state.filters.unit) : aggregateAll();
    const occ = pct(agg.filled, agg.approved);

    /* ٤) مرشحون تحت الإجراء ٥) متدربون قائمون */
    const pipeline = rows("jobs").filter((j) => Number(j.stage) > 0 && Number(j.stage) < JOINED).length;
    const trOn = rows("trainees").filter((r) => Number(r.stage) === TR_JOINED).length;
    const tmOn = rows("tamheer").filter((r) => Number(r.stage) === TR_JOINED).length;

    const kpis = `<div class="kstrip">
      ${kpiTile("الإنجازات هذا الشهر", (netNow >= 0 ? "+" : "") + netNow, netNow - netPrev,
        `${joins} ${t("تعيينات")} · ${exits} ${t("استقالات")} · ${monthName}`, true)}
      ${kpiTile("الشواغر المفتوحة", vacNow, vacPrev === null ? null : vacNow - vacPrev,
        vacPrev === null ? t("ضمن الفترة المختارة") : t("مقارنة بالشهر السابق"))}
      ${kpiTile("نسبة الإشغال", occ + "٪", null, `${agg.filled} ${t("من")} ${agg.approved} ${t("وظيفة معتمدة")}`)}
      ${kpiTile("مرشحون تحت الإجراء", pipeline, null, t("في المراحل الست"))}
      ${kpiTile("متدربون قائمون", trOn + tmOn, null, `${trOn} ${t("تدريب")} · ${tmOn} ${t("تمهير")}`)}
    </div>`;

    /* تحديثات — كلها محسوبة من البيانات */
    const items = [];
    const noRating = rows("interviews").filter((r) => r.status === "تمت" && !r.hr_rating && !r.mgr_rating);
    if (noRating.length) items.push(["crit", `${noRating.length} ${t("مقابلات تمت بلا تقييم")}`,
      t("تعطّل قرار الترشيح — لا تقييم للموارد البشرية ولا للإدارة"), "recruitment"]);

    const overdue = (tbl) => rows(tbl).filter((r) => Number(r.stage) === TR_JOINED && r.end_date && r.end_date < TODAY);
    const late = overdue("trainees").concat(overdue("tamheer"));
    if (late.length) items.push(["warn", `${late.length} ${t("انتهت فترتهم ولم تُحدَّث حالتهم")}`,
      `${t("يظهرون «قائم» رغم انقضاء تاريخ النهاية")} — ${esc(late[0].name)}`, "training"]);

    const cands = rows("jobs");
    const stuck = STAGES.map((st, i) => [st, cands.filter((c) => Number(c.stage) === i).length])
      .slice(1, JOINED).sort((a, b) => b[1] - a[1])[0];
    if (stuck && stuck[1] > 1) items.push(["warn", `${stuck[1]} ${t("مرشحين واقفون عند")} «${t(stuck[0])}»`,
      t("أكبر تجمّع في مرحلة واحدة"), "recruitment"]);

    const worst = roots().map((r) => [r, aggregate(r.id)]).filter(([, a]) => a.approved > 0)
      .sort((a, b) => pct(a[1].filled, a[1].approved) - pct(b[1].filled, b[1].approved))[0];
    if (worst) items.push(["info", `${uname(worst[0])}: ${t("الإشغال")} ${pct(worst[1].filled, worst[1].approved)}٪ — ${t("الأدنى")}`,
      `${worst[1].approved - worst[1].filled} ${t("شاغرًا من")} ${worst[1].approved} ${t("وظيفة معتمدة")}`, "recruitment"]);

    /* سجل التحديثات: ما سُجّل تلقائيًا من عمل المستخدمين + الملاحظات اليدوية */
    const logged = rows("updates").slice().sort((a, b) => String(b.ts || "").localeCompare(String(a.ts || "")));
    const addBtn = canEdit()
      ? `<button class="btn btn-p sm" onclick="APP.openForm('update')">${icon("plus")} ${esc(t("إضافة تحديث"))}</button>` : "";

    const updates = `<div class="panel"><div class="p-h">
        <h3 class="ttl-edit" data-k="التحديثات">${esc(t("التحديثات"))}</h3>
        <div class="hact"><span class="hint">${items.length + logged.length} ${t("بنود")}</span>${addBtn}</div></div>
      <div class="body" style="padding-top:2px">${
        items.map((i) => execRow(i[0], i[1], i[2], i[3])).join("") +
        logged.map(updateRow).join("") ||
        `<div class="empty">${esc(t("لا توجد بنود تحتاج متابعة"))}</div>`}</div></div>`;

    /* الإشغال حسب القطاع — الترتيب باختيار المستخدم */
    const asc = state.occSort !== "desc";
    const ranked = groupUnits().map((g) => [g, aggregate(g.id)])
      .sort((a, b) => (asc ? 1 : -1) * (pct(a[1].filled, a[1].approved) - pct(b[1].filled, b[1].approved)));
    const sortSw = `<span class="sortsw">
      <b class="${asc ? "on" : ""}" onclick="APP.setOccSort('asc')">${esc(t("الأدنى أولًا"))}</b>
      <b class="${asc ? "" : "on"}" onclick="APP.setOccSort('desc')">${esc(t("الأعلى أولًا"))}</b></span>`;
    const rankHTML = `<div class="panel"><div class="p-h">
        <h3 class="ttl-edit" data-k="الإشغال حسب القطاع">${esc(t("الإشغال حسب القطاع"))}</h3>
        ${sortSw}</div>
      <div class="body"><div class="rank">${ranked.map(([g, a]) => {
        const v = pct(a.filled, a.approved);
        const col = v >= 95 ? "var(--emerald)" : v >= 90 ? "var(--g-700)" : "var(--gold)";
        return `<div class="rk"><span class="nm">${esc(uname(g))}</span>
          <span class="br"><i style="width:${v}%;background:${col}"></i></span>
          <span class="pc">${v}٪</span></div>`;
      }).join("") || `<div class="empty">${esc(t("لا توجد بيانات"))}</div>`}</div></div></div>`;

    /* التعيينات مقابل الاستقالات — من بداية السنة */
    const lastM = (new Date().getFullYear() === y) ? new Date().getMonth() + 1 : 12;
    const ms = Array.from({ length: lastM }, (_, i) => i + 1);
    const hires = ms.map((mm) => inMonth("onboarding", y, mm).length);
    const outs = ms.map((mm) => inMonth("resignations", y, mm).length);
    const totH = hires.reduce((a, b) => a + b, 0), totO = outs.reduce((a, b) => a + b, 0);
    const W = 620, H = 200, pad = 34, mx = Math.max(...hires, ...outs, 4);
    const px = (i) => pad + (ms.length > 1 ? i * ((W - pad * 2) / (ms.length - 1)) : (W - pad * 2) / 2);
    const py = (v) => H - 30 - (v / mx) * (H - 64);
    const path = (arr) => arr.map((v, i) => `${i ? "L" : "M"} ${px(i).toFixed(1)} ${py(v).toFixed(1)}`).join(" ");
    const dots = (arr, c) => arr.map((v, i) => `<circle cx="${px(i).toFixed(1)}" cy="${py(v).toFixed(1)}" r="3.5" fill="${c}"/>`).join("");
    const gridl = [0, Math.round(mx / 2), mx].map((v) => `<line x1="${pad}" y1="${py(v)}" x2="${W - pad}" y2="${py(v)}" stroke="var(--line)"/>
      <text x="${W - pad + 6}" y="${py(v) + 4}" style="font-size:10px;fill:var(--muted)">${v}</text>`).join("");
    const xlab = ms.map((mm, i) => `<text x="${px(i)}" y="${H - 8}" text-anchor="middle" style="font-size:10px;fill:var(--muted)">${state.lang === "en" ? MONTHS_EN[mm - 1].slice(0, 3) : MONTHS[mm - 1]}</text>`).join("");
    const trend = `<div class="panel" style="grid-column:1/-1"><div class="p-h">
        <h3 class="ttl-edit" data-k="التعيينات مقابل الاستقالات">${esc(t("التعيينات مقابل الاستقالات"))} — ${esc(t("من بداية"))} ${y}</h3>
        <span class="hint">${totH} ${t("تعيينًا")} · ${totO} ${t("استقالة")} · ${t("صافي")} ${totH - totO >= 0 ? "+" : ""}${totH - totO}</span></div>
      <div class="body"><svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}">${gridl}
        <path d="${path(hires)}" fill="none" stroke="var(--g-700)" stroke-width="2.5" stroke-linejoin="round"/>
        <path d="${path(outs)}" fill="none" stroke="var(--gold)" stroke-width="2.5" stroke-dasharray="5 4" stroke-linejoin="round"/>
        ${dots(hires, "var(--g-700)")}${dots(outs, "var(--gold)")}${xlab}</svg>
        <div class="slg"><div class="i"><span class="sw" style="background:var(--g-700)"></span>${esc(t("تعيينات"))}</div>
        <div class="i"><span class="sw" style="background:var(--gold)"></span>${esc(t("استقالات"))}</div></div></div></div>`;

    return kpis + `<div class="vgrid exgrid">${updates}${rankHTML}</div>
      <div class="vgrid" style="margin-top:18px">${trend}</div>`;
  }

  // اللوحة الرئيسية
  function pageIndex() {
    const jobs = rows("jobs");
    const totalVac = jobs.filter((j) => Number(j.stage) === 0).length;
    const received = jobs.reduce((s, j) => s + Number(j.received || 0), 0);
    const done = jobs.filter((j) => Number(j.stage) === JOINED).length;
    const inprog = jobs.filter((j) => Number(j.stage) > 0 && Number(j.stage) < JOINED).length;
    const trainees = rows("trainees");
    const resg = rows("resignations");
    const target = Number((db().settings.find((s) => s.key === "training_target") || {}).value || 80);
    const trDone = trainees.filter((r) => Number(r.stage) === 3).length;
    const trProg = trainees.filter((r) => Number(r.stage) === 1).length;
    const trOn = trainees.filter((r) => Number(r.stage) === 2).length;
    const tamheer = rows("tamheer");
    const tmDone = tamheer.filter((r) => Number(r.stage) === 3).length;
    const tmProg = tamheer.filter((r) => Number(r.stage) === 1).length;
    const tmOn = tamheer.filter((r) => Number(r.stage) === 2).length;

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

    const details = `<div class="tcards">${cards}</div><div class="mrow full"><div class="vgrid">${panels}</div></div>`;
    return tabbed([["exec", "الملخص التنفيذي"], ["det", "التفاصيل الإضافية"]],
      [["exec", pageExec()], ["det", details]]);
  }

  // التوظيف — الوظائف هي السجل المركزي، والقطاعات تبويب ضمنها
  function pageRecruitment() {
    const jobs = rows("jobs");
    const ivs = rows("interviews");
    const open = jobs.filter((j) => Number(j.stage) < JOINED);
    const joined = jobs.filter((j) => Number(j.stage) === JOINED);
    const received = jobs.reduce((s, j) => s + Number(j.received || 0), 0);
    const agg = state.filters.unit ? aggregate(state.filters.unit) : aggregateAll();

    const ivDone = ivs.filter((i) => i.status === "تمت").length;
    const ivRej = ivs.filter((i) => i.status === "مرفوضة").length;
    const ivSch = ivs.filter((i) => i.status === "مجدولة").length;
    const ivSegs = [["مجدولة", ivSch, "var(--amber)"], ["مكتملة", ivDone, "var(--g-800)"], ["مرفوضة", ivRej, "var(--red)"]];

    // الشواغر حسب القطاع — تُحسب من الوظائف المفتوحة
    const openBySector = groupUnits().map((g, i) => [
      uname(g), open.filter((j) => groupOf(j.unit_id) === g.id).length, PALETTE[i % PALETTE.length],
    ]);
    const occ = pct(agg.filled, agg.approved);

    /* نظرة عامة: الشواغر أولًا وبجانبها نسبة الإشغال، ثم شجرة القطاعات */
    const ov = `<div class="vgrid">
      <div class="panel"><div class="p-h"><h3 class="ttl-edit" data-tk="1" data-k="الوظائف الشاغرة حسب القطاع">${esc(t("الوظائف الشاغرة حسب القطاع"))}</h3>
        <span class="hint">${esc(t("الإجمالي"))} ${open.length}</span></div>
        <div class="body">${colbars(openBySector)}</div></div>
      <div class="panel"><div class="p-h"><h3 class="ttl-edit" data-tk="1" data-k="نسبة الإشغال">${esc(t("نسبة الإشغال"))}</h3></div>
        <div class="body">${ring(occ, occ >= 90 ? "var(--emerald)" : occ >= 70 ? "var(--g-700)" : "var(--gold)",
          "إشغال", `${agg.filled} ${t("مشغولة")} · ${agg.vacant} ${t("شاغرة")}`, 210)}
        <div class="hired">${esc(t("تم توظيف"))} <b>${joined.length}</b> ${esc(t("من أصل"))} <b>${agg.approved}</b> ${esc(t("وظيفة معتمدة"))}</div></div></div>
      </div>`;

    /* المقابلات */
    const ivShown = byStatus("interviews", ivs);
    const ivCards = ivShown.map((r) => pcard(r.candidate, r.position, [
      ["الإدارة", uname(unitById(r.unit_id))], ["مالك الوظيفة", r.owner],
      ["التاريخ", r.date ? fmtDate(r.date) + ((r.day || dayOf(r.date)) ? " · " + (r.day || dayOf(r.date)) : "") : ""], ["الوقت", r.time],
      ["مصدر الوظيفة", r.job_source], ["مصدر المرشح", r.cand_source_name ? r.cand_source + " · " + r.cand_source_name : r.cand_source],
      ["تقييم الموارد البشرية", r.hr_rating], ["تقييم الإدارة", r.mgr_rating],
    ], [r.status, r.status === "تمت" ? "b-good" : r.status === "مرفوضة" ? "b-crit" : "b-info"],
      { form: "interview", id: r.id, table: "interviews" })).join("");

    const ivView = `<div class="vgrid" style="margin-bottom:16px">
      <div class="panel" style="grid-column:1/-1"><div class="p-h">
        <h3 class="ttl-edit" data-tk="1" data-k="حالة طلبات المقابلات">${esc(t("حالة طلبات المقابلات"))}</h3>
        <span class="hint">${esc(t("الإجمالي"))} ${ivs.length}</span></div>
        <div class="body">${donut(ivSegs, ivs.length, "مقابلة", { size: 190, row: true })}</div></div></div>`
      + statusChips("interviews", ivs, ["مجدولة", "تمت", "مرفوضة"])
      + plist("جدول المقابلات", "", ivCards, ["إضافة مقابلة", "interview"]);

    /* مراحل التوظيف — بطاقة لكل مرحلة، والوظيفة تتحرك بينها */
    const atStage = (i) => jobs.filter((j) => Number(j.stage) === i);
    const sum = STAGES.map((s, i) => `<div class="sum${state.stage === i ? " on" : ""}" onclick="APP.setStage(${i})" title="${esc(t("اعرض من في هذه المرحلة"))}">
      <div class="n">${atStage(i).length}</div><div class="l">${esc(t(s))}</div></div>`).join("");

    const shown = state.stage == null ? jobs : atStage(state.stage);
    const accs = shown.map((j, i) => {
      const steps = STAGES.map((s, si) => {
        const cls = si < j.stage ? "done" : si === Number(j.stage) ? "cur" : "";
        return `<div class="step ${cls}"><div class="c">${si < j.stage ? "✓" : si}</div><div class="t">${esc(t(s))}</div></div>`;
      }).join("");
      const upd = canEdit() ? `<button class="btn btn-g" onclick="APP.openForm('job','${jsq(j.id)}')">${icon("pen")} ${esc(t("تحديث المرحلة"))}</button>` : "";
      const del = canEdit() ? `<button class="btn btn-x" onclick="APP.removeRow('jobs','${jsq(j.id)}')">${icon("trash")} ${esc(t("حذف"))}</button>` : "";
      return `<div class="acc ${i === 0 ? "open" : ""}"><div class="head" onclick="this.parentElement.classList.toggle('open')">
        <span class="nm">${esc(j.candidate || t("بلا مرشح بعد"))}</span><span class="pos">${esc(j.title)}</span>
        <span class="jcode">${esc(j.code || "")}</span>
        <span class="badge b-info">${esc(t(STAGES[j.stage] || ""))}</span><span class="chev">${CHEV}</span></div>
        <div class="body"><div class="stepper">${steps}</div>
        <div class="jmeta">
          <div class="mi"><span class="k">${esc(t("الإدارة"))}</span><span class="v">${esc(uname(unitById(j.unit_id)))}</span></div>
          <div class="mi"><span class="k">${esc(t("الدرجة الوظيفية"))}</span><span class="v">${esc(j.grade || "—")}</span></div>
          <div class="mi"><span class="k">${esc(t("مدير الإدارة"))}</span><span class="v">${esc(j.manager || "—")}</span></div>
          <div class="mi"><span class="k">${esc(t("نوع التوظيف"))}</span><span class="v">${esc(j.hire_type || "—")}</span></div>
          <div class="mi"><span class="k">${esc(t("المتقدمون"))}</span><span class="v">${esc(String(j.received || 0))}</span></div>
          <div class="mi"><span class="k">${esc(t("تاريخ المباشرة"))}</span><span class="v">${esc(j.start_date ? fmtDate(j.start_date) : "—")}</span></div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;margin-top:14px;flex-wrap:wrap">
        <div class="note" style="margin:0">${esc(t("آخر تحديث"))}: ${esc(j.note || "—")}</div>${upd}${del}</div></div></div>`;
    }).join("");

    const addJob = canEdit() ? `<div style="display:flex;margin-bottom:14px"><button class="btn btn-p" onclick="APP.openForm('job')">${icon("plus")} ${esc(t("إضافة وظيفة"))}</button></div>` : "";
    const stageNote = state.stage == null ? "" :
      `<div class="stagenote">${esc(t("تعرض الآن مرحلة"))} «${esc(t(STAGES[state.stage]))}» — ${atStage(state.stage).length}
        <button class="btn btn-x" onclick="APP.setStage(${state.stage})">${esc(t("عرض كل المراحل"))}</button></div>`;
    const flow = addJob + `<div class="sumrow" style="grid-template-columns:repeat(${STAGES.length},1fr)">${sum}</div>`
      + stageNote + (accs || `<div class="empty">${esc(t("لا توجد وظائف في هذه المرحلة"))}</div>`);

    /* الانضمام — يُبنى من الوظائف التي بلغت المرحلة الأخيرة، ويقبل إضافة يدوية */
    const manual = rows("onboarding");
    const fromJobs = joined.map((j) => ({
      id: j.id, src: "jobs", name: j.candidate, position: j.title, grade: j.grade,
      unit_id: j.unit_id, manager: j.manager, start_date: j.start_date,
    }));
    const onbRows = fromJobs.concat(manual.map((r) => ({
      id: r.id, src: "onboarding", name: r.name, position: r.position, grade: r.grade,
      unit_id: r.unit_id, manager: r.manager, start_date: r.start_date,
    })));
    const onbHead = ["الاسم", "المسمى الوظيفي", "الدرجة الوظيفية", "الإدارة", "مدير الإدارة", "تاريخ المباشرة"];
    const addOnb = canEdit() ? `<button class="btn btn-p" onclick="APP.openForm('onboarding')">${icon("plus")} ${esc(t("إضافة يدوية"))}</button>` : "";

    /* بطاقات الإدارات: الضغط على إدارة يقصر الجدول عليها، و«الكل» يُلغي */
    const gu = groupUnits();
    const inOnbUnit = (r) => !state.onbUnit || groupOf(r.unit_id) === state.onbUnit;
    const onbChips = `<div class="sumrow" style="grid-template-columns:repeat(${Math.min(gu.length + 1, 6)},1fr)">
      <div class="sum${state.onbUnit ? "" : " on"}" onclick="APP.setOnbUnit('')">
        <div class="n">${onbRows.length}</div><div class="l">${esc(t("الكل"))}</div></div>
      ${gu.map((g) => `<div class="sum${state.onbUnit === g.id ? " on" : ""}" onclick="APP.setOnbUnit('${jsq(g.id)}')">
        <div class="n">${onbRows.filter((r) => groupOf(r.unit_id) === g.id).length}</div>
        <div class="l">${esc(uname(g))}</div></div>`).join("")}</div>`;

    // نسبة الإشغال مقابل إجمالي الوظائف — تتبع الإدارة المختارة إن وُجدت
    const oa = state.onbUnit ? aggregate(state.onbUnit) : agg;
    const oPct = pct(oa.filled, oa.approved);
    const onbChart = `<div class="vgrid" style="margin-bottom:16px">
      <div class="panel"><div class="p-h"><h3 class="ttl-edit" data-tk="1" data-k="نسبة الإشغال مقابل الوظائف">${esc(t("نسبة الإشغال مقابل الوظائف"))}</h3>
        <span class="hint">${state.onbUnit ? esc(uname(unitById(state.onbUnit))) : esc(t("الجهة كاملة"))}</span></div>
        <div class="body">${ring(oPct, oPct >= 90 ? "var(--emerald)" : oPct >= 70 ? "var(--g-700)" : "var(--gold)",
          "إشغال", `${oa.filled} ${t("مشغولة")} · ${oa.vacant} ${t("شاغرة")}`, 200)}</div></div>
      <div class="panel"><div class="p-h"><h3 class="ttl-edit" data-tk="1" data-k="الوظائف والانضمام">${esc(t("الوظائف والانضمام"))}</h3></div>
        <div class="body">${splitbar([["مشغولة", oa.filled, "var(--g-700)"], ["شاغرة", oa.vacant, "var(--g-400)"]])}
        <div class="hired">${esc(t("انضم"))} <b>${onbRows.filter(inOnbUnit).length}</b> ${esc(t("من أصل"))} <b>${oa.approved}</b> ${esc(t("وظيفة معتمدة"))}</div></div></div>
      </div>`;

    const shownOnb = onbRows.filter(inOnbUnit);
    const onbBodyF = shownOnb.map((r) => {
      const act = canEdit()
        ? `<span class="iact" title="${esc(t("تعديل"))}" onclick="APP.openForm('${r.src === "jobs" ? "job" : "onboarding"}','${jsq(r.id)}')">${icon("pen")}</span>` : "";
      return `<tr><td>${esc(r.name || "—")}</td><td>${esc(r.position || "—")}</td><td>${esc(r.grade || "—")}</td>
        <td>${esc(uname(unitById(r.unit_id)) || "—")}</td><td>${esc(r.manager || "—")}</td>
        <td>${esc(r.start_date ? fmtDate(r.start_date) : "—")}</td><td class="ta">${act}</td></tr>`;
    }).join("");

    const onbView = onbChart + onbChips + `<div class="card"><div class="tbl-h">
        <h3 class="ttl-edit" data-tk="1" data-k="جدول الانضمام">${esc(t("جدول الانضمام"))}</h3>
        <div class="hact"><span class="hint">${joined.length} ${esc(t("من الوظائف"))} · ${manual.length} ${esc(t("يدوي"))}</span>${addOnb}</div></div>
      <div class="tblwrap">${shownOnb.length
        ? `<table class="dtable"><thead><tr>${onbHead.map((h) => `<th>${esc(t(h))}</th>`).join("")}<th></th></tr></thead>
           <tbody>${onbBodyF}</tbody></table>`
        : `<div class="empty">${esc(t("لا توجد بيانات مطابقة للفلاتر الحالية"))}</div>`}</div></div>`;

    const orgBlock = `<div class="orgblock">${sectorsBody()}</div>`;
    const ovFull = ORG_FIRST ? orgBlock + ov : ov + orgBlock;
    const views = [["ov", ovFull], ["iv", ivView], ["flow", flow], ["onb", onbView]];
    const tabs = [["ov", "نظرة عامة"], ["iv", "المقابلات"], ["flow", "مراحل التوظيف"], ["onb", "الانضمام"]];

    const side = `<div class="s-h"><h3 class="ttl-edit" data-tk="1" data-k="نسبة إنجاز طلبات المقابلات">${esc(t("نسبة إنجاز طلبات المقابلات"))}</h3></div>
      <div class="hero">${ring(pct(ivDone, ivs.length), "var(--g-700)", "إنجاز المقابلات", `${ivDone} ${t("مكتملة من")} ${ivs.length} ${t("مقابلة")}`, 290)}
      <div class="hero-facts">
        <div class="hf"><span>${esc(t("طلبات التوظيف المستلمة"))}</span><b>${received}</b></div>
        <div class="hf"><span>${esc(t("وظائف مفتوحة"))}</span><b>${open.length}</b></div></div></div>`;

    const active = state.tab || tabs[0][0];
    return tabbed(tabs, views, active === "ov" ? null : side);
  }

  /* شريط مراحل مشترك للتدريب وتمهير — بنفس تنسيق مراحل التوظيف */
  function stageRow(key, list, stages) {
    const cur = state.status[key];
    const at = (i) => list.filter((r) => Number(r.stage) === i).length;
    const all = `<div class="sum${cur === "" || cur == null ? " on" : ""}" onclick="APP.setStatus('${jsq(key)}','')"
        title="${esc(t("عرض الكل"))}"><div class="n">${list.length}</div><div class="l">${esc(t("الكل"))}</div></div>`;
    const cells = all + stages.map((s, i) => `<div class="sum${Number(cur) === i ? " on" : ""}"
        onclick="APP.setStatus('${jsq(key)}','${Number(cur) === i ? "" : i}')" title="${esc(t("اعرض من في هذه المرحلة"))}">
      <div class="n">${at(i)}</div><div class="l">${esc(t(s))}</div></div>`).join("");
    return `<div class="sumrow" style="grid-template-columns:repeat(${stages.length + 1},1fr)">${cells}</div>`;
  }
  const byStage = (key, list) =>
    (state.status[key] === "" || state.status[key] == null ? list : list.filter((r) => Number(r.stage) === Number(state.status[key])));
  const stageBadge = (i, stages) => [stages[i] || "", i === stages.length - 1 ? "b-good" : i === 0 ? "b-warn" : "b-info"];

  // التدريب
  function pageTraining() {
    const tr = rows("trainees");
    const target = Number((db().settings.find((s) => s.key === "training_target") || {}).value || 20);
    const at = (i) => tr.filter((r) => Number(r.stage) === i).length;
    const achieved = tr.filter((r) => Number(r.stage) >= TR_JOINED).length;
    const dist = distBy(tr);

    const ov = `<div class="vgrid">
      <div class="panel" style="grid-column:1/-1"><div class="p-h"><h3 class="ttl-edit" data-tk="1" data-k="توزيع المتدربين على القطاعات">${esc(t("توزيع المتدربين على القطاعات"))}</h3><span class="hint">${esc(t("الإجمالي"))} ${tr.length}</span></div>
        <div class="body">${colbars(dist)}</div></div>
      <div class="panel" style="grid-column:1/-1"><div class="p-h"><h3 class="ttl-edit" data-tk="1" data-k="حالة طلبات التدريب">${esc(t("حالة طلبات التدريب"))}</h3><span class="hint">${esc(t("من إجمالي"))} ${tr.length}</span></div>
        <div class="body">${donut(TR_STAGES.map((s, i) => [s, at(i), PALETTE[i % PALETTE.length]]), tr.length, "طلب", { size: 190, row: true })}</div></div></div>`;

    const trShown = byStage("trainees", tr);
    const cards = stageRow("trainees", tr, TR_STAGES) + trShown.map((r) => pcard(r.name, r.university, [
      ["المشرف التدريبي", r.supervisor], ["الإدارة", uname(unitById(r.unit_id))],
      ["بداية التدريب", fmtDate(r.start_date)], ["نهاية التدريب", fmtDate(r.end_date)], ["رقم الجوال", r.phone],
    ], stageBadge(Number(r.stage), TR_STAGES), { form: "trainee", id: r.id, table: "trainees" },
      `APP.setStatus('trainees','${r.stage}')`)).join("");

    const editTarget = canEditTitles()
      ? `<button class="btn btn-x sm" onclick="APP.setTarget('training_target')">${icon("pen")} ${esc(t("تعديل المستهدف"))}</button>` : "";
    const side = `<div class="s-h"><h3 class="ttl-edit" data-tk="1" data-k="المحقق من المستهدف">${esc(t("المحقق من المستهدف"))}</h3>${editTarget}</div>
      <div class="hero">${ring(pct(achieved, target), "var(--g-700)", "من المستهدف", `${achieved} ${t("من مستهدف")} ${target}`, 290)}
      <div class="hero-facts">${TR_STAGES.map((s, i) =>
        `<div class="hf"><span>${esc(t(s))}</span><b>${at(i)}</b></div>`).join("")}</div></div>`;

    return tabbed([["ov", "نظرة عامة"], ["tt", "المتدربين"]],
      [["ov", updatesBox("التدريب") + ov], ["tt", plist("جدول المتدربين", "", cards, ["إضافة متدرب", "trainee"])]], side);
  }

  // طلبات تمهير
  function pageTamheer() {
    const tm = rows("tamheer");
    const at = (i) => tm.filter((r) => Number(r.stage) === i).length;
    const dist = distBy(tm);

    const ov = `<div class="vgrid">
      <div class="panel" style="grid-column:1/-1"><div class="p-h"><h3 class="ttl-edit" data-tk="1" data-k="توزيع متدربي تمهير على القطاعات">${esc(t("توزيع متدربي تمهير على القطاعات"))}</h3><span class="hint">${esc(t("الإجمالي"))} ${tm.length}</span></div>
        <div class="body">${colbars(dist)}</div></div>
      <div class="panel" style="grid-column:1/-1"><div class="p-h"><h3 class="ttl-edit" data-tk="1" data-k="حالة طلبات تمهير">${esc(t("حالة طلبات تمهير"))}</h3><span class="hint">${esc(t("من إجمالي"))} ${tm.length}</span></div>
        <div class="body">${donut(TR_STAGES.map((s, i) => [s, at(i), PALETTE[i % PALETTE.length]]), tm.length, "طلب", { size: 190, row: true })}</div></div></div>`;

    const tmShown = byStage("tamheer", tm);
    const cards = stageRow("tamheer", tm, TR_STAGES) + tmShown.map((r) => pcard(r.name, r.university, [
      ["المشرف التدريبي", r.supervisor], ["الإدارة", uname(unitById(r.unit_id))],
      ["بداية البرنامج", fmtDate(r.start_date)], ["نهاية البرنامج", fmtDate(r.end_date)], ["رقم الجوال", r.phone],
    ], stageBadge(Number(r.stage), TR_STAGES), { form: "tamheer", id: r.id, table: "tamheer" },
      `APP.setStatus('tamheer','${r.stage}')`)).join("");

    const side = `<div class="s-h"><h3 class="ttl-edit" data-tk="1" data-k="إجمالي طلبات تمهير">${esc(t("إجمالي طلبات تمهير"))}</h3></div>
      <div class="hero"><div class="hero-circle"><span class="hero-n">${tm.length}</span><span class="hero-l">${esc(t("طلب تمهير"))}</span></div>
      <div class="hero-facts">${TR_STAGES.map((s, i) =>
        `<div class="hf"><span>${esc(t(s))}</span><b>${at(i)}</b></div>`).join("")}</div></div>`;

    return tabbed([["ov", "نظرة عامة"], ["tm", "المتدربين"]],
      [["ov", updatesBox("تمهير") + ov], ["tm", plist("جدول طلبات تمهير", "", cards, ["إضافة طلب تمهير", "tamheer"])]], side);
  }

  // الاستقالات
  function pageResignations() {
    const rs = rows("resignations");
    const dist = distBy(rs);
    const grades = {};
    rs.forEach((r) => { if (r.grade) grades[r.grade] = (grades[r.grade] || 0) + 1; });
    const gsegs = Object.keys(grades).map((g, i) => [g, grades[g], PALETTE[i % PALETTE.length]]);
    // حتى تاريخه: كل استقالات السنة المختارة التي مضى آخر يوم عمل لها،
    // بصرف النظر عن فلتر الشهر — فتبقى ثابتة حين يتنقّل المستخدم بين الأشهر
    const toDate = (db().resignations || []).filter((r) =>
      inUnit(r) && Number(r.year) === Number(state.filters.year) &&
      r.last_day && String(r.last_day) <= TODAY).length;
    // أعلى وأقل قطاع — بجانب الرسم البياني مباشرة لا في اللوحة الجانبية
    const ranked = dist.slice().sort((a, b) => b[1] - a[1]);
    const top = ranked[0] || ["—", 0];
    const low = ranked.length > 1 ? ranked[ranked.length - 1] : ["—", 0];
    const extremes = `<div class="extremes">
      <div class="ex-card hi"><span class="k">${esc(t("أعلى قطاع"))}</span>
        <b class="n">${top[1]}</b><span class="u">${esc(top[0])}</span></div>
      <div class="ex-card lo"><span class="k">${esc(t("أقل قطاع"))}</span>
        <b class="n">${low[1]}</b><span class="u">${esc(low[0])}</span></div></div>`;

    const ov = `<div class="vgrid">
      <div class="panel" style="grid-column:1/-1"><div class="p-h"><h3 class="ttl-edit" data-tk="1" data-k="حسب الدرجة">${esc(t("حسب الدرجة"))}</h3></div>
        <div class="body">${gsegs.length ? donut(gsegs, rs.length, "استقالة", { size: 190 }) : `<div class="empty">${esc(t("لا توجد بيانات"))}</div>`}</div></div>
      <div class="panel" style="grid-column:1/-1"><div class="p-h"><h3 class="ttl-edit" data-tk="1" data-k="توزيع الاستقالات حسب القطاع">${esc(t("توزيع الاستقالات حسب القطاع"))}</h3><span class="hint">${esc(t("الإجمالي"))} ${rs.length}</span></div>
        <div class="body">${colbars(dist)}${extremes}</div></div></div>`;

    const rsShown = byStage("resignations", rs);
    const cards = stageRow("resignations", rs, RS_STAGES) + rsShown.map((r) => pcard(r.name, r.position, [
      ["الدرجة", r.grade], ["الإدارة", uname(unitById(r.unit_id))], ["آخر يوم عمل", fmtDate(r.last_day)], ["السبب", r.reason],
    ], stageBadge(Number(r.stage), RS_STAGES), { form: "resignation", id: r.id, table: "resignations" })).join("");

    const side = `<div class="s-h"><h3 class="ttl-edit" data-tk="1" data-k="عدد الاستقالات">${esc(t("عدد الاستقالات"))}</h3></div>
      <div class="hero"><div class="hero-circle"><span class="hero-n">${rs.length}</span><span class="hero-l">${esc(t("استقالة حتى اليوم"))}</span></div>
      <div class="hero-facts"><div class="hf"><span>${esc(t("استقالات حتى تاريخه"))}</span><b>${toDate}</b></div></div></div>`;

    return tabbed([["ov", "نظرة عامة"], ["rd", "تفاصيل الاستقالات"]],
      [["ov", ov], ["rd", plist("جدول الاستقالات", "", cards, ["تسجيل استقالة", "resignation"])]], side);
  }

  // القطاعات
  /* ---------------- الهيكل: مخطط شعاعي (Sunburst) ----------------
     الجهة في المركز، وكل حلقة مستوى تنظيمي. سعة القوس بحجم الوظائف
     المعتمدة، وامتلاؤه من الداخل للخارج بنسبة الإشغال — فتُقرأ الفجوات
     من الشكل قبل الأرقام. الضغط على قوس يجعله المركز. */
  /* ---------------- الهيكل: مخطط مساحي (Treemap) ----------------
     مساحة كل مستطيل بحجم وظائف الوحدة، ولونه بحالة إشغالها، واسمها
     ورقمها مكتوبان بداخله. خوارزمية squarified تُبقي النسب قريبة من
     المربع فتظل النصوص مقروءة. */
  function squarify(items, W, H) {
    const out = [];
    const total = items.reduce((s, n) => s + n.value, 0) || 1;
    const scale = (W * H) / total;
    let nodes = items.slice(), row = [];
    let x = 0, y = 0, w = W, h = H;

    const worst = (r, len) => {
      if (!r.length || !len) return Infinity;
      const ar = r.map((n) => n.value * scale);
      const s = ar.reduce((a, b) => a + b, 0);
      const mx = Math.max.apply(null, ar), mn = Math.min.apply(null, ar);
      return Math.max((len * len * mx) / (s * s), (s * s) / (len * len * mn));
    };
    const flush = () => {
      const area = row.reduce((s, n) => s + n.value * scale, 0);
      if (w >= h) {
        const cw = h ? area / h : 0;
        let cy = y;
        row.forEach((n) => {
          const ch = cw ? (n.value * scale) / cw : 0;
          out.push({ n: n, x: x, y: cy, w: cw, h: ch }); cy += ch;
        });
        x += cw; w -= cw;
      } else {
        const rh = w ? area / w : 0;
        let cx = x;
        row.forEach((n) => {
          const cw2 = rh ? (n.value * scale) / rh : 0;
          out.push({ n: n, x: cx, y: y, w: cw2, h: rh }); cx += cw2;
        });
        y += rh; h -= rh;
      }
      row = [];
    };

    while (nodes.length) {
      const len = Math.min(w, h);
      const next = row.concat([nodes[0]]);
      if (!row.length || worst(row, len) >= worst(next, len)) { row = next; nodes.shift(); }
      else flush();
    }
    if (row.length) flush();
    return out;
  }

  function sectorsBody() {
    const focus = state.orgFocus && unitById(state.orgFocus) ? state.orgFocus : null;
    const a = focus ? aggregate(focus) : aggregateAll();
    const kids = focus ? childrenOf(focus) : roots();
    const occ = pct(a.filled, a.approved);

    // الوزن بالوظائف المعتمدة، وبحد أدنى ١ حتى لا تختفي وحدة بلا أرقام
    const items = kids.map((k) => ({ u: k, st: aggregate(k.id), value: Math.max(1, aggregate(k.id).approved) }))
      .sort((p, q) => q.value - p.value);
    const cells = squarify(items, 100, 100);

    const tone = (p) => (p >= 100 ? "full" : p >= 95 ? "ok" : p >= 90 ? "mid" : "low");
    const boxes = cells.map(({ n, x, y, w, h }) => {
      const p = pct(n.st.filled, n.st.approved);
      const sub = childrenOf(n.u.id).length;
      const small = w < 15 || h < 15;          // مستطيل ضيق: نُخفي التفاصيل ونُبقي الاسم
      const tiny = w < 7 || h < 7;             // أصغر من أن يحمل نصًا
      const edit = canEdit() && !small
        ? `<span class="iact" onclick="event.stopPropagation();APP.openForm('unit','${jsq(n.u.id)}')">${icon("pen")}</span>` : "";
      return `<div class="tmcell ${tone(p)}${sub ? " deep" : ""}"
        style="inset-inline-start:${x.toFixed(3)}%;top:${y.toFixed(3)}%;width:${w.toFixed(3)}%;height:${h.toFixed(3)}%"
        title="${esc(uname(n.u))} — ${esc(t("إشغال"))} ${p}٪ · ${n.st.filled} ${esc(t("من"))} ${n.st.approved} · ${esc(t("شاغر"))} ${n.st.vacant}"
        onclick="APP.focusOrg('${jsq(sub ? n.u.id : focus || "")}')">
        ${tiny ? "" : `<div class="tm-h"><span class="tm-n">${esc(uname(n.u))}</span>${edit}</div>
        ${small ? "" : `<div class="tm-v"><b>${n.st.filled}</b><span>${esc(t("من"))} ${n.st.approved}</span></div>
        <div class="tm-f">${p}٪ · ${n.st.vacant ? `${esc(t("شاغر"))} ${n.st.vacant}` : esc(t("مكتملة"))}${sub ? ` · ${sub} ${esc(t("وحدات"))} ›` : ""}</div>`}`}
      </div>`;
    }).join("");

    const path = focus ? pathOf(focus) : [];
    const crumbs = `<div class="sbcrumbs">
      <a class="${focus ? "" : "cur"}" onclick="APP.focusOrg('')">${esc(t("الجهة كاملة"))}</a>
      ${path.map((v, i) => `<span class="sep">›</span><a class="${i === path.length - 1 ? "cur" : ""}"
        onclick="APP.focusOrg('${jsq(v)}')">${esc(uname(unitById(v)))}</a>`).join("")}</div>`;

    const chips = `<div class="dchips">
      <div class="dchip">${esc(t("الوظائف المعتمدة"))}<b>${a.approved}</b></div>
      <div class="dchip">${esc(t("المشغولة"))}<b>${a.filled}</b></div>
      <div class="dchip">${esc(t("الشاغرة"))}<b>${a.vacant}</b></div>
      <div class="dchip hot">${esc(t("نسبة الإشغال"))}<b>${occ}٪</b></div></div>`;

    const tools = canEdit() ? `<button class="btn btn-p sm" onclick="APP.openForm('unit')">${icon("plus")} ${esc(t("إضافة إدارة / قسم"))}</button>` : "";

    const legend = `<div class="tmlegend">
      <span><i class="full"></i>${esc(t("مكتملة"))}</span>
      <span><i class="ok"></i>٩٥–٩٩٪</span>
      <span><i class="mid"></i>٩٠–٩٤٪</span>
      <span><i class="low"></i>${esc(t("أقل من"))} ٩٠٪</span>
      <span class="note">${esc(t("مساحة المستطيل بحجم وظائف الوحدة · اضغط للتعمّق"))}</span></div>`;

    return `<div class="sbwrap">
      <div class="sbhead">${crumbs}<div class="hact">${chips}${tools}</div></div>
      ${kids.length ? `<div class="tmap">${boxes}</div>${legend}`
        : `<div class="empty">${esc(t("وحدة تنظيمية نهائية"))}</div>`}</div>`;
  }

  /* الصفحة المستقلة تبقى للروابط القديمة (#/sectors) بعد دمج التبويب في التوظيف */
  function pageSectors() {
    return `<div class="mrow full"><div class="vhost"><div class="view show">${sectorsBody()}</div></div></div>`;
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
    jobs:         { title: "الوظائف", cols: [["code","رقم الوظيفة"],["title","المسمى الوظيفي"],["unitName","الإدارة"],["grade","الدرجة الوظيفية"],["manager","مدير الإدارة"],["hire_type","نوع التوظيف"],["stageName","المرحلة"],["candidate","المرشح"],["received","عدد المتقدمين"],["startTxt","تاريخ المباشرة"],["note","ملاحظة"],["period","الفترة"]] },
    interviews:   { title: "المقابلات", cols: [["candidate","المرشح"],["position","المنصب"],["unitName","الإدارة"],["owner","مالك الوظيفة"],["dateTxt","التاريخ"],["day","اليوم"],["time","الوقت"],["status","الحالة"],["job_source","مصدر الوظيفة"],["cand_source","مصدر المرشح"],["hr_rating","تقييم الموارد البشرية"],["mgr_rating","تقييم الإدارة"],["period","الفترة"]] },
    onboarding:   { title: "الانضمام (يدوي)", cols: [["name","الاسم"],["position","المسمى الوظيفي"],["grade","الدرجة الوظيفية"],["unitName","الإدارة"],["manager","مدير الإدارة"],["startTxt","تاريخ المباشرة"],["notes","ملاحظات"],["period","الفترة"]] },
    trainees:     { title: "المتدربون", cols: [["name","الاسم"],["university","الجامعة"],["supervisor","المشرف"],["unitName","الإدارة"],["startTxt","البداية"],["endTxt","النهاية"],["phone","الجوال"],["stageName","المرحلة"],["period","الفترة"]] },
    tamheer:      { title: "طلبات تمهير", cols: [["name","الاسم"],["university","الجامعة"],["supervisor","المشرف"],["unitName","الإدارة"],["startTxt","البداية"],["endTxt","النهاية"],["phone","الجوال"],["stageName","المرحلة"],["period","الفترة"]] },
    resignations: { title: "الاستقالات", cols: [["name","الاسم"],["position","المنصب"],["grade","الدرجة"],["unitName","الإدارة"],["stageName","المرحلة"],["lastTxt","آخر يوم عمل"],["reason","السبب"],["period","الفترة"]] },
  };

  // يضيف الحقول المشتقة التي لا تُخزَّن (اسم الإدارة، الفترة، نسبة الإشغال…)
  function exportRow(table, r) {
    const u = unitById(r.unit_id) || {};
    const out = Object.assign({}, r, {
      unitName: u.name || "",
      period: r.year ? `${MONTHS_FULL[(Number(r.month) || 1) - 1]} ${r.year}` : "",
      stageName: (table === "jobs" ? STAGES : table === "resignations" ? RS_STAGES : TR_STAGES)[Number(r.stage)] || "",
      dateTxt: fmtDate(r.date),
      startTxt: fmtDate(r.start_date),
      endTxt: fmtDate(r.end_date),
      lastTxt: fmtDate(r.last_day),
    });
    if (table === "org_units") {
      const a = aggregate(r.id);
      out.parentName = (unitById(r.parent_id) || {}).name || "—";
      out.approved = a.approved; out.filled = a.filled;
      out.vacant = a.vacant;
      out.occ = pct(a.filled, a.approved);
      out.male = a.male; out.female = a.female;
    }
    return out;
  }

  /* محتوى التقرير: أي الأقسام تدخل ملف PDF */
  const SCOPES = [["all", "الكل"], ["recruitment", "التوظيف"], ["training", "التدريب"],
    ["tamheer", "تمهير"], ["resignations", "الاستقالات"]];
  const SCOPE_TABLES = {
    recruitment: ["org_units", "jobs", "interviews", "onboarding"],
    training: ["trainees"],
    tamheer: ["tamheer"],
    resignations: ["resignations"],
  };
  const scopeLabel = () => (SCOPES.find((s) => s[0] === state.scope) || SCOPES[0])[1];
  const inScope = (key) => state.scope === "all" || state.scope === key;

  // الجداول المصدَّرة، مع تطبيق الفلاتر الحالية (عدا الهيكل فيُصدَّر كاملًا)
  function exportTables() {
    const keep = SCOPE_TABLES[state.scope] || null;   // null = كل الجداول
    return Object.keys(EXPORT).filter((t) => !keep || keep.indexOf(t) > -1).map((t) => {
      const list = t === "org_units" ? units() : rows(t);
      return { table: t, title: EXPORT[t].title, cols: EXPORT[t].cols, rows: list.map((r) => exportRow(t, r)) };
    });
  }

  function filterLabel() {
    const u = state.filters.unit ? uname(unitById(state.filters.unit)) : t("الكل");
    const m = state.filters.month ? MONTHS_FULL[state.filters.month - 1] : "كل الأشهر";
    return `${u} · ${m} ${state.filters.year}`;
  }

  /* الرسوم التي تدخل تقرير PDF — نفس دوال الرسم المستخدمة في الشاشة */
  function exportCharts() {
    const jobs = rows("jobs"), ivs = rows("interviews");
    const tr = rows("trainees"), tm = rows("tamheer"), rs = rows("resignations");
    const totalVac = jobs.filter((j) => Number(j.stage) === 0).length;
    const done = jobs.filter((j) => Number(j.stage) === JOINED).length;
    const inprog = jobs.filter((j) => Number(j.stage) > 0 && Number(j.stage) < JOINED).length;
    const cnt = (list, st) => list.filter((x) => x.status === st).length;
    const cntStage = (list, i) => list.filter((x) => Number(x.stage) === i).length;
    const a = state.filters.unit ? aggregate(state.filters.unit) : aggregateAll();
    const vacant = a.vacant;

    const gradeSegs = (() => {
      const g = {};
      rs.forEach((r) => { if (r.grade) g[r.grade] = (g[r.grade] || 0) + 1; });
      return Object.keys(g).map((k, i) => [k, g[k], PALETTE[i % PALETTE.length]]);
    })();

    // كل قسم موسوم بالجزء الذي يخصّه، ليُصفّى حسب «محتوى التقرير»
    const secs = [
      ["recruitment", "نظرة عامة", [
        ["توزيع حالة طلبات التوظيف", donut([["شاغرة", totalVac, "var(--g-400)"], ["تحت الإجراء", inprog, "var(--g-600)"], ["مكتملة", done, "var(--g-800)"]], totalVac + inprog + done, "إجمالي", { size: 200 })],
        ["توزيع الاستقالات حسب القطاع", colbars(distBy(rs))],
      ]],
      ["recruitment", "المقابلات", [
        ["عدد طلبات المقابلات", donut([["مجدولة", cnt(ivs, "مجدولة"), "var(--amber)"], ["مكتملة", cnt(ivs, "تمت"), "var(--g-800)"], ["مرفوضة", cnt(ivs, "مرفوضة"), "var(--red)"]], ivs.length, "مقابلة", { size: 200 })],
        ["الوظائف الشاغرة حسب القطاع", colbars(distBy(jobs.filter((j) => Number(j.stage) < JOINED)))],
      ]],
      ["training", "التدريب", [
        ["حالة طلبات التدريب", donut(TR_STAGES.map((s2, i) => [s2, cntStage(tr, i), PALETTE[i % PALETTE.length]]), tr.length, "طلب", { size: 190 })],
        ["توزيع المتدربين على القطاعات", colbars(distBy(tr))],
      ]],
      ["tamheer", "طلبات تمهير", [
        ["حالة طلبات تمهير", donut(TR_STAGES.map((s2, i) => [s2, cntStage(tm, i), PALETTE[i % PALETTE.length]]), tm.length, "طلب", { size: 190 })],
        ["توزيع متدربي تمهير على القطاعات", colbars(distBy(tm))],
      ]],
      ["resignations", "الاستقالات", [
        ["حسب الدرجة", gradeSegs.length ? donut(gradeSegs, rs.length, "استقالة", { size: 200 }) : ""],
      ]],
      ["recruitment", "الشواغر والإشغال", [
        ["نسبة الإشغال", ring(pct(a.filled, a.approved), "var(--g-700)", "إشغال", `${a.filled} مشغولة · ${vacant} شاغرة`, 210)],
        ["الشواغر", splitbar([["مشغولة", a.filled, "var(--g-700)"], ["شاغرة", vacant, "var(--g-400)"]])],
        ["الجنس", splitbar([["ذكور", a.male, "var(--g-600)"], ["إناث", a.female, "var(--gold)"]])],
      ]],
    ];

    return secs.filter(([key]) => inScope(key)).map(([, title, boxes]) => {
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
      <div class="meta">${esc2(CFG.ORG_NAME || "")} · ${esc2(scopeLabel())} · ${esc2(filterLabel())} · صدر في ${esc(fmtDate(new Date().toISOString().slice(0, 10)))}</div></header>
      ${chartHTML}${sections}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 600);
  }

  /* ---------------- الهيكل العام ---------------- */
  function shell(title, body) {
    const nav = [["index", "الرئيسية", "home"], ["recruitment", "التوظيف", "users"], ["training", "التدريب", "cap"],
    ["tamheer", "طلبات تمهير", "group"], ["resignations", "الاستقالات", "exit"]];
    const rail = nav.map(([p, tt, ic]) => `<a href="#/${p === "index" ? "" : p}" class="${state.page === p ? "on" : ""}"><span class="tip">${esc(t(tt))}</span>${icon(ic)}</a>`).join("");

    const unitOpts = `<option value="">${esc(t("الكل"))}</option>` + units().map((u) =>
      `<option value="${esc(u.id)}" ${state.filters.unit === u.id ? "selected" : ""}>${esc((u.parent_id ? "— " : "") + uname(u))}</option>`).join("");
    const yearOpts = (CFG.YEARS || [2026]).map((y) => `<option value="${y}" ${Number(state.filters.year) === y ? "selected" : ""}>${y}</option>`).join("");
    const monthOpts = `<option value="0">${esc(t("كل الأشهر"))}</option>` + MONTHS_FULL.map((m, i) =>
      `<option value="${i + 1}" ${Number(state.filters.month) === i + 1 ? "selected" : ""}>${esc(state.lang === "en" ? MONTHS_EN[i] : m)}</option>`).join("");

    const scopeOpts = SCOPES.map(([k, l]) =>
      `<option value="${esc(k)}" ${state.scope === k ? "selected" : ""}>${esc(t(l))}</option>`).join("");

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
          <label class="tb sel-wrap"><span class="k">${esc(t("محتوى التقرير"))}</span>
            <select onchange="APP.setScope(this.value)">${scopeOpts}</select>${CHEV}</label>
          <button class="btn btn-g" onclick="APP.exportPDF()" title="${esc(t("تصدير التقرير PDF حسب المحتوى المختار"))}">${icon("file")} PDF</button>
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
    job: {
      table: "jobs", title: "الوظيفة",
      fields: (r) => [
        ["title", "المسمى الوظيفي", "text", r.title, null, false],
        ["unit_id", "الإدارة", "select", r.unit_id, unitSelect(r.unit_id), false],
        ["grade", "الدرجة الوظيفية", "select", r.grade, opts(["", "الخامسة", "السادسة", "السابعة", "الثامنة", "التاسعة", "العاشرة"], r.grade), false],
        ["manager", "مدير الإدارة", "text", r.manager, null, false],
        ["hire_type", "نوع التوظيف", "select", r.hire_type, opts(["جديدة", "بديلة"], r.hire_type), false],
        ["opened_date", "تاريخ فتح الوظيفة", "date", r.opened_date, null, false],
        ["stage", "المرحلة", "select", r.stage == null ? 0 : r.stage,
          STAGES.map((s, i) => `<option value="${i}" ${Number(r.stage || 0) === i ? "selected" : ""}>${s}</option>`).join(""), false],
        ["candidate", "اسم المرشح", "text", r.candidate, null, false],
        ["received", "عدد المتقدمين", "number", r.received, null, false],
        ["start_date", "تاريخ المباشرة", "date", r.start_date, null, false],
        ["note", "آخر تحديث / ملاحظة", "text", r.note, null, true],
      ],
    },
    onboarding: {
      table: "onboarding", title: "مرحلة الانضمام",
      fields: (r) => [
        ["name", "اسم المرشح", "text", r.name, null, false],
        ["position", "المنصب", "text", r.position, null, false],
        ["grade", "الدرجة الوظيفية", "select", r.grade, opts(["الخامسة", "السادسة", "السابعة", "الثامنة", "التاسعة", "العاشرة"], r.grade), false],
        ["unit_id", "الإدارة", "select", r.unit_id, unitSelect(r.unit_id), false],
        ["manager", "مدير الإدارة", "text", r.manager, null, false],
        ["start_date", "تاريخ المباشرة", "date", r.start_date, null, false],
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
        ["start_date", "بداية التدريب", "date", r.start_date, null, false],
        ["end_date", "نهاية التدريب", "date", r.end_date, null, false],
        ["phone", "رقم الجوال", "text", r.phone, null, false],
        ["stage", "المرحلة", "select", r.stage == null ? 0 : r.stage,
          TR_STAGES.map((s, i) => `<option value="${i}" ${Number(r.stage || 0) === i ? "selected" : ""}>${s}</option>`).join(""), false],
      ],
    },
    tamheer: {
      table: "tamheer", title: "بيانات طلب تمهير",
      fields: (r) => [
        ["name", "اسم المتقدم", "text", r.name, null, false],
        ["university", "الجامعة", "text", r.university, null, false],
        ["supervisor", "المشرف التدريبي", "text", r.supervisor, null, false],
        ["unit_id", "القطاع / الإدارة", "select", r.unit_id, unitSelect(r.unit_id), false],
        ["start_date", "بداية البرنامج", "date", r.start_date, null, false],
        ["end_date", "نهاية البرنامج", "date", r.end_date, null, false],
        ["phone", "رقم الجوال", "text", r.phone, null, false],
        ["stage", "المرحلة", "select", r.stage == null ? 0 : r.stage,
          TR_STAGES.map((s, i) => `<option value="${i}" ${Number(r.stage || 0) === i ? "selected" : ""}>${s}</option>`).join(""), false],
      ],
    },
    resignation: {
      table: "resignations", title: "بيانات الاستقالة",
      fields: (r) => [
        ["name", "الاسم", "text", r.name, null, false],
        ["position", "المنصب", "text", r.position, null, false],
        ["grade", "الدرجة", "select", r.grade, opts(["الخامسة", "السادسة", "السابعة", "الثامنة", "التاسعة", "العاشرة"], r.grade), false],
        ["unit_id", "القطاع / الإدارة", "select", r.unit_id, unitSelect(r.unit_id), false],
        ["stage", "المرحلة", "select", r.stage == null ? 0 : r.stage,
          RS_STAGES.map((s, i) => `<option value="${i}" ${Number(r.stage || 0) === i ? "selected" : ""}>${s}</option>`).join(""), false],
        ["last_day", "آخر يوم عمل", "date", r.last_day, null, false],
        ["reason", "السبب (اختياري)", "text", r.reason, null, true],
      ],
    },
    update: {
      table: "updates", title: "تحديث",
      fields: (r) => [
        ["text", "نص التحديث", "text", r.text, null, true],
        ["source", "يخصّ", "select", r.source,
          opts(["", "التوظيف", "التدريب", "تمهير", "الاستقالات", "الهيكل"], r.source), false],
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

  function openForm(kind, id, preset) {
    if (!canEdit()) return;
    const F = FORMS[kind];
    const row = id ? (db()[F.table] || []).find((r) => r.id === id) || {} : {};
    // فتح النموذج من صفحة بعينها يملأ حقل «يخصّ» مسبقًا
    if (preset && !id) row.source = preset;
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
      if (el.type === "number" || ["stage", "year", "month", "approved", "filled", "junior", "senior", "male", "female", "received"].includes(el.dataset.k)) {
        v = v === "" ? null : Number(v);
      }
      payload[el.dataset.k] = v;
    });
    if (kind === "interview") payload.day = dayOf(payload.date);  // اليوم يتبع التاريخ دائمًا
    if (kind === "update") {
      payload.kind = "manual";
      payload.ts = nowLocal();
      payload.author = (state.user && state.user.name) || "";
    }
    try {
      let saved = null;
      if (id) await DB.update(F.table, id, payload);
      else saved = await DB.insert(F.table, payload);
      /* الاستقالة تفتح وظيفة بديلة فور تسجيلها (وهي في مرحلة الإشعار)،
         حتى يبدأ الاستقطاب قبل أن يخلو المقعد. تُنشأ مرة واحدة عند
         الإضافة لا عند كل تعديل، ومربوطة بسجل الاستقالة فلا تتكرر. */
      if (kind === "resignation" && !id) {
        const already = (db().jobs || []).some((j) => j.from_resignation === saved.id);
        if (!already) {
          const n = (db().jobs || []).length + 1;
          await DB.insert("jobs", {
            code: `JOB-${new Date().getFullYear()}-${String(n).padStart(3, "0")}`,
            title: payload.position || "", unit_id: payload.unit_id || "",
            grade: payload.grade || "", manager: "", hire_type: "بديلة",
            opened_date: new Date().toISOString().slice(0, 10),
            stage: 0, candidate: "", received: 0, start_date: "",
            note: `${t("بديل استقالة")}: ${payload.name || ""}`,
            from_resignation: saved.id,
            year: payload.year, month: payload.month,
          });
          await logUpdate(`فتح وظيفة بديلة — ${payload.position || ""}`, { source: "التوظيف" });
          toast("فُتحت وظيفة بديلة لهذه الاستقالة");
        }
      }
      // التحديث اليدوي لا يُسجَّل تلقائيًا — هو نفسه بند في السجل
      if (kind !== "update") {
        const who = payload.name || payload.candidate || payload.title || "";
        await logUpdate(`${id ? "تعديل" : "إضافة"} — ${F.title}${who ? ": " + who : ""}`);
      }
      closeForm();
      render();
      toast(id ? "تم حفظ التعديلات" : "تمت الإضافة بنجاح");
    } catch (e) {
      alert("تعذّر الحفظ: " + e.message);
    }
  }

  async function removeRow(table, id) {
    if (!confirm("هل تريد حذف هذا السجل؟")) return;
    const row = (db()[table] || []).find((r) => r.id === id) || {};
    try {
      await DB.remove(table, id);
      // حذف بند من السجل نفسه لا يُسجَّل، وإلا لما أمكن تنظيفه أبدًا
      if (table !== "updates") {
        const who = row.name || row.candidate || row.title || "";
        await logUpdate(`حذف — ${(EXPORT[table] || {}).title || table}${who ? ": " + who : ""}`);
      }
      render(); toast("تم الحذف");
    } catch (e) { alert("تعذّر الحذف: " + e.message); }
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
    "الكل": "All", "منتهي": "Ended", "عرض الكل": "Show all", "بديل استقالة": "Backfill for", "وحدات": "units", "نسبة الإشغال مقابل الوظائف": "Occupancy vs positions", "الوظائف والانضمام": "Positions and onboarding", "انضم": "joined", "كل الأشهر": "All months", "تعديل العناوين": "Edit titles",
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
    "الملخص التنفيذي": "Executive summary", "التفاصيل الإضافية": "Additional details",
    "التحديثات": "Updates", "إضافة تحديث": "Add update", "يدوي": "Manual", "تلقائي": "Automatic",
    "تحديثات تمهير": "Tamheer updates", "تظهر في الملخص التنفيذي": "Appears in the executive summary",
    "لا توجد تحديثات بعد": "No updates yet", "نص التحديث": "Update text", "يخصّ": "Relates to",
    "محتوى التقرير": "Report content", "الكل": "All",
    "تصدير التقرير PDF حسب المحتوى المختار": "Export PDF for the selected content",
    "حالة طلبات المقابلات": "Interview requests status",
    "نسبة إنجاز طلبات المقابلات": "Interview requests completion",
    "إنجاز المقابلات": "completed", "مكتملة من": "completed of", "مكتمل من": "completed of",
    "المتدربين": "Trainees", "إجمالي طلبات تمهير": "Total Tamheer requests", "طلب تمهير": "Tamheer requests",
    "أعلى قطاع": "Highest department", "أقل قطاع": "Lowest department",
    "تعديل المستهدف": "Edit target", "من مستهدف": "of target",
    "آخر تحديث": "Last update", "تعرض الآن مرحلة": "Now showing stage",
    "استقالة حتى اليوم": "resignations to date", "استقالات الشهر الحالي": "Resignations this month",
    "الإنجازات هذا الشهر": "Net change this month", "الشواغر المفتوحة": "Open positions",
    "مرشحون تحت الإجراء": "Candidates in progress", "متدربون قائمون": "Active trainees",
    "الإشغال حسب القطاع": "Occupancy by department", "الأدنى أولًا": "Lowest first", "الأعلى أولًا": "Highest first",
    "التعيينات مقابل الاستقالات": "Hires vs resignations", "من بداية": "since",
    "مقارنة بالشهر السابق": "vs previous month", "ضمن الفترة المختارة": "within the selected period", "وظيفة معتمدة": "approved positions",
    "في المراحل الست": "across the six stages", "تعيينات": "hires", "استقالات": "resignations",
    "تدريب": "training", "تمهير": "Tamheer", "تعيينًا": "hires", "صافي": "net",
    "عرض": "View", "بنود": "items", "الأدنى": "lowest", "شاغرًا من": "vacant of",
    "مقابلات تمت بلا تقييم": "completed interviews without rating",
    "تعطّل قرار الترشيح — لا تقييم للموارد البشرية ولا للإدارة": "Blocking the shortlisting decision — no HR or manager rating",
    "انتهت فترتهم ولم تُحدَّث حالتهم": "ended but status not updated",
    "يظهرون «قائم» رغم انقضاء تاريخ النهاية": "Still shown as Active past their end date",
    "مرشحين واقفون عند": "candidates stuck at", "أكبر تجمّع في مرحلة واحدة": "Largest cluster in one stage",
    "لا توجد بنود تحتاج متابعة": "Nothing needs follow-up",
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
    setOccSort(v) { state.occSort = v === "desc" ? "desc" : "asc"; render(); },
    exportPDF,
    setScope(v) { state.scope = v || "all"; render(); },
    toggleLang() { applyLang(state.lang === "en" ? "ar" : "en"); render(); },
    setStatus(key, v) { state.status[key] = v || null; render(); },
    async setTarget(key) {
      if (!canEditTitles()) return;
      const cur = (db().settings.find((s) => s.key === key) || {}).value || "";
      const v = prompt("المستهدف الجديد:", cur);
      if (v === null) return;
      const n = Number(String(v).replace(/[^0-9]/g, ""));
      if (!n) { alert("أدخل رقمًا أكبر من صفر"); return; }
      try {
        const rec = db().settings.find((s) => s.key === key);
        if (rec) await DB.update("settings", rec.id, { value: String(n) });
        else await DB.insert("settings", { key: key, value: String(n) });
        await logUpdate(`تعديل المستهدف إلى ${n}`, { source: key === "training_target" ? "التدريب" : "تمهير" });
        render(); toast("تم تحديث المستهدف");
      } catch (e) { alert("تعذّر الحفظ: " + e.message); }
    },
    focusOrg(id) { state.orgFocus = id || ""; render(); },
    setOnbUnit(v) { state.onbUnit = v || ""; render(); },
    toggleNode(id) { state.openNodes[id] = !state.openNodes[id]; render(); },
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
