#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
يعيد بناء standalone.html من ملفات assets/.

standalone.html نسخة بملف واحد من التطبيق: تضمّ الخطوط والشعار مُرمّزة داخلها،
إضافة إلى أنماط وأسطر خاصة بها وحدها. المناطق المنسوخة من assets/ محاطة
بعلامات في الملف:

    /* @@asset app.js @@ */  …المحتوى…  /* @@end @@ */

هذا السكربت يستبدل ما بين كل زوج علامات بمحتوى الملف الحالي في assets/،
ولا يمسّ أي شيء خارجها. شغّله بعد أي تعديل على assets/:

    python3 build-standalone.py
"""
import io
import os
import re
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
TARGET = os.path.join(ROOT, "standalone.html")
LOGO_PATH = "assets/adaa-logo.png"
MARKED = re.compile(r"/\* @@asset (\S+) @@ \*/\n.*?\n/\* @@end @@ \*/", re.S)


def read(*parts):
    with io.open(os.path.join(ROOT, *parts), encoding="utf-8") as fh:
        return fh.read()


def main():
    html = read("standalone.html")

    # الشعار يُضمَّن داخل standalone كـ data URI بدل مسار الملف
    logo = re.search(r'src="(data:image/png;base64,[^"]+)"', html)
    if not logo:
        sys.exit("لم يُعثر على الشعار المضمّن (data:image/png) في standalone.html")
    logo_uri = logo.group(1)

    seen = []

    def swap(m):
        name = m.group(1)
        path = os.path.join(ROOT, "assets", name)
        if not os.path.exists(path):
            sys.exit("العلامة تشير إلى ملف غير موجود: assets/%s" % name)
        body = read("assets", name).strip().replace(LOGO_PATH, logo_uri)
        seen.append(name)
        return "/* @@asset %s @@ */\n%s\n/* @@end @@ */" % (name, body)

    html, n = MARKED.subn(swap, html)
    if not n:
        sys.exit("لم يُعثر على أي علامات @@asset في standalone.html")

    with io.open(TARGET, "w", encoding="utf-8") as fh:
        fh.write(html)
    print("حُدّثت %d مناطق (%s) — standalone.html: %.1f كيلوبايت"
          % (n, "، ".join(seen), os.path.getsize(TARGET) / 1024.0))


if __name__ == "__main__":
    main()
