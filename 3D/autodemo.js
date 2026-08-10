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
  };

  const fileName = location.pathname.split('/').pop();
  const demo = DEMOS[fileName] || null;
  const steps = demo ? demo.steps : [{ btn: null, fills: null }];

  const allBtns = () => [...document.querySelectorAll('#controls button.algo-btn:not(#demo-run-btn)')];
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
      if (s.fills) {
        const inputs = document.querySelectorAll('#controls input.algo-input');
        s.fills.forEach((v, k) => { if (inputs[k]) inputs[k].value = v; });
      }
      const btn = s.btn ? allBtns().find((b) => b.textContent.includes(s.btn)) : pickBtn();
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
    if (document.querySelector('#controls')) { clearInterval(t); inject(); return; }
    if (++tries > 100) clearInterval(t);
  }, 200);
})();
