# P0 26 页分镜评审与终稿

> 评审对象：优先级 P0 的 26 页。结论：全部保留 P0，但统一补上“核心不变量 + 逐拍为什么 + 页面专属镜头 + 状态面板 + 预测/对比交互”。

## 评审标准

| 维度 | 通过标准 |
|---|---|
| 逻辑 | 能看出 输入 → 不变量 → 操作 → 状态变化 → 终止 |
| 镜头 | 至少 3 个镜头位，且不是全站同一机位 |
| 标注 | 每一拍有一句“为什么”，不是只写动作 |
| 状态 | 面板能读出该算法的核心数据结构，而不是泛泛的“结果” |
| 交互 | 至少一个输入 + 一个预测/对比/回退玩法 |
| 名场面 | 一个只属于该算法的记忆点 |
| 可行性 | 能用现有 GeneratorEngine + 新 Camera/Annotation/HUD 组件实现 |

## 评审结论

- 26 页全部保留 P0；没有需要降级的页面。
- 原分镜的主要问题：多数页面使用原型默认镜头；多数节拍只写“做什么”，没有写“为什么”；状态面板对不变量覆盖不足；少数页缺少删除/负权/分裂等边界。
- 终稿已为每页补：核心不变量、页面专属镜头、6–8 拍逐拍标注、状态面板、预测/对比交互。
- 6 页原有详细样例（BFS/Dijkstra/比较排序/AVL/背包/AES）已并入本终稿；`06-tier1-detailed.md` 保留作为快速样例。

## P0 总表

| 页面 | 原型 | 脚本 | 分组 | 核心不变量 | 名场面 |
|---|---|---|---|---|---|
| [比较排序（冒泡/选择/插入/壳/归并/快排）](../../ComparisonSort.html) | SORT | <code>ComparisonSort3D.js</code> | sort | 每种排序都维护自己的不变量：已排序前缀 / 堆序 / run / 分区 | 六种排序在同一赛道竞速：快排分区墙、归并双河、希尔 gap 平面 |
| [基数排序](../../RadixSort.html) | SORT | <code>RadixSort3D.js</code> | sort | 每轮收集后低 k 位有序；稳定分桶保住前一轮顺序 | 元素像瀑布落进 0-9 桶，再按桶序收成一条有序河 |
| [堆排序](../../HeapSort.html) | SORT | <code>HeapSort3D.js</code> | sort | 堆区始终满足父≥子，堆顶是当前最大值 | 堆顶像喷泉口，最大值被摘下后新堆顶一路下沉 |
| [广度优先搜索](../../BFS.html) | GRAPH | <code>BFS3D.js</code> | graph | FIFO 保证距离非降，首次到达即最短 | 波前环逐层穿过图城，节点按距离一层层点亮 |
| [深度优先搜索](../../DFS.html) | GRAPH | <code>DFS3D.js</code> | graph | 深入优先 + 完成后回溯；dfn/完成时间记录访问顺序 | 一条发光线一路深入，碰壁后回溯，时间戳在节点上亮起 |
| [Dijkstra 的最短路径](../../Dijkstra.html) | GRAPH | <code>Dijkstra3D.js</code> | graph | 非负权 → 取出即确定，不会再被更短路径更新 | 优先队列气泡从源点扩张，松弛光点沿边流动 |
| [Bellman-Ford 最短路径（负权边）](../../BellmanFord.html) | GRAPH | <code>BellmanFord3D.js</code> | graph | 最短路最多 V-1 条边；第 V 轮还能松弛 = 负环 | 每轮松弛像涟漪反复扫过所有边，负权边像弹簧 |
| [Prim 的最小成本生成树](../../Prim.html) | MST | <code>Prim3D.js</code> | graph | 已选边始终是一棵最小生成树（cut property） | 生成树像藤蔓从源点生长，每次选最近的桥 |
| [Kruskal 最小成本生成树](../../Kruskal.html) | MST | <code>Kruskal3D.js</code> | graph | 已选边无环且总权最小（cut property + 并查集） | 按边权从小到大，森林一片片合并；成环的边被拒绝 |
| [A* 寻路](../../AStar.html) | GRAPH | <code>AStar3D.js</code> | graph | h 可采纳（不高估）→ A* 仍找到最短路 | 启发式光束指向终点，优先探索最有希望的格子 |
| [二叉搜索树](../../BST.html) | TREE | <code>BST3D.js</code> | tree | 左子树 < 根 < 右子树；中序必有序 | 新节点从根一路比较下坠，路径点亮成一条光链 |
| [AVL 树（平衡二叉搜索树）](../../AVLtree.html) | TREE | <code>AVL3D.js</code> | tree | 任意节点 \|BF\|≤1；四种失衡对应四种旋转 | 失衡瞬间整棵子树像舞伴一样旋转，平衡仪回正 |
| [红黑树](../../RedBlack.html) | TREE | <code>RedBlack3D.js</code> | tree | 根黑、红节点孩子黑、每条路径黑高相同 | 红黑染色像交通灯切换，旋转重新平衡 |
| [B+树](../../BPlusTree.html) | TREE | <code>BPlusTree3D.js</code> | tree | 所有数据在叶子；内部只做索引；叶子链有序 | 叶子分裂，键值上升，叶子链表像传送带连起来 |
| [Trie（前缀树，26 叉树）](../../Trie.html) | TRIE | <code>Trie3D.js</code> | tree | 路径 = 前缀；词尾星标 = 完整词 | 单词逐字母点亮一条路径，词尾星标亮起 |
| [最长公共子序列](../../DPLCS.html) | DP | <code>DPLCS3D.js</code> | dp | dp[i][j] = 前缀 i/j 的 LCS 长度 | LCS 蛇形路径穿过表格，匹配字符亮起 |
| [0/1 背包问题](../../Knapsack.html) | DP | <code>Knapsack3D.js</code> | dp | dp[i][c] = 前 i 件物品、容量 c 的最优价值 | 表格变地形，选/不选两条路在山脊汇合 |
| [最长递增子序列](../../LIS.html) | DP | <code>LIS3D.js</code> | dp | dp[i] = 以 a[i] 结尾的 LIS 长度 | 最长递增子序列像山脊线，从柱阵中浮起 |
| [编辑距离](../../EditDistance.html) | DP | <code>EditDistance3D.js</code> | dp | dp[i][j] = 前缀 i/j 的最少编辑操作 | 编辑操作路径在表格中蛇形，三种操作三色箭头 |
| [AES](../../AES.html) | CIPHER | <code>AES3D.js</code> | crypto | 每轮 = SubBytes + ShiftRows + MixColumns + AddRoundKey；最后一轮无 MixColumns | AES 墨滴扩散：1 字节变化染遍整块 |
| [RSA](../../RSA.html) | PUBK | <code>RSA3D.js</code> | crypto | M^(ed) ≡ M mod n（欧拉定理） | 公钥锁上、私钥打开，模幂像齿轮 |
| [Raft 共识](../../Raft.html) | DIST | <code>Raft3D.js</code> | dist | 多数票 + 日志匹配 + 领导者完整性 | 选举闪电 + 日志复制，Leader 心跳 |
| [CNN 卷积网络](../../CNN.html) | ML | <code>CNN3D.js</code> | ml | 卷积 = 局部加权和 + 权重共享；池化降维 | 卷积核像聚光灯滑动，特征图逐格点亮 |
| [Transformer](../../Transformer.html) | ML | <code>Transformer3D.js</code> | ml | Attention(Q,K,V)=softmax(QKᵀ/√d)V | 注意力光束在词之间连线，权重越强线越亮 |
| [Grover 搜索](../../Grover.html) | QUANT | <code>Grover3D.js</code> | quantum | 总概率=1；目标振幅被逐步放大 | Oracle 相位翻转 + 均值反转，目标振幅像波峰升起 |
| [KMP 字符串匹配](../../KMP.html) | STR | <code>KMP3D.js</code> | string | next[j] = 模式前缀的最长相等前后缀长度 | 失配时 next 表让指针时间旅行，跳过重复比较 |

## 建议实现顺序

| 批次 | 页面 | 目的 | 预估 |
|---|---|---|---|
| A | BFS / DFS / Dijkstra / Bellman-Ford / A* / Prim / Kruskal | 先把图城、波前、PQ、路径、MST 这套最通用的舞台跑通 | 2.5 周 |
| B | 比较排序 / 基数排序 / 堆排序 | 赛道、桶、堆树三套排序舞台 | 2 周 |
| C | BST / AVL / 红黑树 / B+ 树 / Trie | 树岛、旋转、分裂、叶子链、前缀路径 | 2 周 |
| D | LCS / 背包 / LIS / 编辑距离 / KMP | 表格地形、回溯路径、纸带跳转 | 1.5 周 |
| E | AES / RSA / CNN / Transformer / Raft / Grover | 状态方阵、密钥、卷积、注意力、集群、振幅 | 2 周 |

> 合计约 8–10 周（1 名开发）；2 名开发并行约 6–7 周（另配设计/内容）。每批完成后用同一套验收：首屏 3 秒看懂、每拍一个动词、状态面板可读、至少一个交互、手机不裁切、无标注重叠。

## 开放决策

1. P0 26 页是否按上面的 A–E 顺序实施？
2. 是否保留 `06-tier1-detailed.md` 作为样例，还是删除以免和 07 重复？
3. 是否有页面要换“名场面”或调整优先级？

## 文件

- [07a-p0-graph-sort-tree.md](07a-p0-graph-sort-tree.md)：排序 / 图 / 树（15 页）
- [07b-p0-dp-crypto-ml-dist-quantum.md](07b-p0-dp-crypto-ml-dist-quantum.md)：DP / 密码 / ML / 分布式 / 量子 / 字符串（11 页）