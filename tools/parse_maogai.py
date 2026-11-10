# -*- coding: utf-8 -*-
import re, os, io, json, zipfile

SRC = r'D:\project\YYYYYYYXXXX\毛概率数据'
OUT = r'D:\project\YYYYYYYXXXX\data\banks\maogai.json'

FW = str.maketrans('０１２３４５６７８９ＡＢＣＤ（）', '0123456789ABCD()')

def norm(s):
    return s.translate(FW)

def docx_lines(path):
    with zipfile.ZipFile(path) as z:
        xml = z.read('word/document.xml').decode('utf-8')
    paras = []
    for chunk in xml.split('</w:p>'):
        parts = re.findall(r'<(?:w|m):t(?: [^>]*)?>([^<]*)</(?:w|m):t>', chunk)
        line = ''.join(parts).replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>').replace('&quot;', '"')
        if line.strip():
            paras.append(norm(line.strip()))
    return paras

# order files by unit title
ORDER = ['导论', '第一章毛泽东思想及其历史地位', '中国特色社会主义理论体系的形成发展', '第六章 邓小平理论', '第七章', '第八章']

files = []
for f in os.listdir(SRC):
    if f.endswith('.docx'):
        files.append(os.path.join(SRC, f))

units_raw = []
for path in files:
    lines = docx_lines(path)
    title = lines[0]
    units_raw.append((title, lines))

def sort_key(item):
    t = item[0]
    for i, o in enumerate(ORDER):
        if t.startswith(o[:4]) or o.startswith(t[:4]):
            return i
    return 99

units_raw.sort(key=sort_key)

SEC_RE = re.compile(r'^（?[一二三四]）?[、.]?\s*（?[一二]）?\s*(单选|多选)(?:题)?')
Q_RE = re.compile(r'^(\d{1,3})(?:[.、]|(?=[^0-9.]))')

def parse_section(kind, sec_lines):
    qs = []
    blocks = []
    cur = None
    expect = 1
    for l in sec_lines:
        m = Q_RE.match(l)
        if m and int(m.group(1)) == expect:
            if cur:
                blocks.append(cur)
            cur = [l[m.end():].strip()]
            expect += 1
        elif m and int(m.group(1)) == 1 and cur is not None:
            # numbering restart mid-section? treat as new
            blocks.append(cur)
            cur = [l[m.end():].strip()]
            expect = 2
        elif cur is not None:
            cur.append(l)
    if cur:
        blocks.append(cur)
    out = []
    for b in blocks:
        joined = re.sub(r'\s+', ' ', ' '.join(b)).strip()
        markers = re.findall(r'[（(]\s*([A-D\s,，、1-9]+)\s*[)）]', joined)
        answer = ''
        if markers:
            chars = []
            src = markers[0] if kind == 'single' else ''.join(markers)
            for ch in src:
                if ch in 'ABCD' and ch not in chars:
                    chars.append(ch)
            answer = ''.join(chars)
            joined = re.sub(r'[（(]\s*[A-D\s,，、1-9]+\s*[)）]', '（  ）', joined, count=0 if kind == 'single' else 0)
            # keep only one blank marker at first position
            first = joined.find('（  ）')
            joined = joined[:first] + joined[first:].replace('（  ）', '（  ）', 1)
            joined = re.sub(r'（  ）\s*(?=（  ）)', '', joined)
            joined = re.sub(r'[（(]\s*[A-D]\s*个\s*[)）]', '', joined)
        opts = []
        stem = joined
        fm = re.search(r'(^|\s|[)）])[Aa](?:\s*[.、]|(?=[\u4e00-\u9fff]))', joined)
        if fm:
            stem = joined[:fm.start()].strip(' （）()')
            rest = joined[fm.start():].strip(' （）()')
            for p in re.split(r'(?=(?:^|\s)[A-Da-d](?:\s*[.、]|(?=[\u4e00-\u9fff])))', rest):
                p = p.strip()
                if not p:
                    continue
                mm = re.match(r'^([A-Da-d])\s*[.、]?\s*(.*)$', p, re.S)
                if mm:
                    opts.append(mm.group(2).strip())
                elif opts:
                    opts[-1] += ' ' + p
        out.append({'no': len(out) + 1, 'type': kind, 'stem': stem, 'options': opts, 'answer': answer})
    return out

units = []
for title, lines in units_raw:
    sec_kind = None
    sec_lines = []
    single, multi = [], []
    def flush():
        global sec_kind, sec_lines
        if sec_kind == 'single':
            single.extend(parse_section('single', sec_lines))
        elif sec_kind == 'multi':
            multi.extend(parse_section('multi', sec_lines))
        sec_kind = None
        sec_lines = []
    for l in lines[1:]:
        m = None
        if len(l) <= 14 and ('单选题' in l or '多选题' in l):
            key = '单选题' if '单选' in l else '多选题'
        elif len(l) <= 14 and ('简答题' in l or '论述题' in l or '判断题' in l or '材料' in l):
            key = 'other'
        else:
            key = None
        if key is not None:
            flush()
            if '单选' in key:
                sec_kind = 'single'
            elif '多选' in key:
                sec_kind = 'multi'
            else:
                sec_kind = 'skip'
            continue
        if l.startswith('练习题') or l.startswith('重要知识点'):
            flush()
            continue
        if sec_kind:
            sec_lines.append(l)
    flush()
    units.append({'title': title, 'terms': [], 'questions': single + multi, 'texts': []})

bank = {'slug': 'maogai', 'title': '毛泽东思想与中国特色社会主义理论体系（毛概）', 'units': units, 'recital': []}
json.dump(bank, io.open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
for u in units:
    sq = [q for q in u['questions'] if q['type'] == 'single']
    mq = [q for q in u['questions'] if q['type'] == 'multi']
    print(u['title'], '单选:', len(sq), '多选:', len(mq))
