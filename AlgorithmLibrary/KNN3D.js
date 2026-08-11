// AlgorithmLibrary/KNN3D.js — K 近邻：算距离 → 取最近 K 个 → 多数投票分类（function* 生成器驱动，逐点连距离线动画）
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText, tubeBetween, easeInOut } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('KNN3D');

const scene = new Scene3D('scene', { cameraPos: [0, 380, 720], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GREEN = 0x4ade80, BLUE = 0x60a5fa, YELLOW = 0xfacc15, RED = 0xf87171;
const hint = new VText(scene, { text: '点击「运行演示」开始：K 近邻分类', x: 0, y: 330, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('就绪');

const K = 3;
const APTS = [[-220, 90], [-160, 140], [-140, 10], [-260, -30], [-100, -60]];
const BPTS = [[210, 100], [260, 40], [180, -20], [230, -90], [140, -140]];
const Q = [0, 50];
const CLASSES = [
  ...APTS.map(p => ({ cls: 'A', x: p[0], y: p[1] })),
  ...BPTS.map(p => ({ cls: 'B', x: p[0], y: p[1] })),
];

const pts = CLASSES.map((p, i) => new VBox(scene, { w: 26, h: 26, d: 26, x: p.x, y: p.y, z: 0, label: '', color: p.cls === 'A' ? GREEN : BLUE, emissive: p.cls === 'A' ? GREEN : BLUE }));
const clsT = CLASSES.map((p, i) => new VText(scene, { text: p.cls + '类', x: p.x, y: p.y + 38, z: 0, color: p.cls === 'A' ? GREEN : BLUE, scale: 0.55 }));
const query = new VBox(scene, { w: 34, h: 34, d: 34, x: Q[0], y: Q[1], z: 0, label: '?', color: YELLOW, emissive: YELLOW });
const distT = CLASSES.map(() => new VText(scene, { text: '', x: 0, y: 0, z: 0, color: PALETTE.textDim, scale: 0.55 }));
const tubes = CLASSES.map(p => tubeBetween(scene, [Q[0], Q[1], 0], [p.x, p.y, 0], { color: YELLOW, opacity: 0.3, radius: 1.8 }));
tubes.forEach(t => t.visible = false);

// 预计算距离并排序
const dists = CLASSES.map((p, i) => ({ i, d: Math.hypot(p.x - Q[0], p.y - Q[1]) }));
dists.sort((x, y) => x.d - y.d);

function resetAll() {
  pts.forEach((p, i) => p.setColor(CLASSES[i].cls === 'A' ? GREEN : BLUE, CLASSES[i].cls === 'A' ? GREEN : BLUE));
  for (const p of pts) p.setHighlight(false);
  query.setColor(YELLOW, YELLOW);
  query.setText('?');
  tubes.forEach(t => t.visible = false);
  distT.forEach(t => t.setText(''));
}

function* knnGen() {
  resetAll();
  yield S(() => hint.setText('KNN：计算待分类点与所有已知点的距离，取最近的 K = ' + K + ' 个，按多数投票定类别'));
  for (let done = 0; done < dists.length; done++) {
    const d = dists[done];
    yield S(() => {
      tubes[d.i].visible = true;
      distT[d.i].moveTo(CLASSES[d.i].x, CLASSES[d.i].y - 36, 0, 300);
      distT[d.i].setText('d≈' + d.d.toFixed(1));
      if (done < K) { pts[d.i].setColor(RED, RED); hint.setText('第 ' + (done + 1) + ' 近：' + CLASSES[d.i].cls + ' 类（d≈' + d.d.toFixed(1) + '）——进入最近 ' + K + ' 个'); }
      else hint.setText('第 ' + (done + 1) + ' 近：' + CLASSES[d.i].cls + ' 类（d≈' + d.d.toFixed(1) + '）——距离较远，不参与投票');
    });
    yield W(650);
    if (done >= K) {
      yield S(() => pts[d.i].setColor(CLASSES[d.i].cls === 'A' ? GREEN : BLUE, CLASSES[d.i].cls === 'A' ? GREEN : BLUE));
      yield W(450);
    }
  }
  const top = dists.slice(0, K);
  const vote = top.reduce((m, d) => { m[CLASSES[d.i].cls] = (m[CLASSES[d.i].cls] || 0) + 1; return m; }, {});
  const winner = (vote.A || 0) >= (vote.B || 0) ? 'A' : 'B';
  yield S(() => {
    for (const d of top) pts[d.i].setHighlight(true);
    query.setColor(winner === 'A' ? GREEN : BLUE, winner === 'A' ? GREEN : BLUE);
    query.setText(winner);
    hint.setText('最近 ' + K + ' 个点：' + (vote.A || 0) + ' 个 A 类、' + (vote.B || 0) + ' 个 B 类 → 投票结果：' + winner + ' 类');
  });
  yield W(700);
  yield S(() => {
    status.textContent = 'K=' + K + ' 分类完成：待分类点 → ' + winner + ' 类（' + (vote.A || 0) + ' : ' + (vote.B || 0) + '）';
    hint.setText('K 取奇数避免平票；K 越大越平滑，K=1 是最近邻分类');
  });
  yield W(600);
}

panel.addButton('运行演示', () => engine.start(knnGen()));
panel.addButton('清空', () => { engine.clear(); resetAll(); hint.setText('已清空，可重新运行'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；KNN 是惰性学习，预测时才计算）');

scene.start(engine);
