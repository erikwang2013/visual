# 数据结构可视化网站 three.js 3D 全面重写 — 设计文档

日期：2026-08-10
状态：已获用户批准

## 1. 背景与目标

当前站点 `visual.erik.xyz` 是 USF David Galles 经典算法可视化项目的中文版：
53 个算法页面，基于 2D canvas 渲染（`AnimationLibrary/`，12 个类，5200 行）＋ 老式 jQuery 1.5.2 控件。

**目标**：用 three.js 全面重写为动态 3D 可视化，视觉风格**深空科幻**（深蓝星空＋发光节点＋网格地面），要好看、好玩、有特色。

**范围决策（用户确认）**：方案 B —— 每个页面独立 three.js 场景，算法逻辑与 3D 渲染均重写。旧 `AnimationLibrary/` 2D 引擎退役。

## 2. 视觉规范（深空科幻）

| 元素 | 设计 |
|------|------|
| 背景 | 深蓝黑渐变（`#030514 → #0a0f2e`）＋ 300–500 颗静态粒子星 ＋ 缓慢飘动星云点 |
| 地面 | 半透明发光网格（淡蓝 `#3b82f6`，低透明度） |
| 节点 | 发光球体，蓝色主色 emissive 微光；高亮时变青色并脉冲 |
| 连线 | 管状线（TubeGeometry），淡蓝半透明 |
| 文字 | Sprite 文字（CanvasTexture），白色＋淡蓝描边 |
| 光照 | 环境光 ＋ 主方向光 ＋ 跟随相机的点光源 |
| 交互 | OrbitControls 拖拽旋转/缩放/平移；初始视角俯视约 30° |

## 3. 架构

```
3D/                              ← 新增共享 3D 基础设施
├── Scene3D.js                   通用场景：粒子星空、网格地面、雾、
│                                相机、OrbitControls、RAF 渲染循环
├── Glow.js                      发光材质工厂（深空科幻调色板）
├── VisualObject3D.js            3D 图元：发光球体/圆角盒子/文字Sprite/
│                                箭头/管状连线/圆环/粒子
├── AnimationEngine.js           动画状态机：创建、移动、高亮、消失补间
├── ControlPanel.js              算法控制按钮区（沿用现有 DOM 控件风格）
└── modes/
    ├── Array3D.js               排序/栈/队列/哈希 → 3D 柱状体/盒子列
    ├── Tree3D.js                所有树结构 → 3D 树，每层 z 深度错开
    ├── Graph3D.js               图算法 → 悬浮节点球 + 发光连线
    ├── Table3D.js               DP / Floyd → 3D 网格面板
    └── Geometry3D.js            几何变换 → 3D 坐标轴 + 多面体演示
```

**页面三要素**：
1. 页面 HTML：引入 importmap（three.js）＋ `3D/` 组件 ＋ 页面算法脚本
2. 页面算法脚本：实现算法逻辑（如 BFS 的队列、入队出队、节点着色），直接驱动 3D 图元
3. 模式组件：决定可视化形态

## 4. 模式细节

- **Array3D**（排序/栈/队列/哈希）：元素＝3D 柱/盒子列，高度=值；比较中的柱体高亮发光并上下浮动；栈/队列元素盒子逐个入列带缓动与落地阴影。
- **Tree3D**（BST/AVL/红黑/Splay/Trie/基数树/TST/B树/B+树/各类堆/不相交集）：节点＝发光球体，父子管状线连接；每层 z 递增 2 单位形成纵深；插入/删除节点缩放＋发光脉冲；红黑树节点红/蓝双色；AVL/红黑旋转节点沿弧线移动。
- **Graph3D**（BFS/DFS/连通分量/Dijkstra/Prim/拓扑×2/Floyd/Kruskal）：节点＝悬浮发光球（随机分布），边＝半透明管；遍历当前节点高亮＋连线点亮动画；带权图显示距离数值 Sprite。
- **Table3D**（DPFib/DPChange/DPLCS/Floyd 的矩阵部分）：3D 面板网格，单元格凸起，计算中单元格高亮发光，已计算单元格留光迹。
- **Geometry3D**（RotateScale2D/RotateTranslate2D/ChangingCoordinates2D/RotateScale3D/ChangingCoordinates3D）：真 3D 坐标轴（XYZ 彩色箭头）＋网格地面＋多面体演示旋转/平移/缩放/坐标系变换。

## 5. 首页漫游空间（Algorithms.html 重写）

- 全屏 3D：星空＋旋转银河粒子环
- 8 个分类（基本/递归/索引/排序/堆/图/DP/几何）→ 每组 3D 图标（悬浮几何体：排序=上升柱群、树=小树、图=节点球网等）
- 悬停：图标放大＋发光增强＋显示分类名；点击：过渡展开该分类的页面悬浮球菜单；再点进入页面
- 鼠标拖拽/触摸漫游；标题「数据结构可视化」3D 悬浮文字
- 降级：页面底部保留纯文字目录链接（WebGL 不可用时的退路）

## 6. 技术细节

- three.js **本地引入**（`ThirdParty/three/`）：`three.module.js` ＋ `OrbitControls.js`；每页 `<script type="importmap">` ＋ `import * as THREE from 'three'`
- WebGL 不可用：页面顶部提示＋降级目录链接
- `setPixelRatio(min(devicePixelRatio, 2))` 防移动端性能问题
- 星空用单次 `Points` 绘制；地面用 `GridHelper` 单对象；控制 draw call
- 独立 RAF 循环＋补间池；动画速度滑块沿用现有 jQuery UI 组件
- 旧文件直接覆盖（git 已初始化，历史可回退）

## 7. 分期实施计划

| 阶段 | 内容 | 页面 |
|------|------|------|
| 0 地基 | 下载 three.js 本地文件；搭建 `3D/` 基础设施 | — |
| 1 模式验证 | StackArray(Array3D)、BST(Tree3D)、BFS(Graph3D)、DPFib(Table3D)、RotateScale3D(Geometry3D) | 5 |
| 2 批量铺开 | 基本结构(7) → 排序(9) → 索引(14) → 堆(5) → 图(9) → DP(3) → 几何(5)，每批 Playwright 冒烟测试 | 48 |
| 3 首页+收尾 | Algorithms.html 漫游空间；template.html 更新；全站验证 | 1 |

## 8. 边界与错误处理

- 输入校验：控件输入沿用现有 `returnSubmit` 数字校验模式（只接受合法数值）
- 空结构操作：对空栈/空队列/空树的弹出、删除操作给出状态提示（面板文字）
- WebGL 失败：错误提示 + 降级链接
- 动画状态机保证命令串行执行（同一时刻一个补间队列），避免冲突

## 9. 测试策略

- 每批页面用 Playwright（browser MCP）冒烟测试：加载无控制台错误、控件可操作、核心操作动画可见
- 首页漫游空间重点测试：悬停、点击展开、导航进入
- 全站验证阶段跑一遍全部 53 页
