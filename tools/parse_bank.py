# -*- coding: utf-8 -*-
import json, re

RAW = r'D:\project\YYYYYYYXXXX\_scratch\bank_raw.txt'
OUT = r'D:\project\YYYYYYYXXXX\_scratch\bank.json'

FW = str.maketrans('０１２３４５６７８９ＡＢＣＤＥ（）', '0123456789ABCDE()')

def norm(s):
    return s.translate(FW)

text = open(RAW, encoding='utf-8-sig').read()
text = text.replace('\u3000', ' ').replace('\xa0', ' ')
lines = [l.rstrip() for l in text.replace('\r\n', '\n').replace('\r', '\n').replace('\x07', '\n').split('\n')]

SEC_RE = re.compile(r'^[一二三四五]、(名词术语|单选题|多选题|简答题|论述题)')
UNIT_RE = re.compile(r'^(第[一二三四五六七八九十]+单元|绪论)\s*(.*)$')
QSTART_RE = re.compile(r'^\s*(\d{1,3})(?:、|(?=《))')

app_idx = next(i for i, l in enumerate(lines) if '背诵原文' in l)

units = []
cur_unit = None
cur_sec = None
sec_lines = []

def flush_sec():
    global cur_sec, sec_lines
    if cur_unit is not None and cur_sec is not None:
        cur_unit['sections'].append((cur_sec, list(sec_lines)))
    cur_sec = None
    sec_lines = []

i = 0
while i < app_idx:
    l = norm(lines[i]).strip()
    if not l:
        if cur_sec is not None:
            sec_lines.append('')
        i += 1
        continue
    m = UNIT_RE.match(l)
    if m and cur_unit is None or (m and (m.group(1) != '绪论' or l == '绪论')):
        if m:
            title = m.group(2).strip()
            name = m.group(1)
            if not title and name != '绪论':
                j = i + 1
                while j < app_idx and not lines[j].strip():
                    j += 1
                if j < app_idx:
                    nxt = norm(lines[j]).strip()
                    if not SEC_RE.match(nxt) and not UNIT_RE.match(nxt) and len(nxt) <= 12:
                        title = nxt
                        i = j
            flush_sec()
            full = name if name == '绪论' else (name + ' ' + title).strip()
            units.append({'title': full, 'sections': []})
            cur_unit = units[-1]
            i += 1
            continue
    m = SEC_RE.match(l)
    if m and cur_unit is not None:
        flush_sec()
        cur_sec = m.group(1)
        i += 1
        continue
    if cur_unit is None:
        i += 1
        continue
    if cur_sec is not None:
        sec_lines.append(l)
    i += 1

flush_sec()

def parse_terms(sl):
    items = []
    cur = None
    for l in sl:
        m = QSTART_RE.match(l)
        if m:
            if cur:
                items.append(cur)
            cur = l[m.end():]
        elif cur is not None:
            if l:
                cur += ' ' + l
    if cur:
        items.append(cur)
    out = []
    for it in items:
        it = it.strip()
        if '：' in it:
            term, defi = it.split('：', 1)
        elif ':' in it:
            term, defi = it.split(':', 1)
        else:
            continue
        term = term.strip()
        defi = defi.strip()
        if term and defi and len(term) <= 30:
            out.append({'term': term, 'definition': defi})
    return out

def split_opts_12345(joined):
    for p in re.split(r'(?=[①②③④⑤])', joined):
        p = p.strip()
        if p:
            yield p[1:].strip()

def parse_choice(sl, kind):
    qs = []
    blocks = []
    cur = None
    expect = 1
    for l in sl:
        m = QSTART_RE.match(l)
        if m and int(m.group(1)) == expect:
            if cur:
                blocks.append(cur)
            cur = [l[m.end():]]
            expect += 1
        elif cur is not None:
            cur.append(l)
    if cur:
        blocks.append(cur)
    for bi, blk in enumerate(blocks, 1):
        joined = re.sub(r'\s+', ' ', ' '.join(x for x in blk if x))
        answer = ''
        ma = list(re.finditer(r'\(([A-E①②③④⑤]+)\)', joined))
        if ma:
            answer = ma[-1].group(1)
            joined = (joined[:ma[-1].start()] + ' ' + joined[ma[-1].end():]).strip()
        opts = []
        stem = joined
        if kind == 'single':
            joined = re.sub(r'(?<= )([A-E])(?=[\u4e00-\u9fff])', lambda mm: mm.group(1) + '、', joined)
            first = re.search(r'[A-E]\s*、', joined)
            if first:
                stem = joined[:first.start()].strip()
                for p in re.split(r'(?=[A-E]\s*、)', joined[first.start():]):
                    p = p.strip()
                    if not p:
                        continue
                    mm = re.match(r'^[A-E]\s*、\s*(.*)$', p, re.S)
                    if mm:
                        opts.append(mm.group(1).strip())
                    elif opts:
                        opts[-1] += ' ' + p
        else:
            se = joined.find('①')
            if se != -1:
                stem = joined[:se].strip()
                opts = list(split_opts_12345(joined[se:]))
            else:
                se2 = joined.find('②')
                if se2 != -1:
                    head = joined[:se2]
                    pe = head.rfind(')')
                    if pe != -1:
                        stem = head[:pe+1].strip()
                        opts = [head[pe+1:].strip()] + list(split_opts_12345(joined[se2:]))
                    else:
                        stem = head.strip()
                        opts = list(split_opts_12345(joined[se2:]))
        qs.append({'no': bi, 'type': kind, 'stem': stem, 'options': opts, 'answer': answer})
    return qs

def parse_text_qa(sl, kind):
    qs = []
    blocks = []
    cur = None
    expect = 1
    for l in sl:
        m = QSTART_RE.match(l)
        if m and int(m.group(1)) == expect:
            if cur:
                blocks.append(cur)
            cur = {'stem': l[m.end():].strip(), 'ans': []}
            expect += 1
        elif cur is not None:
            if l:
                cur['ans'].append(l)
    if cur:
        blocks.append(cur)
    return [{'no': bi, 'type': kind, 'stem': b['stem'], 'answer': '\n'.join(b['ans']).strip()} for bi, b in enumerate(blocks, 1)]

result_units = []
for u in units:
    ro = {'title': u['title'], 'terms': [], 'questions': [], 'texts': []}
    for sec, sl in u['sections']:
        if sec == '名词术语':
            ro['terms'] = parse_terms(sl)
        elif sec == '单选题':
            ro['questions'] += parse_choice(sl, 'single')
        elif sec == '多选题':
            ro['questions'] += parse_choice(sl, 'multi')
        elif sec == '简答题':
            ro['texts'] += parse_text_qa(sl, 'short')
        elif sec == '论述题':
            ro['texts'] += parse_text_qa(sl, 'essay')
    result_units.append(ro)

recital = []
cur_r = None
for l in lines[app_idx + 1:]:
    l = norm(l).strip()
    if not l:
        continue
    m = re.match(r'^(第[一二三四五六七八九十]+单元)$', l)
    if m:
        cur_r = {'unit': m.group(1), 'passages': []}
        recital.append(cur_r)
        continue
    if cur_r is not None and len(l) >= 4:
        cur_r['passages'].append(l)

bank = {'slug': 'neijing-xuandu', 'title': '《内经选读》习题库', 'units': result_units, 'recital': recital}
json.dump(bank, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
for u in result_units:
    print(u['title'], 'terms:', len(u['terms']), 'choice:', len(u['questions']), 'text:', len(u['texts']))
print('recital units:', len(recital))
