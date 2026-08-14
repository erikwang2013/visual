# Huffman 动画叙事重构试点 —— 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按 BFS 试点验证后的最终页面规范重构 Huffman3D.js（无场景内说明文字、演示体保留数字/字符标签、初始化即默认演示体、结果入 HTML 状态栏、俯视相机），复跑 8 环节流水线。

**Architecture:** 单页串行流水线（研究→设计→设计检查→布局基线→编码→审查→测试→交付确认）。研究/设计/检查/审查/测试各一个代理，编码由主控直接执行（BFS 试点已验证代码模式，减少代理开销）。

**Tech Stack:** Three.js（Scene3D/GeneratorEngine W·S·A/VisualObject3D/Glow），Playwright-core（测试），ES Modules。

**页面规范（BFS 试点用户确认，本页必须遵守）：**
1. **零场景内说明文字**：不创建 hint/stageT/eqT/outT/orderT 等两侧文字；码表、示例、完成文案全部不显示在 3D 场景内
2. **演示体保留标识**：节点标签 `字符(频率)`/`频率`、边 0/1 分支标签保留（属演示体数字）
3. **初始化即默认演示体**：页面加载后立即显示叶子频率行（a5 b9 c12 d13 e16 f45，6 个频率球），点播放才开始合并
4. **结果入 HTML 状态栏**：`status.textContent = 'Huffman 完成：WPL = …'`（HTML 元素，非 3D）
5. **俯视相机**：`cameraPos [320,660,900]`，`lookAt [320,460,0]`，`fov 52`（同 BFS 终版）
6. 颜色语义：蓝=叶子，黄=内部节点，金=选中合并，绿=编码揭示

**关键算法事实（供研究/设计/检查核对）：**
- 频率：a5 b9 c12 d13 e16 f45（经典教学例）
- 合并序列：5+9=14 → 12+13=25 → 14+16=30 → 25+30=55 → 45+55=100（共 5 次，根 w=100）
- 编码规则：左 0 右 1；每个叶子码为前缀码；WPL = Σ w×len；平均位/字符 = WPL/100
- 复杂度：建树 O(n log n)；编码后总位数 ≤ Σw×⌈log n⌉
- 现有 Huffman3D.js 已实现 merges/codeMap/revealOrder（左 0 右 1、x 为较小者）——研究环节需验证其正确性

---

### Task 1: 研究（researcher 代理）

**Files:** 无文件产出；交付物为研究报告（消息内）

- [ ] **Step 1: 派发研究代理**

派发 `general-purpose` 代理（只读），简报：
> 研究 Huffman 编码并核对现有实现 `AlgorithmLibrary/Huffman3D.js`，报告以下事实确认或修正（给出依据，300 字内）：
> 1. 频率 a5 b9 c12 d13 e16 f45 的 Huffman 合并序列是否为 5+9=14 → 12+13=25 → 14+16=30 → 25+30=55 → 45+55=100
> 2. 读 Huffman3D.js 第 21-37 行：`items.sort` 升序后 shift 两次取 x,y（x.w≤y.w），合并为父节点（x=左、y=右），`collect` 用左 0 右 1 编码。逐叶子给出最终编码（如 a=…, b=…, …）并核对：编码是否互不为前缀、WPL 是否最小
> 3. 编码揭示顺序 revealOrder 是否为中序遍历（左→根→右）
> 4. 复杂度 O(n log n)；Huffman 树是前缀码最优树（证明要点一句即可）
> 输出：每个叶子的编码表 + WPL + 结论（现有实现正确/需修正点）。

### Task 2: 设计（designer 代理）

**Files:** 无文件产出；交付物为分镜方案（消息内）

- [ ] **Step 1: 派发设计代理**

派发 `general-purpose` 代理，简报：
> 为 Huffman 3D 演示页设计动画分镜（**无场景文字版**——页面规范见下，必须遵守）。
> 页面规范（BFS 试点用户确认）：
> - 场景内零说明文字（无 hint/阶段标题/码表/示例）；仅演示体标识：节点标签 `字符(频率)`（叶子）或 `频率`（内部节点）、边标签 0/1
> - 初始化即显示默认演示体：6 个频率叶子（蓝）按行显示；点播放才动画
> - 结果（WPL/平均位数）放 HTML 状态栏（非 3D）
> - 相机 [320,660,900] / lookAt [320,460,0] / fov 52（俯视）
> - 颜色：蓝=叶子、黄=内部节点、金=当前合并选中、绿=编码揭示
> 动画叙事（自底向上建树，无文字版）：
> 1. 初始：叶子行显示（默认体）；播放后叶子逐个 pulse 强调（顺序 a,b,c,d,e,f）
> 2. 每次合并：取最小两个 → 二者变金 → 父节点（黄）生长于二者中点上方 → 两条 0/1 曲线边点亮 + 金色粒子流（左 0 右 1）→ 恢复蓝/黄
> 3. 树完成后：按 revealOrder（中序）叶子逐个变绿 pulse
> 4. 结束：状态栏 `Huffman 完成：WPL = …，平均 … 位/字符`
> 输出：分镜步骤表（步骤/动作/时长，总 15-40s）+ 树布局坐标方案（俯视相机下根在上方，叶在最下，y 范围适配 400-620 世界坐标）。对照算法事实核对合并序列。报告 300 字内。

- [ ] **Step 2: 核对分镜**

合并序列与 Task 1 编码表一致；无场景文字设计符合规范；布局在俯视相机可见范围（世界 x∈[0,640]、y 中上区域）。不一致退回。

### Task 3: 设计检查（design-checker 代理）

**Files:** 无文件产出；交付物为检查结论（消息内）

- [ ] **Step 1: 派发设计检查代理**

派发 `general-purpose` 代理，简报：
> 设计检查：审阅 Huffman 分镜方案（Task 2 产出）对照页面规范与算法事实：
> 1. 规范符合：场景内零说明文字（唯一 sprite 必须是节点/边标签）；初始化即默认演示体；结果在状态栏；俯视相机参数正确
> 2. 算法正确：合并序列、叶子编码（互不为前缀）、WPL 计算
> 3. 分镜完备：每步有时长、无遗漏状态（颜色恢复、粒子清理）
> 输出：PASS 或逐条可执行问题清单。

- [ ] **Step 2: 处理结论**

PASS → Task 4；有问题 → 修正设计后复审。

### Task 4: 布局基线（layout-checker 代理）

**Files:** 无文件产出；交付物为基线结论（消息内）

- [ ] **Step 1: 确认服务器**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/Huffman.html
```
非 200 → `cd /home/project/visual && (python3 -m http.server 8000 >/tmp/httpserver.log 2>&1 &) && sleep 1`

- [ ] **Step 2: 派发布局检查代理**

派发 `general-purpose` 代理，简报：
> 布局基线：运行 `cd /tmp && NODE_PATH=/tmp/pwtest/node_modules node /tmp/smoke_verify.js Huffman`。
> 判据：`OK   Huffman total=N` 且无 FAIL。这是重构前基线：记录现有页面是否通过（失败则说明现有实现有越界对象，重构时一并修正）。

### Task 5: 编码（主控直接执行）

**Files:**
- Rewrite: `AlgorithmLibrary/Huffman3D.js`

- [ ] **Step 1: 重写代码**

按 Task 2 分镜 + 页面规范重写 `AlgorithmLibrary/Huffman3D.js`，要点：
- 删除全部 VText（hint/codeTexts/sample 及 edge 的 0/1 用 VText？——不，0/1 边标签是演示体数字，保留，但**实现改用 VText 仍会创建 sprite**——规范允许，因为它是演示体标识。检查设计确认）
- 节点标签保留：叶子 `ch(w)`、内部 `w`；VNode label
- 初始化即 buildTree 叶子显示（visible=true、scale=1），内部节点 hidden；播放后合并时才生长
- 相机俯视 [320,660,900]/[320,460,0]/52
- 状态栏 status 输出 WPL；清空按钮恢复默认演示体（叶子行）
- 无任何 setText 场景文字调用；`S()` 块只做颜色/显隐/状态栏

- [ ] **Step 2: 校验与提交**

```bash
cd /home/project/visual && node --check AlgorithmLibrary/Huffman3D.js
git add AlgorithmLibrary/Huffman3D.js && git commit -m "feat: Huffman 页叙事重构（无场景文字 + 默认演示体 + 俯视相机）"
```

### Task 6: 代码审查（reviewer 代理）

**Files:** 无文件产出；交付物为审查结论（消息内）

- [ ] **Step 1: 派发审查代理**

派发 `general-purpose` 代理，简报：
> 代码审查 `AlgorithmLibrary/Huffman3D.js`（重构后）：
> 1. 页面规范：场景内除节点/边标签外无 sprite 文字；初始化即默认演示体；状态栏结果；俯视相机
> 2. 算法正确：合并序列、左右 0/1、编码前缀性、WPL
> 3. 资源生命周期：pop/隐藏后无泄漏、clearFx 清理、边材质 opacity
> 4. 文件 <500 行、无死代码（如未用的 revealOrder/codeMap 若已删）
> 输出：PASS 或可执行问题清单。

- [ ] **Step 2: 处理结论**

PASS → Task 7；有问题 → 主控修复后复审。

### Task 7: 测试（tester 代理）

**Files:**
- Create: `/tmp/huffman_check.js`（临时工具，不入库）

- [ ] **Step 1: 派发测试代理**

派发 `general-purpose` 代理，简报：
> 测试 Huffman 重构后页面（服务器 8000 已运行）。chromium 启动参数必须含 `--disable-background-timer-throttling --disable-renderer-backgrounding --disable-backgrounding-occluded-windows`（否则 headless rAF 节流使动画时间膨胀 ~10 倍）。
> 1. 布局回归：`cd /tmp && NODE_PATH=/tmp/pwtest/node_modules node /tmp/smoke_verify.js Huffman`，预期 `OK` 无 FAIL
> 2. 创建 `/tmp/huffman_check.js`（仿 BFS 模式）：
>    - 加载后 2s（未播放）：断言 sprite 数 = 6（叶子标签）且存在 'a(5)'；mesh ≥ 6 叶子球；无其他文字 sprite
>    - 点击播放，轮询 150s：状态栏出现 'Huffman 完成' → 断言 sprite 数仍 = 节点数（6 叶子 + 5 内部 = 11 标签，无额外文字）、mesh 包含树全部节点与边
>    - 断言状态栏含 'WPL' 且数值与算法事实一致（先读 Task 1 报告拿 WPL 值）
>    - 全程 pageerror 捕获，报错则 FAIL
> 3. 报告：布局 OK/FAIL、规范断言 PASS/FAIL、WPL 数值、控制台错误数。

- [ ] **Step 2: 处理测试结论**

全部通过 → Task 8。失败 → 定位返修对应环节重跑。

### Task 8: 交付确认（用户）

- [ ] **Step 1: 交付**

重启服务器并告知用户：打开 `http://localhost:8000/Huffman.html`，检查：加载即见 6 个频率叶子、播放后合并动画（金选中→黄父节点→0/1 边+粒子流）、编码揭示（叶子逐个变绿）、底部状态栏 WPL 结果、全程无场景文字。

- [ ] **Step 2: 收集反馈并返修**

用户确认 → 本页完成，标记第二个试点页完成；Huffman 确认后正式进入批量生产模式（后续页面按此规范流水线化）。用户要求修改 → 对应环节重跑。
