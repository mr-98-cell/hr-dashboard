#!/usr/bin/env node
/* ===========================================================
   يعيد بناء standalone.html من ملفات assets/
   -----------------------------------------------------------
   standalone.html يحتوي على الخطوط والشعار مضمّنة (base64) وهي
   غير موجودة في المستودع، لذلك لا نبنيه من الصفر: نستبدل فقط
   محتوى وسوم <script> الثلاثة بمحتوى config.js و data.js و app.js،
   مع تحويل مسار الشعار إلى data URI.

   وكذلك نستبدل ملفَّي CSS داخل وسم <style>، بين علامتَي تعليق
   يحملان @@css و @@end. ما قبل الأولى (الخطوط المضمّنة) وما بعد
   الثانية يبقى كما هو.

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

let result = out.join("\n");

// الأنماط: نستبدل ما بين العلامتين فقط، ونترك الخطوط المضمّنة قبلهما
const CSS_SOURCES = ["assets/base.css", "assets/app.css"];
const css = CSS_SOURCES
  .map((f) => fs.readFileSync(path.join(ROOT, f), "utf8").trim())
  .join("\n");
const marked = /\/\* @@css @@ \*\/\n[\s\S]*?\n\/\* @@end @@ \*\//;
if (!marked.test(result)) {
  console.error("✗ لم أجد علامتي الأنماط (@@css / @@end) داخل <style>. أوقفت البناء.");
  process.exit(1);
}
result = result.replace(marked, `/* @@css @@ */\n${css}\n/* @@end @@ */`);

fs.writeFileSync(TARGET, result);

if (result.includes(LOGO)) {
  console.error("✗ بقي مسار شعار غير مضمّن في الملف الناتج.");
  process.exit(1);
}

console.log(`✓ حُدِّث standalone.html من: ${SOURCES.join("، ")}`);
