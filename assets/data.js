/* ===========================================================
   طبقة البيانات — تعمل مع Supabase إن توفّرت الإعدادات،
   وإلا تعمل محليًا (localStorage) ببيانات ابتدائية.
   =========================================================== */
(function () {
  const CFG = window.APP_CONFIG || {};
  const HAS_REMOTE = !!(CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY);
  const LS_KEY = "adaa_hr_dashboard_v1";

  /* ---------- الجداول ---------- */
  const TABLES = [
    "org_units",   // الهيكل التنظيمي (قطاعات/إدارات/أقسام)
    "jobs",        // الوظائف: كل وظيفة سجل مستقل يتحرك في مراحل التوظيف
    "interviews",  // المقابلات
    "onboarding",  // الانضمام
    "trainees",    // المتدربون
    "tamheer",     // طلبات تمهير
    "resignations",// الاستقالات
    "updates",     // سجل التحديثات: تلقائي من كل تعديل + ملاحظات يدوية
    "settings",    // العناوين القابلة للتعديل
  ];

  /* ---------- بيانات ابتدائية ---------- */
  const SEED = {
    org_units: [
      { id: "perf", name: "إدارة الأداء", name_en: "Performance Management", parent_id: null, approved: 0, filled: 0, junior: 0, senior: 0, male: 0, female: 0 },
      { id: "perf-q", name: "إدارة جودة الأداء", name_en: "Performance Quality", parent_id: "perf", approved: 7, filled: 0, junior: 0, senior: 0, male: 2, female: 5 },
      { id: "perf-adv", name: "الدعم الاستشاري", name_en: "Advisory Support", parent_id: "perf", approved: 0, filled: 0, junior: 0, senior: 0, male: 0, female: 0 },
      { id: "perf-adv-1", name: "المشاريع الخاصة", name_en: "Special Projects", parent_id: "perf-adv", approved: 8, filled: 0, junior: 0, senior: 0, male: 0, female: 8 },
      { id: "perf-adv-2", name: "دعم إدارة الأداء", name_en: "Performance Management Support", parent_id: "perf-adv", approved: 3, filled: 0, junior: 0, senior: 0, male: 0, female: 3 },
      { id: "perf-cap", name: "تنمية القدرات المؤسسية", name_en: "Institutional Capability Development", parent_id: "perf", approved: 0, filled: 0, junior: 0, senior: 0, male: 0, female: 0 },
      { id: "perf-cap-1", name: "تقييم ممارسات أداء الأجهزة", name_en: "Entity Performance Practices Assessment", parent_id: "perf-cap", approved: 7, filled: 0, junior: 0, senior: 0, male: 0, female: 7 },
      { id: "perf-cap-2", name: "تنمية قدرات الأجهزة", name_en: "Entity Capability Development", parent_id: "perf-cap", approved: 5, filled: 0, junior: 0, senior: 0, male: 0, female: 5 },
      { id: "perf-ana", name: "التحاليل المتقدمة والتقارير", name_en: "Advanced Analytics & Reporting", parent_id: "perf", approved: 0, filled: 0, junior: 0, senior: 0, male: 0, female: 0 },
      { id: "perf-ana-1", name: "التحاليل المتقدمة", name_en: "Advanced Analytics", parent_id: "perf-ana", approved: 3, filled: 0, junior: 0, senior: 0, male: 3, female: 0 },
      { id: "perf-ana-2", name: "التقارير", name_en: "Reporting", parent_id: "perf-ana", approved: 8, filled: 0, junior: 0, senior: 0, male: 1, female: 7 },
      { id: "perf-dev", name: "تطوير الأداء", name_en: "Performance Development", parent_id: "perf", approved: 0, filled: 0, junior: 0, senior: 0, male: 0, female: 0 },
      { id: "perf-dev-1", name: "الاستراتيجيات والتخطيط", name_en: "Strategy & Planning", parent_id: "perf-dev", approved: 5, filled: 0, junior: 0, senior: 0, male: 0, female: 5 },
      { id: "perf-dev-2", name: "إدارة مخاطر الأداء", name_en: "Performance Risk Management", parent_id: "perf-dev", approved: 8, filled: 0, junior: 0, senior: 0, male: 0, female: 8 },
      { id: "perf-dev-3", name: "إدارة تجربة المستفيد", name_en: "Beneficiary Experience", parent_id: "perf-dev", approved: 3, filled: 0, junior: 0, senior: 0, male: 1, female: 2 },
      { id: "perf-dev-4", name: "إدارة المنتجات الخاصة", name_en: "Special Products", parent_id: "perf-dev", approved: 2, filled: 0, junior: 0, senior: 0, male: 2, female: 0 },
      { id: "perf-ops", name: "عمليات إدارة الأداء", name_en: "Performance Operations", parent_id: "perf", approved: 0, filled: 0, junior: 0, senior: 0, male: 0, female: 0 },
      { id: "perf-ops-1", name: "عمليات القطاع المالي والاقتصادي", name_en: "Financial & Economic Sector Operations", parent_id: "perf-ops", approved: 8, filled: 0, junior: 0, senior: 0, male: 0, female: 8 },
      { id: "perf-ops-2", name: "عمليات قطاع الشؤون الأمنية والعدلية", name_en: "Security & Judicial Affairs Sector Operations", parent_id: "perf-ops", approved: 5, filled: 0, junior: 0, senior: 0, male: 0, female: 5 },
      { id: "perf-ops-3", name: "عمليات قطاع الصناعة والتنمية المناطقية", name_en: "Industry & Regional Development Sector Operations", parent_id: "perf-ops", approved: 4, filled: 0, junior: 0, senior: 0, male: 2, female: 2 },
      { id: "perf-ops-4", name: "عمليات قطاع البنية التحتية", name_en: "Infrastructure Sector Operations", parent_id: "perf-ops", approved: 8, filled: 0, junior: 0, senior: 0, male: 2, female: 6 },
      { id: "perf-ops-5", name: "عمليات قطاع جودة الحياة", name_en: "Quality of Life Sector Operations", parent_id: "perf-ops", approved: 3, filled: 0, junior: 0, senior: 0, male: 2, female: 1 },
      { id: "perf-ops-6", name: "عمليات قطاع التنمية الاجتماعية", name_en: "Social Development Sector Operations", parent_id: "perf-ops", approved: 4, filled: 0, junior: 0, senior: 0, male: 0, female: 4 },
      { id: "perf-ops-7", name: "دعم عمليات الأداء", name_en: "Performance Operations Support", parent_id: "perf-ops", approved: 5, filled: 0, junior: 0, senior: 0, male: 2, female: 3 },
      { id: "shared", name: "الخدمات المشتركة", name_en: "Shared Services", parent_id: null, approved: 0, filled: 0, junior: 0, senior: 0, male: 0, female: 0 },
      { id: "shared-proc", name: "المشتريات والعقود", name_en: "Procurement & Contracts", parent_id: "shared", approved: 3, filled: 0, junior: 0, senior: 0, male: 0, female: 3 },
      { id: "shared-adm", name: "الشؤون الإدارية", name_en: "Administrative Affairs", parent_id: "shared", approved: 2, filled: 0, junior: 0, senior: 0, male: 2, female: 0 },
      { id: "shared-fin", name: "المالية", name_en: "Finance", parent_id: "shared", approved: 0, filled: 0, junior: 0, senior: 0, male: 0, female: 0 },
      { id: "shared-fin-1", name: "المحاسبة", name_en: "Accounting", parent_id: "shared-fin", approved: 5, filled: 0, junior: 0, senior: 0, male: 3, female: 2 },
      { id: "shared-fin-2", name: "الرقابة والتقارير", name_en: "Control & Reporting", parent_id: "shared-fin", approved: 8, filled: 0, junior: 0, senior: 0, male: 5, female: 3 },
      { id: "shared-it", name: "التحول الرقمي وتقنية المعلومات", name_en: "Digital Transformation & IT", parent_id: "shared", approved: 0, filled: 0, junior: 0, senior: 0, male: 0, female: 0 },
      { id: "shared-it-sol", name: "حلول الأعمال", name_en: "Business Solutions", parent_id: "shared-it", approved: 9, filled: 0, junior: 0, senior: 0, male: 9, female: 0 },
      { id: "shared-it-1", name: "تقنية المعلومات", name_en: "Information Technology", parent_id: "shared-it", approved: 9, filled: 0, junior: 0, senior: 0, male: 5, female: 4 },
      { id: "shared-it-2", name: "هندسة البيانات", name_en: "Data Engineering", parent_id: "shared-it", approved: 6, filled: 0, junior: 0, senior: 0, male: 1, female: 5 },
      { id: "shared-it-3", name: "التحول الرقمي", name_en: "Digital Transformation", parent_id: "shared-it", approved: 4, filled: 0, junior: 0, senior: 0, male: 1, female: 3 },
      { id: "shared-hc", name: "رأس المال البشري", name_en: "Human Capital", parent_id: "shared", approved: 0, filled: 0, junior: 0, senior: 0, male: 0, female: 0 },
      { id: "shared-hc-1", name: "عمليات الموارد البشرية", name_en: "HR Operations", parent_id: "shared-hc", approved: 3, filled: 0, junior: 0, senior: 0, male: 2, female: 1 },
      { id: "shared-hc-2", name: "إدارة واستقطاب وتطوير المواهب", name_en: "Talent Acquisition & Development", parent_id: "shared-hc", approved: 9, filled: 0, junior: 0, senior: 0, male: 5, female: 4 },
      { id: "shared-hc-3", name: "ثقافة العمل والانخراط الوظيفي", name_en: "Workplace Culture & Engagement", parent_id: "shared-hc", approved: 9, filled: 0, junior: 0, senior: 0, male: 4, female: 5 },
      { id: "shared-hc-4", name: "تخطيط وتنمية الموارد البشرية", name_en: "HR Planning & Development", parent_id: "shared-hc", approved: 3, filled: 0, junior: 0, senior: 0, male: 0, female: 3 },
      { id: "grc", name: "الحوكمة والمخاطر والالتزام ومكتب البيانات", name_en: "Governance, Risk, Compliance & Data Office", parent_id: null, approved: 0, filled: 0, junior: 0, senior: 0, male: 0, female: 0 },
      { id: "grc-1", name: "الحوكمة والمخاطر والالتزام واستمرارية الأعمال", name_en: "Governance, Risk, Compliance & Business Continuity", parent_id: "grc", approved: 8, filled: 0, junior: 0, senior: 0, male: 2, female: 6 },
      { id: "grc-2", name: "الأمن السيبراني", name_en: "Cybersecurity", parent_id: "grc", approved: 7, filled: 0, junior: 0, senior: 0, male: 2, female: 5 },
      { id: "grc-3", name: "مكتب إدارة البيانات", name_en: "Data Management Office", parent_id: "grc", approved: 9, filled: 0, junior: 0, senior: 0, male: 6, female: 3 },
      { id: "strat", name: "التحول الاستراتيجي", name_en: "Strategic Transformation", parent_id: null, approved: 0, filled: 0, junior: 0, senior: 0, male: 0, female: 0 },
      { id: "strat-1", name: "الاستراتيجية المؤسسية", name_en: "Corporate Strategy", parent_id: "strat", approved: 2, filled: 0, junior: 0, senior: 0, male: 2, female: 0 },
      { id: "strat-2", name: "التميز المؤسسي", name_en: "Corporate Excellence", parent_id: "strat", approved: 3, filled: 0, junior: 0, senior: 0, male: 2, female: 1 },
      { id: "strat-3", name: "مكتب إدارة المشاريع", name_en: "Project Management Office", parent_id: "strat", approved: 7, filled: 0, junior: 0, senior: 0, male: 5, female: 2 },
      { id: "legal", name: "القانونية", name_en: "Legal", parent_id: null, approved: 0, filled: 0, junior: 0, senior: 0, male: 0, female: 0 },
      { id: "legal-1", name: "الاستشارات والعقود", name_en: "Legal Advisory & Contracts", parent_id: "legal", approved: 9, filled: 0, junior: 0, senior: 0, male: 9, female: 0 },
      { id: "legal-2", name: "الامتثال والتمثيل", name_en: "Compliance & Representation", parent_id: "legal", approved: 9, filled: 0, junior: 0, senior: 0, male: 1, female: 8 },
      { id: "gmo", name: "مكتب المدير العام", name_en: "Director General's Office", parent_id: null, approved: 0, filled: 0, junior: 0, senior: 0, male: 0, female: 0 },
      { id: "gmo-1", name: "المراسلات والوثائق والمحفوظات", name_en: "Correspondence, Documents & Archives", parent_id: "gmo", approved: 3, filled: 0, junior: 0, senior: 0, male: 2, female: 1 },
      { id: "gmo-2", name: "الأعمال التنفيذية", name_en: "Executive Affairs", parent_id: "gmo", approved: 9, filled: 0, junior: 0, senior: 0, male: 1, female: 8 },
      { id: "comm", name: "التواصل المؤسسي", name_en: "Corporate Communication", parent_id: null, approved: 0, filled: 0, junior: 0, senior: 0, male: 0, female: 0 },
      { id: "comm-1", name: "الإعلام والهوية المؤسسية", name_en: "Media & Corporate Identity", parent_id: "comm", approved: 2, filled: 0, junior: 0, senior: 0, male: 2, female: 0 },
      { id: "comm-2", name: "العلاقات العامة", name_en: "Public Relations", parent_id: "comm", approved: 6, filled: 0, junior: 0, senior: 0, male: 5, female: 1 },
      { id: "audit", name: "المراجعة الداخلية", name_en: "Internal Audit", parent_id: null, approved: 9, filled: 0, junior: 0, senior: 0, male: 4, female: 5 },
    ],

    /* الوظائف — كل صف وظيفة واحدة تتحرك في المراحل السبع.
       stage: 0 شاغرة · 1 المقابلة · 2 العرض الأولي · 3 المسح الأمني
              4 الفحص الطبي · 5 العرض النهائي · 6 الانضمام */
    jobs: [
      { id: "j1", code: "JOB-2026-001", title: "منسق موارد بشرية", unit_id: "shared-hc", grade: "السادسة", manager: "أ. نورة السالم", hire_type: "جديدة", opened_date: "2026-06-01", stage: 5, candidate: "ليان المطيري", received: 18, start_date: "", note: "تم توقيع العرض النهائي", year: 2026, month: 7 },
      { id: "j2", code: "JOB-2026-002", title: "أخصائي تحليل بيانات", unit_id: "perf-ana-1", grade: "السابعة", manager: "أ. خالد العمري", hire_type: "جديدة", opened_date: "2026-06-05", stage: 2, candidate: "سارة الدوسري", received: 72, start_date: "", note: "العرض الأولي مرسل · بانتظار الرد", year: 2026, month: 7 },
      { id: "j3", code: "JOB-2026-003", title: "مدير مشاريع", unit_id: "strat-3", grade: "التاسعة", manager: "أ. ريم الشمري", hire_type: "بديلة", opened_date: "2026-06-10", stage: 3, candidate: "لمى العتيبي", received: 41, start_date: "", note: "المسح الأمني قيد المراجعة", year: 2026, month: 7 },
      { id: "j4", code: "JOB-2026-004", title: "مستشار قانوني", unit_id: "legal-1", grade: "الثامنة", manager: "أ. منى الحربي", hire_type: "جديدة", opened_date: "2026-06-12", stage: 4, candidate: "فيصل القحطاني", received: 26, start_date: "", note: "الفحص الطبي مكتمل", year: 2026, month: 7 },
      { id: "j5", code: "JOB-2026-005", title: "مدقق داخلي", unit_id: "audit", grade: "السابعة", manager: "أ. طارق الغامدي", hire_type: "جديدة", opened_date: "2026-06-15", stage: 4, candidate: "محمد البلوي", received: 48, start_date: "", note: "الفحص الطبي محجوز", year: 2026, month: 7 },
      { id: "j6", code: "JOB-2026-006", title: "أخصائي أنظمة", unit_id: "shared-it-1", grade: "السابعة", manager: "أ. نورة السالم", hire_type: "جديدة", opened_date: "2026-05-20", stage: 6, candidate: "عبدالعزيز الحارثي", received: 33, start_date: "2026-08-10", note: "مباشرة رسمية", year: 2026, month: 8 },
      { id: "j7", code: "JOB-2026-007", title: "محلل مالي", unit_id: "shared-fin", grade: "السادسة", manager: "أ. نورة السالم", hire_type: "بديلة", opened_date: "2026-06-18", stage: 5, candidate: "نايف الرشيدي", received: 21, start_date: "", note: "العرض النهائي مرسل", year: 2026, month: 7 },
      { id: "j8", code: "JOB-2026-008", title: "أخصائي مشتريات", unit_id: "shared-proc", grade: "السادسة", manager: "أ. نورة السالم", hire_type: "جديدة", opened_date: "2026-07-01", stage: 0, candidate: "", received: 58, start_date: "", note: "", year: 2026, month: 7 },
      { id: "j9", code: "JOB-2026-009", title: "أخصائي حوكمة", unit_id: "grc-1", grade: "السابعة", manager: "أ. منى الحربي", hire_type: "جديدة", opened_date: "2026-07-03", stage: 0, candidate: "", received: 54, start_date: "", note: "", year: 2026, month: 7 },
      { id: "j10", code: "JOB-2026-010", title: "منسق إداري", unit_id: "gmo-2", grade: "الخامسة", manager: "أ. سعد", hire_type: "جديدة", opened_date: "2026-07-05", stage: 0, candidate: "", received: 19, start_date: "", note: "", year: 2026, month: 7 },
    ],

    interviews: [
      { id: "i1", candidate: "سارة الدوسري", position: "أخصائي تحليل بيانات", unit_id: "perf", owner: "أ. خالد العمري", status: "مجدولة", date: "2026-07-28", day: "الثلاثاء", time: "10:00", job_source: "توظيف مباشر", cand_source: "لينكدإن", cand_source_name: "", hr_rating: "ممتاز", mgr_rating: "جيد جدًا", year: 2026, month: 7 },
      { id: "i2", candidate: "فيصل القحطاني", position: "مستشار قانوني", unit_id: "legal", owner: "أ. منى الحربي", status: "تمت", date: "2026-07-26", day: "الأحد", time: "12:30", job_source: "إعلان داخلي", cand_source: "توصية", cand_source_name: "أ. سعد", hr_rating: "جيد جدًا", mgr_rating: "ممتاز", year: 2026, month: 7 },
      { id: "i3", candidate: "عبدالله الزهراني", position: "أخصائي مشتريات", unit_id: "shared", owner: "أ. نورة السالم", status: "مرفوضة", date: "2026-07-24", day: "الخميس", time: "09:00", job_source: "منصة توظيف", cand_source: "أخرى", cand_source_name: "", hr_rating: "مقبول", mgr_rating: "ضعيف", year: 2026, month: 7 },
      { id: "i4", candidate: "لمى العتيبي", position: "مدير مشاريع", unit_id: "strat", owner: "أ. ريم الشمري", status: "مجدولة", date: "2026-07-29", day: "الأربعاء", time: "11:00", job_source: "توظيف مباشر", cand_source: "لينكدإن", cand_source_name: "", hr_rating: "", mgr_rating: "", year: 2026, month: 7 },
      { id: "i5", candidate: "محمد البلوي", position: "مدقق داخلي", unit_id: "audit", owner: "أ. طارق الغامدي", status: "تمت", date: "2026-07-25", day: "الجمعة", time: "10:30", job_source: "إعلان خارجي", cand_source: "لينكدإن", cand_source_name: "", hr_rating: "ممتاز", mgr_rating: "جيد", year: 2026, month: 7 },
    ],

    onboarding: [
      { id: "o1", name: "ليان المطيري", position: "منسق موارد بشرية", grade: "السادسة", unit_id: "shared-hc", manager: "أ. نورة السالم", start_date: "2026-08-03", notes: "مباشرة رسمية", year: 2026, month: 8 },
    ],

    trainees: [
      { id: "t1", name: "سلمان العنزي", supervisor: "أ. خالد العمري", university: "جامعة الملك سعود", unit_id: "perf", start_date: "2026-07-01", end_date: "2026-08-31", phone: "0551234567", stage: 2, year: 2026, month: 7 },
      { id: "t2", name: "جواهر الفهد", supervisor: "أ. منى الحربي", university: "جامعة الأميرة نورة", unit_id: "legal", start_date: "2026-06-15", end_date: "2026-09-15", phone: "0559876543", stage: 2, year: 2026, month: 6 },
      { id: "t3", name: "راكان الدوسري", supervisor: "أ. نورة السالم", university: "جامعة الملك فهد", unit_id: "shared", start_date: "2026-08-01", end_date: "2026-09-30", phone: "0501112223", stage: 1, year: 2026, month: 8 },
      { id: "t4", name: "دانة القحطاني", supervisor: "أ. ريم الشمري", university: "جامعة الإمام", unit_id: "strat", start_date: "2026-07-10", end_date: "2026-10-10", phone: "0533334445", stage: 2, year: 2026, month: 7 },
      { id: "t5", name: "عبدالرحمن الشهري", supervisor: "أ. طارق الغامدي", university: "جامعة الملك عبدالعزيز", unit_id: "audit", start_date: "2026-06-20", end_date: "2026-09-20", phone: "0544445556", stage: 3, year: 2026, month: 6 },
    ],

    tamheer: [
      { id: "tm1", name: "فهد الحربي", supervisor: "أ. خالد العمري", university: "جامعة الملك سعود", unit_id: "perf", start_date: "2026-07-01", end_date: "2026-12-31", phone: "0553334445", stage: 2, year: 2026, month: 7 },
      { id: "tm2", name: "نورة الشمري", supervisor: "أ. نورة السالم", university: "جامعة الأميرة نورة", unit_id: "shared", start_date: "2026-06-01", end_date: "2026-11-30", phone: "0556667778", stage: 2, year: 2026, month: 6 },
      { id: "tm3", name: "تركي المالكي", supervisor: "أ. منى الحربي", university: "جامعة الملك فهد", unit_id: "grc", start_date: "2026-08-15", end_date: "2027-02-15", phone: "0502223334", stage: 1, year: 2026, month: 8 },
      { id: "tm4", name: "شهد العتيبي", supervisor: "أ. ريم الشمري", university: "جامعة الملك عبدالعزيز", unit_id: "strat", start_date: "2026-07-01", end_date: "2026-12-31", phone: "0534445556", stage: 2, year: 2026, month: 7 },
      { id: "tm5", name: "بدر الزهراني", supervisor: "أ. طارق الغامدي", university: "جامعة الإمام", unit_id: "audit", start_date: "2026-05-01", end_date: "2026-10-31", phone: "0545556667", stage: 3, year: 2026, month: 5 },
    ],

    resignations: [
      { id: "r1", name: "ماجد السبيعي", position: "محلل نظم", grade: "الثامنة", unit_id: "perf", last_day: "2026-08-15", reason: "", stage: 1, year: 2026, month: 8 },
      { id: "r2", name: "هيفاء المالكي", position: "أخصائي تسويق", grade: "السابعة", unit_id: "shared", last_day: "2026-07-31", reason: "", stage: 1, year: 2026, month: 7 },
      { id: "r3", name: "بندر العتيبي", position: "مدير إدارة", grade: "التاسعة", unit_id: "shared", last_day: "2026-08-20", reason: "", stage: 1, year: 2026, month: 8 },
      { id: "r4", name: "أروى الجهني", position: "منسق إداري", grade: "السادسة", unit_id: "grc", last_day: "2026-08-05", reason: "", stage: 1, year: 2026, month: 8 },
    ],

    // سجل التحديثات — يبدأ فارغًا ويمتلئ من عمل المستخدمين
    updates: [],

    settings: [
      { id: "targets", key: "training_target", value: "20" },
      { id: "tamheer", key: "tamheer_target", value: "40" },
      { id: "titles", key: "titles", value: "{}" },
    ],
  };

  /* ---------- تخزين محلي ---------- */
  function readLocal() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) return migrate(JSON.parse(raw));
    } catch (e) {}
    const fresh = JSON.parse(JSON.stringify(SEED));
    writeLocal(fresh);
    return fresh;
  }

  // بيانات محفوظة من إصدار أقدم قد تنقصها جداول أو إعدادات أضيفت لاحقًا
  function migrate(db) {
    let changed = false;

    /* ---- من «الشواغر + المرشحون» إلى «الوظائف» ----
       الوظيفة صارت السجل الذي يتحرك في المراحل، فيُدمج الجدولان فيها:
       كل مرشح يصير وظيفة في مرحلته، وكل صف شواغر بعدد n يصير n وظيفة شاغرة.
       يجري قبل تعبئة الجداول الناقصة حتى لا تُحقن بذرة الوظائف فوق بياناتك. */
    if (!Array.isArray(db.jobs) && (Array.isArray(db.vacancies) || Array.isArray(db.candidates))) {
      const jobs = [];
      let n = 0;
      const code = () => `JOB-${new Date().getFullYear()}-${String(++n).padStart(3, "0")}`;
      (db.candidates || []).forEach((c) => {
        jobs.push({
          id: uid(), code: code(), title: c.position || "", unit_id: c.unit_id || "",
          grade: "", manager: "", hire_type: "جديدة", opened_date: "",
          // المراحل انزاحت واحدة لأن «شاغرة» أُضيفت في أولها
          stage: Math.min(Number(c.stage || 0) + 1, 6), candidate: c.name || "",
          received: 0, start_date: "", note: c.note || "", year: c.year, month: c.month,
        });
      });
      (db.vacancies || []).forEach((v) => {
        const many = Math.max(1, Number(v.count || 1));
        for (let k = 0; k < many; k++) {
          jobs.push({
            id: uid(), code: code(), title: v.title || "", unit_id: v.unit_id || "",
            grade: "", manager: "", hire_type: "جديدة", opened_date: "",
            stage: 0, candidate: "",
            // إجمالي المتقدمين يُحفظ على أول وظيفة من المجموعة فلا يتضاعف
            received: k === 0 ? Number(v.received || 0) : 0,
            start_date: "", note: "", year: v.year, month: v.month,
          });
        }
      });
      db.jobs = jobs;
      delete db.vacancies;
      delete db.candidates;
      changed = true;
    }

    /* ---- وظائف بلا معرّف ----
       أُضيفت قبل أن يصير المعرّف يُولَّد تلقائيًا. نُسند لكل واحدة رقمًا
       يبدأ بعد أكبر رقم مستخدم في سنتها فلا يتصادم مع القائم. */
    if (Array.isArray(db.jobs)) {
      const seq = {};
      db.jobs.forEach((j) => {
        const m = /^JOB-(\d{4})-(\d+)$/.exec(String(j.code || ""));
        if (m) seq[m[1]] = Math.max(seq[m[1]] || 0, Number(m[2]));
      });
      db.jobs.forEach((j) => {
        if (String(j.code || "").trim()) return;
        const yr = String(Number(j.year) || new Date().getFullYear());
        seq[yr] = (seq[yr] || 0) + 1;
        j.code = `JOB-${yr}-${String(seq[yr]).padStart(3, "0")}`;
        changed = true;
      });
    }

    /* ---- الحالات النصية إلى مراحل مرقّمة ---- */
    const TR_FROM_STATUS = { "تحت الإجراء": 1, "قائم": 2, "مكتمل": 3 };
    for (const t of ["trainees", "tamheer"]) {
      (db[t] || []).forEach((r) => {
        if (r.stage == null && r.status) { r.stage = TR_FROM_STATUS[r.status]; delete r.status; changed = true; }
      });
    }
    (db.resignations || []).forEach((r) => {
      // من مضى آخر يوم عمل له فقد انتهى، ومن لم يمضِ فهو في الإشعار
      if (r.stage == null) {
        r.stage = r.last_day && String(r.last_day) <= new Date().toISOString().slice(0, 10) ? 1 : 0;
        changed = true;
      }
    });

    for (const t of TABLES) {
      if (!Array.isArray(db[t])) { db[t] = JSON.parse(JSON.stringify(SEED[t] || [])); changed = true; }
    }
    for (const s of SEED.settings) {
      if (!db.settings.some((x) => x.key === s.key)) { db.settings.push(JSON.parse(JSON.stringify(s))); changed = true; }
    }
    /* وحدات تنظيمية أُضيفت للهيكل بعد أن حُفظت البيانات محليًا.
       إضافة فقط — لا نلمس وحدة موجودة حتى لا تضيع الأرقام المُدخلة عليها،
       ولا نحذف وحدة أضافها المستخدم بنفسه من صفحة القطاعات. */
    for (const u of SEED.org_units) {
      if (!db.org_units.some((x) => x.id === u.id)) {
        const at = db.org_units.findIndex((x) => x.parent_id === u.parent_id);
        db.org_units.splice(at < 0 ? db.org_units.length : at, 0, JSON.parse(JSON.stringify(u)));
        changed = true;
      }
    }
    /* هيكل مهجور من نسخة أقدم — معرّفاته s1..s7 وفروعها.
       الترحيل الإضافي أعلاه كان يضع الهيكل الجديد فوقه فيظهر هيكلان
       متراكبان في كل الرسوم. ننقل السجلات إلى ما يقابل قطاعها ثم نحذفه.
       الوحدات التي يضيفها المستخدم معرّفها يبدأ بـ x فلا تتأثر. */
    const RETIRED_ROOT = { s1: "perf", s2: "shared", s3: "legal", s4: "gmo", s5: "grc", s6: "strat", s7: "audit" };
    const isRetired = (id) => /^s\d/.test(String(id || ""));
    if (db.org_units.some((u) => isRetired(u.id))) {
      // أي وحدة قديمة تُنسب إلى قطاعها الجذر ثم إلى مقابله الجديد
      const newIdFor = (id) => {
        let cur = id;
        for (let hop = 0; cur && hop < 20; hop++) {
          if (RETIRED_ROOT[cur]) return RETIRED_ROOT[cur];
          const u = db.org_units.find((x) => x.id === cur);
          cur = u ? u.parent_id : null;
        }
        return "";
      };
      const moveTo = {};
      db.org_units.forEach((u) => { if (isRetired(u.id)) moveTo[u.id] = newIdFor(u.id); });
      for (const t of TABLES) {
        if (t === "org_units" || !Array.isArray(db[t])) continue;
        db[t].forEach((r) => {
          if (r.unit_id && Object.prototype.hasOwnProperty.call(moveTo, r.unit_id)) r.unit_id = moveTo[r.unit_id];
        });
      }
      db.org_units = db.org_units.filter((u) => !isRetired(u.id));
      changed = true;
    }

    if (changed) writeLocal(db);
    return db;
  }
  function writeLocal(db) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(db)); } catch (e) {}
  }

  /* ---------- عميل Supabase ---------- */
  let sb = null;
  function client() {
    if (!HAS_REMOTE) return null;
    if (!sb && window.supabase) {
      sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
    }
    return sb;
  }

  const uid = () => "x" + Math.random().toString(36).slice(2, 10);

  /* ---------- واجهة البيانات ---------- */
  const DB = {
    isRemote: HAS_REMOTE,
    cache: null,

    async loadAll() {
      if (!HAS_REMOTE) { this.cache = readLocal(); return this.cache; }
      const c = client();
      const out = {};
      for (const t of TABLES) {
        const { data, error } = await c.from(t).select("*");
        if (error) throw new Error(`تعذّر تحميل ${t}: ${error.message}`);
        out[t] = data || [];
      }
      this.cache = out;
      return out;
    },

    async insert(table, row) {
      row = Object.assign({}, row);
      if (!HAS_REMOTE) {
        row.id = row.id || uid();
        this.cache[table].push(row);
        writeLocal(this.cache);
        return row;
      }
      const { data, error } = await client().from(table).insert(row).select().single();
      if (error) throw new Error(error.message);
      this.cache[table].push(data);
      return data;
    },

    async update(table, id, patch) {
      if (!HAS_REMOTE) {
        const i = this.cache[table].findIndex((r) => r.id === id);
        if (i > -1) Object.assign(this.cache[table][i], patch);
        writeLocal(this.cache);
        return this.cache[table][i];
      }
      const { data, error } = await client().from(table).update(patch).eq("id", id).select().single();
      if (error) throw new Error(error.message);
      const i = this.cache[table].findIndex((r) => r.id === id);
      if (i > -1) this.cache[table][i] = data;
      return data;
    },

    async remove(table, id) {
      if (!HAS_REMOTE) {
        this.cache[table] = this.cache[table].filter((r) => r.id !== id);
        writeLocal(this.cache);
        return true;
      }
      const { error } = await client().from(table).delete().eq("id", id);
      if (error) throw new Error(error.message);
      this.cache[table] = this.cache[table].filter((r) => r.id !== id);
      return true;
    },

    resetLocal() { localStorage.removeItem(LS_KEY); },
  };

  /* ---------- اشتقاق بصمة رمز الدخول ---------- */
  const ROLES = ["owner", "editor", "viewer"];
  const LOCK_KEY = "adaa_hr_lock";

  const b64 = (buf) => btoa(String.fromCharCode.apply(null, new Uint8Array(buf)));

  // مقارنة بزمن ثابت — لا تكشف طول التطابق
  function sameSecret(a, b) {
    if (a.length !== b.length) return false;
    let d = 0;
    for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return d === 0;
  }

  async function hashCode(code) {
    const subtle = window.crypto && window.crypto.subtle;
    if (!subtle) {
      throw new Error("المتصفح لا يدعم التشفير هنا — افتح الصفحة عبر https أو localhost");
    }
    const enc = new TextEncoder();
    const key = await subtle.importKey("raw", enc.encode(String(code).normalize("NFKC")), "PBKDF2", false, ["deriveBits"]);
    const bits = await subtle.deriveBits(
      { name: "PBKDF2", salt: enc.encode(CFG.AUTH_SALT || ""), iterations: Number(CFG.AUTH_ITERATIONS) || 600000, hash: "SHA-256" },
      key, 256
    );
    return b64(bits);
  }

  /* ---------- إيقاف مؤقت بعد محاولات فاشلة ---------- */
  function lockState() {
    try { return JSON.parse(localStorage.getItem(LOCK_KEY) || "null") || { n: 0, until: 0 }; }
    catch (e) { return { n: 0, until: 0 }; }
  }
  function lockRemaining() {
    const s = lockState();
    return Math.max(0, Math.ceil((s.until - Date.now()) / 1000));
  }
  function noteFailure() {
    const s = lockState();
    s.n = (s.n || 0) + 1;
    const max = Number(CFG.AUTH_MAX_ATTEMPTS) || 5;
    if (s.n >= max) {
      s.until = Date.now() + (Number(CFG.AUTH_LOCKOUT_SECONDS) || 60) * 1000;
      s.n = 0;
    }
    try { localStorage.setItem(LOCK_KEY, JSON.stringify(s)); } catch (e) {}
  }
  function clearFailures() {
    try { localStorage.removeItem(LOCK_KEY); } catch (e) {}
  }

  /* ---------- الحسابات والصلاحيات ---------- */
  const AUTH = {
    hashCode,
    lockRemaining,

    // هل ما زالت الإعدادات تحمل رموزًا صريحة يقدر أي أحد يقرأها؟
    plaintextCodesInUse() {
      const c = CFG.ACCESS_CODES || {};
      return ROLES.some((r) => c[r]);
    },

    async current() {
      if (!HAS_REMOTE) {
        try { return JSON.parse(sessionStorage.getItem("adaa_hr_user") || "null"); } catch (e) { return null; }
      }
      const c = client();
      const { data } = await c.auth.getUser();
      if (!data || !data.user) return null;
      const { data: prof } = await c.from("profiles").select("*").eq("id", data.user.id).single();
      return {
        name: (prof && prof.full_name) || data.user.email,
        role: (prof && prof.role) || "viewer",
        email: data.user.email,
      };
    },

    async signIn(email, password) {
      if (!HAS_REMOTE) throw new Error("الدخول بالبريد يتطلب ربط قاعدة البيانات");
      const { error } = await client().auth.signInWithPassword({ email, password });
      if (error) throw new Error("بيانات الدخول غير صحيحة");
      return this.current();
    },

    // دخول بالوضع المحلي: الاسم + رمز الدخول (يحدّد الصلاحية)
    async demoSignIn(name, code) {
      const wait = lockRemaining();
      if (wait > 0) throw new Error(`محاولات كثيرة — انتظر ${wait} ثانية ثم أعد المحاولة`);

      const entered = String(code).trim();
      const plain = CFG.ACCESS_CODES || {};
      const hashes = CFG.ACCESS_CODE_HASHES || {};
      let role = null;

      // الرموز الصريحة (توافق مع الإعدادات القديمة)
      for (const r of ROLES) {
        if (plain[r] && sameSecret(entered, String(plain[r]))) { role = r; break; }
      }

      // البصمات — الوضع الافتراضي
      if (!role && ROLES.some((r) => hashes[r])) {
        const h = await hashCode(entered);
        for (const r of ROLES) {
          if (hashes[r] && sameSecret(h, String(hashes[r]))) { role = r; break; }
        }
      }

      if (!role) { noteFailure(); throw new Error("رمز الدخول غير صحيح"); }

      clearFailures();
      const u = { name: (name || "").trim() || "مستخدم", role: role, demo: true };
      // بعض المتصفحات تمنع التخزين (تصفح خاص أو إطار مقيّد) — الجلسة تكمل بدونه
      try { sessionStorage.setItem("adaa_hr_user", JSON.stringify(u)); } catch (e) {}
      return u;
    },

    async signOut() {
      try { sessionStorage.removeItem("adaa_hr_user"); } catch (e) {}
      if (HAS_REMOTE) await client().auth.signOut();
    },
  };

  window.DB = DB;
  window.AUTH = AUTH;
  window.SEED = SEED;
})();
