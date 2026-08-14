// AlgorithmLibrary/EditDistance3D.js — 编辑距离：S="CART"→T="CRAT" 的 5×5 DP 表逐格填，三源（青=上/橙=左/紫=对角）依次高亮、金=当前格、方向字符放大动画、绿=回溯路径（function* 生成器驱动）
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText, VBox, easeInOut } from '../3D/VisualObject3D.js';
import { applyTheme } from '../3D/Glow.js';
applyTheme('EditDistance3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc084fc, WHITE = 0xffffff;
const status = panel.addStatus('就绪');
panel.addLabel('（拖拽旋转视角，滚轮缩放；青=上源，橙=左源，紫=对角源，金=当前格，绿=回溯路径）');

const SA = 'CART', TB = 'CRAT';   // SA 行串 / TB 列串（不叫 S/T，避免遮蔽生成器助手 S）
const N = SA.length, M = TB.length;   // 列数 / 行数（均 4）
const dp = Array.from({ length: M + 1 }, () => Array(N + 1).fill(0));
const cellView = new Map();   // 'i-j' -> {box}
const headerViews = [];       // 表头 VText（含 ε）——clearView 必须移除，防清空重播叠加
const BX = j => 320 + (j - 2) * 62;   // j=0..4 → 196/258/320/382/444
const BY = i => 606 - i * 62;         // i=0..4 → 606/544/482/420/358

// 方向字符单例：模块顶层创建，永不进 clearView、绝不 dispose/重建（重建会破坏生成器引用）
const dirT = new VText(scene, { text: '↖', x: 0, y: 0, z: 0, color: WHITE, scale: 0.5 });
dirT.sprite.visible = false;
const BS = dirT.sprite.scale.clone();   // 基准缩放

// 16 格文案（逐字；候选值已核验）
const CELL_MSG = {
  '1-1': 'd[1][1] = min(上 2, 左 2, 对角 0) = 0（C=C 匹配，取对角）',
  '1-2': 'd[1][2] = min(上 3, 左 1, 对角 2) = 1（插入 R）',
  '1-3': 'd[1][3] = min(上 4, 左 2, 对角 3) = 2（插入 A）',
  '1-4': 'd[1][4] = min(上 5, 左 3, 对角 4) = 3（插入 T）',
  '2-1': 'd[2][1] = min(上 1, 左 3, 对角 2) = 1（删除 A）',
  '2-2': 'd[2][2] = min(上 2, 左 2, 对角 1) = 1（替换 A→R）',
  '2-3': 'd[2][3] = min(上 3, 左 2, 对角 1) = 1（A=A 匹配，取对角）',
  '2-4': 'd[2][4] = min(上 4, 左 2, 对角 3) = 2（插入 T）',
  '3-1': 'd[3][1] = min(上 2, 左 4, 对角 3) = 2（删除 R）',
  '3-2': 'd[3][2] = min(上 2, 左 3, 对角 1) = 1（R=R 匹配，取对角）',
  '3-3': 'd[3][3] = min(上 2, 左 2, 对角 2) = 2（三源并列 → 对角优先）',
  '3-4': 'd[3][4] = min(上 3, 左 3, 对角 2) = 2（替换 R→T）',
  '4-1': 'd[4][1] = min(上 3, 左 5, 对角 4) = 3（删除 T）',
  '4-2': 'd[4][2] = min(上 2, 左 4, 对角 3) = 2（删除 T）',
  '4-3': 'd[4][3] = min(上 3, 左 3, 对角 2) = 2（替换 T→A）',
  '4-4': 'd[4][4] = min(上 3, 左 3, 对角 2) = 2（T=T 匹配，取对角）← 编辑距离答案',
};

function clearView() {
  cellView.forEach(c => scene.remove(c.box.mesh));
  headerViews.forEach(h => scene.remove(h.sprite));
  cellView.clear();
  headerViews.length = 0;
}
function buildTable() {
  clearView();
  for (let j = 1; j <= N; j++) {
    const h = new VText(scene, { text: TB[j - 1], x: BX(j), y: 656, z: 0, color: CYAN, scale: 0.5 });
    headerViews.push(h);
  }
  for (let i = 1; i <= M; i++) {
    const h = new VText(scene, { text: SA[i - 1], x: 146, y: BY(i), z: 0, color: CYAN, scale: 0.5 });
    headerViews.push(h);
  }
  headerViews.push(new VText(scene, { text: 'ε', x: 146, y: 656, z: 0, color: CYAN, scale: 0.5 }));
  for (let i = 0; i <= M; i++) {
    for (let j = 0; j <= N; j++) {
      const box = new VBox(scene, { w: 56, h: 56, d: 14, x: BX(j), y: BY(i), z: 0, label: String(dp[i][j]), color: BLUE, emissive: BLUE });
      cellView.set(i + '-' + j, { box });
    }
  }
}
function setCell(i, j, v) {
  dp[i][j] = v;
  const e = cellView.get(i + '-' + j);
  e.box.setText(String(v));
  e.box.setColor(BLUE, BLUE);
}
function setCellColor(i, j, c) { const e = cellView.get(i + '-' + j); if (e) e.box.setColor(c, c); }
function resetAll() {
  dp.length = 0;
  for (let i = 0; i <= M; i++) dp.push(Array(N + 1).fill(0));
  cellView.forEach(e => { e.box.setText('0'); e.box.setColor(BLUE, BLUE); });
  dirT.sprite.visible = false;
  dirT.sprite.scale.copy(BS);
}

buildTable();   // 规范②：模块加载即显示 25 盒全 '0' BLUE + 9 表头，点播放才动画

function* runED() {
  yield S(resetAll);
  yield S(() => { status.textContent = '编辑距离：把 S="CART" 变成 T="CRAT" 的最少操作数；d[i][j] = min(上+1 删, 左+1 插, 对角 +0 匹配/+1 替换)'; });
  yield W(900);
  // Phase 1 初始化：首行全插入
  yield S(() => { status.textContent = '初始化：首行 d[0][j]=j——空串 → T 前 j 字符需插入 j 次（全插入）'; });
  for (let j = 1; j <= N; j++) {
    yield S(() => setCellColor(0, j, GOLD));
    yield W(240);
    yield S(() => setCell(0, j, j));
    yield W(130);
  }
  // Phase 1 初始化：首列全删除
  yield S(() => { status.textContent = '初始化：首列 d[i][0]=i——S 前 i 字符 → 空串需删除 i 次（全删除）'; });
  for (let i = 1; i <= M; i++) {
    yield S(() => setCellColor(i, 0, GOLD));
    yield W(240);
    yield S(() => setCell(i, 0, i));
    yield W(130);
  }
  // Phase 2 逐格填充 16 格
  for (let i = 1; i <= M; i++) {
    for (let j = 1; j <= N; j++) {
      const eq = SA[i - 1] === TB[j - 1];
      const up = dp[i - 1][j] + 1, left = dp[i][j - 1] + 1, diag = dp[i - 1][j - 1] + (eq ? 0 : 1);
      const v = eq ? diag : Math.min(diag, up, left);
      dp[i][j] = v;
      const dir = v === diag ? '↖' : v === up ? '↑' : '←';   // 对角优先
      const cx = BX(j), cy = BY(i), msg = CELL_MSG[i + '-' + j];
      yield S(() => { dirT.sprite.visible = false; setCellColor(i, j, GOLD); });
      yield S(() => setCellColor(i - 1, j, CYAN));
      yield W(150);
      yield S(() => setCellColor(i - 1, j, BLUE));
      yield S(() => setCellColor(i, j - 1, ORANGE));
      yield W(150);
      yield S(() => setCellColor(i, j - 1, BLUE));
      yield S(() => setCellColor(i - 1, j - 1, PUR));
      yield W(150);
      yield S(() => setCellColor(i - 1, j - 1, BLUE));
      yield S(() => { dirT.setText(dir); dirT.sprite.position.set(cx - 24, cy - 24, 0); dirT.sprite.visible = true; status.textContent = msg; });
      yield A(220, p => { dirT.sprite.scale.copy(BS).multiplyScalar(0.3 + 0.7 * easeInOut(p)); });
      yield S(() => { setCell(i, j, v); dirT.sprite.visible = false; });
      yield W(120);
    }
  }
  // Phase 3 回溯
  yield S(() => { status.textContent = '回溯：从 d[4][4] 出发，对角优先；字符相同走对角（匹配），否则按 对角→上→左 选最小值来源'; });
  yield W(700);
  yield S(() => { setCellColor(4, 4, GOLD); status.textContent = '回溯：d[4][4]=2：S[3]=T=T[3] 匹配 → 走对角到 (3,3)'; });
  yield W(450);
  yield S(() => setCellColor(4, 4, GREEN));
  yield S(() => { setCellColor(3, 3, GOLD); status.textContent = '回溯：d[3][3]=2：上 2 / 左 2 / 对角 2 三源并列 → 对角优先（替换 R→A）→ (2,2)'; });
  yield W(450);
  yield S(() => setCellColor(3, 3, GREEN));
  yield S(() => { setCellColor(2, 2, GOLD); status.textContent = '回溯：d[2][2]=1：对角 0+1=1 最小 → 替换 A→R → (1,1)'; });
  yield W(450);
  yield S(() => setCellColor(2, 2, GREEN));
  yield S(() => { setCellColor(1, 1, GOLD); status.textContent = '回溯：d[1][1]=0：S[0]=C=T[0] 匹配 → 保持 C → (0,0)'; });
  yield W(450);
  yield S(() => setCellColor(1, 1, GREEN));
  yield S(() => { setCellColor(0, 0, GOLD); status.textContent = '回溯：到达 (0,0)，路径完成：保持 C、替换 A→R、替换 R→A、保持 T'; });
  yield W(450);
  yield S(() => setCellColor(0, 0, GREEN));
  // Phase 4 完成
  yield S(() => setCellColor(4, 4, GOLD));
  yield S(() => { status.textContent = '编辑距离(CART, CRAT) = 2'; });
  yield W(450);
  yield S(() => setCellColor(4, 4, GREEN));
  yield S(() => { status.textContent = '编辑距离(CART, CRAT) = 2：保持 C、替换 A→R、替换 R→A、保持 T（O(nm) 时间、O(nm) 空间）'; });
  yield W(600);
}

engine.queue(() => runED());
panel.addButton('清空', () => { engine.clear(); clearView(); resetAll(); buildTable(); status.textContent = ''; });
scene.start(engine);
