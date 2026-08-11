// AlgorithmLibrary/DBSCAN3D.js — DBSCAN：密度聚类，自动发现簇与噪声（function* 生成器驱动）
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('DBSCAN3D');

const scene = new Scene3D('scene', { cameraPos: [0, 330, 640], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const GREEN = 0x4ade80, YELLOW = 0xfacc15, BLUE = 0x67e8f9, ROSE = 0xfb7185, DIM = 0x334155;
const hint = new VText(scene, { text: '点击「运行演示」开始：DBSCAN 密度聚类', x: 0, y: 255, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('就绪');

const PTS = [[0, 0], [1, 0], [0.5, 0.5], [0, 1], [1, 1], [4, 4], [5, 4], [4.5, 4.5], [4, 5], [7, 1]];
const WX = v => v * 45 - 160, WY = v => -(v * 45 - 112.5);
const pts = PTS.map(([x, y]) => new VBox(scene, { w: 30, h: 30, d: 30, x: WX(x), y: WY(y), z: 0, label: '', color: DIM, emissive: 0 }));
new VText(scene, { text: 'ε = 1.1，minPts = 3', x: -300, y: 170, z: 0, color: PALETTE.textDim, scale: 0.6 });
new VText(scene, { text: '10 个样本点：两簇 + 一个孤立点', x: -230, y: 140, z: 0, color: PALETTE.textDim, scale: 0.6 });

// 密度可达的邻接边（距离 ≤ ε）：簇① 8 条，簇② 5 条
const C1 = [[0, 1], [0, 2], [0, 3], [1, 2], [1, 4], [2, 3], [2, 4], [3, 4]];
const C2 = [[5, 6], [5, 7], [5, 8], [6, 7], [7, 8]];
const edgeBox = (i, j) => {
  const p1 = { x: WX(PTS[i][0]), y: WY(PTS[i][1]) }, p2 = { x: WX(PTS[j][0]), y: WY(PTS[j][1]) };
  const b = new VBox(scene, { w: 200, h: 3, d: 3, x: 0, y: 0, z: 0, label: '', color: DIM, emissive: 0 });
  const cx = (p1.x + p2.x) / 2, cy = (p1.y + p2.y) / 2;
  const len = Math.hypot(p2.x - p1.x, p2.y - p1.y);
  b.mesh.rotation.z = Math.atan2(p2.y - p1.y, p2.x - p1.x);
  b.mesh.scale.set(len / 200, 1, 1);
  b.mesh.position.set(cx, cy, 0);
  b.mesh.visible = false;
  return b;
};
const edges1 = C1.map(([i, j]) => edgeBox(i, j));
const edges2 = C2.map(([i, j]) => edgeBox(i, j));
const stepT = new VText(scene, { text: '', x: 0, y: -170, z: 0, color: PALETTE.textGlow, scale: 0.75 });

function resetAll() {
  pts.forEach(b => b.setColor(DIM, 0));
  [...edges1, ...edges2].forEach(b => (b.mesh.visible = false));
  stepT.setText('');
}

function* dbscanGen() {
  resetAll();
  yield S(() => hint.setText('DBSCAN：邻居多 → 核心点，核心点串起来成簇；没人要的点就是噪声'));
  yield S(() => { stepT.setText('第 1 步：随机选点，数它 ε=1.1 半径内的邻居数（≥ 3 才是核心点）'); });
  yield W(500);
  yield S(() => {
    pts[2].setColor(YELLOW, YELLOW);
    stepT.setText('选点 (0.5,0.5)：邻域内有 4 个邻居 ≥ minPts=3 → 核心点，向外扩散');
  });
  yield W(600);
  yield S(() => {
    edges1.forEach(b => (b.mesh.visible = true));
    for (const i of [0, 1, 3, 4]) pts[i].setColor(GREEN, GREEN);
    pts[2].setColor(GREEN, GREEN);
    stepT.setText('密度可达：邻居的邻居也算进来 → 簇① 共 5 点（绿，8 条连接边）');
  });
  yield W(700);
  yield S(() => {
    pts[7].setColor(YELLOW, YELLOW);
    stepT.setText('另一处：核心点 (4.5,4.5)，邻域 4 点 → 独立成簇②');
  });
  yield W(600);
  yield S(() => {
    edges2.forEach(b => (b.mesh.visible = true));
    for (const i of [5, 6, 8]) pts[i].setColor(BLUE, BLUE);
    pts[7].setColor(BLUE, BLUE);
    stepT.setText('簇② 共 4 点（蓝，5 条连接边）— 两簇之间距离 > ε，互不相连');
  });
  yield W(700);
  yield S(() => {
    pts[9].setColor(ROSE, ROSE);
    stepT.setText('孤立点 (7,1)：邻域内 0 个邻居 → 既不是核心点也不可达 → 标记为噪声（红）');
  });
  yield W(600);
  yield S(() => {
    status.textContent = 'DBSCAN 完成：簇① 5 点 + 簇② 4 点 + 噪声 1 点，无需预设簇数';
    hint.setText('DBSCAN 无需指定 k，能发现任意形状的簇并识别异常 — 地理聚类/异常检测常用');
  });
  yield W(600);
}

panel.addButton('运行演示', () => engine.start(dbscanGen()));
panel.addButton('清空', () => { engine.clear(); resetAll(); hint.setText('已清空，可重新运行'); status.textContent = ''; });
panel.addLabel('（拖拽旋转视角，滚轮缩放；连线 = 距离 ≤ ε，核心点向邻居扩散成簇）');

scene.start(engine);
