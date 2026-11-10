# -*- coding: utf-8 -*-
import zipfile, re, os, io

SRC = r'D:\project\YYYYYYYXXXX\毛概率数据'
OUT = r'D:\project\YYYYYYYXXXX\_scratch2'
os.makedirs(OUT, exist_ok=True)

def unesc(s):
    return s.replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>').replace('&quot;', '"').replace('&apos;', "'")

for f in sorted(os.listdir(SRC)):
    if not f.endswith('.docx'):
        continue
    with zipfile.ZipFile(os.path.join(SRC, f)) as z:
        xml = z.read('word/document.xml').decode('utf-8')
    paras = []
    for chunk in xml.split('</w:p>'):
        parts = re.findall(r'<(?:w|m):t(?: [^>]*)?>([^<]*)</(?:w|m):t>', chunk)
        line = unesc(''.join(parts))
        if line.strip():
            paras.append(line.strip())
    out = os.path.join(OUT, f.replace('.docx', '.txt'))
    io.open(out, 'w', encoding='utf-8').write('\n'.join(paras))
    print(f[-11:], 'paras:', len(paras))
