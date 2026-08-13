# BFS 动画叙事重构试点 —— 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按 BFS 算法定义重构 BFS3D.js 的动画叙事（三幕结构、分层推进、文案同步），并跑通「研究→设计→设计检查→布局检查→编码→审查→测试→交付确认」8 环节多代理流水线，作为后续 199 页的模板。

**Architecture:** 单页串行流水线。研究/设计/检查/编码/审查/测试各由一个代理执行，经 SendMessage 交接；布局标准（相机 `[320,500,900]`/hint `700,560`/可见 y∈[61,939], x∈[0,640]）不变。测试用 smoke_verify.js（布局回归）+ 新叙事断言脚本（分阶段文本顺序）。

**Tech Stack:** Three.js（Scene3D/GeneratorEngine W·S·A/VisualObject3D/Glow），Playwright-core（测试），ES Modules。

**规格依据:** `docs/superpowers/specs/2026-08-14-redesign-pilot-design.md`

**关键算法事实（供研究/设计/检查核对）：**
- 图：8 节点环形图，边 `(0-1, 0-6, 0-7, 1-2, 1-5, 2-3, 3-4, 4-5, 5-6, 6-7)`
- BFS 遍历顺序（从 0 出发）：`0 → 1 → 6 → 7 → 2 → 5 → 3 → 4`
- 分层：L0={0}，L1={1,6,7}，L2={2,5}，L3={3,4}；层号表 `LEVEL=[0,1,2,3,3,2,1,1]`（距起点的边数：3 经 0-1-2-3、4 经 0-1-5-4，均 3 步；研究环节已修正原错误分层 L2={2,5,3}）
- 复杂度 O(V+E)；队列 FIFO 保证按层扩展；BFS 可求无权图最短步数/可达性

---

### Task 0: 基础设施 —— sprite 暴露文本（userData.text）

**Files:**
- Modify: `3D/Glow.js:92-113`（makeTextSprite / setSpriteText 各加一行）

- [ ] **Step 1: 修改 Glow.js**

`makeTextSprite`（约 96 行 `const sprite = new THREE.Sprite(mat);` 之后）加：
```js
  sprite.userData.text = text;
```
`setSpriteText`（约 105 行函数开头 `const tex = textTexture(...)` 之前）加：
```js
  sprite.userData.text = text;
```
目的：叙事测试脚本可遍历 scene 读取任意 VText 的当前文本（文本烘在纹理里，原本不可读）。userData 惰性字段，对渲染零影响。

- [ ] **Step 2: 提交**

```bash
git add 3D/Glow.js && git commit -m "feat: sprite 暴露 userData.text 供叙事测试读取"
```

### Task 1: 研究（researcher 代理）

**Files:** 无文件产出；交付物为研究报告（消息内）

- [ ] **Step 1: 派发研究代理**

派发 `general-purpose` 代理（只读研究），简报：
> 研究 BFS（广度优先搜索）算法定义，核对以下事实并报告确认或修正（给出依据）：
> 1. BFS 用队列（FIFO）实现，按「层」扩展：先访问起点，再逐层访问其邻居
> 2. 给定无向图 8 节点、边 (0-1, 0-6, 0-7, 1-2, 1-5, 2-3, 3-4, 4-5, 5-6, 6-7)，从 0 出发的 BFS 遍历顺序是否为 0→1→6→7→2→5→3→4，层划分是否为 L0={0}, L1={1,6,7}, L2={2,5,3}, L3={4}
> 3. 复杂度 O(V+E)；BFS 的应用（无权图最短步数、可达性、连通分量）
> 4. 常见教学演示的易错点（如重复入队、visited 标记时机）
> 报告控制在 300 字内，标注哪些事实确认、哪些修正。

- [ ] **Step 2: 核对报告**

对照「关键算法事实」节检查报告。若报告修正了顺序/层号/复杂度，先修正本计划 Task 5 的代码再继续；若仅确认，直接进入 Task 2。

### Task 2: 设计（designer 代理）

**Files:** 无文件产出；交付物为分镜确认表（消息内）

- [ ] **Step 1: 派发设计代理**

派发 `general-purpose` 代理，简报：
> 为 BFS 3D 演示页面设计动画分镜。舞台布局标准（必须遵守，不可改动）：
> - 相机 [320,500,900] / lookAt [320,500,0] / fov 52；hint 文本 (700,560,scale 0.7,wrapChars 7)
> - 节点环 y=300 半径 200 中心 (320,300)；队列盒行 y=475 从 x=130 起每盒 +55
> - stageT 阶段标题 (0,562,scale 0.72)；eqT 要点 (0,230,scale 0.44)；outT 操作细节 (700,420)；orderT 遍历顺序 (700,300)
> - 颜色语义：蓝=未访问、金=当前出队、橙=已入队、绿=已访问/边点亮、白=普通边
> 分镜要求（三幕结构，5 阶段）：
> 1. ① 初始化：起点 0 入队+标记已访问
> 2. ② 逐层遍历：出队金→邻居入队橙+边亮绿→转绿
> 3. 层边界强调：每层完成时暂停并报「第 k 层完成：共 n 个节点」
> 4. ③ 完成：全部绿、遍历顺序展示
> 5. ④ 收尾：复杂度 O(V+E)、无权最短路应用
> 输出：每阶段的 stageT/eqT/hint/outT 文案（中文、与步骤同步）、每阶段时长（总 15-40s）。对照「关键算法事实」核对顺序与层号。报告 300 字内。

- [ ] **Step 2: 核对分镜**

分镜文案与「关键算法事实」一致（顺序 0→1→6→7→2→5→3→4、层号表、复杂度）。不一致则退回重做。

### Task 3: 设计检查（design-checker 代理）

**Files:** 无文件产出；交付物为检查结论（消息内）

- [ ] **Step 1: 派发设计检查代理**

派发 `general-purpose` 代理，简报：
> 设计检查：审阅 BFS 动画分镜设计（Task 2 产出）与目标实现规格（本计划 Task 5 的代码），核对：
> 1. 叙事步骤顺序与 BFS 算法定义一致（队列 FIFO、visited 标记在入队时、按层扩展）
> 2. 示例数据正确：遍历顺序 0→1→6→7→2→5→3→4；层划分（距起点边数）L0={0} L1={1,6,7} L2={2,5} L3={3,4}
> 3. 文案/公式无错误（复杂度 O(V+E)、无权最短路应用）
> 4. 分镜的层完成逻辑：boundary 检测在弹出「下一层首个节点」时触发，levelCount 语义为「当前层已弹出节点数」，初始 0、跨层重置 1、同层 +1
> 输出：PASS 或逐条问题清单（问题必须可执行，如「第 3 行 levelCount 初始值应为 0」）。

- [ ] **Step 2: 处理结论**

PASS → Task 4；有问题 → 修正 Task 5 代码后重新检查。

### Task 4: 布局检查（layout-checker 代理）

**Files:** 无文件产出；交付物为检查结论（消息内）

- [ ] **Step 1: 启动服务器**

```bash
cd /home/project/visual && (python3 -m http.server 8000 >/tmp/httpserver.log 2>&1 &) && sleep 1
```

- [ ] **Step 2: 派发布局检查代理**

派发 `general-purpose` 代理，简报：
> 布局检查：运行 `cd /tmp && NODE_PATH=/tmp/pwtest/node_modules node /tmp/smoke_verify.js BFS`（等待约 15s 完成）。
> 判据：输出 `OK   BFS total=N` 且无 FAIL；若有 outside 对象，报告其坐标与应修正位置（可见范围 x∈[0,640]、y∈[61,939]）。
> 这是重构前的回归基线：当前页面必须已通过。输出：基线结论。

- [ ] **Step 3: 记录基线**

基线通过 → Task 5。基线失败 → 先修复现有越界对象再继续（说明重构不背旧债）。

### Task 5: 编码（coder 代理）

**Files:**
- Rewrite: `AlgorithmLibrary/BFS3D.js`（整个文件替换为下方代码）

- [ ] **Step 1: 派发编码代理**

派发 `general-purpose` 代理，简报：
> 将 `AlgorithmLibrary/BFS3D.js` 整个文件替换为以下代码（这是设计检查通过后的目标实现，逐字写入，不要改动结构）：
>
> ```js
> // AlgorithmLibrary/BFS3D.js — BFS 广度优先遍历：队列盒可视化 + 分层推进 + 邻居入队 + 边点亮（function* 生成器驱动）
> import * as THREE from 'three';
> import { Scene3D } from '../3D/Scene3D.js';
> import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
> import { ControlPanel } from '../3D/ControlPanel.js';
> import { VText, VNode, VBox } from '../3D/VisualObject3D.js';
> import { PALETTE, applyTheme } from '../3D/Glow.js';
> applyTheme('BFS3D');
>
> const scene = new Scene3D('scene', { cameraPos: [320, 500, 900], lookAt: [320, 500, 0], fov: 52 });
> const engine = new GeneratorEngine({ speed: 1 });
> const panel = new ControlPanel({ engine });
>
> const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, WHITE = 0xffffff;
> const hint = new VText(scene, { text: '点击「▶ 演示」开始：BFS 从节点 0 出发', x: 700, y: 560, z: 0, color: PALETTE.textGlow, scale: 0.7, wrapChars: 7 });
> const status = panel.addStatus('就绪');
> const stageT = new VText(scene, { text: '', x: 0, y: 562, z: 0, color: GOLD, scale: 0.72 });
> const eqT = new VText(scene, { text: '', x: 0, y: 230, z: 0, color: PALETTE.textGlow, scale: 0.44 });
> const outT = new VText(scene, { text: '', x: 700, y: 420, z: 0, color: PALETTE.textGlow, scale: 0.55, wrapChars: 8 });
> const orderT = new VText(scene, { text: '遍历顺序: ', x: 700, y: 300, z: 0, color: PALETTE.green, scale: 0.55, wrapChars: 8 });
>
> const N = 8, R = 200;
> const adj = Array.from({ length: N }, () => []);
> const nodeView = new Map();  // i -> VNode
> const edgeView = new Map();  // 'i-j' -> tube
> const queueBoxes = [];       // 队列盒
>
> function posOf(i) { const a = (i / N) * Math.PI * 2 - Math.PI / 2; return new THREE.Vector3(Math.cos(a) * R + 320, 300, Math.sin(a) * R); }
> function tube(a, b) {
>   const curve = new THREE.CatmullRomCurve3([a, b]);
>   const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 4, 2.5, 6), new THREE.MeshBasicMaterial({ color: WHITE, transparent: true, opacity: 0.5 }));
>   scene.add(m);
>   return m;
> }
> function clearView() {
>   nodeView.forEach(v => scene.remove(v.mesh));
>   edgeView.forEach(m => { scene.remove(m); m.geometry.dispose(); m.material.dispose(); });
>   queueBoxes.forEach(e => scene.remove(e.box.mesh));
>   nodeView.clear(); edgeView.clear(); queueBoxes.length = 0;
> }
> function buildGraph(edges) {
>   clearView();
>   for (let i = 0; i < N; i++) adj[i].length = 0;
>   for (let i = 0; i < N; i++) {
>     const p = posOf(i);
>     const vn = new VNode(scene, { radius: 21, x: p.x, y: p.y, z: p.z, label: String(i), color: BLUE, emissive: BLUE });
>     nodeView.set(i, vn);
>   }
>   for (const [a, b] of edges) {
>     edgeView.set(a + '-' + b, tube(posOf(a), posOf(b)));
>     edgeView.set(b + '-' + a, tube(posOf(b), posOf(a)));
>     adj[a].push(b); adj[b].push(a);
>   }
> }
> function setNodeColor(i, c) { nodeView.get(i).setColor(c, c); }
> function resetNodeColors() { nodeView.forEach(v => v.setColor(BLUE, BLUE)); }
> function setEdgeColor(a, b, c, op) { const e = edgeView.get(a + '-' + b); if (e) { e.material.color.setHex(c); e.material.opacity = op; } }
> function resetEdgeColors() { edgeView.forEach(e => { e.material.color.setHex(WHITE); e.material.opacity = 0.5; }); }
>
> // ---- 队列可视化 ----
> function* pushBox(id) {
>   const x = 130 + queueBoxes.length * 55;
>   const box = new VBox(scene, { w: 42, h: 42, d: 20, x, y: 475, z: 0, label: id, color: ORANGE, emissive: ORANGE });
>   box.mesh.scale.setScalar(0.01);
>   yield A(280, p => { box.mesh.scale.setScalar(0.01 + 0.99 * p); });
>   queueBoxes.push({ id, box });
> }
> function* popBox() {
>   const e = queueBoxes.shift();
>   if (!e) return;
>   yield A(240, p => { e.box.mesh.scale.setScalar(1 - p); });
>   scene.remove(e.box.mesh);
>   const tasks = queueBoxes.map(b => ({ box: b.box, from: b.box.mesh.position.x }));
>   if (tasks.length) yield A(300, p => tasks.forEach(t => t.box.mesh.position.x = t.from - 55 * p));
> }
>
> // 层号表：节点 i 距起点的边数（L0={0}, L1={1,6,7}, L2={2,5}, L3={3,4}）
> const LEVEL = [0, 1, 2, 3, 3, 2, 1, 1];
>
> function* bfsGen() {
>   const visited = new Set(), order = [], queue = [0];
>   visited.add(0);
>   yield S(() => {
>     hint.setText('BFS 从节点 0 出发：入队并标记已访问（绿）');
>     stageT.setText('① 初始化：起点 0 入队');
>     eqT.setText('队列 = 先进先出（FIFO）→ 先入队的先出队，保证按层扩展');
>     orderT.setText('遍历顺序: 0');
>   });
>   yield* pushBox('0');
>   yield W(800);
>   yield S(() => stageT.setText('② 逐层遍历：队列先进先出，按层扩展'));
>   yield W(600);
>   let head = 0, curLevel = 0, levelCount = 0;
>   while (head < queue.length) {
>     const cur = queue[head++];
>     if (LEVEL[cur] > curLevel) {
>       yield S(() => {
>         stageT.setText('第 ' + curLevel + ' 层完成：共 ' + levelCount + ' 个节点，按入队顺序全部访问');
>         hint.setText('BFS 逐层推进：先访问完整一层，再进入下一层');
>       });
>       yield W(700);
>       curLevel = LEVEL[cur]; levelCount = 1;
>     } else levelCount++;
>     setNodeColor(cur, GOLD);
>     yield S(() => {
>       outT.setText('出队 ' + cur + '（队首），探索其未访问邻居');
>       eqT.setText('队列: [' + queue.slice(head).join(', ') + ']');
>     });
>     yield* popBox();
>     order.push(cur);
>     yield W(420);
>     for (const nb of adj[cur]) {
>       if (visited.has(nb)) continue;
>       visited.add(nb);
>       queue.push(nb);
>       setNodeColor(nb, ORANGE);
>       setEdgeColor(cur, nb, GREEN, 0.95);
>       yield S(() => {
>         outT.setText('未访问邻居 ' + nb + '：边点亮、入队（橙）');
>         eqT.setText('队列: [' + queue.slice(head).join(', ') + ']');
>       });
>       yield* pushBox(String(nb));
>       yield W(340);
>     }
>     setNodeColor(cur, GREEN);
>     yield S(() => { orderT.setText('遍历顺序: ' + order.concat(cur).join(' → ')); });
>   }
>   resetNodeColors();
>   resetEdgeColors();
>   yield S(() => {
>     outT.setText('BFS 完成：按距离分层，队列先进先出');
>     stageT.setText('③ 完成：全部节点按层访问（第 3 层完成：共 2 个节点）');
>     eqT.setText('遍历顺序 0 → 1 → 6 → 7 → 2 → 5 → 3 → 4：先访问距起点 1 层，再 2 层、3 层');
>     status.textContent = 'BFS 顺序: ' + order.join(' → ');
>   });
>   yield W(900);
> }
>
> function* runBFS() {
>   buildGraph([[0, 1], [0, 6], [0, 7], [1, 2], [1, 5], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7]]);
>   hint.setText('BFS：队列先进先出，按层扩展');
>   orderT.setText('遍历顺序: ');
>   eqT.setText('起点 0 在第 0 层；邻居 1/6/7 在第 1 层；2/5 在第 2 层；3/4 在第 3 层');
>   yield W(900);
>   yield* bfsGen();
>   yield S(() => {
>     outT.setText('');
>     hint.setText('BFS 完成：时间复杂度 O(V+E)，可求无权图最短步数与可达性');
>     stageT.setText('④ 复杂度：O(V+E），应用：无权最短路、连通分量');
>   });
>   yield W(700);
> }
>
> engine.queue(() => runBFS());
> panel.addButton('清空', () => { engine.clear(); clearView(); orderT.setText('遍历顺序: '); hint.setText('已清空，可重新运行'); status.textContent = ''; outT.setText(''); stageT.setText(''); eqT.setText(''); });
> panel.addLabel('（拖拽旋转视角，滚轮缩放；金 = 当前出队，橙 = 已入队，绿 = 已访问/边点亮；顶部为队列，层完成时暂停提示）');
>
> scene.start(engine);
> ```
>
> 注意：`④ 复杂度：O(V+E），应用…` 中的全角括号是刻意写法（与全角逗号配套），不要改成半角。

- [ ] **Step 2: 校验语法**

```bash
cd /home/project/visual && node --check AlgorithmLibrary/BFS3D.js
```
预期：无输出（语法通过）。

- [ ] **Step 3: 提交**

```bash
git add AlgorithmLibrary/BFS3D.js && git commit -m "feat: BFS 动画叙事重构（分层推进 + 阶段标题 + 队列内容同步）"
```

### Task 6: 代码审查（reviewer 代理）

**Files:** 无文件产出；交付物为审查结论（消息内）

- [ ] **Step 1: 派发审查代理**

派发 `general-purpose` 代理，简报：
> 代码审查 `AlgorithmLibrary/BFS3D.js`（重构后）：
> 1. 与 Task 5 目标代码逐行一致性（是否存在意外改动）
> 2. 叙事正确性：顺序 0→1→6→7→2→5→3→4；层号表 LEVEL 与层边界逻辑（levelCount 初始 0、跨层重置 1、同层 +1）；visited 在入队时标记
> 3. 潜在问题：重复入队、越界访问、动画资源泄漏（popBox 后 mesh 移除）、渲染对象在视口内
> 4. 文件 <500 行、无死代码、无未用变量
> 输出：PASS 或可执行问题清单。

- [ ] **Step 2: 处理结论**

PASS → Task 7；有问题 → coder 修复后复审。

### Task 7: 测试（tester 代理）

**Files:**
- Create: `/tmp/narrative_check.js`（临时工具，不入库）

- [ ] **Step 1: 派发测试代理**

派发 `general-purpose` 代理，简报：
> 测试 BFS 重构后的页面。服务器已在 8000 端口运行（若未运行：`cd /home/project/visual && (python3 -m http.server 8000 >/tmp/httpserver.log 2>&1 &)`）。
>
> 1. 布局回归：`cd /tmp && NODE_PATH=/tmp/pwtest/node_modules node /tmp/smoke_verify.js BFS`，预期 `OK   BFS total=N`，任何 FAIL 都要报告对象坐标。
>
> 2. 叙事核对：创建 `/tmp/narrative_check.js`（内容如下），运行 `cd /tmp && NODE_PATH=/tmp/pwtest/node_modules node /tmp/narrative_check.js`：
>
> ```js
> // BFS 叙事核对：播放期间逐秒采样全部 sprite 文本，断言关键文案按序出现
> const { chromium } = require('playwright-core');
> const EXPECT = ['① 初始化', '② 逐层遍历', '第 0 层完成', '第 1 层完成', '第 2 层完成', '③ 完成', 'O(V+E)'];
> (async () => {
>   const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-gpu'],
>     executablePath: '/home/erik/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome' });
>   const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
>   const errors = [];
>   page.on('pageerror', e => errors.push(e.message));
>   page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
>   await page.goto('http://127.0.0.1:8000/BFS.html', { waitUntil: 'domcontentloaded', timeout: 25000 });
>   await page.waitForTimeout(3000);
>   await page.getByRole('button', { name: '▶ 播放' }).click();
>   const stream = [];
>   for (let t = 0; t <= 34; t++) {
>     const texts = await page.evaluate(() => {
>       const out = [];
>       window.__s3d.scene.traverse(o => { if (o.isSprite && o.userData && o.userData.text) out.push(o.userData.text); });
>       return out;
>     });
>     stream.push(texts.join(' | '));
>     await page.waitForTimeout(1000);
>   }
>   const all = stream.join('\n');
>   let idx = 0; const missing = [];
>   for (const k of EXPECT) { const i = all.indexOf(k, idx); if (i < 0) missing.push(k); else idx = i + k.length; }
>   const errs = errors.filter(e => !/busuanzi|Failed to load resource/i.test(e));
>   if (missing.length) console.log('FAIL 缺失文案: ' + missing.join(', '));
>   if (errs.length) console.log('FAIL 控制台错误: ' + errs.slice(0, 3).join(' | '));
>   if (!missing.length && !errs.length) console.log('PASS 叙事核对: ' + EXPECT.length + ' 项文案按序出现');
>   else { console.log('--- 时间线片段 ---'); console.log(all.slice(0, 600)); process.exitCode = 1; }
>   await browser.close();
> })();
> ```
>
> 3. 报告：三条结论（布局 OK/FAIL、叙事 PASS/FAIL、控制台错误数）+ 任何失败对象的坐标与出现时刻。

- [ ] **Step 2: 处理测试结论**

全部通过 → 任务 8。失败 → 定位（布局/叙事/代码）后返修对应环节，重新运行测试。

### Task 8: 交付确认（用户）

- [ ] **Step 1: 重启服务器并交付**

```bash
cd /home/project/visual && (python3 -m http.server 8000 >/tmp/httpserver.log 2>&1 &) && sleep 1 && curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/BFS.html
```

告知用户：打开 `http://localhost:8000/BFS.html`，点「▶ 播放」，检查：阶段标题（① 初始化 → ② 逐层遍历 → 第 k 层完成 → ③ 完成 → ④ 复杂度）、队列盒动画、遍历顺序 0→1→6→7→2→5→3→4、底部 eqT 队列内容、总时长约 20s。

- [ ] **Step 2: 收集反馈并返修**

用户确认 → 本页完成，标记试点里程碑（BFS 页完成），转入下一试点页（Huffman）的计划制定。用户要求修改 → 修改点进入对应环节重跑。
