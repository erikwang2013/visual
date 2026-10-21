// AlgorithmLibrary/Grover3D.js — Grover 搜索：均匀叠加 → Oracle 翻号 → 均值反转 → 迭代 → 测量。
// 振幅柱向上为正、向下为负；均值线贯穿全部柱；点击柱切换目标，n 可选 3/4 位。
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S, A } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { applyTheme } from '../3D/Glow.js';
import { ripple } from '../3D/effects/Fx.js';
import { StoryDirector } from '../3D/director/StoryDirector.js';
import { InputKit } from '../3D/director/InputKit.js';
import { QuantumStage } from '../3D/director/QuantumStage.js';
applyTheme('Grover3D');

const isMobile = typeof matchMedia !== 'undefined' && matchMedia('(max-width: 900px)').matches;
const scene = new Scene3D('scene', { cameraPos: [320, 700, 1020], lookAt: [320, 380, 0], fov: 50 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });
const input = new InputKit(panel);
const status = panel.addStatus('就绪');

let qbits = 3;
let N = 1 << qbits;
let target = 5;
let amps = Array(N).fill(1 / Math.sqrt(N));
let iter = 0;
let stage = null;

const director = new StoryDirector(scene, {
  title: 'Grover · 振幅放大',
  total: 8,
  legend: [
    { label: '正振幅', color: '#4ade80' },
    { label: '负振幅（相位翻转）', color: '#fb7185' },
    { label: '目标', color: '#fcd34d' },
    { label: '均值 μ', color: '#fbbf24' },
  ],
  onReplay: () => restart(qbits, target, true),
});

const nSelect = input.addSelect('量子位 n', [3, 4], 3, (v) => restart(Number(v), defaultTarget(Number(v)), true));
const targetSelect = input.addSelect('目标 x', Array.from({ length: N }, (_, i) => i), target,
  (v) => restart(qbits, Number(v), true));
function syncTargetSelect() {
  while (targetSelect.options.length) targetSelect.remove(0);
  for (let i = 0; i < N; i++) targetSelect.add(new Option(String(i), String(i)));
  targetSelect.value = String(target);
}
panel.addLabel('点击振幅柱或选择「目标 x」可切换目标');

const SHOT_HOOK = { pos: [320, 700, 1020], target: [320, 380, 0], ms: 900 };
const SHOT_FRONT = { pos: [320, 430, 880], target: [320, 370, 0], ms: 750 };
const SHOT_WIDE = { pos: [640, 640, 1000], target: [320, 380, 0], ms: 800 };
const SHOT_SIDE = { pos: [900, 480, 620], target: [320, 380, 0], ms: 800 };
const SHOT_MEASURE = { pos: [430, 720, 940], target: [320, 380, 0], ms: 850 };
const SHOT_FINAL = { pos: [320, 740, 1000], target: [320, 380, 0], ms: 900 };

function defaultTarget(q) { return q === 3 ? 5 : 11; }
function targetShot() {
  const x = stage.x(target);
  return { pos: [x, 430, 700], target: [x, 380, 0], ms: 650, fov: 44 };
}
function uniform() { return Array(N).fill(1 / Math.sqrt(N)); }
function oracleOf(a, t) { const b = a.slice(); b[t] = -b[t]; return b; }
function diffuseOf(a) {
  const mu = a.reduce((s, v) => s + v, 0) / a.length;
  return a.map((v) => 2 * mu - v);
}

function stateBlocks(note) {
  const probs = amps.map((a) => +(a * a * 100).toFixed(1));
  const sum = amps.reduce((s, a) => s + a * a * 100, 0);
  const K = Math.max(1, Math.floor((Math.PI / 4) * Math.sqrt(N)));
  return {
    blocks: [
      { type: 'dist', label: '振幅 a（负=相位翻转）', values: amps.map((a) => +a.toFixed(2)), current: target },
      { type: 'dist', label: '概率 |a|² (%)', values: probs, current: target },
      {
        type: 'kv', label: '迭代',
        items: [
          { k: 'N', v: String(N) },
          { k: 'k', v: String(iter) },
          { k: '最优', v: '≈ ' + K },
          { k: 'ΣP', v: sum.toFixed(1) + '%' },
        ],
      },
      { type: 'text', label: '当前步骤', value: note },
    ],
    footer: '目标 <b>x=' + target + '</b> · P(x=' + target + ') = <b>' + probs[target].toFixed(1) + '%</b>',
  };
}

function* animateTo(next, ms) {
  const from = amps.slice();
  yield A(ms, (p) => stage.setAmps(from.map((v, i) => v + (next[i] - v) * p), false));
  amps = next;
  stage.setAmps(amps, true);
}

function* groverStory() {
  director.reset();
  amps = uniform();
  iter = 0;
  stage.setTarget(target);
  stage.setAmps(amps, true);
  const K = Math.max(1, Math.floor((Math.PI / 4) * Math.sqrt(N)));
  const fmt = () => (amps[target] * amps[target] * 100).toFixed(1);

  director.chapter('叠加态');
  yield S(() => director.beat({
    title: N + ' 个状态等幅共存',
    why: '量子叠加让一次查询同时作用于全部 N 项；问题是：怎样让目标从均匀的波里升起来？',
    stateText: 'N=' + N + ' · 目标 x=' + target + ' · 经典平均查 N/2=' + (N / 2) + ' 次',
    progress: 0,
    camera: SHOT_HOOK,
    annotations: [
      { id: 'title', text: 'Grover：振幅放大', anchor: () => new THREE.Vector3(320, 640, 0), offset: [0, -22] },
      { id: 'target', text: '目标 x=' + target + '（此刻并不特殊）', anchor: () => stage.pos(target), offset: [0, -18], className: 'gold' },
    ],
  }));
  director.stateUpdate(stateBlocks('初始均匀叠加'));
  yield W(700);

  director.chapter('均匀叠加');
  yield S(() => director.beat({
    title: '每个振幅都是 1/√N',
    why: 'N 个基态等幅同相：aᵢ=1/√N。概率 = |aᵢ|² = 1/N，所以没有哪个状态更可能。',
    stateText: 'a=1/√' + N + '≈' + (1 / Math.sqrt(N)).toFixed(3) + ' · P(x=' + target + ')=' + fmt() + '% · ΣP=100%',
    progress: 1,
    camera: SHOT_FRONT,
    annotations: [
      { id: 'formula', text: 'aᵢ = 1/√N · P = |aᵢ|²', anchor: () => new THREE.Vector3(320, 640, 0), offset: [0, -22] },
      { id: 'target', text: '目标 P=' + fmt() + '%', anchor: () => stage.pos(target), offset: [0, -18], className: 'gold' },
    ],
  }));
  director.stateUpdate(stateBlocks('均匀叠加：N 项概率各 1/N'));
  yield W(750);

  director.chapter('Oracle');
  const o1 = oracleOf(amps, target);
  yield S(() => director.beat({
    title: 'Oracle：只翻转目标相位',
    why: 'Oracle 能识别目标却不说出它是谁：把目标振幅乘 −1。其他项不变，总概率仍为 1。',
    stateText: 'a[' + target + ']: +' + amps[target].toFixed(2) + ' → ' + o1[target].toFixed(2) + ' · 总概率不变',
    progress: 2,
    camera: targetShot(),
    annotations: [
      { id: 'oracle', text: '目标振幅翻负（柱向下）', anchor: () => stage.pos(target), offset: [0, -18], className: 'warn' },
      { id: 'mean', text: '均值 μ 仍为正', anchor: () => stage.meanPos(), offset: [0, -16] },
    ],
  }));
  yield* animateTo(o1, 620);
  director.stateUpdate(stateBlocks('Oracle 只改相位：目标振幅变负'));
  yield W(520);

  director.chapter('扩散');
  const d1 = diffuseOf(amps);
  yield S(() => director.beat({
    title: '扩散：关于均值 μ 反射',
    why: '每个振幅变成 2μ−aᵢ：负的目标被翻到均值上方，干扰项被压低——概率从干扰项流向目标。',
    stateText: 'μ=' + (amps.reduce((s, v) => s + v, 0) / N).toFixed(3) + ' · 第 1 轮后 P(x=' + target + ')=' + (d1[target] * d1[target] * 100).toFixed(1) + '%',
    progress: 3,
    camera: SHOT_WIDE,
    annotations: [
      { id: 'mean', text: '绕均值线反射', anchor: () => stage.meanPos(), offset: [0, -16], className: 'gold' },
      { id: 'target', text: '目标柱升高', anchor: () => stage.pos(target), offset: [0, -18], className: 'final' },
    ],
  }));
  yield* animateTo(d1, 680);
  iter = 1;
  director.stateUpdate(stateBlocks('第 1 轮 Oracle + 扩散：P=' + fmt() + '%'));
  yield W(520);

  for (let k = 2; k <= K; k++) {
    director.chapter('第 ' + k + ' 轮迭代');
    yield S(() => director.beat({
      title: '第 ' + k + ' 轮：Oracle + 扩散',
      why: '每轮把目标振幅再放大一次；最优迭代 ≈ (π/4)√N ≈ ' + K + ' 次，继续迭代反而会先降后升。',
      stateText: '第 ' + k + '/' + K + ' 轮 · 当前 P(x=' + target + ')=' + fmt() + '%',
      progress: 4,
      camera: SHOT_WIDE,
      annotations: [{ id: 'iter', text: '第 ' + k + '/' + K + ' 轮振幅放大', anchor: () => new THREE.Vector3(320, 640, 0), offset: [0, -22] }],
    }));
    yield* animateTo(oracleOf(amps, target), 520);
    director.setBeatState('Oracle 翻转目标 → 准备扩散');
    yield W(180);
    yield* animateTo(diffuseOf(amps), 560);
    iter = k;
    director.setBeatState('第 ' + k + ' 轮完成 · P(x=' + target + ')=' + fmt() + '%');
    director.stateUpdate(stateBlocks('第 ' + k + ' 轮完成：P=' + fmt() + '%'));
    yield W(420);
  }

  const sumP = amps.reduce((s, a) => s + a * a, 0) * 100;
  director.chapter('不变量');
  yield S(() => director.beat({
    title: '总概率始终等于 1',
    why: '振幅平方和恒为 1：Oracle 只改符号，扩散只做关于均值的反射，两者都不创造概率。',
    stateText: 'Σ|aᵢ|² = ' + sumP.toFixed(1) + '% · 目标 P=' + fmt() + '%',
    progress: 5,
    camera: SHOT_SIDE,
    annotations: [
      { id: 'sum', text: 'ΣP = ' + sumP.toFixed(1) + '% = 1', anchor: () => new THREE.Vector3(320, 660, 0), offset: [0, -22], className: 'final' },
      { id: 'rest', text: '其余 ' + (N - 1) + ' 项只占 ' + (100 - sumP).toFixed(1) + '%', anchor: () => stage.pos(target), offset: [0, -18] },
    ],
  }));
  director.stateUpdate(stateBlocks('概率守恒：ΣP=100%'));
  yield W(700);

  director.chapter('测量');
  const hit = fmt();
  stage.measure(target);
  const tp = stage.pos(target);
  ripple(scene, tp.x, stage.baseY, tp.z, 0xfcd34d, 80);
  yield S(() => director.beat({
    title: '测量坍缩 → 最可能 x=' + target,
    why: '测量让叠加态坍缩到一个基态；单次结果按 |a|² 抽样，目标概率最高（P=' + hit + '%），这里展示最可能结果，重复实验约 ' + (100 / parseFloat(hit)).toFixed(1) + ' 次命中一次。',
    stateText: '最可能结果 x=' + target + ' · P=' + hit + '% · 单次抽样可能不同',
    progress: 6,
    camera: SHOT_MEASURE,
    annotations: [
      { id: 'hit', text: '最可能测得 x=' + target + '（P=' + hit + '%）', anchor: () => stage.pos(target), offset: [0, -18], className: 'gold' },
      { id: 'collapse', text: '坍缩：只留下一个基态', anchor: () => new THREE.Vector3(320, 660, 0), offset: [0, -22], className: 'final' },
    ],
  }));
  director.stateUpdate(stateBlocks('测量：目标概率最高，单次按概率抽样'));
  yield W(900);

  director.chapter('复盘');
  yield S(() => director.beat({
    title: 'O(√N) 的二次加速',
    why: '经典线性搜索平均 N/2=' + (N / 2) + ' 次比较；Grover 只需约 (π/4)√N≈' + K + ' 次量子查询。N 越大差距越大。',
    stateText: '经典 ' + (N / 2) + ' 次 vs Grover ' + K + ' 次 · O(√N)',
    progress: 8,
    camera: SHOT_FINAL,
    annotations: [
      { id: 'cmp', text: '经典 ' + (N / 2) + ' 次 → 量子 ' + K + ' 次', anchor: () => new THREE.Vector3(320, 700, 0), offset: [0, -22], className: 'gold' },
      { id: 'big', text: 'N 越大，√N 的优势越明显', anchor: () => new THREE.Vector3(320, 660, 0), offset: [0, -22], className: 'final' },
    ],
  }));
  director.stateUpdate(stateBlocks('复盘：O(√N) 查询复杂度'));
  status.textContent = 'Grover: n=' + qbits + ' N=' + N + ' 目标 x=' + target + ' · P=' + hit + '% · ' + K + ' 次迭代（经典平均 ' + (N / 2) + ' 次）· O(√N) 二次加速';
  yield W(800);
}

function buildStage() {
  if (stage) stage.dispose();
  stage = new QuantumStage(scene, {
    n: N,
    target,
    scale: isMobile ? 0.8 : 1,
    span: N <= 8 ? 760 : 900,
  });
  stage.setAmps(Array(N).fill(1 / Math.sqrt(N)), true);
}

function restart(q, t, autoPlay = true) {
  qbits = q;
  N = 1 << qbits;
  target = Math.min(Math.max(0, t), N - 1);
  amps = uniform();
  iter = 0;
  engine.clear();
  director.reset();
  buildStage();
  nSelect.value = String(q);
  syncTargetSelect();
  status.textContent = '就绪 · n=' + qbits + ' N=' + N + ' · 目标 x=' + target;
  engine.queue(() => groverStory());
  if (autoPlay) engine.toggle();
}

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let down = null;
const canvas = scene.renderer.domElement;
canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
canvas.addEventListener('pointerup', (e) => {
  if (!down) return;
  const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
  down = null;
  if (moved > 6) return;
  const r = canvas.getBoundingClientRect();
  pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(pointer, scene.camera);
  const hits = raycaster.intersectObjects(stage.barMeshes(), false);
  if (!hits.length) return;
  const i = hits[0].object.userData.index;
  if (i !== undefined && i !== target) restart(qbits, i, true);
});

input.addButton('测量', () => {
  const p = (amps[target] * amps[target] * 100).toFixed(1);
  engine.pause();
  stage.measure(target);
  status.textContent = '测量（最可能结果）：x=' + target + ' · P=' + p + '% · 单次实验按概率抽样';
  director.stateUpdate(stateBlocks('手动测量：展示最可能结果（单次按概率抽样）'));
});
input.addButton('重播', () => restart(qbits, target, true));
input.addButton('清空', () => {
  engine.clear();
  director.reset();
  amps = uniform();
  iter = 0;
  stage.setTarget(target);
  stage.setAmps(amps, true);
  status.textContent = '';
});

buildStage();
engine.queue(() => groverStory());
scene.start(engine);
