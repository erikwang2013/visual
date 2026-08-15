// AlgorithmLibrary/SuffixArray3D.js — 后缀数组（倍增）：立柱 = 排名，每轮颜色深浅 = 当前关键字排名（function* 生成器驱动，解说入状态栏）
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText, VBar } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
applyTheme('SuffixArray3D');

const scene = new Scene3D('scene', { cameraPos: [320, 660, 900], lookAt: [320, 460, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });

const VIOLET = 0xc4b5fd, GOLD = 0xfcd34d, SLATE = 0x64748b;
const status = panel.addStatus('就绪');

const TXT = 'banana';
const SA = (() => { const sa = [...TXT].map((_, i) => i).sort((a, b) => TXT.slice(a) < TXT.slice(b) ? -1 : 1); return sa; })();
const SUF = TXT.length;
const SP = 92;
const cx = k => (k - (SUF - 1) / 2) * SP + 320;
const shadeHex = (rank, maxRank) => new THREE.Color(VIOLET).multiplyScalar(0.45 + 0.55 * (maxRank > 0 ? rank / maxRank : 1)).getHex();
const BAR_BASE = 340;
const rankToH = rank => 1 + rank * 42;
const sufT = [...TXT].map((_, i) => new VText(scene, { text: `"${TXT.slice(i)}"`, x: cx(i), y: 290, z: 0, color: PALETTE.textGlow, scale: 0.5 }));
const colT = [...TXT].map((_, i) => new VText(scene, { text: `i=${i}`, x: cx(i), y: 230, z: 0, color: PALETTE.textDim, scale: 0.45 }));
const bar = [...TXT].map((_, i) => { const b = new VBar(scene, { w: 42, d: 42, x: cx(i), color: SLATE, emissive: SLATE }); b.mesh.scale.y = 0.5; b.mesh.position.y = BAR_BASE + 0.25; return b; });
const rankT = [...TXT].map((_, i) => new VText(scene, { text: '', x: cx(i), y: 0, z: 0, color: GOLD, scale: 0.55 }));

const growBar = (b, h, p, color) => {
  const hh = Math.max(h * p, 0.5); b.mesh.scale.y = hh; b.mesh.position.y = BAR_BASE + hh / 2;
  if (color) b.setColor(color, color);
};

// 每轮关键字 = 前 k 个字符（k=1,2,4），返回每原下标的新排名（并列同排）
function roundRanks(k) {
  const keys = [...TXT].map((_, i) => TXT.slice(i, i + k));
  const sorted = [...keys].sort();
  const rank = {};
  sorted.forEach((key, idx) => { if (!(key in rank)) rank[key] = idx; });
  return [...TXT].map((_, i) => rank[keys[i]]);
}
const R1 = roundRanks(1), R2 = roundRanks(2), R3 = roundRanks(4);
// 每轮柱色预计算（生成器内零分配）
const C1 = R1.map(r => shadeHex(r, Math.max(...R1)));
const C2 = R2.map(r => shadeHex(r, Math.max(...R2)));
const C3 = R3.map(r => shadeHex(r, Math.max(...R3)));

function resetAll() {
  bar.forEach(b => { b.mesh.scale.y = 0.5; b.mesh.position.y = BAR_BASE + 0.25; b.setColor(SLATE, SLATE); });
  rankT.forEach(t => t.setText(''));
}

function* roundAnim(round, ranks, colors, desc) {
  const maxRank = Math.max(...ranks);
  yield S(() => {
    status.textContent = `第 ${round} 轮（倍增 k=${round === 1 ? 1 : round === 2 ? 2 : 4}）：${desc}；本轮新排名 [${ranks.join(', ')}]，并列同排同色`;
  });
  yield W(900);
  for (let i = 0; i < SUF; i++) {
    const h = rankToH(ranks[i]);
    yield A(360, p => growBar(bar[i], h, p, colors[i]));
    yield S(() => { rankT[i].setText(String(ranks[i]), { color: ranks[i] === maxRank ? GOLD : PALETTE.textGlow }); rankT[i].sprite.position.set(cx(i), BAR_BASE + h + 20, 0); });
  }
  yield W(600);
}

function* runSA() {
  yield S(() => { resetAll(); status.textContent = '后缀数组倍增法：每轮按前 k 个字符（k 翻倍）给每个后缀排名，排名唯一后排序结束 —— 柱高 = 排名，色深 = 关键字排名'; });
  yield W(500);
  yield* roundAnim(1, R1, C1, '关键字 = 首字符：a(0) b(1) n(2)，三个 a 并列');
  yield* roundAnim(2, R2, C2, '关键字 = 前 2 字符：ba(3) an(1) na(4) an(1) na(4) a(0)');
  yield* roundAnim(3, R3, C3, '关键字 = 前 4 字符（已达串尾，排名全唯一）：最终排名即 SA');
  yield S(() => {
    status.textContent = `后缀数组演示完成：SA("${TXT}") = [${SA.join(', ')}]（倍增 3 轮，最终排名 [${R3.join(', ')}]，排名唯一即排序结束）`;
  });
  yield W(500);
}

engine.queue(() => runSA());
panel.addButton('清空', () => { engine.clear(); resetAll(); status.textContent = ''; });

scene.start(engine);
