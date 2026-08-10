// 3D/autodemo.js — 算法内页「演示」按钮：一键 3D 演示当前算法逻辑。
// 自动跳过"随机列表/随机化数组/更改大小"类辅助按钮，选中第一个真正的演示动作并播放动画。
// 空输入页（树/堆/哈希/栈/队列等）按页面填充默认演示输入；树类先删后插保证插入必成功。
(function () {
  // 每页演示序列：steps = [{ btn: 按钮文本（省略=第一个真实动作）, fills: [输入框值...] }]
  // 无条目页面执行单次默认动作
  const DEMOS = {
    'BellmanFord.html': { steps: [{ fills: ['s'] }] },
    'BST.html': { steps: [{ btn: '删除', fills: ['50'] }, { btn: '插入', fills: ['50'] }] },
    'AVLtree.html': { steps: [{ btn: '删除', fills: ['50'] }, { btn: '插入', fills: ['50'] }] },
    'RedBlack.html': { steps: [{ btn: '删除', fills: ['50'] }, { btn: '插入', fills: ['50'] }] },
    'SplayTree.html': { steps: [{ btn: '删除', fills: ['50'] }, { btn: '插入', fills: ['50'] }] },
    'BTree.html': { steps: [{ btn: '删除', fills: ['50'] }, { btn: '插入', fills: ['50'] }] },
    'BPlusTree.html': { steps: [{ btn: '删除', fills: ['50'] }, { btn: '插入', fills: ['50'] }] },
    'Trie.html': { steps: [{ btn: '删除', fills: ['abc'] }, { btn: '插入', fills: ['abc'] }] },
    'RadixTree.html': { steps: [{ btn: '删除', fills: ['abc'] }, { btn: '插入', fills: ['abc'] }] },
    'TST.html': { steps: [{ btn: '删除', fills: ['abc'] }, { btn: '插入', fills: ['abc'] }] },
    'Heap.html': { steps: [{ fills: ['10'] }, { fills: ['20'] }, { fills: ['30'] }] },
    'KMP.html': { steps: [{ fills: ['ABABABCABAB', 'ABABC'] }] },
    'Knapsack.html': { steps: [{ fills: ['2/3,3/4,4/5,5/6', '8'] }] },
    'BinomialQueue.html': { steps: [{ fills: ['10'] }, { fills: ['20'] }, { fills: ['30'] }] },
    'FibonacciHeap.html': { steps: [{ fills: ['10'] }, { fills: ['20'] }, { fills: ['30'] }] },
    'LeftistHeap.html': { steps: [{ fills: ['10'] }, { fills: ['20'] }, { fills: ['30'] }] },
    'SkewHeap.html': { steps: [{ fills: ['10'] }, { fills: ['20'] }, { fills: ['30'] }] },
    'OpenHash.html': { steps: [{ fills: ['10'] }, { fills: ['20'] }, { fills: ['30'] }] },
    'ClosedHash.html': { steps: [{ fills: ['10'] }, { fills: ['20'] }, { fills: ['30'] }] },
    'ClosedHashBucket.html': { steps: [{ fills: ['10'] }, { fills: ['20'] }, { fills: ['30'] }] },
    'StackArray.html': { steps: [{ fills: ['5'] }, { fills: ['6'] }, { fills: ['7'] }] },
    'StackLL.html': { steps: [{ fills: ['5'] }, { fills: ['6'] }, { fills: ['7'] }] },
    'QueueArray.html': { steps: [{ fills: ['5'] }, { fills: ['6'] }, { fills: ['7'] }] },
    'QueueLL.html': { steps: [{ fills: ['5'] }, { fills: ['6'] }, { fills: ['7'] }] },
    'SimpleStack.html': { steps: [{ fills: ['5'] }, { fills: ['6'] }, { fills: ['7'] }] },
    'RecReverse.html': { steps: [{ fills: ['hello'] }] },
    'SegmentTree.html': { steps: [{ btn: '建树' }, { btn: '区间查询', fills: ['2', '5'] }, { btn: '点更新', fills: ['2', '5', '3', '9'] }, { btn: '区间查询', fills: ['2', '5'] }] },
    'DPFib.html': { steps: [{ fills: ['10'] }] },
    'ComparisonSort.html': { steps: [{ select: '选择演示算法' }] },
  };

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
    'ComparisonSort.html': ['比较排序：6 种经典排序算法，可先用「选择演示算法」指定一种，再点「演示所选」播放该算法。', '子算法：插入排序、选择排序、冒泡排序、壳排序、归并排序、快速排序'],
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
  };

  const fileName = location.pathname.split('/').pop();
  const demo = DEMOS[fileName] || null;
  const steps = demo ? demo.steps : [{ btn: null, fills: null }];

  const allBtns = () => [...document.querySelectorAll('#controls button.algo-btn:not(#demo-run-btn):not(#clear-run-btn)')];
  const pickBtn = () => allBtns().find((b) => !/随机|random|更改大小/i.test(b.textContent));

  const waitPlayback = () => new Promise((resolve) => {
    const t = setInterval(() => {
      const play = document.querySelector('#playbar button.play-btn');
      if (play && play.textContent.includes('播放')) { clearInterval(t); resolve(); }
    }, 200);
  });

  async function runDemo() {
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      let btn;
      if (s.select) {
        const sel = document.querySelector('#controls .algo-select-input');
        const v = sel && sel.selectedOptions[0] ? sel.selectedOptions[0].textContent : '';
        btn = v ? allBtns().find((b) => b.textContent.trim() === v) : null;
      } else {
        if (s.fills) {
          const inputs = document.querySelectorAll('#controls input.algo-input');
          s.fills.forEach((v, k) => { if (inputs[k]) inputs[k].value = v; });
        }
        btn = s.btn ? allBtns().find((b) => b.textContent.includes(s.btn)) : pickBtn();
      }
      if (!btn) return;
      btn.click();
      await new Promise((r) => setTimeout(r, 600));
      const play = document.querySelector('#playbar button.play-btn');
      if (play && play.textContent.includes('播放')) play.click();
      if (i < steps.length - 1) await waitPlayback();
    }
  }

  const inject = () => {
    const controls = document.querySelector('#controls');
    if (!controls || document.querySelector('#demo-run-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'demo-run-btn';
    btn.className = 'algo-btn';
    btn.textContent = '▶ 演示';
    btn.addEventListener('click', runDemo);
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
    // 页面有「选择演示算法」类选择器时，把选择器移到演示按钮正后方（选择器紧跟演示按钮）
    let moveTries = 0;
    const moveT = setInterval(() => {
      if (moveTries++ > 50) { clearInterval(moveT); return; }
      const b = document.getElementById('demo-run-btn');
      if (!b) { clearInterval(moveT); return; }
      const sel = controls.querySelector('.algo-select');
      if (!sel) return;
      if (b.nextElementSibling !== sel) {
        const c = document.getElementById('clear-run-btn');
        controls.insertBefore(sel, b.nextSibling);
        if (c) controls.insertBefore(c, sel.nextSibling);
      }
      clearInterval(moveT);
    }, 300);
  };

  // 算法说明条：插在 header 与 controls 之间，不占用 3D 画布、不影响演示
  const injectDesc = () => {
    const header = document.querySelector('#header');
    const controls = document.querySelector('#controls');
    if (!header || !controls || document.querySelector('#algo-desc')) return;
    const desc = ALGO_DESC[fileName];
    if (!desc) return;
    const div = document.createElement('div');
    div.id = 'algo-desc';
    div.className = 'algo-desc';
    desc.forEach((line, i) => {
      const p = document.createElement('p');
      if (i > 0) p.className = 'd-sub';
      p.textContent = line;
      div.appendChild(p);
    });
    header.parentNode.insertBefore(div, controls);
  };

  // URL 带 ?demo=1 时自动触发一次（保持兼容）
  if (new URLSearchParams(location.search).has('demo')) {
    let tries = 0;
    const t = setInterval(() => {
      const btn = document.querySelector('#demo-run-btn');
      if (btn) { clearInterval(t); runDemo(); return; }
      if (++tries > 100) clearInterval(t);
    }, 200);
  }

  let tries = 0;
  const t = setInterval(() => {
    if (document.querySelector('#controls')) { clearInterval(t); inject(); injectDesc(); return; }
    if (++tries > 100) clearInterval(t);
  }, 200);
})();
