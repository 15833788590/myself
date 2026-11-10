# 医经刷题（yixue-quiz）

面向中医/医学学生的多题库刷题网站。手机优先，支持多用户。

## 功能
- 多题库：题库以 JSON 放在 `data/banks/<slug>.json`，新增题库免改代码
- 刷题模式：顺序 / 随机 / 按章节 / 背题（直接看答案）/ 错题重刷
- 模拟考试：选题数量与时长可配，倒计时、自动交卷、计分、错题回顾、历史记录
- 名词解释：按单元默写名词，对照标准解释自评掌握度
- 收藏：任何题目可加星收藏，可按收藏练习
- 搜索：题目、选项、答案、名词术语、背诵原文全文检索
- 背诵原文：附篇原文浏览，支持"遮挡"自测模式
- 多用户：用户名+密码注册，学习进度/收藏/考试记录按账号保存在 SQLite

## 技术栈
Next.js 15 (App Router) + React 19 + TypeScript + Tailwind CSS 3 + node:sqlite（Node 内置，无原生依赖）。

## 本地开发
要求 Node.js >= 24。
```
npm install
npm run dev        # http://localhost:3000
```

## 生产部署（服务器 + 域名）
```
npm ci
npm run build
npm i -g pm2
pm2 start npm --name quiz -- start   # 监听 3000
pm2 save && pm2 startup
```
Nginx 反向代理示例：
```
server {
  listen 80;
  server_name quiz.example.com;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```
之后用 certbot 申请 HTTPS。用户数据在 `data/app.db`，升级/迁移时备份该文件即可。

## 新增题库
1. 用 Word 打开 .doc，另存或提取为 UTF-8 文本
2. 参考 `tools/parse_bank.py`（《内经选读》解析器）调整章节/题型正则后运行，生成 bank JSON
3. 放入 `data/banks/<slug>.json`，网站题库列表自动出现

bank JSON 结构：
```
{ slug, title,
  units: [ { title,
      terms:    [ { term, definition } ],          // 名词术语
      questions:[ { no, type: single|multi, stem, options[], answer } ],
      texts:    [ { no, type: short|essay, stem, answer } ] } ],
  recital: [ { unit, passages: [string] } ] }      // 可选：背诵原文
```

## 目录
- `src/app` 页面与 API 路由
- `src/lib/bank.ts` 题库加载；`src/lib/db.ts` SQLite；`src/lib/auth.ts` 会话
- `data/banks/` 题库数据；`data/app.db` 运行时生成
- `tools/parse_bank.py` 题库解析脚本

## 已内置题库
- 《内经选读》（slug: `neijing-xuandu`）：解析器 `tools/parse_bank.py`，源自《内经选读》习题库及标准答案.doc
- 毛概（slug: `maogai`）：解析器 `tools/parse_maogai.py`，源自 `毛概率数据/` 内 6 个 docx（导论、第一章、理论体系形成发展、第六章、第七章、第八章；198 题）

多选题答案标签按题库自适应（①-⑤ 或 A-D），由 `src/lib/bank.ts` 根据答案字符自动判定。
