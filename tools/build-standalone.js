#!/usr/bin/env node
/* ===========================================================
   يعيد بناء standalone.html من ملفات assets/
   -----------------------------------------------------------
   standalone.html يحتوي على الخطوط والشعار مضمّنة (base64) وهي
   غير موجودة في المستودع، لذلك لا نبنيه من الصفر: نستبدل فقط
   محتوى وسوم <script> الثلاثة بمحتوى config.js و data.js و app.js،
   مع تحويل مسار الشعار إلى data URI.

   التشغيل:  node tools/build-standalone.js
   =========================================================== */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const TARGET = path.join(ROOT, "standalone.html");
const SOURCES = ["assets/config.js", "assets/data.js", "assets/app.js"];
const LOGO = "assets/adaa-logo.png";

const html = fs.readFileSync(TARGET, "utf8");
const lines = html.split("\n");

// حدود وسوم <script> المستقلة (سطر يحتوي الوسم وحده)
const opens = [];
const closes = [];
lines.forEach((l, i) => {
  if (l.trim() === "<script>") opens.push(i);
  if (l.trim() === "</script>") closes.push(i);
});

if (opens.length !== SOURCES.length || closes.length !== SOURCES.length) {
  console.error(`✗ توقعت ${SOURCES.length} وسوم <script> لكن وجدت ${opens.length}. أوقفت البناء.`);
  process.exit(1);
}

const logoUri = "data:image/png;base64," + fs.readFileSync(path.join(ROOT, LOGO)).toString("base64");

// نبني من الآخر للأول حتى لا تتغيّر أرقام الأسطر أثناء الاستبدال
const out = lines.slice();
for (let i = SOURCES.length - 1; i >= 0; i--) {
  let code = fs.readFileSync(path.join(ROOT, SOURCES[i]), "utf8").replace(/\n+$/, "");
  code = code.split(LOGO).join(logoUri);
  out.splice(opens[i] + 1, closes[i] - opens[i] - 1, code);
}

const result = out.join("\n");
fs.writeFileSync(TARGET, result);

if (result.includes(LOGO)) {
  console.error("✗ بقي مسار شعار غير مضمّن في الملف الناتج.");
  process.exit(1);
}

console.log(`✓ حُدِّث standalone.html من: ${SOURCES.join("، ")}`);
