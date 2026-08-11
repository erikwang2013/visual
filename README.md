# 算法可视化 · 3D 动态演示

基于 three.js 的算法可视化网站：**199 个数据结构与算法**，每个算法都有可交互的 3D 动画演示、逐步执行与文字讲解。

## 特性

- **199 个算法页面**：线性结构、树、堆、图、排序、查找、哈希、动态规划、字符串匹配、网络流、密码学、压缩、机器学习、分布式、量子算法等
- **3D 可视化**：Three.js 实时渲染，节点、边、路径高亮均可拖拽旋转视角
- **自动演示**：每个页面内置「▶ 演示」按钮，一键播放完整算法流程（播放/暂停/调速）
- **逐步讲解**：演示过程中顶部提示条同步说明当前步骤的原理与状态
- **交互实验**：在控制面板输入自定义数据（如树的中序序列、图的边、模式串）实时重演
- **清除/重置**：一键清空当前演示内容回到初始状态，无需刷新页面
- **视觉主题**：每个算法专属配色（霓虹光效、星空背景），页面支持滚动与滚轮缩放

## 本地运行

项目为纯静态页面（ES Module，无构建步骤），任选一种方式启动：

```bash
# Python
python3 -m http.server 8124

# 或 Node
npx serve .
```

浏览器访问 <http://127.0.0.1:8124/> 即可。请使用现代浏览器（Chrome / Edge / Firefox）。

## 目录结构

```
visual/
├── index.html                  # 首页目录（199 个算法入口 + 搜索 + 浮动导航）
├── visualizationPageStyle3d.css# 详情页统一样式
├── 3D/
│   ├── Scene3D.js              # 3D 场景基座（相机/光照/星空/背景/滚轮策略）
│   ├── AnimationEngine.js      # 动画队列引擎（命令/时间线/速度/暂停）
│   ├── ControlPanel.js         # 控制面板（按钮/输入框/状态栏/滑块）
│   ├── VisualObject3D.js       # 可视化对象（VBox 节点/VText 文本/管状边）
│   ├── Glow.js                 # 主题与调色板（发光材质）
│   └── autodemo.js             # 自动演示条（▶ 演示 / 清空 / 说明注入）
├── AlgorithmLibrary/           # 每个算法一个 XX3D.js（场景逻辑 + 动画编排）
├── ThirdParty/three/           # three.js 运行时库（本地引入，无 CDN）
└── 各算法页面 *.html           # 如 RedBlack.html、BPlusTree.html、Dinic.html
```

## 算法列表（全部 199 个）

> 每个算法一个页面，文件名即 `XXX.html`，演示脚本位于 `AlgorithmLibrary/XXX3D.js`。

### 搜索与字符串
- ACAutomaton — AC 自动机 多模式匹配
- BoyerMoore — Boyer-Moore 字符串匹配
- BruteForce — BF 朴素匹配
- KMP — KMP 字符串匹配
- LCP — LCP 最长公共前缀
- Manacher — Manacher 最长回文子串
- RabinKarp — Rabin-Karp 字符串匹配
- Search — 查找（二分查找 / 线性搜索）
- SuffixArray — 后缀数组 Suffix Array
- SuffixAutomaton — 后缀自动机 SAM
- SuffixTree — 后缀树 Suffix Tree
- Sunday — Sunday 算法
- Trie — 字典树 Trie
- TST — 三叉搜索树 TST
- ZAlgorithm — Z 算法（字符串匹配）

### 排序
- BucketSort — 桶排序
- ComparisonSort — 比较排序算法
- CountingSort — 计数排序
- HeapSort — 堆排序
- RadixSort — 基数排序
- TimSort — TimSort 排序算法

### 树
- AVLtree — AVL 平衡二叉树
- BPlusTree — B+ 树（3 阶）
- BST — 二叉搜索树
- BTree — B 树（3 阶）
- RadixTree — 基数树 Radix Tree
- RedBlack — 红黑树
- SegmentTree — 线段树（区间和）
- SplayTree — 伸展树（Splay 树）
- Treap — Treap（树堆）

### 堆
- BinomialQueue — 二项队列
- FibonacciHeap — 斐波那契堆
- Heap — 最小堆
- LeftistHeap — 左倾堆
- PairingHeap — 配对堆（Pairing Heap）
- SkewHeap — 斜堆

### 图论与网络流
- AStar — A* 寻路
- BellmanFord — Bellman-Ford 最短路
- Boruvka — Borůvka 最小生成树
- BFS — 广度优先搜索（BFS）
- Biconnected — 双连通分量（割点与桥）
- ConnectedComponent — 连接组件
- DFS — 深度优先搜索
- Dijkstra — Dijkstra 最短路径
- Dinic — Dinic 最大流
- EdmondsKarp — 最大流（Edmonds-Karp）
- Floyd — Floyd-Warshall All-Pairs 最短路径
- FordFulkerson — Ford-Fulkerson 最大流
- HopcroftKarp — Hopcroft-Karp 匹配
- Hungarian — 匈牙利算法（二分图最大匹配）
- Johnson — Johnson 全源最短路
- KM — KM 最大权匹配
- Kosaraju — Kosaraju 强连通分量（SCC）
- Kruskal — Kruskal 最小成本生成树
- MinCostFlow — 最小费用最大流
- Prim — Prim 最小成本生成树
- PushRelabel — Push-Relabel 压入重标记
- SPFA — SPFA 最短路（队列优化的 Bellman-Ford）
- Tarjan — Tarjan 强连通分量
- TopoSortDFS — 拓扑排序 (DFS)
- TopoSortIndegree — 拓扑排序（入度）

### 动态规划
- DigitDP — 数位DP
- DPChange — 动态规划（做出改变）
- DPFib — 斐波那契（动态规划）
- DPLCS — 动态规划（最长公共子序列）
- EditDistance — 编辑距离（动态规划）
- Knapsack — 0/1 背包问题
- LIS — 最长递增子序列（动态规划）
- MatrixChain — 矩阵连乘（动态规划）
- OptimalBST — 最优二叉搜索树
- RodCutting — 钢条切割
- StoneMerge — 石子合并
- TreeDP — 树形DP
- TSPDP — 状压DP旅行商
- UnboundedKnapsack — 完全背包

### 数学与数值
- Cholesky — Cholesky 分解
- Euclidean — 欧几里得算法（最大公约数）
- ExGcd — 扩展欧几里得算法
- FastPow — 快速幂（快速求幂）
- FFT — FFT 快速傅里叶变换
- FWT — FWT 快速沃尔什变换
- Gauss — 高斯消元（线性方程组）
- Graham — Graham 扫描（凸包）
- GeometryBase — 计算几何基础
- HalfPlane — 半平面裁剪（Sutherland–Hodgman）
- LUDecomposition — LU 分解
- MatrixFastPow — 矩阵快速幂
- MillerRabin — Miller-Rabin 素性测试
- NearestPair — 最近点对
- NTT — NTT 快速数论变换
- PollardRho — Pollard-Rho 质因数分解
- QRDecomposition — QR 分解
- Sieve — 埃氏筛与线性筛（质数筛选）
- Strassen — Strassen 矩阵乘法

### 哈希与数据结构
- BKDRHash — BKDR 哈希
- CityHash — CityHash 散列
- ClosedHash — 闭寻址哈希（线性探测）
- ClosedHashBucket — 桶内链闭哈希
- ConsistentHash — 一致性哈希（哈希环）
- ELFHash — ELF 哈希
- MurmurHash — MurmurHash 散列
- OpenHash — 开放哈希（链地址法）
- DisjointSets — 不相交集（并查集）
- Fenwick — 树状数组（Fenwick Tree）
- SkipList — 跳表（Skip List）

### 操作系统
- Banker — 银行家算法（死锁避免）
- Clock — 时钟页面置换（Clock）
- CSCAN — C-SCAN 磁盘调度
- Deadlock — 死锁检测
- FCFS — 先来先服务调度（FCFS）
- FIFO — 先进先出页面置换（FIFO）
- LFU — 最不经常使用页面置换（LFU）
- LRU — 最近最久未用页面置换（LRU）
- MLFQ — 多级反馈队列调度（MLFQ）
- NRU — NRU 页面置换
- RR — 时间片轮转调度（RR）
- SCAN — 电梯扫描磁盘调度（SCAN）
- SJF — 短作业优先调度（SJF）
- SSTF — 最短寻道时间磁盘调度（SSTF）

### 密码学与压缩
- AES — AES 加密
- Caesar — Caesar 凯撒密码
- CRC — CRC-32 循环冗余校验
- DES — DES 加密
- DiffieHellman — Diffie-Hellman 密钥交换
- DSA — DSA 数字签名
- ECC — 椭圆曲线密码
- ECDH — ECDH 密钥交换
- ECDSA — ECDSA 签名
- ElGamal — ElGamal 加密
- Hamming — 汉明码 (7,4)
- LDPC — LDPC 低密度奇偶校验码
- MD5 — MD5 消息摘要
- RC4 — RC4 流密码
- RSA — RSA 公钥加密
- RS — Reed-Solomon 纠错码
- SHA256 — SHA-256 摘要算法
- SM2 — SM2 国密签名
- SM3 — SM3 国密摘要
- SM4 — SM4 分组密码
- TripleDES — 3DES 三重加密
- Vigenere — Vigenere 维吉尼亚密码
- ArithmeticCoding — 算术编码
- Brotli — Brotli 压缩
- DEFLATE — DEFLATE 压缩
- Huffman — Huffman 编码
- LZ77 — LZ77 压缩
- LZ78 — LZ78 压缩
- LZSS — LZSS 压缩
- RLE — RLE 游程编码
- Zstd — Zstandard 压缩

### 机器学习与数据挖掘
- AdaBoost — AdaBoost自适应提升
- CNN — 卷积神经网络
- DBSCAN — DBSCAN密度聚类
- DecisionTree — 决策树（ID3）
- GBDT — 梯度提升树
- KMeans — K-Means 聚类
- KNN — K 近邻（KNN）
- LinearRegression — 线性回归（梯度下降）
- LogisticRegression — 逻辑回归
- MLP — 多层感知机
- NaiveBayes — 朴素贝叶斯
- PCA — 主成分分析
- QLearning — Q学习强化学习
- RandomForest — 随机森林
- SVM — 支持向量机
- Transformer — Transformer自注意力

### 分布式与并发
- Gossip — Gossip 流言协议
- LoadBalance — 负载均衡
- Paxos — Paxos 分布式共识
- Raft — Raft 共识算法
- RateLimit — 令牌桶限流
- Saga — Saga 长事务
- Snowflake — Snowflake 雪花 ID
- TCC — TCC 事务
- ThreePC — 三阶段提交 3PC
- TwoPhaseCommit — 两阶段提交（2PC）
- ZAB — ZAB 协议

### 量子与前沿
- Grover — Grover 搜索算法
- QuantumAnnealing — 量子退火
- Shor — Shor 质因数分解

### 递归与栈/队列
- RecFact — 递归阶乘
- RecQueens — N 皇后问题
- RecReverse — 递归逆转
- QueueArray — 队列（数组实现）
- QueueLL — 队列（链表实现）
- SimpleStack — 堆栈
- StackArray — 堆栈（数组实现）
- StackLL — 堆栈

### 几何变换
- ChangingCoordinates2D — 改变坐标空间 (2D)
- ChangingCoordinates3D — 更改坐标空间 (3D)
- RotateScale2D — 旋转和缩放 (2D)
- RotateScale3D — 旋转与缩放（3D）
- RotateTranslate2D — 旋转和平移 (2D)

### 其他
- ActivitySelect — 活动选择
- FibonacciSearch — 斐波那契搜索
- ExponentialSearch — 指数搜索
- InterpolationSearch — 插值搜索
- SetCover — 集合覆盖
- TaskSched — 任务调度

## 技术栈

- [Three.js](https://threejs.org/) —— 3D 渲染（本地 `ThirdParty/three` 引入）
- 原生 JavaScript ES Module，无框架、无构建工具、无外部 CDN 依赖
- 纯前端静态托管，任意静态服务器 / CDN / GitHub Pages 均可部署
