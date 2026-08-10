// 3D/autodemo.js — 算法内页「演示」按钮：一键 3D 演示当前算法逻辑。
// 自动跳过"随机列表/随机化数组/更改大小"类辅助按钮，选中第一个真正的演示动作并播放动画。
(function () {
  const autoRun = () => {
    const btns = document.querySelectorAll('#controls button.algo-btn:not(#demo-run-btn)');
    const btn = [...btns].find((b) => !/随机|random|更改大小/i.test(b.textContent));
    if (!btn) return;
    btn.click();
    setTimeout(() => {
      const play = document.querySelector('#playbar button.play-btn');
      if (play && play.textContent.includes('播放')) play.click();
    }, 600);
  };

  const inject = () => {
    const controls = document.querySelector('#controls');
    if (!controls || document.querySelector('#demo-run-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'demo-run-btn';
    btn.className = 'algo-btn';
    btn.textContent = '▶ 演示';
    btn.addEventListener('click', autoRun);
    controls.prepend(btn);
  };

  // URL 带 ?demo=1 时自动触发一次（保持兼容）
  if (new URLSearchParams(location.search).has('demo')) {
    let tries = 0;
    const t = setInterval(() => {
      const btn = document.querySelector('#demo-run-btn');
      if (btn) { clearInterval(t); autoRun(); return; }
      if (++tries > 100) clearInterval(t);
    }, 200);
  }

  let tries = 0;
  const t = setInterval(() => {
    if (document.querySelector('#controls')) { clearInterval(t); inject(); return; }
    if (++tries > 100) clearInterval(t);
  }, 200);
})();
