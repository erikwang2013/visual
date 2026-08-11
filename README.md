# 算法可视化 · 3D 动态演示

基于 three.js 的算法可视化网站：**174 个数据结构与算法**，每个算法都有可交互的 3D 动画演示、逐步执行与文字讲解。

## 特性

- **195 个算法页面**：线性结构、树、堆、图、排序、查找、哈希、动态规划、字符串匹配、网络流、密码学、压缩、机器学习、分布式、量子算法等
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
├── index.html                  # 首页目录（174 个算法入口 + 搜索 + 浮动导航）
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

## 算法列表（分类）

- **树**：二叉搜索树、AVL、红黑树、B 树、B+ 树、Trie、基数树、TST、伸展树、Treap
- **堆**：二叉堆、左式堆、斜堆、配对堆、二项队列、斐波那契堆
- **图**：DFS、BFS、连通分量、拓扑排序×2、Dijkstra、Bellman-Ford、Floyd、Prim、Kruskal、A*、Dinic、Tarjan
- **排序**：比较排序、归并、快速、堆排序、桶、计数、基数、TimSort
- **查找/哈希**：顺序/二分查找、插值/指数/斐波那契搜索、开放/封闭/封闭桶哈希
- **动态规划**：斐波那契、找零、LCS、背包、矩阵连乘、LIS、编辑距离
- **操作系统**：FCFS、SJF、RR、MLFQ 进程调度；FIFO、LRU、LFU、Clock 页面置换；SSTF、SCAN 磁盘调度；银行家算法
- **图论补全**：SPFA 最短路、Edmonds-Karp 最大流、匈牙利算法、Kosaraju SCC、Borůvka MST、Johnson 全源最短路、Ford-Fulkerson、Push-Relabel 预流推进、最小费用最大流、双连通分量（Tarjan 割点/桥）、KM 最大权匹配、Hopcroft-Karp 匹配
- **数学与数值**：埃氏筛/线性筛、快速幂、Graham 凸包、高斯消元、扩展欧几里得、欧几里得、矩阵快速幂、LU 分解、QR 分解、Cholesky、Strassen、Miller-Rabin、Pollard-Rho、计算几何基础、最近点对、半平面交、FFT、NTT、FWT
- **搜索与字符串**：跳表、一致性哈希、Huffman 编码、Boyer-Moore、Rabin-Karp、Z 算法
- **密码学与压缩**：凯撒、维吉尼亚、DES、AES、RSA、Diffie-Hellman、MD5、SHA-256、SM3、MurmurHash、CityHash；SM4、3DES、RC4、ECC、ElGamal、SM2、ECDH、DSA、ECDSA；RLE、LZ77、LZ78、算术编码、LZSS、DEFLATE、Brotli、Zstandard、汉明码、CRC-32、Reed-Solomon、LDPC
- **机器学习与分布式**：KNN、K-Means、线性回归、决策树（ID3）、逻辑回归、朴素贝叶斯、SVM、随机森林、GBDT、AdaBoost、DBSCAN、PCA、MLP、CNN、Transformer、Q-Learning；Raft 共识、两阶段提交（2PC）、Paxos、ZAB、Gossip、负载均衡（加权轮询）、令牌桶限流、Snowflake ID、三阶段提交（3PC）、TCC、Saga
- **量子算法**：Grover 搜索、Shor 质因数分解
- **其他**：并查集、KMP、Manacher、AC 自动机

## 技术栈

- [Three.js](https://threejs.org/) —— 3D 渲染（本地 `ThirdParty/three` 引入）
- 原生 JavaScript ES Module，无框架、无构建工具、无外部 CDN 依赖
- 纯前端静态托管，任意静态服务器 / CDN / GitHub Pages 均可部署
