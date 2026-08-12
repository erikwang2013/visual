// 3D/autodemo.js — 算法内页「演示」按钮：一键启动当前算法演示。
// 页面不再有「运行演示」按钮：默认演示由 GeneratorEngine.queue(factory) 注册，
// 本脚本的「▶ 演示」与播放条「播放」都走 engine.toggle()，首次点击自动启动。
(function () {
  // 右侧对照说明栏 + 场景底部结果条：同步创建（本脚本先于模块脚本执行，模块的 addStatus/addLabel 依赖它）
  const sceneEl = document.querySelector('#scene');
  if (sceneEl && !document.querySelector('#side-panel')) {
    const side = document.createElement('div');
    side.id = 'side-panel';
    side.innerHTML = '<h2 class="panel-title">算法说明</h2><div id="algo-desc"></div><div id="side-hints"></div>';
    sceneEl.parentNode.insertBefore(side, sceneEl.nextSibling);
  }
  if (sceneEl && !document.querySelector('#result-bar')) {
    const bar = document.createElement('div');
    bar.id = 'result-bar';
    bar.innerHTML = '<span class="result-tag">演示结果</span>';
    sceneEl.parentNode.insertBefore(bar, sceneEl.nextSibling);
  }

  // 每页算法说明：第一段为总述，其余为子算法/子功能说明
  const ALGO_DESC = {
    'StackArray.html': ['堆栈（数组实现）：后进先出，压栈/弹栈都在数组末尾进行，常数时间操作。', '子算法：压栈 push、弹栈 pop、查看栈顶 top'],
    'StackLL.html': ['堆栈（链表实现）：后进先出，压栈在链表头部插入节点，弹栈删除头节点。', '子算法：压栈 push（头插）、弹栈 pop（头删）'],
    'QueueArray.html': ['队列（数组实现）：先进先出，循环数组用头/尾指针绕回复用空间。', '子算法：入队 enqueue（尾进）、出队 dequeue（头出）'],
    'QueueLL.html': ['队列（链表实现）：先进先出，头部出队、尾部入队。', '子算法：入队 enqueue（尾插）、出队 dequeue（头删）'],
    'SimpleStack.html': ['简单堆栈：后进先出，演示数组上的压栈与弹栈过程。', '子算法：压栈 push、弹栈 pop'],
    'RecFact.html': ['递归阶乘：f(n)=n×f(n-1) 自顶向下展开调用帧，到达叶子 f(1)=1 后回溯逐层相乘。', '子步骤：递归展开 → 叶子归位 → 回溯累乘'],
    'RecReverse.html': ['递归反转字符串：调用帧 rev(s[i..]) 依次压栈，回溯时字符逐个飞回反转后的位置。', '子步骤：递归展开 → 回溯移动字符'],
    'RecQueens.html': ['N-皇后问题：回溯逐行放置皇后，冲突则撤销换列，直到所有皇后互不攻击。', '子步骤：试探放置 → 冲突检测 → 回溯换列'],
    'Search.html': ['搜索（排序列表）：在有序数组上查找目标值。', '子算法：线性搜索（逐个比较）、二分查找（每次折半，O(log n)）'],
    'BST.html': ['二叉搜索树：左子树 < 根 < 右子树，插入、删除、查找都在 O(log n) 期望时间完成。', '子操作：插入（按大小下探）、删除（叶子/单子/双子三种情形）、查找'],
    'AVLtree.html': ['AVL 树：平衡二叉搜索树，任何节点左右子树高度差 ≤ 1，失衡时按 LL/RR/LR/RL 四种旋转恢复。', '子操作：插入/删除后检查平衡因子 → 单旋或双旋'],
    'RedBlack.html': ['红黑树：五条染色性质保证最长路径不超过最短路径两倍，插入/删除通过旋转与变色维持平衡。', '子操作：插入修正（叔红变色/叔黑旋转）、删除修正'],
    'SplayTree.html': ['展开树：每次访问（查找/插入/删除）后将该节点通过旋转提升到根，近期访问节点更快。', '子操作：单旋、之字形双旋、一字形双旋'],
    'BTree.html': ['B 树：多路平衡搜索树，节点最多 m 个孩子，插入满则分裂、删除不足则借位/合并。', '子操作：查找、插入（分裂）、删除（借位/合并）'],
    'BPlusTree.html': ['B+ 树：所有数据只存于叶子节点，内部节点纯索引，叶子间链表连接支持高效范围查询。', '子操作：查找、插入（叶子分裂）、删除（合并）'],
    'Trie.html': ['Trie 前缀树：26 叉树逐字符存储字符串，共享公共前缀，支持前缀查询。', '子操作：插入（逐字符建链）、查找（前缀/完整词）'],
    'RadixTree.html': ['基数树（Compact Trie）：压缩只有一个孩子的节点，路径合并使结构更紧凑。', '子操作：插入（路径压缩）、查找、删除'],
    'TST.html': ['三元搜索树：每个节点三向分支（小于/等于/大于），比 26 叉 Trie 更省空间。', '子操作：插入、查找（三向比较）'],
    'SegmentTree.html': ['线段树（区间和）：堆式存储的完全二叉树，叶子为数组值，内部节点为区间和。', '子操作：建树（自底向上合并）、区间查询（完全/部分/不相交三类节点）、点更新（自叶到根重算）'],
    'ComparisonSort.html': ['比较排序：6 种经典排序算法，直接用按钮选一种即播放该算法。', '子算法：插入排序、选择排序、冒泡排序、壳排序、归并排序、快速排序'],
    'BucketSort.html': ['桶排序：按值范围分桶，各桶内部排序后按序合并，适合均匀分布的数据。', '子步骤：分桶 → 桶内排序 → 合并'],
    'CountingSort.html': ['计数排序：统计每个值的出现次数，按计数直接放置元素，O(n+k) 但要求值域为小整数。', '子步骤：计数 → 前缀和定位 → 回填'],
    'RadixSort.html': ['基数排序：按位（从最低位起）逐位桶排，LSD 方式经 k 轮完成整体有序。', '子步骤：按个位/十位/百位依次分桶收集'],
    'HeapSort.html': ['堆排序：先建最大堆，再反复把堆顶换到末尾并下沉，原地完成升序排序。', '子步骤：建堆 → 取堆顶 → 下沉调整'],
    'Heap.html': ['二叉堆：完全二叉树上的优先队列，堆顶最小，插入上浮、删除堆顶下沉。', '子操作：插入（上浮）、删除最小（下沉）、取最小'],
    'BinomialQueue.html': ['二项式队列：一组二项树的森林，按二进制进位方式合并，摊还 O(log n)。', '子操作：合并（同阶进位）、插入、删除最小'],
    'FibonacciHeap.html': ['斐波那契堆：延迟合并的多树堆，除删除最小外操作均摊 O(1)。', '子操作：插入（并入根表）、删除最小（合并同度树）'],
    'LeftistHeap.html': ['左派堆：以 npl（零路径长）维持左倾，合并优先在右子树进行，O(log n)。', '子操作：合并、插入（合并单点）、删除最小'],
    'SkewHeap.html': ['倾斜堆：合并时无条件交换左右子树，结构更简单，摊还 O(log n)。', '子操作：合并（无条件交换）、插入、删除最小'],
    'OpenHash.html': ['开放哈希表（封闭寻址）：哈希冲突时把新键串入同一槽位的链表。', '子操作：插入（头插链）、查找、删除'],
    'ClosedHash.html': ['封闭哈希表（开放寻址）：冲突时沿探测序列找下一个空槽（线性探测）。', '子操作：插入（探测）、查找（探测）、删除（标记墓碑）'],
    'ClosedHashBucket.html': ['封闭哈希表（桶式）：每个槽位是定长桶，桶满后溢出链式存储。', '子操作：插入（桶内放置）、查找、删除'],
    'BFS.html': ['广度优先搜索：从起点按层扩展，用队列记录待访问节点，可求无权图最短路径。', '子步骤：入队起点 → 逐层出队扩展邻接点'],
    'DFS.html': ['深度优先搜索：从起点一路深入，碰壁后回溯，用递归或显式栈实现。', '子步骤：深入访问 → 回溯 → 访问时间戳'],
    'ConnectedComponent.html': ['连接组件：反复从未访问节点出发做 BFS/DFS，划分无向图的连通块。', '子步骤：选未访问点 → 扩散标记 → 下一个组件'],
    'Dijkstra.html': ['Dijkstra 最短路径：贪心选当前最近未定节点松弛其邻居，仅适用非负权图。', '子步骤：取最小距离 → 松弛邻边 → 标记确定'],
    'BellmanFord.html': ['Bellman-Ford 最短路径：对每条边松弛 V-1 轮，可处理负权边并检测负权环。', '子步骤：逐轮全边松弛 → 第 V 轮检测负环'],
    'Prim.html': ['Prim 最小生成树：从单个顶点出发，每次并入连接已选集合的最短边，直到覆盖全图。', '子步骤：取最近跨边 → 并入新顶点 → 更新跨边'],
    'Kruskal.html': ['Kruskal 最小生成树：按边权升序选取不构成环的边（并查集判环），直到生成树完成。', '子步骤：边排序 → 并查集选边判环'],
    'Floyd.html': ['Floyd-Warshall：三重循环动态规划，求所有顶点对之间的最短路径。', '子步骤：逐中间点松弛所有顶点对'],
    'TopoSortIndegree.html': ['拓扑排序（入度表）：重复取出入度为 0 的顶点并删边，得到有向无环图的线性序。', '子步骤：统计入度 → 取零度顶点 → 更新入度'],
    'TopoSortDFS.html': ['拓扑排序（DFS）：按深度优先完成时间逆序输出，完成越晚的顶点越靠前。', '子步骤：DFS 遍历 → 按完成时间逆序排列'],
    'DPFib.html': ['计算第 n 个斐波那契数：自底向上填表，每个状态只算一次，O(n)。', '子步骤：初始化 f(0)/f(1) → 递推填表'],
    'DPChange.html': ['找零问题：动态规划求凑出金额的最少硬币数，并回溯输出硬币组合。', '子步骤：逐金额取最小方案 → 回溯还原组合'],
    'DPLCS.html': ['最长公共子序列：二维 DP 表比较两串，回溯得到最长公共子序列。', '子步骤：逐格填表 → 回溯输出子序列'],
    'Knapsack.html': ['0/1 背包：二维 DP 对每个物品决策取/不取，在容量约束下最大化总价值。', '子步骤：逐物品选/不选 → 回溯输出方案'],
    'RotateScale2D.html': ['二维旋转和缩放矩阵：用 2×2 矩阵对图形做旋转与缩放，演示矩阵逐元素变换。', '子步骤：旋转矩阵 → 缩放矩阵 → 组合应用'],
    'RotateScale3D.html': ['三维旋转和缩放矩阵：绕坐标轴旋转并缩放物体，矩阵连乘作用于三维对象。', '子步骤：绕轴旋转 → 缩放 → 组合应用'],
    'RotateTranslate2D.html': ['二维旋转和平移矩阵：先绕原点旋转再平移，演示矩阵分步作用到对象。', '子步骤：旋转 → 平移'],
    'ChangingCoordinates2D.html': ['二维改变坐标系：点绕 Z 轴旋转 90° 后平移 (x,y)，矩阵逐步更新。', '子操作：变换点（旋转+平移）、移动对象（整体变换）'],
    'ChangingCoordinates3D.html': ['三维改变坐标系：点先绕 Z 轴再绕 X 轴各旋转 90°，最后平移 (x,y,z)。', '子操作：变换点（旋转+平移）、移动对象（整体变换）'],
    'DisjointSets.html': ['不相交集（并查集）：维护分组集合，支持查找（路径压缩）与合并（按秩合并）。', '子操作：find 路径压缩、union 按秩合并'],
    'KMP.html': ['KMP 字符串匹配：预处理 next 前缀表，失配时利用已匹配信息跳过重复比较。', '子步骤：构建 next 表 → 主串扫描匹配'],
    'AStar.html': ['A* 寻路：启发式搜索，f = g + h 优先扩展最有希望的节点，扩展节点少且能找到最短路径。', '子步骤：计算启发值 → 扩展最小 f 节点 → 回溯路径'],
    'Dinic.html': ['Dinic 最大流：BFS 构建分层图，DFS 沿分层路径寻找增广路并更新残量，直到无法增广。', '子步骤：BFS 分层 → DFS 增广 → 更新残量'],
    'Tarjan.html': ['Tarjan 强连通分量：DFS 计算 dfn 与 low，栈中 dfn == low 的节点构成一个强连通分量。', '子步骤：DFS 编号 → 回边更新 low → 出栈形成 SCC'],
    'MatrixChain.html': ['矩阵连乘：动态规划求最优括号化方案，使标量乘法次数最少。', '子步骤：按链长自底向上填表 → s 表回溯括号化'],
    'LIS.html': ['最长递增子序列：逐位置比较前序位置，dp[i] = max(dp[j] + 1)，并回溯出最长序列。', '子步骤：逐位置递推 → 回溯最长序列'],
    'EditDistance.html': ['编辑距离：二维 DP 求两串最少编辑操作（插入/删除/替换）数，并回溯操作序列。', '子步骤：逐格填表 → 回溯操作路径'],
    'Manacher.html': ['Manacher 回文：利用回文对称性线性时间求最长回文子串，O(n)。', '子步骤：扩展半径 → 对称复制 → 更新最右回文'],
    'ACAutomaton.html': ['AC 自动机：Trie 加 fail 指针，一次扫描主串同时匹配全部模式串。', '子步骤：建 Trie → 构建 fail → 扫描匹配'],
    'Fenwick.html': ['树状数组（BIT）：lowbit 技巧支持前缀和查询与单点更新，均为 O(log n)。', '子步骤：点更新逐层上溯 → 前缀查询逐段累加'],
    'Treap.html': ['Treap：二叉搜索树加随机优先级堆性质，期望 O(log n) 的平衡搜索树。', '子步骤：BST 下降 → 违反堆性质时旋转修复'],
    'PairingHeap.html': ['配对堆：多树森林结构，插入与合并均摊 O(1)，删除最小需要两遍成对合并。', '子步骤：插入合并 → 删除最小 → 成对合并'],
    'FCFS.html': ['先来先服务：按到达顺序依次执行，非抢占，等待时间可能较长。', '子步骤：进程到达入队 → 队首出队上 CPU → 完成进完成区'],
    'SJF.html': ['短作业优先：就绪队列中挑选剩余服务时间最短的进程执行，可显著降低平均等待时间。', '子步骤：到达入队 → 选取最短作业 → 执行完成'],
    'RR.html': ['时间片轮转：每个进程执行固定时间片（2 拍），用完未完成则回到队尾，保证响应公平。', '子步骤：入队 → 上 CPU 执行时间片 → 用尽回队尾/完成'],
    'MLFQ.html': ['多级反馈队列：Q1 时间片 1、Q2 时间片 2、Q3 先来先服务，新进程进 Q1，时间片用完降级，高优先级非空时抢占。', '子步骤：到达进 Q1 → 时间片用尽降级 → 高优先级抢占'],
    'FIFO.html': ['先进先出页面置换：缺页时替换最早装入内存的页框，Belady 异常可能增加缺页。', '子步骤：访问页 → 命中高亮 / 缺页替换队首页框'],
    'LRU.html': ['最近最久未用页面置换：缺页时替换最久没有访问的页面，用栈式算法保证 Belady 最优。', '子步骤：访问页 → 命中更新访问时刻 / 缺页替换 lastUse 最小者'],
    'LFU.html': ['最不经常使用页面置换：缺页时替换访问次数最少的页面，次数相同按装入时间先替换。', '子步骤：访问页 → 命中计数 +1 / 缺页替换计数最小者'],
    'Clock.html': ['时钟页面置换（二次机会）：每个页框一个使用位，缺页时指针扫描，使用位为 1 清零后跳过，为 0 才替换。', '子步骤：指针扫描 → 清零使用位 → 替换使用位为 0 的页框'],
    'SSTF.html': ['最短寻道时间优先磁盘调度：磁头总是前往距离当前磁道最近的请求柱面，减少寻道时间。', '子步骤：选取最近请求 → 移动磁头 → 累计寻道距离'],
    'SCAN.html': ['电梯算法磁盘调度：磁头沿一个方向移动服务请求直到端部，再反向折返服务，避免饥饿。', '子步骤：向上扫描 → 到达端部折返 → 向下扫描'],
    'Banker.html': ['银行家算法（死锁避免）：每次分配前检查安全性，只有存在安全序列才允许资源分配。', '子步骤：检查 Need ≤ Available → 模拟运行释放 → 构造安全序列'],
    'SPFA.html': ['SPFA（队列优化 Bellman-Ford）：允许负权边，出队节点松弛其出边，被更新节点入队，直至队列为空。', '子步骤：源点入队 → 出队松弛 → 距离更新者入队'],
    'EdmondsKarp.html': ['最大流（Edmonds-Karp）：BFS 每次找最短增广路，按瓶颈容量增量，直至找不到增广路。', '子步骤：BFS 找增广路 → 高亮路径 → 更新流量'],
    'Hungarian.html': ['匈牙利算法（Kuhn 增广）：从左部每个点出发寻找增广路，冲突时递归为已匹配点重新匹配，求出最大匹配。', '子步骤：尝试匹配 → 冲突则递归重配 → 增广成功'],
    'Kosaraju.html': ['Kosaraju 强连通分量：原图 DFS 记录完成序，再按逆完成序在反图上 DFS，每棵搜索树即一个 SCC。', '子步骤：原图 DFS 求完成序 → 反图逆序 DFS → 标记分量'],
    'Boruvka.html': ['Borůvka 最小生成树：每轮每个连通分量选最廉价出边，去重后并入生成树并合并分量，直至只剩一个分量。', '子步骤：分量选最廉价边 → 合并去重 → 着色标记分量'],
    'Sieve.html': ['埃氏筛 / 线性筛（质数筛选）：埃氏筛反复筛去质数的倍数；线性筛保证每个合数只被最小质因子标记一次。', '子步骤：标记质数 → 筛去倍数 → 统计 30 以内质数'],
    'FastPow.html': ['快速幂：将指数按二进制分解，底数每步平方，遇到 1 位时乘入结果，O(log n) 求幂。', '子步骤：展开指数二进制 → 按位平方底数 → 位为 1 时乘入结果'],
    'Graham.html': ['Graham 扫描（凸包）：取最下点作极点，其余点按极角排序后单调栈扫描，用叉积剔除右转点。', '子步骤：极点排序 → 左转入栈 → 右转弹栈 → 闭合凸包'],
    'Gauss.html': ['高斯消元：对增广矩阵做初等行变换化为上三角（消元），再自下而上回代求解线性方程组。', '子步骤：选主元 → 行变换消元 → 回代求解'],
    'ExGcd.html': ['扩展欧几里得：辗转相除的同时记录系数，求出 ax+by=gcd(a,b) 的一组整数解。', '子步骤：辗转相除 → 回代组合余数 → 得到整数解'],
    'SkipList.html': ['跳表（Skip List）：多层有序链表，高层提供“跳跃指针”，查找时先向右再向下，O(log n)。', '子步骤：顶层向右 → 遇大值下移 → 找到目标'],
    'ConsistentHash.html': ['一致性哈希：服务器与 key 都哈希到环上，key 沿顺时针遇到的第一台服务器即归属；增删节点只迁移相邻区间。', '子步骤：服务器入环 → key 顺时针寻址 → 新增节点仅迁移邻近 key'],
    'Huffman.html': ['Huffman 编码：按频率反复合并最小的两棵子树建最优前缀树，左 0 右 1 得最短码字。', '子步骤：频率建堆 → 两两合并 → 0/1 编码 → 示例编码'],
    'BoyerMoore.html': ['Boyer-Moore：从模式最右端往左比较，失配时用“坏字符”最后一次出现位置计算跳跃步数。', '子步骤：右端对齐 → 从右往左比 → 坏字符跳跃 → 匹配'],
    'RabinKarp.html': ['Rabin-Karp：把子串哈希成整数并 O(1) 滚动更新，哈希相等才逐字符验证。', '子步骤：计算模式哈希 → 窗口滚动 → 哈希相等验证'],
    'ZAlgorithm.html': ['Z 算法：O(n) 计算 Z 数组（后缀与前缀的最长公共长度），Z[i]≥模式长且越过分隔符即匹配。', '子步骤：逐位求 Z → 着色 Z 盒 → 判定匹配位置'],
    'Caesar.html': ['凯撒密码：明文字母沿字母表平移固定位数 k 得密文，最古老的替换密码。', '子步骤：逐字符平移 → 模 26 环绕 → 生成密文'],
    'Vigenere.html': ['维吉尼亚密码：密钥循环参与位移，同一明文字符因位置不同可得到不同密文。', '子步骤：密钥循环 → (明文+密钥) mod 26 → 密文'],
    'DES.html': ['DES：16 轮 Feistel 网络，每轮右半经 F 函数（扩展+异或+代换+置换）再与左半异或。', '子步骤：初始置换 → 16 轮轮函数 → 末轮交换 → 逆初始置换'],
    'AES.html': ['AES：字节代换（S 盒）→ 行移位 → 列混合 → 加轮密钥，多轮迭代的对称加密。', '子步骤：AddRoundKey → SubBytes → ShiftRows → MixColumns'],
    'RSA.html': ['RSA：选两个大素数求模数 n 与 φ(n)，公钥加密 C=M^e mod n，私钥解密 M=C^d mod n。', '子步骤：密钥生成 → 加密（快速幂） → 解密'],
    'DiffieHellman.html': ['Diffie-Hellman：双方公开交换 g^a、g^b，各自算出共享密钥 g^(ab) mod p。', '子步骤：生成秘密 → 交换公开值 → 计算共享密钥'],
    'RLE.html': ['游程编码：连续相同字符压缩为「字符+计数」，重复多的数据压缩率高。', '子步骤：扫描游程 → 输出 字符+计数'],
    'LZ77.html': ['LZ77：滑动窗口内寻找最长匹配，输出 (偏移, 长度, 下一字符) 三元组。', '子步骤：窗口搜索最长匹配 → 输出三元组'],
    'LZ78.html': ['LZ78：动态构建字典，输出 (字典号, 新字符) 对，字典随输入增长。', '子步骤：最长前缀查字典 → 输出 (索引, 新字符) → 字典新增条目'],
    'ArithmeticCoding.html': ['算术编码：把整条消息映射为 [0,1) 内一个区间，每读一符号区间按概率缩窄。', '子步骤：符号划分区间 → 缩窄到子区间 → 取中点/二进制输出'],
    'KNN.html': ['K 近邻：新样本与所有已知样本算距离，取最近的 K 个，多数投票定类别。', '子步骤：算距离 → 取最近 K 个 → 多数投票'],
    'KMeans.html': ['K-Means 聚类：随机选 K 个质心，交替执行「分配最近质心 + 质心取簇均值」直至收敛。', '子步骤：初始化质心 → 分配 → 更新质心 → 迭代收敛'],
    'LinearRegression.html': ['线性回归：y = wx + b，梯度下降最小化均方误差，直线逐步拟合数据。', '子步骤：初始化 w,b → 算梯度 → 更新参数 → 误差下降'],
    'DecisionTree.html': ['决策树 ID3：按信息增益选特征递归分裂，子集纯化则成为叶节点。', '子步骤：算熵与增益 → 选最佳特征分裂 → 递归建树'],
    'Raft.html': ['Raft 共识：超时竞选 → 多数票成 Leader → 日志复制并提交，保证集群一致。', '子步骤：选举 → 日志复制 → 提交'],
    'TwoPhaseCommit.html': ['两阶段提交：Prepare 征询 → 全 YES 则 Commit，否则 Abort 回滚，保证分布式原子性。', '子步骤：Prepare → 回复 → Commit/Abort'],
    'Grover.html': ['Grover 搜索：均匀叠加 → Oracle 翻号 → 均值反转放大目标振幅，O(√N) 次查询。', '子步骤：叠加 → Oracle → 扩散放大 → 测量'],
    'TimSort.html': ['TimSort：Python/Java 内置排序。找自然升序 run → 短 run 插入排序补长 → 归并栈合并。', '子步骤：识别 run → 补长 → 两两归并'],
    'InterpolationSearch.html': ['插值搜索：按 key 在区间内的值比例估算下标（查字典式），均匀分布时 O(log log N)。', '子步骤：比例估算 → 比较 → 收缩区间'],
    'ExponentialSearch.html': ['指数搜索：以 1→2→4→8 翻倍探测上界，再二分收尾，适合无界/大数组。', '子步骤：指数步进 → 锁定区间 → 二分'],
    'FibonacciSearch.html': ['斐波那契搜索：用斐波那契数按黄金分割定位，只用加减不用除法。', '子步骤：取斐波那契三元组 → 探针比较 → 收缩'],
    'MD5.html': ['MD5：消息填充为 512bit 块 → 16 字 → 4 轮×16 步压缩（F/G/H/I + 循环左移）→ 128bit 摘要。', '子步骤：填充 → 分字 → 64 步压缩 → 雪崩演示'],
    'SHA256.html': ['SHA-256：8 寄存器 + 消息扩展 + 64 轮压缩（Σ/Ch/Maj 函数），输出 256bit，比特币 PoW 核心。', '子步骤：填充 → 扩展 W → 64 轮 → 雪崩演示'],
    'SM3.html': ['SM3 国密摘要：8 寄存器 + P0/P1 双置换 + FF/GG 门，64 轮输出 256bit，对标 SHA-256。', '子步骤：填充 → P1 扩展 → 64 轮压缩 → 雪崩演示'],
    'MurmurHash.html': ['MurmurHash3：乘法×旋转×异或三连混合 + fmix 终混，非加密但极快，用于哈希表/布隆过滤器。', '子步骤：切块 → 逐块混合 → 尾部 → fmix → 雪崩'],
    'CityHash.html': ['CityHash64：Google 设计，4 路流水线并行混合 + 种子传播，64bit 散列，吞吐极高。', '子步骤：载入 a/c/d → 混合轮 → 终混 → 雪崩'],
    'Shor.html': ['Shor 分解：量子求 a^x mod N 的周期，经典 gcd 后处理提取因子，可破解 RSA。', '子步骤：并行求模幂 → 找周期 → gcd 出因子'],
    'Johnson.html': ['Johnson 全源最短路：Bellman-Ford 重加权消除负边 → 跑 n 次 Dijkstra，负权图专用。', '子步骤：加超级源重加权 → 还原真实距离'],
    'FordFulkerson.html': ['Ford-Fulkerson 最大流：DFS 在残余网络找增广路并送流，反向边退流纠错，直到无路可走。', '子步骤：找增广路 → 沿路增广 → 反向边退流'],
    'PushRelabel.html': ['Push-Relabel 预流推进：s 灌满预流，节点只向 h-1 邻居「推」过剩流量，推不动就 relabel 抬升。', '子步骤：预流 → 局部 push → 推不动 relabel'],
    'MinCostFlow.html': ['最小费用最大流：每轮用 Bellman-Ford 找单位费用最短路增广（含反向负费用边），贪心保证全局最优。', '子步骤：找最便宜增广路 → 增广 → 更新费用'],
    'Biconnected.html': ['双连通分量（Tarjan）：DFS 记 dfn，回溯算 low；low[子] > dfn[父] 是桥，≥ 是割点。', '子步骤：DFS 进点 → 回边更新 low → 判定割点/桥'],
    'KM.html': ['Kuhn-Munkres 最大权匹配：顶标维护相等子图，仅在其上增广；找不到就调顶标（delta）让新边进入。', '子步骤：初始化顶标 → 相等子图增广 → 顶标调整'],
    'HopcroftKarp.html': ['Hopcroft-Karp 最大匹配：BFS 给未匹配 L 分层，DFS 沿层一次找多条最短增广路并整体换位，O(E√V)。', '子步骤：BFS 分层 → DFS 冲突链 → 整体换位'],
    'RodCutting.html': ['钢条切割：dp[i] = max(p[i], dp[j]+dp[i-j]) 分治最优子结构，从 1 寸到 8 寸自底向上填表。', '子步骤：切一刀 → 拆两段最优 → 自底向上填表'],
    'StoneMerge.html': ['石子合并：区间 DP，dp[i][j] = min(dp[i][k]+dp[k+1][j]) + 前缀和，先小区间后大区间。', '子步骤：枚举区间长 → 枚举切分点 → 加区间和'],
    'OptimalBST.html': ['最优二叉搜索树：e[i][j] = min(e[i][k-1]+e[k+1][j]) + w[i][j]，CLRS 教科书数据全流程。', '子步骤：填 w 表 → 填 e 表 → 按 root 建树'],
    'TreeDP.html': ['树形DP（没有上司的舞会）：f1[u]=h[u]+Σf0[v]，f0[u]=Σmax(f0,f1)，后序遍历自底向上。', '子步骤：后序遍历 → 孩子算完算父亲 → 全局答案在根'],
    'TSPDP.html': ['旅行商（状态压缩DP）：dp[mask][i] = min(dp[mask\\{i}][k]+d[k][i])，集合压位 + 回溯最优环。', '子步骤：初始直达 → 集合合并 → 回溯重建环'],
    'DigitDP.html': ['数位DP：统计 1..120 不含数字 6 的个数，f[p][紧][开始] 自底向上填表，与数字大小无关。', '子步骤：拆位数 → 填状态表 → 减全 0 得答案'],
    'ActivitySelect.html': ['活动选择（贪心）：按结束时间排序，每次选最早结束且兼容的活动，交换论证证明最优。', '子步骤：排序 → 指针扫描 → 兼容即选'],
    'TaskSched.html': ['任务调度（贪心+并查集）：按利润降序，每个任务放入最晚的空闲截止槽，O(n log n)。', '子步骤：利润排序 → 并查集找槽 → 累计收益'],
    'UnboundedKnapsack.html': ['完全背包：dp[w] = max(dp[w-wi]+vi)，物品无限件，正着扫容量，回溯最优组合。', '子步骤：容量递推 → 选最后一件 → 回溯组合'],
    'SetCover.html': ['集合覆盖（贪心）：每轮选覆盖最多未覆盖元素的集合，NP-难问题求 ln n 近似解。', '子步骤：统计新覆盖 → 选最大 → 更新覆盖集'],
    'BruteForce.html': ['BF 朴素匹配：文本每个位置把模式整个比一遍，错一格右移重来，最坏 O(nm)。', '子步骤：窗口对齐 → 逐字符比较 → 失配右移'],
    'Sunday.html': ['Sunday 匹配：失配时看窗口后一位，按 shift 表一次跳 1..m+1 格，平均快于 KMP。', '子步骤：建 shift 表 → 窗口比较 → 按后一位跳跃'],
    'SuffixTree.html': ['后缀树：把「banana」全部后缀存进一棵树，公共前缀自动合并，冲突时拆边。', '子步骤：插入后缀 → 沿边走 → 冲突拆边'],
    'SuffixArray.html': ['后缀数组（倍增法）：每轮按 (rank, rank+2^k) 双关键字排序，长度翻倍直到 rank 全唯一。', '子步骤：字符码初排 → 双关键字排序 → 重编号'],
    'SuffixAutomaton.html': ['后缀自动机 SAM：在线加字符，转移 + 后缀链接 + 克隆，状态数 ≤ 2n−1 的最小 DFA。', '子步骤：新状态 → 补转移 → 必要时克隆'],
    'BKDRHash.html': ['BKDR 哈希：h = h×31 + 字符码 逐字符滚动，32 位位模式可视化，冲突远少于朴素求和。', '子步骤：乘 31 → 加字符码 → 寄存器滚动'],
    'ELFHash.html': ['ELF 哈希：h = (h<<4) + 字符码，溢出时高 4 位异或回低 8 位再清零，信息不丢。', '子步骤：左移 4 位 → 加字符 → 溢出折叠'],
    'LCP.html': ['LCP 数组（Kasai）：按文本顺序扫后缀，h 借位最多减 1，线性时间算相邻后缀的最长公共前缀。', '子步骤：借位 → 扩展比对 → 写入插槽'],
    'LUDecomposition.html': ['LU 分解（Doolittle）：高斯消元逐行消除，下三角 L 与上三角 U 乘积还原 A —— 一次分解多次解方程。', '子步骤：选主元 → 乘数写 L → 消元写 U'],
    'QRDecomposition.html': ['QR 分解（Gram–Schmidt）：逐列「投影减法」剥离旧方向再归一化 —— Q 正交、R 上三角。', '子步骤：取列 → 投影减法 → 归一化入列'],
    'Cholesky.html': ['Cholesky 分解：对称正定阵 A = L·Lᵀ，对角元开方、非对角除以对角 —— 比 LU 少一半运算。', '子步骤：扣已填项 → 对角开方 → 非对角除对角'],
    'Strassen.html': ['Strassen 矩阵乘：7 个 P 乘积拼出 C 的 4 块 —— 用加法换乘法，递归压到 O(n^2.807)。', '子步骤：构造 P → 完成乘法 → 加减拼 C'],
    'MillerRabin.html': ['Miller–Rabin 素性测试：n−1 = d·2^s，连续平方 b^d 找 −1 —— 概率正确、工程事实标准。', '子步骤：分解 n−1 → 快速幂 → 平方找 −1'],
    'PollardRho.html': ['Pollard-Rho 分解：兔龟赛跑 gcd(|x−y|, n) 抓公因子 —— 随机游走必入环，8051 = 97×83。', '子步骤：兔龟各走 → gcd 判定 → 抓到因子'],
    'Euclidean.html': ['欧几里得算法：gcd(a,b) = gcd(b, a mod b) 反复除到 0 —— 木条对折的数学版。', '子步骤：整除 → 余数条 → 换下一轮'],
    'MatrixFastPow.html': ['矩阵快速幂：指数拆成二进制逐位平方累乘 —— M¹⁰ 只用 4 次乘法，斐波那契秒算。', '子步骤：扫二进制位 → M 自乘 → 位 1 累乘'],
    'GeometryBase.html': ['几何工具箱：叉积判转向 / 鞋带公式算面积 / 点线距离 —— 凸包与碰撞检测的地基三招。', '子步骤：三点叉积 → 鞋带求和 → 距离公式'],
    'NearestPair.html': ['最近点对（分治）：左右递归找最近，合并只查中线 δ 带 —— O(n²) 压到 O(n log n)。', '子步骤：分两半 → 各自找最近 → δ 带合并'],
    'HalfPlane.html': ['半平面交：凸多边形被每条半平面「切一刀」，Sutherland–Hodgman 逐边裁剪 —— 可行域渐显。', '子步骤：画刀线 → 求交点 → 更新顶点'],
    'FFT.html': ['FFT 蝶形合并：偶奇分治 + ω 对称性，X(k) = E±ω^k·O —— 卷积从 O(n²) 到 O(n log n)。', '子步骤：奇偶拆分 → 递归变换 → 蝶形合并'],
    'NTT.html': ['NTT 数论变换：FFT 的整数版，ω 换模 p 单位根 —— 零浮点误差，精确可逆。', '子步骤：求 ω → 分治变换 → 模算术蝶形'],
    'FWT.html': ['FWT 沃尔什-哈达玛：每层蝶形只有 (u+v, u−v) —— 异或卷积的纯加减加速器。', '子步骤：层 1 蝶形 → 层 2 合并 → 输出落定'],
    'SM4.html': ['SM4 国密分组密码：128 位密钥，32 轮 Feistel —— X[i+4] = X[i] ⊕ T(X[i+1]⊕X[i+2]⊕X[i+3]⊕rk[i])，T = S 盒 + 循环左移。', '子步骤：轮密钥异或 → S 盒代换 → 循环左移 → 轮状态推进'],
    'TripleDES.html': ['3DES（EDE）：三把 56 位密钥串联 DES —— 加密-解密-加密，168 位有效密钥，兼容老 DES 数据。', '子步骤：K1 加密 → K2 解密 → K3 加密'],
    'RC4.html': ['RC4 流密码：KSA 密钥调度打乱 256 字节 S 盒，PRGA 伪随机生成器逐字节吐密钥流，明文异或成密文。', '子步骤：KSA 初始化 → PRGA 生成密钥流 → 明文异或'],
    'ECC.html': ['椭圆曲线循环群（mod 17）：y²=x³+2x+2 上 19 个点，倍点 λ=(3x²+a)/(2y)、加法 λ=(y₂−y₁)/(x₂−x₁) —— 点乘的地基。', '子步骤：倍点公式 → 加法公式 → 生成循环群表'],
    'ElGamal.html': ['ElGamal 加密：离散对数难题 —— 随机 k 生成 (c₁, c₂) = (gᵏ, m·yᵏ)，解密 m = c₂·(c₁ˣ)⁻¹ 还原。', '子步骤：密钥生成 → 加密（随机 k） → 解密'],
    'SM2.html': ['SM2 国密签名（GB/T 32918）：Schnorr 风格 —— r = (e+x₁) mod n，s = (1+dA)⁻¹(k−r·dA)，验签 sG+t·PA 还原 x₁。', '子步骤：密钥对 → 签名 → 验签'],
    'ECDH.html': ['ECDH 密钥交换：私钥不出门、公钥公开换 —— aA·(aB·G) = aB·(aA·G)，两边殊途同归得共享秘密。', '子步骤：掷私钥 → 交换公钥 → 各自算共享秘密'],
    'DSA.html': ['DSA 数字签名（NIST）：子群 q 上签名、模 p 验证 —— r = (gᵏ mod p) mod q，s = k⁻¹(e+x·r) mod q。', '子步骤：密钥生成 → 签名 → 验签'],
    'ECDSA.html': ['ECDSA 椭圆曲线签名：比特币/以太坊标准 —— r 来自 kG 的 x 坐标，s = k⁻¹(e+r·dA)，验签 u1G+u2Q 还原 kG。', '子步骤：密钥对 → 签名 → 验签'],
    'LZSS.html': ['LZSS 压缩：LZ77 的改良 —— 匹配长度 ≥ 2 才用指针 (偏移, 长度)，否则字面量，并加 1 位标志位区分。', '子步骤：滑动窗口匹配 → 长匹配用指针 → 短匹配用字面量'],
    'DEFLATE.html': ['DEFLATE（zip 核心）：LZ77 匹配 + 哈夫曼树 → 变长码 —— 先做重复消除再做熵编码，两级压缩。', '子步骤：LZ77 匹配 → 频次统计 → 建哈夫曼树 → 生成变长码'],
    'Brotli.html': ['Brotli 压缩：LZ77 + 上下文建模 + 二阶熵编码 —— 用前 2 个字符预测下一个字符，HTTP 传输神器。', '子步骤：字典匹配 → 上下文预测 → 熵编码输出字节流'],
    'Zstd.html': ['Zstandard 压缩：3 字节哈希链匹配 + FSE 有限状态熵编码 —— Facebook 出品，速度与压缩比兼得。', '子步骤：哈希链建表 → 查表找最长匹配 → 指针输出'],
    'Hamming.html': ['汉明码 (7,4)：4 数据位 + 3 校验位覆盖分组，任意 1 位翻转由综合征定位并自动纠正。', '子步骤：写数据位 → 算校验位 → 传输翻转 → 综合征定位 → 纠正'],
    'CRC.html': ['CRC-32 循环冗余校验：逐字节做多项式除法（异或求余），取反得校验值，接收端验残差魔数判完整性。', '子步骤：寄存器初始化 → 逐字节移位异或 → 取反 → 残差校验'],
    'RS.html': ['Reed-Solomon RS(7,3)：GF(2⁸) 多项式编码，m(x)·x⁴ ÷ g(x) 余数为校验位，可纠 2 个符号错误。', '子步骤：多项式除法 → 码字发送 → 伴随式计算 → 试错纠正'],
    'LDPC.html': ['LDPC 低密度奇偶校验：稀疏校验矩阵 H，码字满足 H·c=0，迭代译码可逼近香农极限（5G/WiFi/SSD 在用）。', '子步骤：校验方程 → 写数据位 → 求校验位 → 综合征检测 → 试错纠正'],
    'LogisticRegression.html': ['逻辑回归：z = w·x + b 过 σ 函数映射为概率，梯度下降最小化交叉熵，决策边界逐步逼近。', '子步骤：初始化权重 → 前向预测 → 算梯度 → 更新边界'],
    'NaiveBayes.html': ['朴素贝叶斯：P(类别|词) ∝ 先验 × Π似然，拉普拉斯平滑防零概率，对数相加避下溢。', '子步骤：算先验 → 平滑似然 → 对数相加 → 取最大类'],
    'SVM.html': ['SVM 支持向量机：最大化几何间隔的超平面，只有边界上的支持向量决定分类面。', '子步骤：找间隔带 → 标支持向量 → 最优超平面'],
    'RandomForest.html': ['随机森林：行（样本）与列（特征）双随机采样训练多棵决策树，投票聚合抗过拟合。', '子步骤：采样建树 → 三树各自决策 → 投票定类'],
    'GBDT.html': ['GBDT 梯度提升回归：先用均值预测，每棵树拟合残差（梯度方向），小步累加逼近真实值。', '子步骤：均值 f₀ → 算残差 → 树拟合 → f₁ 更新'],
    'AdaBoost.html': ['AdaBoost：弱学习器串行训练，错分样本权重放大，按 α 加权投票合成强分类器。', '子步骤：均权起步 → 弱分类 → 算 α → 权重更新'],
    'DBSCAN.html': ['DBSCAN 密度聚类：ε 邻域内核心点向外扩散，密度可达连成簇，孤立点标记为噪声。', '子步骤：数邻居 → 核心点扩散 → 成簇 → 噪声'],
    'PCA.html': ['PCA 主成分分析：协方差矩阵特征分解取最大方差方向，投影降维保留主要信息。', '子步骤：去中心化 → 协方差 → 特征分解 → 投影'],
    'MLP.html': ['MLP 多层感知机：2-2-1 网络解决 XOR，前向算预测、反向算梯度、梯度下降更新权重。', '子步骤：前向传播 → 误差反向 → 权重更新'],
    'CNN.html': ['CNN 卷积网络：卷积核滑动做局部加权求和提取特征，最大池化降维浓缩（图像识别基石）。', '子步骤：卷积窗口滑动 → 特征图 → 池化降维'],
    'Transformer.html': ['Transformer 自注意力：Q 与所有 K 点积打分，softmax 归一后加权聚合 V——任意词直接看任意词。', '子步骤：Q/K/V 生成 → 点积得分 → softmax → 加权聚合'],
    'QLearning.html': ['Q-Learning：Q(s,a) ← Q + lr·(R + γ·maxQ − Q) 试错更新，终点的奖励沿状态一路回传。', '子步骤：探索行动 → 拿奖励 → Q 表更新 → 回传收敛'],
    'Paxos.html': ['Paxos：Prepare 编号压制 + 多数 Promise + Accept 提交，新旧提案被老值驯服达成一致（分布式共识鼻祖）。', '子步骤：Prepare(n) → Promise → Accept(v) → 多数锁定'],
    'ZAB.html': ['ZAB：先多数票选 Leader，写事务以 zxid(epoch:seq) 广播，崩溃后日志对齐再恢复广播（ZooKeeper 核心）。', '子步骤：选举 → 广播事务 → ACK → 恢复同步'],
    'Gossip.html': ['Gossip 流言协议：每轮每个知情节点随机闲聊几人，对数轮全网知情——无中心、容错强（Cassandra/Redis Cluster 在用）。', '子步骤：起始知情 → 随机闲聊 → 翻倍扩散 → 全群皆知'],
    'LoadBalance.html': ['加权轮询负载均衡：按服务器权重 2:1:1 轮流分发请求，权重高接得多（Nginx/HAProxy 调度策略）。', '子步骤：请求到达 → 轮转选服务器 → 计数分配'],
    'RateLimit.html': ['令牌桶限流：桶里先存令牌，请求来一个取一个，桶空直接拒绝 429——削峰填谷的瞬时保护。', '子步骤：取令牌 → 有则放行 → 无则拒绝'],
    'Snowflake.html': ['Snowflake 雪花 ID：41bit 时间戳 + 10bit 机器 + 12bit 序列拼出 64 位全局唯一递增 ID（分布式发号器）。', '子步骤：取时间戳 → 拼机器位 → 序列递增'],
    'ThreePC.html': ['三阶段提交 3PC：CanCommit/PreCommit/DoCommit，协调者崩溃时参与方超时回滚——2PC 阻塞问题的改良。', '子步骤：CanCommit → PreCommit → DoCommit / 超时回滚'],
    'TCC.html': ['TCC 事务：Try 锁定资源 → Confirm 正式提交 / Cancel 反向补偿，业务级两阶段（Seata 框架实现）。', '子步骤：Try 冻结 → Confirm 扣款 / Cancel 解冻'],
    'Saga.html': ['Saga 长事务：跨库长流程拆小步各自提交，任一步失败就逆序执行补偿动作撤销副作用（微服务事务）。', '子步骤：下单 → 扣库存 → 支付 → 失败 → 反向补偿'],
    'NRU.html': ['NRU 最近未使用页面置换：R/M 参考位组合分四类 (0,0)(0,1)(1,0)(1,1)，缺页时优先淘汰低类页，并周期性清零 R 位。', '子步骤：访问页 → 命中/缺页 → 选最低类 → 置换'],
    'CSCAN.html': ['C-SCAN 循环扫描磁盘调度：磁头单向服务直到最远端再折返，途中只服务同方向请求，等待时间更均匀。', '子步骤：按方向扫 → 服务最近请求 → 到头折返'],
    'Deadlock.html': ['死锁检测：资源分配图找环——进程持资源又申请资源，成环即死锁；抢占解除可消环。', '子步骤：申请边 → 分配边 → 找环 → 解除'],
    'QuantumAnnealing.html': ['量子退火：哈密顿量从横场强态缓慢演化到问题哈密顿量，隧穿效应跳出局部最优找到全局最小（D-Wave 原理）。', '子步骤：初始横场 → 缓慢演化 → 隧穿跳出 → 全局最小'],
  };

  const fileName = location.pathname.split('/').pop();

  // 播放条「播放」按钮：engine.toggle() 未运行时自动启动 queue 的默认演示
  const startDemo = () => {
    const play = document.querySelector('#playbar button.play-btn');
    if (play && play.textContent.includes('播放')) play.click();
  };

  const inject = () => {
    const controls = document.querySelector('#controls');
    if (!controls || document.querySelector('#demo-run-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'demo-run-btn';
    btn.className = 'algo-btn';
    btn.textContent = '▶ 演示';
    btn.addEventListener('click', startDemo);
    controls.prepend(btn);
    // 页面自身没有重置类按钮时注入：重置演示（停止动画并恢复初始状态）
    const hasNativeReset = [...controls.querySelectorAll('button.algo-btn')].some((b) => /清空|清除|清楚|随机|重置|新图|clear/i.test(b.textContent.trim()));
    if (!hasNativeReset) {
      const clearBtn = document.createElement('button');
      clearBtn.id = 'clear-run-btn';
      clearBtn.className = 'algo-btn';
      clearBtn.textContent = '清空';
      clearBtn.addEventListener('click', () => location.reload());
      controls.insertBefore(clearBtn, btn.nextSibling);
      // 页面模块按钮可能晚于注入渲染：原生「清空」出现时移除注入按钮，避免重复
      const t = setInterval(() => {
        const injected = document.getElementById('clear-run-btn');
        if (!injected) { clearInterval(t); return; }
        const native = [...controls.querySelectorAll('button.algo-btn')].find((b) => b.id !== 'clear-run-btn' && b.textContent.trim() === '清空');
        if (native) { injected.remove(); clearInterval(t); }
      }, 300);
    }
  };

  // 算法说明：写入右侧「对照说明栏」的 #algo-desc 区
  const injectDesc = () => {
    const descEl = document.querySelector('#algo-desc');
    if (!descEl || descEl.childElementCount) return;
    const desc = ALGO_DESC[fileName];
    if (!desc) return;
    desc.forEach((line, i) => {
      const p = document.createElement('p');
      if (i > 0) p.className = 'd-sub';
      p.textContent = line;
      descEl.appendChild(p);
    });
  };

  // URL 带 ?demo=1 时自动触发一次（保持兼容）
  if (new URLSearchParams(location.search).has('demo')) {
    let tries = 0;
    const t = setInterval(() => {
      const play = document.querySelector('#playbar button.play-btn');
      if (play) { clearInterval(t); startDemo(); return; }
      if (++tries > 100) clearInterval(t);
    }, 200);
  }

  let tries = 0;
  const t = setInterval(() => {
    if (document.querySelector('#controls')) { clearInterval(t); inject(); injectDesc(); return; }
    if (++tries > 100) clearInterval(t);
  }, 200);
})();
