# 批次7 字符串匹配类 6 页叙事重构 —— 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按 BFS/Huffman 双试点验证的最终页面规范，重构字符串匹配类 6 页（BruteForce3D / KMP3D / BoyerMoore3D / RabinKarp3D / Sunday3D / EditDistance3D），每页走完整 8 环节流水线（研究→设计→设计检查→布局基线→编码→审查→测试→交付确认）。

**Architecture:** 单页串行流水线（与 BFS/Huffman 试点相同）。每页：研究代理 → 设计代理 → 设计检查代理 → 布局基线（smoke）→ 主控编码 → 审查代理 → 测试代理 → 用户确认。页间不暂停，逐页推进。

**Tech Stack:** Three.js（Scene3D/GeneratorEngine W·S·A/VisualObject3D/Glow），Playwright-core（测试），ES Modules。

**页面规范（BFS/Huffman 双试点用户确认，本批每页必须遵守）：**
1. **零场景内说明文字**：不创建 hint/stageT/eqT/outT/orderT 等两侧文字；码表、示例、完成文案全部不显示在 3D 场景内
2. **演示体保留标识**：文本字符盒、指针/下标标签、字符位置编号等属演示体标识，保留
3. **初始化即默认演示体**：页面加载后立即显示文本/模式串默认状态，点播放才动画
4. **结果入 HTML 状态栏**：`status.textContent`（`#result-bar .algo-status`），非 3D 场景
5. **俯视相机**：`cameraPos [320,660,900]`，`lookAt [320,460,0]`，`fov 52`
6. 播放条/清空按钮保留；清空后恢复默认演示体
7. 颜色语义（本类）：蓝=常规字符盒/文本，金=当前比较/选中，绿=匹配成功，橙=失配/回溯

**批内共性（字符串匹配类演示体模式）：**
- 文本行 + 模式行双行字符盒；文本位置编号（0..n-1）保留
- 指针/下标（i、j、shift 等）用标签保留在演示体上
- 匹配过程：字符比较高亮（金）→ 匹配成功（绿）→ 失配回溯（橙闪烁）→ 移动模式串（平移动画）
- 状态栏输出：匹配位置/总比较次数/总移动次数

**批次流程（每页重复以下 8 环节，页间不停顿）：**

### 每页 Task 1: 研究（researcher 代理）
派 `general-purpose` 只读代理，简报模板：
> 研究 `<算法名>` 并核对现有实现 `AlgorithmLibrary/<Name>3D.js`，报告（300 字内）：
> 1. 算法核心事实：输入示例、匹配/计算过程步骤、结果
> 2. 读 `<Name>3D.js`：现有演示流程（生成器步骤）、现有场景文字清单（列出所有 VText/setText 调用行号）、演示体（字符盒/指针/标签）结构、默认初始状态
> 3. 动画可复用件：现有 A() 动画、pulse/移动/高亮逻辑、粒子
> 4. 结论：重构需保留/删除/新增的清单

### 每页 Task 2: 设计（designer 代理）
派 `general-purpose` 代理，简报模板（含页面规范全文）：
> 为 `<算法名>` 3D 演示页设计动画分镜（**无场景文字版**，规范见下）：
> - 场景内零说明文字；仅演示体标识（字符盒字符、位置编号、指针标签）
> - 初始化即默认演示体；结果入 HTML 状态栏；俯视相机 [320,660,900]/[320,460,0]/52
> - 颜色：蓝=常规、金=比较、绿=匹配、橙=失配/回溯
> 输出：分镜步骤表（步骤/动作/时长，总 15-40s）+ 布局坐标方案（文本/模式双行，世界坐标适配俯视视锥 y∈[400,650] 中央区）+ 状态栏文案。对照 Task 1 算法事实核对。

### 每页 Task 3: 设计检查（design-checker 代理）
派 `general-purpose` 代理对照页面规范 + 算法事实审阅分镜，PASS 或可执行问题清单。

### 每页 Task 4: 布局基线（主控执行）
`curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/<Name>.html`；非 200 → 启动服务器。
`cd /tmp && NODE_PATH=/tmp/pwtest/node_modules node /tmp/smoke_verify.js <Name>`，记录基线 OK/FAIL。

### 每页 Task 5: 编码（主控直接执行）
按分镜 + 规范重写 `AlgorithmLibrary/<Name>3D.js`：
- 删除全部场景文字（hint/说明/码表/示例），保留演示体标识
- 初始化即默认演示体（文本行/模式行可见）
- 相机俯视 [320,660,900]/[320,460,0]/52
- 状态栏输出结果；清空按钮恢复默认体
- `<500 行`；`node --check` 通过后提交 `git commit -m "feat: <Name> 页叙事重构（无场景文字 + 默认演示体 + 俯视相机）"`

### 每页 Task 6: 代码审查（reviewer 代理）
派 `general-purpose` 代理：页面规范符合性 + 算法正确性 + 资源生命周期（edge/粒子 dispose）+ 死代码。PASS 或可执行问题清单；问题 → 主控修复后复审。

### 每页 Task 7: 测试（tester 代理）
派 `general-purpose` 代理（chromium 必须含 3 个节流禁用参数）：
1. 布局回归 smoke_verify
2. `/tmp/<name>_check.js`：未播放 sprite=演示体标识数（字符盒+编号+指针标签）且无其他文字；播放后状态栏出现预期结果文本；终态 sprite 集合 ⊆ 允许标识；pageerror=0；清空复位
3. 报告 PASS/FAIL 清单

### 每页 Task 8: 交付确认（用户）
告知用户打开 `http://localhost:8000/<Name>.html` 检查，用户确认后进入下一页；修改需求 → 对应环节重跑。

---

## 批次执行顺序

1. BruteForce3D（最简，先跑通批量流程）
2. KMP3D
3. RabinKarp3D
4. BoyerMoore3D
5. Sunday3D
6. EditDistance3D

每页完成后更新本文件复选框；全部完成后总结并进入下一批次（按用户选择继续按算法类别分批）。
