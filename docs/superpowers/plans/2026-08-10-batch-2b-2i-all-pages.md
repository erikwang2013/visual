# 剩余 40 页 3D 化 + index.html 3D 目录 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** 将剩余 40 个算法页面全部 3D 化（three.js 深空科幻风格），并把 Algorithms.html 改为 index.html 3D 目录页。

**Architecture:** 每页 = 独立 HTML（复制 StackArray.html 模板结构）+ AlgorithmLibrary/Xxx3D.js 模块脚本（ES modules，importmap 映射 "three"）。页面脚本复用现有 6 个 3D 模式（Array3D/LinkedList3D/Tree3D/Graph3D/Table3D/Geometry3D）与基础对象（VNode/VBox/VText/VArrow/VTorus），动画一律通过 AnimationEngine 命令队列实现，支持播放/暂停/步进/撤销。控制器负责验证（node --check + Playwright smoke + 像素/ASCII 检查），每个批次一个 commit。

**Tech Stack:** three.js r160（本地 ThirdParty/three/build/three.module.js）、现有 3D/ 框架（Scene3D/AnimationEngine/ControlPanel/Glow/VisualObject3D + 6 modes）、Playwright headless chromium + swiftshader 验证。

---

## 全局约定（所有页面必须遵守）

1. **HTML 模板**：复制 `StackArray.html` 的完整结构（head 含 importmap 仅映射 "three"、`visualizationPageStyle3d.css`、title/header 用页面中文名；body 含 `#scene` 容器 + 导航链接 + `module` 脚本指向 AlgorithmLibrary/Xxx3D.js）。参考 `/home/project/visual/StackArray.html` 逐字复制结构。
2. **脚本骨架**（参考 SimpleStack3D.js）：
   ```js
   import { Scene3D } from '../3D/Scene3D.js';
   import { AnimationEngine } from '../3D/AnimationEngine.js';
   import { ControlPanel } from '../3D/ControlPanel.js';
   import { ...modes } from '../3D/modes/Xxx3D.js';
   import { VText, VNode } from '../3D/VisualObject3D.js';
   import { PALETTE } from '../3D/Glow.js';
   const scene = new Scene3D('scene', { cameraPos: [0, 220, 640], fov: 55 });
   const engine = new AnimationEngine({ speed: 1.2 });
   const panel = new ControlPanel({ engine });
   const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });
   ```
   **C 必须是 dual-mode**（对象 or 分离参数）——模式方法以单对象调用，页面直接调用以分离参数。控件用 `panel.addInput/addButton/addLabel/addStatus`。状态反馈写入 `status` VText 或 `panel.addStatus`。
3. **动画语义**：每个用户操作把整串命令排入 engine（立即入队、不自动播放）；用户点 ▶ 播放。引擎 done 时按钮回到 '▶ 播放'。所有命令必须有 undo（默认空函数）。
4. **验证**：`node --check AlgorithmLibrary/Xxx3D.js`；Playwright smoke 用 completion-wait pattern（等待 play-btn label 回到 '▶ 播放'），断言无 console error + canvas 存在 + 截图 ASCII/像素检查关键区域出现预期对象。冒烟脚本放 /tmp/3d_smoke/，不入库。
5. **文件行数** < 500 行。不创建文档文件。每批次完成后 git commit。

## 模式 API 速查（已核实）

- **Array3D** `{type:'box'|'bar', count, w, h, spacing, startX, startY, z}` → create()、xOf(i)、setValue(i,val,cmd)、highlight(i,cmd,color?)、unhighlight(i,cmd)、swap(i,j,cmd)（弧线交换，bar 模式高度随 mesh 走）、addLine/clearLines。bar 模式 setValue 高度 = val*6。
- **LinkedList3D** addNode(id,x,y,z)（VBox 52x46x28 + nullText 子对象）、moveNode(id,x,y,cmd,dur=400)、setNodeValue(id,text,cmd?)、highlightNode(id,cmd)、setNext(from,to,cmd)、deleteNode(id,cmd)（隐藏式，undo 可恢复）、addPointer(name,label,x,y)、movePointer(name,x,y,cmd)、pointTo(name,id,cmd)、redraw()。
- **Tree3D** addNode(id,label,x,y,z,opts)、removeNode(id,cmd?)、moveNode(id,x,y,z,cmd)（500ms，p===1 时 drawEdges）、setColor(id,color,emissive?)、highlight(id,cmd)、unhighlight(id,cmd)、drawEdges()、clear()。
- **Graph3D** addNode(id,label,x,y,z,opts)、positionNode(id,x,y,z,cmd)（450ms）、addEdge(a,b,opts={weight,color,directed,radius})、lightEdge(a,b,on,cmd)、highlightNode/dehighlightNode(id,cmd)、setNodeLabel(id,text)、setLabel(id,text)。节点位置用圆周布局自行计算。
- **Table3D** `{rows, cols, cellW, cellH, startX, startY}` → create()、setCell(r,c,val,cmd)、highlightCell/unhighlightCell(r,c,cmd)、setRowLabel(r,text)。
- **Geometry3D** addAxes()（构造时自动）、addShape(geometry,opts)、setTransform(pos,euler)、animateTo(from,to,cmd,dur)、页面用 THREE 基础几何（BoxGeometry/CylinderGeometry/IcosahedronGeometry 等）加 VText 标注。
- **VText** `new VText(scene, {text, x, y, z, color, scale})`、setText、moveTo、remove。
- **VNode** `new VNode(scene, {label, x, y, z, color, radius})`、setText、setColor、moveTo(x,y,z,ms)、remove。

---

# 批次 2b：递归（3 页）

### 2b-1 RecFact 递归阶乘
- 文件：改写 `RecFact.html`、创建 `AlgorithmLibrary/RecFact3D.js`
- 控件：输入框「n」+ 按钮「阶乘」（原 阶乘/Text）
- 设计：VNode 球递归树——从 n 逐层减 1 向左侧下方展开（每层一个 VNode 标签 "n=5"…"n=1"，树高度 ≤8 层防溢出）；叶子 "f(1)=1" 后返回：逐层向上用 VText 飞入 "f(k)=f(k-1)*k"，最后大号 VText "f(n)=120" 浮现中央并 pulse。状态文本「正在计算 f(k)…」。
- Smoke：输入 5 → 播放 → 完成 → 截图验证中央出现 "f(5)=120" 文本（像素/ASCII 检查文本区域高亮）→ 无 error。

### 2b-2 RecReverse 递归逆转
- 文件：改写 `RecReverse.html`、创建 `AlgorithmLibrary/RecReverse3D.js`
- 控件：输入框「字符串」+ 按钮「逆转」
- 设计：输入串字符排成一行 VBox（x 按字符间距 70）；递归过程在右侧 VNode 栈显示调用帧（"rev(ab)"、"rev(b)"…递归到空）；回溯时箭头 VArrow 反转指向，字符 VBox 依次飞到反转后位置，最终 VText 显示逆转结果。
- Smoke：输入 "abcd" → 播放 → 截图验证出现 "dcba"（像素检查右侧文本区）。

### 2b-3 RecQueens 皇后问题
- 文件：改写 `RecQueens.html`、创建 `AlgorithmLibrary/RecQueens3D.js`
- 控件：输入框「皇后数」（默认 4~8）+ 按钮「皇后区」（原「皇后区」按钮）
- 设计：Table3D 棋盘（rows=cols=皇后数，cellW 64）；皇后 = VNode 球（label "Q"）落在格上，随回溯移动/消失（removeNode 式隐藏：直接 scene.remove 前先做一次下落动画——用 VNode.moveTo 飞入 + 高亮 cell）；尝试格 highlightCell 红色 = 冲突、cyan = 安全；找到解后整盘皇后 pulse，VText 显示「找到一个解」。若用户输入 8，n=8 渲染 8×8。
- Smoke：n=4 → 播放 → 完成 → 截图验证 ≥1 个球体在棋盘上 + 无 error。

# 批次 2c：查找 + 平衡树（4 页）

### 2c-1 Search 二分/线性查找
- 文件：改写 `Search.html`、创建 `AlgorithmLibrary/Search3D.js`
- 控件：输入框「数字」+ 按钮「二分查找」「线性搜索」
- 设计：Array3D box 模式固定 12 槽（预填升序数组）；二分查找：lo/hi 两个 VArrow 指向边界，mid VText 标签，命中格 highlight 绿；未命中则扫描收窄。线性搜索：VArrow 顺序推进 + 逐格高亮。状态文本「查找 x：找到/未找到」。
- Smoke：二分找存在值 → 完成 → 像素验证箭头+高亮；找不存在值 → 状态文本「未找到」。

### 2c-2 AVLtree AVL 树
- 文件：改写 `AVLtree.html`、创建 `AlgorithmLibrary/AVL3D.js`
- 控件：输入框「值」+ 按钮「插入」「查找」「删除」「打印」
- 设计：Tree3D + 平衡因子 VText（节点上方 ±1/0）；插入：BST 查找路径高亮 → 新节点 VNode 飞入 → 回溯更新平衡因子（setText）→ 失衡时旋转（moveNode 移动涉及节点 + drawEdges）。查找：路径高亮。删除：找到节点（高亮）→ 隐藏节点（removeNode）→ 旋转修复。打印：中序遍历值依次飞出为 VText 序列。
- Smoke：插入 5 个值含失衡序列 → 完成 → 截图验证树节点 + 无 error。

### 2c-3 RedBlack 红黑树
- 文件：改写 `RedBlack.html`、创建 `AlgorithmLibrary/RedBlack3D.js`
- 控件：输入框「值」+ 按钮「插入」「查找」「打印」「删除」
- 设计：Tree3D；红节点 setColor(0xf97316 orange)，黑节点 PALETTE.node；插入：路径高亮 → 新节点红色飞入 → 修复循环（变色 = setColor 动画、旋转 = moveNode）。查找：路径高亮。打印：中序 VText。删除：标准修复（兄弟变色/旋转）。
- Smoke：插入 6 个值 → 完成 → 截图验证红黑节点并存 + 无 error。

### 2c-4 SplayTree 伸展树
- 文件：改写 `SplayTree.html`、创建 `AlgorithmLibrary/SplayTree3D.js`
- 控件：输入框「值」+ 按钮「插入」「查找」「打印」「删除」
- 设计：Tree3D；插入/查找后伸展：从访问节点沿祖父链 zig-zig/zig-zag 旋转（moveNode 动画），目标节点高亮旋转至根（pulse）。删除：查找节点 → 伸展 → 移除 → 左右子树合并伸展。
- Smoke：插入 4 值 → 查找最深值 → 完成 → 截图验证访问节点在根位置（顶部中央）+ 无 error。

# 批次 2d：哈希（3 页）

### 2d-1 OpenHash 开放寻址哈希（桶链）
- 文件：改写 `OpenHash.html`、创建 `AlgorithmLibrary/OpenHash3D.js`
- 控件：输入框「值」+ 按钮「插入」「删除」「查找」（原 Hash 基类控件）
- 设计：10 个桶 = 一行 VBox（Array3D box 模式，标签 h(x)=x%10 用 indexLabels 替换为桶号）；哈希值 VText "h(x)=x%10=k" 浮现 → 元素 VText 飞入对应桶：链为空则挂新 VBox 链节点（手写链：桶下用 VBox 序列，tubeBetween 连接）；链查找路径高亮。删除：链上高亮 → 隐藏该节点（fade 缩放动画）→ 重连。查找：路径高亮 + 状态「找到/未找到」。
- Smoke：插入 3 个同桶值（10/20/30）→ 播放 → 截图验证链式节点 + 无 error。

### 2d-2 ClosedHash 闭寻址哈希（线性探测）
- 文件：改写 `ClosedHash.html`、创建 `AlgorithmLibrary/ClosedHash3D.js`
- 控件：输入框「值」+ 按钮「插入」「删除」「查找」
- 设计：Array3D box 模式 10 槽 + 下方哈希位置指针 VArrow；插入：h(x) 位置高亮 → 冲突则沿槽移动（VArrow 右移 + 逐格高亮）→ 空槽 setValue。删除：查找路径 → 标记删除（setValue '×' 变灰）。查找：探测路径高亮，找到/未找到。
- Smoke：插入 12,22,32（冲突链）→ 播放 → 截图验证 3 值落在连续槽 + 无 error。

### 2d-3 ClosedHashBucket 桶内链
- 文件：改写 `ClosedHashBucket.html`、创建 `AlgorithmLibrary/ClosedHashBucket3D.js`
- 控件：输入框「值」+ 按钮「插入」「删除」「查找」
- 设计：10 桶 VBox 行 + 每桶下链表（同 2d-1 手写链）；与 OpenHash 区别：桶内链位置固定，桶满不移动。动画同 2d-1。
- Smoke：插入 5 个值（3 个同桶）→ 播放 → 截图验证 + 无 error。

# 批次 2e：字符串树 + B 树（5 页）

### 2e-1 Trie 字典树
- 文件：改写 `Trie.html`、创建 `AlgorithmLibrary/Trie3D.js`
- 控件：输入框「单词」+ 按钮「插入」「查找」「打印」「删除」
- 设计：Graph3D（边带标签 char）；根节点 y 顶部，每层下行；插入：从根沿字符边 lightEdge 高亮，缺边则新增 VNode（按深度分层 y = 每层 -80，x 按兄弟计数展开）+ addEdge 带 char 标签；词尾节点 pulse + 词尾标记（setNodeLabel '★'）。查找：路径 lightEdge 高亮。删除：词尾标记移除，无分支路径节点逐层隐藏（fade）。打印：DFS 收集单词 VText 序列。
- Smoke：插入 "cat" → 播放 → 截图验证 3 层链 + 无 error。

### 2e-2 RadixTree 基数树
- 文件：改写 `RadixTree.html`、创建 `AlgorithmLibrary/RadixTree3D.js`
- 设计：Graph3D 带边标签（边标签为公共前缀串 "ca"/"t"）；分裂：边标签拆分（删除旧边 addEdge 新边），新增中间节点。其余同 Trie。
- Smoke：插入 "cat"/"car" → 播放 → 截图验证共享前缀分裂节点 + 无 error。

### 2e-3 TST 三叉搜索树
- 文件：改写 `TST.html`、创建 `AlgorithmLibrary/TST3D.js`
- 设计：Tree3D 三分支（中=相等字符、左=小于、右=大于，边不标字但节点标签即字符）；插入：沿分支高亮，缺分支建 VNode。查找：高亮路径 + 词尾判断。打印：中序收集。用 Graph3D 或 Tree3D 均可，选 Tree3D + 节点字符标签。
- Smoke：插入 3 个单词 → 播放 → 截图验证 + 无 error。

### 2e-4 BTree B 树
- 文件：改写 `BTree.html`、创建 `AlgorithmLibrary/BTree3D.js`
- 控件：输入框「值」+ 按钮「插入」「查找」「打印」「清楚」「删除」（「清楚」即清空）
- 设计：Tree3D；节点标签多键 "3|5"（VNode 标签文本）；阶 m=3（最多 2 键）。插入：根到叶路径高亮 → 叶节点超键数则分裂：原节点 setText 前半键，新建 VNode（父层）飞入 + 后半键另建 VNode（右兄弟），drawEdges。查找：路径高亮 + 节点内 setHighlight。删除：叶删除 → 不足则借/合并（moveNode + setText）。清空：clear()。
- Smoke：插入 4 个值触发分裂 → 播放 → 截图验证 ≥3 节点 + 无 error。

### 2e-5 BPlusTree B+ 树
- 文件：改写 `BPlusTree.html`、创建 `AlgorithmLibrary/BPlusTree3D.js`
- 控件：输入框「值」+ 按钮「插入」「查找」「打印」「删除」「Clear」（Clear 即清空）
- 设计：Tree3D + 叶层渲染为 VBox 行（叶子键 + 兄弟指针 tubeBetween 横向连接）；内部节点用 VNode 多键标签。插入分裂同 B 树（内部复制 + 叶子上移）。查找：路径高亮 → 叶层横向 lightEdge 移动。打印：叶层从左到右高亮输出 VText 序列。
- Smoke：插入 4 值 → 播放 → 截图验证叶层盒子链 + 无 error。

# 批次 2f：排序（5 页）

### 2f-1 ComparisonSort 比较排序
- 文件：改写 `ComparisonSort.html`、创建 `AlgorithmLibrary/ComparisonSort3D.js`
- 控件：按钮「插入排序」「选择排序」「冒泡排序」「壳排序」「归并排序」「快速排序」「随机化数组」「更改大小」（加输入框「大小」配合更改大小）
- 设计：Array3D bar 模式 count=20（更改大小 5~30 重建）；随机化数组：重生成 + 柱体逐一 setValue 动画。各排序：
  - 插入：当前柱高亮，前移比较（被比较柱 highlight），后移 = swap(i,i-1) 连续。
  - 选择：扫描 highlight 找最小 → 与 i swap。
  - 冒泡：相邻比较 highlight + 条件 swap。
  - 壳：gap 递减插入排序。
  - 归并：辅助数组 Array3D 上半屏（第二行）；段复制 + 归并写入 swap/移动动画。
  - 快排：pivot 高亮（橘色），左右扫描指针高亮，交换 swap，递归分区。
- Smoke：随机化 → 选择排序 → 完成 → 截图验证柱体 + 无 error。

### 2f-2 BucketSort 桶排序
- 文件：改写 `BucketSort.html`、创建 `AlgorithmLibrary/BucketSort3D.js`
- 控件：按钮「随机列表」「桶排序」
- 设计：Array3D bar 原始数组 + 下方 5 桶（VBox 行 label 桶0..4）+ 桶内 VBox 链；桶排序：扫描数组每柱体 VText 飞入对应桶（桶位置由值映射），再按序收集回柱体（setValue 高度变化）。
- Smoke：随机列表 → 桶排序 → 完成 → 截图验证 + 无 error。

### 2f-3 CountingSort 计数排序
- 文件：改写 `CountingSort.html`、创建 `AlgorithmLibrary/CountingSort3D.js`
- 控件：按钮「随机列表」「计数排序」
- 设计：Array3D bar 原数组 + 计数数组 Table3D（1×10 单元格）→ 计数累加 highlight → 输出数组 Array3D bar（第二行）逐位填入（输入元素 VText 飞到输出位置）。
- Smoke：随机列表 → 计数排序 → 完成 → 截图验证 + 无 error。

### 2f-4 RadixSort 基数排序
- 文件：改写 `RadixSort.html`、创建 `AlgorithmLibrary/RadixSort3D.js`
- 控件：按钮「随机列表」「基数排序」
- 设计：Array3D bar 原数组 + 10 桶行；每趟按位（个/十/百位）：柱体 VText 依次入桶（highlight），收集回写（setValue + 移动动画），VText 显示「第 k 位」。
- Smoke：随机列表 → 基数排序 → 完成 → 截图验证 + 无 error。

### 2f-5 HeapSort 堆排序
- 文件：改写 `HeapSort.html`、创建 `AlgorithmLibrary/HeapSort3D.js`
- 控件：按钮「随机化数组」「堆排序」
- 设计：Array3D bar；构建堆：从 n/2 起下沉（比较父子 highlight + swap）；排序：根与末尾 swap → 末尾柱变灰（setColor 0x64748b）→ 根下沉。状态文本「堆长度 k」。
- Smoke：随机化数组 → 堆排序 → 完成 → 截图验证末尾灰色柱 + 无 error。

# 批次 2g：堆（5 页）

### 2g-1 Heap 最小堆
- 文件：改写 `Heap.html`、创建 `AlgorithmLibrary/Heap3D.js`
- 控件：输入框「值」+ 按钮「插入」「删除最小的」「清除堆」「构建堆」
- 设计：Tree3D 完全二叉树布局（节点 (x=层偏移, y=层深度)）；数组下标 VText 每节点旁。插入：新节点放最后位置飞入 → 与父比较（父 highlight）→ 上滤 = moveNode 交换父子（交换标签：moveNode 后 setText 交换）。删除最小：根与最后节点 moveNode 互换 → 移除根 → 下滤。清除堆：全部 removeNode。构建堆：输入框可一次输入多个值（空格分隔）。
- Smoke：插入 5 值 → 播放 → 截图验证树 + 无 error；删除最小 → 完成 → 树根为最小。

### 2g-2 BinomialQueue 二项队列
- 文件：改写 `BinomialQueue.html`、创建 `AlgorithmLibrary/BinomialQueue3D.js`
- 控件：输入框「值」+ 按钮「插入」「删除最小的」「清除堆」
- 设计：Tree3D 森林（每棵二项树 = 根 + 子链，完全布局）；插入 = 与最小阶树合并（moveNode 子树 + drawEdges）；删除最小 = 找最小根（highlight）→ 拆分其子树为森林 → 逐树合并。
- Smoke：插入 5 值 → 播放 → 截图验证森林（≥2 棵）+ 无 error。

### 2g-3 FibonacciHeap 斐波那契堆
- 文件：改写 `FibonacciHeap.html`、创建 `AlgorithmLibrary/FibonacciHeap3D.js`
- 控件：输入框「值」+ 按钮「插入」「删除最小的」「清除堆」
- 设计：Tree3D 森林（根表 = 一行 VNode + 环形连线提示 label「根表」）；插入 = 根表加入新节点；删除最小 = 最小根 pulse → 其子树并入根表 → 度表合并（同度树合并 moveNode）。
- Smoke：插入 5 值 → 播放 → 截图验证根表行 + 无 error。

### 2g-4 LeftistHeap 左倾堆
- 文件：改写 `LeftistHeap.html`、创建 `AlgorithmLibrary/LeftistHeap3D.js`
- 控件：输入框「值」+ 按钮「插入」「删除最小的」「清除堆」
- 设计：Tree3D；插入 = 单节点堆与主堆合并（递归 merge 动画：比较根 → 沿右路径 moveNode 拼接 → 回溯交换左右子 moveNode）；删除最小 = 根移除 → 左右子堆合并。npl 值 VText 每节点旁（setText 更新）。
- Smoke：插入 5 值 → 播放 → 截图验证 + 无 error。

### 2g-5 SkewHeap 斜堆
- 文件：改写 `SkewHeap.html`、创建 `AlgorithmLibrary/SkewHeap3D.js`
- 设计：Tree3D；同左倾堆但 merge 无条件交换左右子。
- Smoke：插入 5 值 → 播放 → 截图验证 + 无 error。

# 批次 2h：图（8 页）

图页面共用布局：Graph3D 固定示例图（节点圆周布局，复用 BFS3D.js 的图常量与坐标风格——参考 `/home/project/visual/AlgorithmLibrary/BFS3D.js` 的节点/边定义方式复制调整）。

### 2h-1 DFS 深度优先
- 文件：改写 `DFS.html`、创建 `AlgorithmLibrary/DFS3D.js`
- 控件：输入框「起始节点」（0~N-1）+ 按钮「运行DFS」
- 设计：复用 BFS3D 的图；访问节点 highlight + pulse，树边 lightEdge(on) 青绿，回溯边不亮；visited 顺序 VText 逐个飞出。状态「访问顺序: 0 1 3 …」。
- Smoke：输入 0 → 运行DFS → 完成 → 截图验证访问序列文本 + 无 error。

### 2h-2 ConnectedComponent 连通分量
- 文件：改写 `ConnectedComponent.html`、创建 `AlgorithmLibrary/ConnectedComponent3D.js`
- 控件：按钮「运行连接组件」
- 设计：示例图两分量；BFS/DFS 逐分量遍历，每个分量节点 setColor 同色（分量 1 青绿、分量 2 紫），边 lightEdge；分量编号 VText。
- Smoke：运行 → 完成 → 截图验证两色节点 + 无 error。

### 2h-3 Dijkstra 最短路径
- 文件：改写 `Dijkstra.html`、创建 `AlgorithmLibrary/Dijkstra3D.js`
- 控件：输入框「起始节点」+ 按钮「运行Dijkstra」
- 设计：加权图（边 weight 标签，同 BFS3D 但带权）；dist 标签 setNodeLabel 更新 + 节点颜色随距离深浅；每次选取最小 dist 节点 highlight（pulse），松弛时 lightEdge；最终最短路径树边常亮 + dist 汇总 VText。
- Smoke：输入 0 → 运行 → 完成 → 截图验证 dist 标签 + 无 error。

### 2h-4 Prim 最小生成树
- 文件：改写 `Prim.html`、创建 `AlgorithmLibrary/Prim3D.js`
- 控件：输入框「起始节点」+ 按钮「运行Prim」
- 设计：加权图；已加入树节点 setColor 青绿，候选边闪烁（lightEdge on→off 交替），选入边常亮；VText 记录选边序列。
- Smoke：输入 0 → 运行 → 完成 → 截图验证 N-1 条常亮边 + 无 error。

### 2h-5 TopoSortIndegree 拓扑排序（入度法）
- 文件：改写 `TopoSortIndegree.html`、创建 `AlgorithmLibrary/TopoSortIndegree3D.js`
- 控件：按钮「做拓扑排序」
- 设计：DAG 示例图；入度 VText 每节点上方（初始计算动画）；每次取入度 0 节点 highlight → 隐藏（fade/缩放）→ 邻接入度-1；顺序 VText 序列。
- Smoke：运行 → 完成 → 截图验证序列文本 + 无 error。

### 2h-6 TopoSortDFS 拓扑排序（DFS 法）
- 文件：改写 `TopoSortDFS.html`、创建 `AlgorithmLibrary/TopoSortDFS3D.js`
- 控件：按钮「做拓扑排序」
- 设计：DFS 访问，节点 finish 时飞出为输出序列（逆序 VText 依次挂到序列行）；树边亮、回边红（lightEdge color 用 opts 或 setColor）。
- Smoke：运行 → 完成 → 截图验证序列 + 无 error。

### 2h-7 Floyd Floyd-Warshall
- 文件：改写 `Floyd.html`、创建 `AlgorithmLibrary/Floyd3D.js`
- 控件：按钮「运行Floyd-Warshall」
- 设计：Table3D k×k 距离矩阵（k=5 示例图）；每轮 k：k 行/k 列 highlightCell，比较 d[i][k]+d[k][j]<d[i][j] 时更新单元格 setCell（变色高亮）；轮次 VText「k=…」。
- Smoke：运行 → 完成 → 截图验证矩阵 + 无 error。

### 2h-8 Kruskal 最小生成树
- 文件：改写 `Kruskal.html`、创建 `AlgorithmLibrary/Kruskal3D.js`
- 控件：按钮「运行Kruskal」
- 设计：加权图 + Table3D 边列表（边号/权重，按权重排序）；逐个取边：选中 lightEdge 青绿，成环边变红闪烁；并查集数组 VText 行（父指针更新）；最终树边常亮。
- Smoke：运行 → 完成 → 截图验证 N-1 常亮边 + 无 error。

# 批次 2i：DP + 几何 + 并查集（7 页）

### 2i-1 DPChange 找零钱
- 文件：改写 `DPChange.html`、创建 `AlgorithmLibrary/DPChange3D.js`
- 控件：输入框「金额」+ 输入框「币种」(逗号分隔) + 按钮「改变贪婪」「更改表」「更改递归」「更改记忆」（币种默认 1,5,10,25）
- 设计：Table3D（行=币种数，列=金额+1）：
  - 表模式：逐格填充 highlightCell + setCell 最小硬币数，VText 说明「用币 c 时 min(不含, 含)」。
  - 记忆模式：同表但按递归记忆顺序，已算格变暗色（setCell 或保留高亮）。
  - 递归模式：递归树 VNode（金额分叉 + 币），栈深度限制 ≤12。
  - 贪婪模式：金额行 VBox 递减动画 + 选币 pulse，可能非最优提示。
- Smoke：金额 26 → 更改表 → 播放 → 截图验证表格 + 无 error。

### 2i-2 DPLCS 最长公共子序列
- 文件：改写 `DPLCS.html`、创建 `AlgorithmLibrary/DPLCS3D.js`
- 控件：输入框「串A」「串B」+ 按钮「LCS表」「LCS 递归」「LCS 记忆」
- 设计：Table3D（rows=lenB+1, cols=lenA+1）加行/列字符标签（setRowLabel + 顶部 VText 行）；填表逐格 highlightCell + setCell 长度；回溯：从右下沿 LCS 路径高亮，字符飞入结果 VText；递归/记忆同表不同遍历顺序。
- Smoke：A="abc" B="ac" → LCS表 → 播放 → 截图验证表 + 结果 "ac" + 无 error。

### 2i-3 RotateScale2D 旋转缩放 2D
- 文件：改写 `RotateScale2D.html`、创建 `AlgorithmLibrary/RotateScale2D3D.js`
- 控件：输入框「角度」「缩放」+ 按钮「转变」「改变形状」
- 设计：Geometry3D（相机侧视 2D 平面：shape 用很扁的 BoxGeometry 当 2D 图形）+ 数学矩阵 VText 显示（旋转矩阵/缩放矩阵表格用 VText 行）；转变：animateTo 旋转 angle° + 缩放因子（页面直接操作 this.shape.scale 用自写 C 命令 + setTransform 兜底）；改变形状：换几何（remove shape → addShape）。
- Smoke：角度 90 → 转变 → 播放 → 截图验证图形旋转 + 无 error。

### 2i-4 RotateTranslate2D 旋转平移 2D
- 文件：改写 `RotateTranslate2D.html`、创建 `AlgorithmLibrary/RotateTranslate2D3D.js`
- 控件：输入框「角度」「dx」「dy」+ 按钮「转变」「改变形状」
- 设计：同 2i-3 加平移（变换矩阵 3×3 VText）；转变 = 旋转 + 平移组合 animateTo。
- Smoke：角度 90 + dx 50 → 转变 → 播放 → 截图验证旋转+位移 + 无 error。

### 2i-5 ChangingCoordinates2D 坐标变换 2D
- 文件：改写 `ChangingCoordinates2D.html`、创建 `AlgorithmLibrary/ChangingCoordinates2D3D.js`
- 控件：输入框「x」「y」+ 按钮「变换点」「移动对象」
- 设计：Geometry3D 2D 平面 + 点 VNode 球 + 原点坐标系；变换点：旋转/平移复合矩阵作用于点（VNode moveTo 新位置 + 矩阵 VText 逐步更新，步骤 1 旋转 → 2 平移）；移动对象：对象整体移动（VBox/group moveTo）。
- Smoke：变换点 → 播放 → 截图验证点位移 + 无 error。

### 2i-6 ChangingCoordinates3D 坐标变换 3D
- 文件：改写 `ChangingCoordinates3D.html`、创建 `AlgorithmLibrary/ChangingCoordinates3D3D.js`
- 控件：输入框「x」「y」「z」+ 按钮「变换点」「移动对象」
- 设计：Geometry3D 3D 轴 + 点 VNode + 对象（IcosahedronGeometry）；变换点：绕轴旋转复合（step 动画 + 矩阵 VText）；移动对象：对象 animateTo。
- Smoke：变换点 → 播放 → 截图验证 + 无 error。

### 2i-7 DisjointSets 并查集
- 文件：改写 `DisjointSets.html`、创建 `AlgorithmLibrary/DisjointSets3D.js`
- 控件：输入框「值」(0~7) + 按钮「查找」「联合」
- 设计：8 个元素 = 森林 Tree3D（单节点排两行）+ 父指针 Table3D（1×8 显示 parent 数组）；联合：两个根连通（drawEdges + 根成为子树 moveNode）；查找：从节点沿父链 highlight 到根 + VText「find(x)=r」；按秩合并显示秩 VText。
- Smoke：联合 0-1, 2-3 → 查找 0 → 播放 → 截图验证树 + 无 error。

# 阶段 3：index.html 3D 目录

- 文件：创建 `index.html`、删除 `Algorithms.html`（用户指令「Algorithms.html改成index.html」；创建 index.html 后删除 Algorithms.html；仓库内对 Algorithms.html 的引用（如已完成 3D 页面 HTML 内的导航链接）改为 index.html）
- 设计：
  - head：importmap 映射 "three" + visualizationPageStyle3d.css + 深空背景样式。
  - 3D hero：独立 canvas `#hero`（Scene3D 实例 + 独立 AnimationEngine，不依赖页面算法）；中央旋转 IcosahedronGeometry 网格发光体 + 环绕小行星球（圆环轨道）+ 背景星空 + FogExp2；标题「算法可视化」HTML overlay（或 VText）；循环动画（Scene3D.start 渲染循环已驱动，页面额外维护 hero 对象自转）。
  - 9 个分类卡片（基本/递归/索引/排序/堆/图/DP/几何/其他）：每卡片 HTML div + 页面链接（全部 53 页，已完成 3D 化的用 3D 图标标记）。hover 卡片 CSS 发光。
  - 冒烟：加载 index.html → canvas 存在 → 无 error → 截图 hero 有图形像素。
- 导航引用更新：把 9 个已完成 3D 页面 + 40 个新页面统一注册到 index.html 卡片链接；旧页面上方的「返回目录」链接指向 index.html。

---

## 批次顺序与验证

批次按 2b→2i→stage3 串行执行（共享代码库，禁止并行 implementer）。每批完成后：
1. `node --check AlgorithmLibrary/*3D.js`（该批新文件）
2. Playwright smoke（completion-wait pattern）：加载每个页面 → 执行代表性操作 → 等待 '▶ 播放' 复原 → 断言无 console error + canvas 存在 + 截图人工/ASCII 检查
3. 修复问题后 `git add` 该批文件 + commit（message: `feat: 3D 化 <批名> <页数> 页`）

已完成的 9 页（SimpleStack/StackLL/QueueArray/QueueLL/BST/BFS/DPFib/RotateScale3D/StackArray）保持不动，仅确认 index.html 链接正确。
