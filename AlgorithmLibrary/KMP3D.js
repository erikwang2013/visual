// AlgorithmLibrary/KMP3D.js — KMP：主串纸带 + 模式纸带 + next 前缀表；失配时 j 沿 next 跳、i 从不回退。
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText } from '../3D/VisualObject3D.js';
import { applyTheme } from '../3D/Glow.js';
import { StoryDirector } from '../3D/director/StoryDirector.js';
import { InputKit } from '../3D/director/InputKit.js';
import { StringStage } from '../3D/director/StringStage.js';
applyTheme('KMP3D');

const scene = new Scene3D('scene', { cameraPos: [520, 580, 950], lookAt: [320, 470, 0], fov: 52 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });
const input = new InputKit(panel);
const status = panel.addStatus('就绪');

const isMobile = typeof matchMedia !== 'undefined' && matchMedia('(max-width: 900px)').matches;
const GREEN = 0x4ade80, RED = 0xfb7185, CYAN = 0x22d3ee, ORANGE = 0xfb923c, GOLD = 0xfde047, DIM = 0x475569;
let TEXT = 'ABABDABACDABABCABAB';
let PAT = 'ABABCABAB';
let NEXT = [];
let stage = null;
let resultText = null;
let i = 0, j = 0, cmp = 0;
let matches = [];
let nextReady = 0;

const director = new StoryDirector(scene, {
  title: 'KMP · 失败函数',
  total: 8,
  legend: [
    { label: '相等', color: '#4ade80' },
    { label: '失配', color: '#fb7185' },
    { label: '跳转', color: '#22d3ee' },
    { label: '命中', color: '#fde047' },
  ],
  onReplay: () => restart(true),
});

function computeNext() {
  const p = [...PAT];
  const out = new Array(p.length).fill(0);
  let k = 0;
  for (let q = 1; q < p.length; q++) {
    while (k > 0 && p[q] !== p[k]) k = out[k - 1];
    if (p[q] === p[k]) k++;
    out[q] = k;
  }
  return out;
}

// 纯模拟扫描轨迹，找第一次 j>0 失配，供叙事与真实 kmpStep 对齐。
function findFailure() {
  let si = 0, sj = 0;
  const n = TEXT.length, m = PAT.length;
  for (let guard = 0; guard < 2 * n + 2 * m + 10 && si < n; guard++) {
    if (sj >= m) sj = NEXT[m - 1];
    if (TEXT[si] === PAT[sj]) {
      si++; sj++;
    } else if (sj > 0) {
      return { i: si, from: sj, to: NEXT[sj - 1], text: TEXT[si], pat: PAT[sj] };
    } else {
      si++;
    }
  }
  return null;
}

function naiveCount() {
  let c = 0;
  for (let s = 0; s + PAT.length <= TEXT.length; s++) {
    for (let k = 0; k < PAT.length; k++) {
      c++;
      if (TEXT[s + k] !== PAT[k]) break;
    }
  }
  return c;
}

function state() {
  const items = NEXT.slice(0, nextReady).map((v, q) => ({
    text: q + ':' + v,
    cls: q === j ? 'current' : 'done',
  }));
  return {
    blocks: [
      { type: 'kv', label: '指针', items: [{ k: 'i', v: i + ' / ' + TEXT.length }, { k: 'j', v: j + ' / ' + PAT.length }] },
      { type: 'chips', label: 'next[]（已构建）', items, empty: '—' },
      { type: 'chips', label: '匹配位置', items: matches.map((p) => ({ text: String(p), cls: 'done' })), empty: '—' },
      { type: 'text', label: '比较次数', value: String(cmp) },
    ],
    footer: 'next[j] = 模式前缀最长相等前后缀长度',
  };
}

const SHOT_SIDE = { pos: [560, 580, 980], target: [320, 460, 0], ms: 900 };
const SHOT_NEXT = isMobile
  ? { pos: [420, 650, 600], target: [320, 600, 0], ms: 850 }
  : { pos: [520, 730, 780], target: [320, 585, 0], ms: 850 };
const SHOT_JUMP = { pos: [560, 650, 640], target: [330, 520, 0], ms: 750 };
const SHOT_HIT = { pos: [560, 540, 760], target: [380, 360, 0], ms: 850 };
const SHOT_FINAL = isMobile
  ? { pos: [320, 560, 1000], target: [320, 450, 0], ms: 950 }
  : { pos: [320, 620, 1250], target: [320, 450, 0], ms: 950 };

function stageScale() {
  const base = isMobile ? 0.9 : 0.8;
  return base * Math.min(1, 650 / (Math.max(TEXT.length, PAT.length) * 39 * base));
}

function build() {
  if (stage) stage.dispose();
  if (resultText) { resultText.remove(); resultText = null; }
  NEXT = computeNext();
  stage = new StringStage(scene, {
    scale: stageScale(), cellW: 34, cellH: 34, gap: 5,
    center: [320, 0, 0], tapeY: 320, patY: 490, nextY: 650,
  });
  stage.build(TEXT, PAT);
  resultText = new VText(scene, { text: '匹配 @ —', x: 320, y: 195, z: 0, color: '#fde047', scale: 0.7 });
  i = 0; j = 0; cmp = 0; matches = []; nextReady = 0;
  director.stateUpdate(state());
}

function* kmpStep(wait = 170) {
  if (i >= TEXT.length) return false;
  if (j >= PAT.length) j = NEXT[PAT.length - 1];
  if (TEXT[i] === PAT[j]) {
    cmp++;
    stage.setTextColor(i, GREEN);
    stage.setPatColor(j, GREEN);
    i++; j++;
    if (j === PAT.length) {
      const start = i - PAT.length;
      matches.push(start);
      stage.markMatch(start, PAT.length);
      stage.hidePointer('i');
      stage.hidePointer('j');
      director.stateUpdate(state());
      director.setBeatState('完整匹配 @ ' + start + ' · 比较 ' + cmp + ' 次');
      yield W(wait + 520);
      j = NEXT[PAT.length - 1];
      return true;
    }
  } else {
    cmp++;
    stage.setTextColor(i, RED);
    stage.setPatColor(j, RED);
    if (j > 0) {
      const from = j;
      j = NEXT[j - 1];
      stage.jump(from, j);
      director.stateUpdate(state());
      director.setBeatState('失配 ' + TEXT[i] + ' ≠ ' + PAT[from] + ' · j = next[' + (from - 1) + '] = ' + j);
      yield W(wait + 260);
      stage.clearJump();
    } else {
      director.setBeatState('失配 ' + TEXT[i] + ' ≠ ' + PAT[0] + ' · j 已到底 → i++');
      i++;
    }
  }
  if (i < TEXT.length) stage.setPointer('i', i); else stage.hidePointer('i');
  if (j < PAT.length) stage.setPointer('j', j);
  director.stateUpdate(state());
  yield W(wait);
  return true;
}

function* runKMP() {
  director.reset();
  stage.reset();
  i = 0; j = 0; cmp = 0; matches = []; nextReady = 0;
  if (resultText) resultText.setText('匹配 @ —', { color: '#fde047' });
  director.stateUpdate(state());

  director.chapter('建立');
  yield S(() => director.beat({
    title: '长纸带 + 模式 + next 表',
    why: '主串只向前扫描；模式失配时靠 next 表决定 j 回退到哪，而不是把 i 拖回去。',
    stateText: '主串 ' + TEXT.length + ' 字符 · 模式 ' + PAT.length + ' 字符',
    progress: 0,
    camera: SHOT_SIDE,
    annotations: [
      { id: 'tape', text: '主串 ' + TEXT, anchor: () => stage.textAnchor(0), offset: [0, -20], className: 'gold' },
      { id: 'pat', text: '模式 ' + PAT, anchor: () => stage.patAnchor(0), offset: [0, -20] },
      { id: 'hook', text: '失配后要回退多少？', anchor: () => new THREE.Vector3(320, 720, 0), offset: [0, -22], className: 'final' },
    ],
  }));
  yield W(800);

  // 第 1 拍：构建 next
  director.chapter('构建 next');
  yield S(() => director.beat({
    title: 'next[j]：最长相等前后缀',
    why: '对每个前缀，找出“既是最前又是最后”的最长子串长度；失配时这段已经匹配，可以整段跳过。',
    stateText: '逐格构建 next[0…' + (PAT.length - 1) + ']',
    progress: 1,
    camera: SHOT_NEXT,
    annotations: [{ id: 'build', text: '青色 = 前缀，橙色 = 后缀', anchor: () => stage.patAnchor(0), offset: [0, -20] }],
  }));
  for (let q = 0; q < PAT.length; q++) {
    const k = NEXT[q];
    stage.resetColors();
    for (let t = 0; t < k; t++) stage.setPatColor(t, CYAN);
    for (let t = q - k + 1; t <= q; t++) stage.setPatColor(t, ORANGE);
    nextReady = q + 1;
    stage.setNext(q, k, GOLD);
    yield S(() => {
      director.stateUpdate(state());
      director.setBeatState('next[' + q + '] = ' + k + (k ? ' · 前缀 "' + PAT.slice(0, k) + '" = 后缀' : ' · 无相等前后缀'));
    });
    yield W(300);
    stage.setNext(q, k, DIM);
  }
  stage.resetColors();
  yield S(() => director.setBeatState('next 构建完成 · 共 ' + PAT.length + ' 项'));
  yield W(450);

  // 第 2 拍：开始扫描
  director.chapter('扫描');
  i = 0; j = 0; cmp = 0; matches = [];
  stage.resetColors();
  stage.clearJump();
  stage.clearMatch();
  stage.setPointer('i', 0);
  stage.setPointer('j', 0);
  const scanK = Math.min(3, TEXT.length - 1);
  yield S(() => director.beat({
    title: 'i / j 双指针逐字符比较',
    why: '相等就一起右移；文本指针 i 永远不向左——这是 KMP 线性的关键。',
    stateText: 'i = 0, j = 0 · 比较 0 次',
    progress: 2,
    camera: { pos: [stage.xText(scanK) + 180, 560, 700], target: [stage.xText(scanK), 370, 0], ms: 800 },
    annotations: [{ id: 'cmp', text: '相等 → i++ / j++', anchor: () => stage.textAnchor(0), offset: [0, -20] }],
  }));
  yield W(450);
  const failure = findFailure();
  let preGuard = 0;
  while (failure && (i !== failure.i || j !== failure.from) && preGuard++ < 400) {
    if (!(yield* kmpStep(130))) break;
  }
  const atFailure = !!failure && i === failure.i && j === failure.from;
  if (atFailure) {
    yield S(() => {
      director.stateUpdate(state());
      director.setBeatState('已匹配前缀 "' + PAT.slice(0, j) + '" · 下一个字符 ' + TEXT[i] + ' ≠ ' + PAT[j]);
    });
    yield W(350);
  }

  // 第 3 拍：按真实扫描轨迹演示失配（扫描未触发 j>0 失配时说明原因）
  director.chapter('失配');
  if (atFailure) {
    const from = failure.from, to = failure.to;
    const border = to ? '「' + PAT.slice(0, to) + '」' : '空';
    yield S(() => director.beat({
      title: '失配 ' + failure.text + ' ≠ ' + failure.pat + ' → j ' + from + '→' + to,
      why: '已匹配前缀「' + PAT.slice(0, from) + '」的最长相等前后缀是 ' + border +
        '（next[' + (from - 1) + '] = ' + to + '），j 退到 ' + to + ' 复用这段 border；i 原地不动。',
      stateText: 'i = ' + i + ', j = ' + from + '→' + to + ' · ' + failure.text + ' ≠ ' + failure.pat + ' · 已比较 ' + cmp + ' 次',
      progress: 3,
      camera: SHOT_JUMP,
      annotations: [{ id: 'jump', text: 'j = next[' + (from - 1) + '] = ' + to, anchor: () => stage.patAnchor(from), offset: [0, -20], className: 'warn' }],
    }));
    yield W(450);
    yield* kmpStep(220);
    yield S(() => director.setBeatState('j 已回退到 ' + j + ' · i 保持 ' + i + ' · 比较 ' + cmp + ' 次'));
    yield W(400);
  } else {
    yield S(() => director.beat({
      title: '本次扫描没有 j>0 失配',
      why: '按当前主串/模式，扫描中每个 j>0 的比较都相等；next 回退分支不被触发，只会在 j=0 处跳过或直接命中。',
      stateText: '无 j>0 失配 · next 回退未触发 · 当前比较 ' + cmp + ' 次',
      progress: 3,
      camera: SHOT_JUMP,
      annotations: [{ id: 'jump', text: '无 j>0 失配 · next 回退未触发', anchor: () => stage.patAnchor(0), offset: [0, -20], className: 'warn' }],
    }));
    yield W(500);
  }

  // 第 4 拍：继续扫描直到命中
  director.chapter('继续扫描');
  yield S(() => director.beat({
    title: '文本指针继续前进',
    why: 'j 从 next 表恢复匹配后，i 不回退；扫描到命中前一共只比较有限次。',
    stateText: 'i = ' + i + ' · 比较 ' + cmp + ' 次',
    progress: 4,
    camera: SHOT_SIDE,
    annotations: [],
  }));
  let guard = 0;
  while (i < TEXT.length && guard++ < 200) yield* kmpStep(140);
  const first = matches.length ? matches[0] : null;
  yield S(() => {
    if (first !== null) {
      if (resultText) resultText.setText('匹配 @ ' + matches.join('、'), { color: '#fde047' });
      director.chapter('命中');
      director.beat({
        title: '完整匹配 @ ' + first,
        why: '模式 ' + PAT.length + ' 个字符全部对完，命中位置 = i − 模式长度；next 表还能让扫描继续找下一次。',
        stateText: '匹配位置 ' + matches.join('、') + ' · 比较 ' + cmp + ' 次',
        progress: 4.5,
        camera: SHOT_HIT,
        annotations: [{ id: 'hit', text: '模式出现 @ ' + first, anchor: () => stage.textAnchor(Math.min(TEXT.length - 1, first)), offset: [0, -20], className: 'final' }],
      });
      director.stateUpdate(state());
    } else {
      director.beat({
        title: '未找到匹配',
        why: 'i 扫到主串末尾仍未对齐完整模式；next 表保证没有漏掉起点。',
        stateText: '比较 ' + cmp + ' 次',
        progress: 4.5,
        camera: SHOT_SIDE,
        annotations: [],
      });
    }
  });
  yield W(850);

  // 第 5 拍：不变量
  director.chapter('不变量');
  yield S(() => director.beat({
    title: '已匹配前缀绝不重比',
    why: 'next[j-1] 保存的是“可复用的最长 border”；j 回退只经过 border，因此每个文本字符最多比较一次量级。',
    stateText: 'i 不回退 · 比较 ' + cmp + ' 次 · O(n+m)',
    progress: 5,
    camera: SHOT_SIDE,
    annotations: [{ id: 'inv', text: 'i 只增不减', anchor: () => stage.textAnchor(Math.min(i, TEXT.length - 1)), offset: [0, -20], className: 'gold' }],
  }));
  yield W(700);

  // 第 6 拍：结算
  yield S(() => {
    director.chapter('结算');
    const naive = naiveCount();
    director.beat({
      title: first === null ? '无匹配' : '匹配 @ ' + matches.join('、'),
      why: 'next 预处理 O(m)，扫描 O(n)；朴素匹配最坏会把每个起点重比一遍。',
      stateText: 'KMP 比较 ' + cmp + ' 次 · 朴素 ' + naive + ' 次',
      progress: 6,
      camera: SHOT_FINAL,
      annotations: [{ id: 'res', text: first === null ? '无匹配' : '命中 @ ' + matches.join('、'), anchor: () => new THREE.Vector3(320, 250, 0), offset: [0, -20], className: 'final' }],
    });
    director.stateUpdate(state());
  });
  status.textContent = 'KMP：在 "' + TEXT + '" 中匹配 "' + PAT + '"，' +
    (first === null ? '未找到' : '位置 [' + matches.join(', ') + ']') +
    ' · 比较 ' + cmp + ' 次（朴素 ' + naiveCount() + ' 次） · O(n+m)';
  yield W(950);

  // 第 7 拍：复盘
  director.chapter('复盘');
  yield S(() => director.beat({
    title: 'KMP = 失败函数 + 不回退的 i',
    why: '应用：文本编辑器查找、DNA 序列定位、日志关键字扫描；空间换时间只花 O(m) 的 next 表。',
    stateText: 'next O(m) · 扫描 O(n) · 总 O(n+m)',
    progress: 8,
    camera: SHOT_FINAL,
    annotations: [],
  }));
  yield W(700);
}

function applyInputs() {
  const t = textInput.value.trim().toUpperCase().replace(/[^A-Z]/g, '').slice(0, 22);
  const p = patInput.value.trim().toUpperCase().replace(/[^A-Z]/g, '').slice(0, 9);
  if (!t || !p) {
    status.textContent = '主串/模式至少各 1 个字母（A–Z，主串 ≤22、模式 ≤9）';
    return;
  }
  if (t.length < p.length) {
    status.textContent = '模式不能比主串长';
    return;
  }
  TEXT = t; PAT = p;
  textInput.value = TEXT;
  patInput.value = PAT;
  restart(true);
}

const textInput = panel.addInput('主串 A–Z', applyInputs, 24);
textInput.value = TEXT;
const patInput = panel.addInput('模式 A–Z', applyInputs, 12);
patInput.value = PAT;

function restart(auto = true) {
  status.textContent = '';
  engine.clear();
  director.reset();
  build();
  engine.queue(() => runKMP());
  if (auto) engine.toggle();
}

input.addButton('重播', () => restart(true));
input.addButton('清空', () => { engine.clear(); director.reset(); build(); status.textContent = ''; });

build();
engine.queue(() => runKMP());
scene.start(engine);
