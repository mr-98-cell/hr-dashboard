/* ===========================================================
   عامل الخدمة — يجعل الداشبورد يعمل كتطبيق مثبَّت وبلا إنترنت
   -----------------------------------------------------------
   الاستراتيجية: الشبكة أولًا ثم المخزَّن.
   السبب: هذا داشبورد إداري، وأسوأ ما قد يحدث أن يرى المدير نسخة
   قديمة دون أن يدري. فنحاول الشبكة دائمًا، ولا نرجع للمخزَّن إلا
   عند انقطاع الاتصال.

   ملاحظة: لا يُخزَّن إلا ملفات الموقع نفسه. طلبات Supabase أو أي
   نطاق خارجي تمرّ دون مساس حتى لا تُعرض بيانات قديمة.

   عند أي تعديل على الملفات: ارفع رقم CACHE — وإلا بقي المستخدمون
   على النسخة السابقة حتى انتهاء صلاحية المخزَّن.
   =========================================================== */
const CACHE = "adaa-hr-v1";

const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./assets/base.css",
  "./assets/app.css",
  "./assets/config.js",
  "./assets/data.js",
  "./assets/app.js",
  "./assets/adaa-logo.png",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/apple-touch-icon.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      // addAll يفشل كليًا لو تعذّر ملف واحد، فنخزّن كلًا على حدة
      .then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  // نطاقات خارجية (Supabase، الخطوط) تمرّ كما هي
  if (new URL(req.url).origin !== self.location.origin) return;

  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match("./index.html")))
  );
});
