// AlgorithmLibrary/UnboundedKnapsack3D.js — 完全背包：容量槽 1..10 正序扫描 dp[w]=max(dp[w-wi]+vi)，同物可重复用，回溯组合（function* 生成器驱动）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText, VBox } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('UnboundedKnapsack3D');

const scene = new Scene3D('scene', { cameraPos: [320, 500, 900], lookAt: [320, 500, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const BLUE = 0x60a5fa, GOLD = 0xfcd34d, GREEN = 0x4ade80, RED = 0xfb7185, ORANGE = 0xfb923c, CYAN = 0x22d3ee, PUR = 0xc4b5fd, WHITE = 0xffffff;
const hint = new VText(scene, { text: '点击「▶ 演示」开始：完全背包（容量 10，物品无限件）', x: 700, y: 560, z: 0, color: PALETTE.textGlow, scale: 0.7, wrapChars: 7 });
const status = panel.addStatus('就绪');
const outT = new VText(scene, { text: '', x: 0, y: 115, z: 0, color: PALETTE.textGlow, scale: 0.62 });

const ITEMS = [{ id: 'A', w: 3, v: 4 }, { id: 'B', w: 5, v: 8 }, { id: 'C', w: 4, v: 6 }];
const CAP = 10;
const itemBox = new Map();    // id -> VBox
const slotView = new Map();   // w -> VBox
const dp = new Array(CAP + 1).fill(0);
const pick = new Array(CAP + 1).fill(-1);

function clearView() {
  itemBox.forEach(b => scene.remove(b.mesh));
  slotView.forEach(s => scene.remove(s.mesh));
  itemBox.clear(); slotView.clear();
}
function buildView() {
  clearView();
  for (let i = 0; i < ITEMS.length; i++) {
    const it = ITEMS[i];
    const y = 420 - i * 110;
    const b = new VBox(scene, { w: 96, h: 48, d: 40, x: -40, y, z: 0, label: it.id, color: BLUE, emissive: BLUE });
    itemBox.set(it.id, b);
    new VText(scene, { text: '重量 ' + it.w + ' · 价值 ' + it.v, x: -40, y: y + 42, z: 0, color: WHITE, scale: 0.5 });
  }
  for (let w = 1; w <= CAP; w++) {
    const b = new VBox(scene, { w: 44, h: 40, d: 36, x: 50 + (w - 1) * 60, y: 490, z: 0, label: String(w), color: BLUE, emissive: BLUE });
    slotView.set(w, b);
    new VText(scene, { text: '容量' + w, x: 50 + (w - 1) * 60, y: 528, z: 0, color: WHITE, scale: 0.42 });
  }
}
function setSlot(w, v, c) {
  dp[w] = v;
  const e = slotView.get(w);
  e.setText(String(v));
  e.setColor(c, c);
}
function setSlotColor(w, c) { const e = slotView.get(w); if (e) e.setColor(c, c); }
function setItemColor(id, c) { const e = itemBox.get(id); if (e) e.setColor(c, c); }

function* ubGen() {
  yield S(() => outT.setText('完全背包：dp[w] = max(dp[w-wi] + vi)，容量正序扫描 —— 同一物品可反复装（与 0/1 背包唯一区别）'));
  yield W(650);
  for (let w = 1; w <= CAP; w++) {
    let best = 0, bf = -1;
    const cands = [];
    setSlotColor(w, CYAN);
    yield S(() => outT.setText('——— 容量 ' + w + '：逐一尝试「最后装的一件」———'));
    yield W(300);
    for (const it of ITEMS) {
      if (w >= it.w) {
        const v = dp[w - it.w] + it.v;
        cands.push(it.id + '→' + v);
        setItemColor(it.id, ORANGE);
        yield S(() => outT.setText('装 ' + it.id + '：dp[' + (w - it.w) + ']=' + dp[w - it.w] + ' + ' + it.v + ' = ' + v + (v > best ? ' ← 暂优' : '')));
        yield W(300);
        if (v > best) { best = v; bf = it.id; }
        setItemColor(it.id, BLUE);
      } else {
        yield S(() => outT.setText(it.id + ' 重 ' + it.w + ' > 容量 ' + w + '，放不下'));
        yield W(200);
      }
    }
    setSlot(w, best, GOLD);
    pick[w] = bf;
    yield S(() => outT.setText('→ dp[' + w + '] = ' + best + '（最后装 ' + (bf || '—') + '）' + (cands.length ? '；候选：' + cands.join('、') : '；都放不下，空着')));
    yield W(450);
  }
  yield S(() => outT.setText('填表完成。回溯：从容量 10 开始反复减掉「最后装的那件」的重量'));
  yield W(550);
  const comb = [];
  let w = CAP;
  while (w > 0 && pick[w] !== -1) {
    const it = ITEMS.find(i => i.id === pick[w]);
    comb.push(it.id);
    const b = itemBox.get(it.id);
    const baseY = b.mesh.position.y;
    yield A(450, p => { b.mesh.position.y = baseY + 40 * Math.sin(p * Math.PI); });
    setItemColor(it.id, GOLD);
    yield S(() => outT.setText('dp[' + w + '] 最后装的是 ' + it.id + '（重 ' + it.w + '）→ 容量 ' + w + ' - ' + it.w + ' = ' + (w - it.w)));
    yield W(420);
    w -= it.w;
  }
  const total = dp[CAP];
  yield S(() => outT.setText('完成：最大价值 ' + total + '，组合 ' + comb.join(' + ') + '（总重 5+5=10，正好装满）'));
  yield W(600);
  yield S(() => { status.textContent = '完全背包完成：最大价值 ' + total + '（' + comb.join('+') + '），O(nW)'; });
  yield W(450);
}

function* runUB() {
  buildView();
  hint.setText('完全背包：正序扫容量，同物可重复用');
  yield W(400);
  yield* ubGen();
  yield S(() => { outT.setText(''); hint.setText('完全背包完成：最大价值 16（B+B），O(nW)'); });
}

engine.queue(() => runUB());
panel.addButton('清空', () => { engine.clear(); clearView(); hint.setText('已清空，可重新运行'); status.textContent = ''; outT.setText(''); });
panel.addLabel('（拖拽旋转视角，滚轮缩放；青 = 当前容量，橙 = 候选物品，金 = 已定 dp 值/选中物品）');

scene.start(engine);
