// 3D/autodemo.js — 目录页「演示」按钮：URL 带 ?demo=1 时自动运行页面算法演示。
// 跳过"随机列表/随机化数组/更改大小"类辅助按钮，选中第一个真正的演示动作。
(function () {
  if (!new URLSearchParams(location.search).has('demo')) return;
  let tries = 0;
  const t = setInterval(() => {
    const btns = document.querySelectorAll('#controls button.algo-btn');
    if (!btns.length) { if (++tries > 50) clearInterval(t); return; }
    const btn = [...btns].find((b) => !/随机|random|更改大小/i.test(b.textContent));
    if (!btn) { clearInterval(t); return; }
    btn.click();
    clearInterval(t);
    setTimeout(() => {
      const play = document.querySelector('#playbar button.play-btn');
      if (play && play.textContent.includes('播放')) play.click();
    }, 600);
  }, 200);
})();
