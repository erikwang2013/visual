// AlgorithmLibrary/AStar3D.js — A* 网格寻路：open/closed、f=g+h、障碍与路径回溯。
// 10×10 网格，点击格子切换障碍；路径保证可通，否则拒绝该墙。
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VText } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme, glowMaterial } from '../3D/Glow.js';
import { ripple } from '../3D/effects/Fx.js';
import { StoryDirector } from '../3D/director/StoryDirector.js';
import { InputKit } from '../3D/director/InputKit.js';
applyTheme('AStar3D');

const N = 10;
const CELL = 42;
const STEP = 46;
const HALF = ((N - 1) * STEP) / 2;
const CENTER = new THREE.Vector3(320, 300, 0);
const START = [0, 0];
const GOAL = [N - 1, N - 1];
const C = {
  idle: 0x1e293b, idleEm: 0x0f172a, obstacle: 0x7f1d1d, obstacleEm: 0xef4444,
  open: 0xfbbf24, closed: 0x334155, current: 0x22d3ee, path: 0x4ade80,
  start: 0x22c55e, goal: 0xfacc15, line: 0x4ade80,
};

const isMobile = typeof matchMedia !== 'undefined' && matchMedia('(max-width: 900px)').matches;
const scene = new Scene3D('scene', { cameraPos: [480, 500, 720], lookAt: [320, 300, 0], fov: 50 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });
const input = new InputKit(panel);
const status = panel.addStatus('就绪');

const director = new StoryDirector(scene, {
  title: 'A* · 寻路',
  total: 100,
  legend: [
    { label: 'open', color: '#fbbf24' },
    { label: 'closed', color: '#475569' },
    { label: '当前', color: '#22d3ee' },
    { label: '障碍', color: '#ef4444' },
    { label: '路径', color: '#4ade80' },
  ],
  onReplay: () => restart(true),
});

const key = (r, c) => r + ',' + c;
const inGrid = (r, c) => r >= 0 && r < N && c >= 0 && c < N;
const hCost = (r, c) => Math.abs(r - GOAL[0]) + Math.abs(c - GOAL[1]);

function hasPath(obstacles) {
  const seen = new Set([key(...START)]);
  const q = [START];
  for (let i = 0; i < q.length; i++) {
    const [r, c] = q[i];
    if (r === GOAL[0] && c === GOAL[1]) return true;
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nr = r + dr, nc = c + dc, k = key(nr, nc);
      if (!inGrid(nr, nc) || seen.has(k) || obstacles.has(k)) continue;
      seen.add(k);
      q.push([nr, nc]);
    }
  }
  return false;
}

function generateObstacles() {
  const obs = new Set();
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if ((r === START[0] && c === START[1]) || (r === GOAL[0] && c === GOAL[1])) continue;
      if (Math.random() < 0.22) obs.add(key(r, c));
    }
  }
  let guard = 0;
  while (!hasPath(obs) && guard++ < 300) {
    const arr = [...obs];
    if (!arr.length) break;
    obs.delete(arr[Math.floor(Math.random() * arr.length)]);
  }
  return obs;
}

let obstacles = generateObstacles();
let cellGeo = null;
let platform = null;
let labels = [];
let pathLine = null;
let cells = []; // [r][c] -> { mesh, mat }

function clearGrid() {
  activeMesh = null;
  for (const row of cells) {
    for (const cell of row) {
      if (!cell) continue;
      scene.remove(cell.mesh);
      cell.mat.dispose();
    }
  }
  cells = [];
  if (cellGeo) { cellGeo.dispose(); cellGeo = null; }
  if (platform) {
    scene.remove(platform);
    platform.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    platform = null;
  }
  labels.forEach((l) => { if (l.sprite && l.sprite.material) l.sprite.material.dispose(); l.remove(); });
  labels = [];
  if (pathLine) {
    scene.remove(pathLine);
    pathLine.geometry.dispose();
    pathLine.material.dispose();
    pathLine = null;
  }
}

function buildGrid() {
  clearGrid();
  platform = new THREE.Mesh(
    new THREE.BoxGeometry(N * STEP + 26, 8, N * STEP + 26),
    new THREE.MeshStandardMaterial({ color: 0x0a0f2e, roughness: 0.8, metalness: 0.1 }),
  );
  platform.position.set(CENTER.x, CENTER.y - 10, CENTER.z);
  scene.add(platform);
  cellGeo = new THREE.BoxGeometry(CELL, 6, CELL);
  cells = Array.from({ length: N }, () => Array(N).fill(null));
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const isStart = r === START[0] && c === START[1];
      const isGoal = r === GOAL[0] && c === GOAL[1];
      const isObs = obstacles.has(key(r, c));
      const color = isStart ? C.start : isGoal ? C.goal : isObs ? C.obstacle : C.idle;
      const em = isStart ? C.start : isGoal ? C.goal : isObs ? C.obstacleEm : C.idleEm;
      const mat = glowMaterial(color, { emissive: em, emissiveIntensity: isObs ? 0.5 : 0.22, roughness: 0.5, metalness: 0.1 });
      const mesh = new THREE.Mesh(cellGeo, mat);
      mesh.position.set(CENTER.x - HALF + c * STEP, CENTER.y + (isObs ? 12 : 0), CENTER.z - HALF + r * STEP);
      if (isObs) mesh.scale.y = 4;
      mesh.userData.cell = [r, c];
      scene.add(mesh);
      cells[r][c] = { mesh, mat };
    }
  }
  const sLabel = new VText(scene, { text: 'S', x: CENTER.x - HALF + START[1] * STEP, y: CENTER.y + 42, z: CENTER.z - HALF + START[0] * STEP, color: '#86efac', scale: 0.9 });
  const gLabel = new VText(scene, { text: 'G', x: CENTER.x - HALF + GOAL[1] * STEP, y: CENTER.y + 42, z: CENTER.z - HALF + GOAL[0] * STEP, color: '#fde047', scale: 0.9 });
  labels.push(sLabel, gLabel);
  director.stateUpdate(initialBlocks());
}

function paint(r, c, color, em = color) {
  const cell = cells[r] && cells[r][c];
  if (!cell) return;
  cell.mat.color.setHex(color);
  cell.mat.emissive.setHex(em);
}

function initialBlocks() {
  return {
    blocks: [
      { type: 'chips', label: 'open（按 f 排序）', items: [], empty: '空' },
      { type: 'kv', label: '当前格', items: [{ k: '坐标', v: '—' }, { k: 'g/h/f', v: '—' }] },
      { type: 'text', label: '步数', value: '0' },
    ],
    footer: '障碍 <b>' + obstacles.size + '</b> 个 · 目标 ' + GOAL.join(',') + '',
  };
}

function blocks(state) {
  const best = new Map();
  for (const e of state.open) {
    const k = key(e.r, e.c);
    if (state.closed.has(k)) continue;
    if (!best.has(k) || e.f < best.get(k).f) best.set(k, e);
  }
  const openAll = [...best.values()].sort((a, b) => a.f - b.f || a.h - b.h);
  const openItems = openAll.slice(0, 8).map((e) => ({
    text: e.r + ',' + e.c + ':f' + e.f,
    cls: key(e.r, e.c) === (state.current ? key(...state.current) : null) ? 'head' : 'open',
  }));
  const curCell = state.current;
  return {
    blocks: [
      { type: 'chips', label: 'open（前 8 个，按 f）', items: openItems, empty: '空' },
      { type: 'kv', label: '当前格', items: curCell ? [
        { k: '坐标', v: curCell.join(',') },
        { k: 'g/h/f', v: state.g[curCell[0]][curCell[1]] + '/' + state.h[curCell[0]][curCell[1]] + '/' + state.f[curCell[0]][curCell[1]] },
      ] : [{ k: '坐标', v: '—' }, { k: 'g/h/f', v: '—' }] },
      { type: 'text', label: '步数', value: state.steps + ' · closed ' + state.closed.size },
    ],
    footer: `open <b>${openAll.length}</b> · closed <b>${state.closed.size}</b> · 障碍 <b>${obstacles.size}</b>`,
  };
}

const SHOT_ESTABLISH = { pos: [480, 500, 720], target: [320, 300, 0], ms: 900 };
const SHOT_MEDIUM = { pos: [440, 460, 620], target: [320, 300, 0], ms: 650 };
const SHOT_FINAL = { pos: [400, 460, 560], target: [320, 300, 0], ms: 900 };

function* runAStar() {
  director.reset();
  director.stateUpdate(initialBlocks());
  const g = Array.from({ length: N }, () => Array(N).fill(Infinity));
  const h = Array.from({ length: N }, (_, r) => Array.from({ length: N }, (_, c) => hCost(r, c)));
  const f = Array.from({ length: N }, () => Array(N).fill(Infinity));
  const parent = new Map();
  const closed = new Set();
  const open = [];
  g[START[0]][START[1]] = 0;
  f[START[0]][START[1]] = h[START[0]][START[1]];
  open.push({ r: START[0], c: START[1], f: f[START[0]][START[1]], h: h[START[0]][START[1]] });
  const state = { g, h, f, closed, open, current: START, steps: 0 };

  director.chapter('建立');
  yield S(() => director.beat({
    title: 'A* 网格就位',
    why: 'f = g + h：g 是已走代价，h 是到终点的曼哈顿估计。点击格子可加/删墙。',
    stateText: '10×10 · 障碍 ' + obstacles.size + ' 个 · 目标 ' + GOAL.join(','),
    progress: 0,
    camera: SHOT_ESTABLISH,
    annotations: [
      { id: 'start', text: '起点 S', anchor: () => cellAnchor(START), offset: [0, -18], className: 'final' },
      { id: 'goal', text: '终点 G', anchor: () => cellAnchor(GOAL), offset: [0, -18], className: 'gold' },
    ],
  }));
  yield W(700);
  paint(START[0], START[1], C.open, C.open);
  director.stateUpdate(blocks(state));

  while (open.length) {
    open.sort((a, b) => a.f - b.f || a.h - b.h);
    const cur = open.shift();
    const ck = key(cur.r, cur.c);
    if (closed.has(ck)) continue;
    closed.add(ck);
    state.current = [cur.r, cur.c];
    state.steps++;
    paint(cur.r, cur.c, C.current, C.current);
    stageActive(cur.r, cur.c);
    director.chapter('扩展 f 最小');
    yield S(() => director.beat({
      title: '扩展 (' + cur.r + ',' + cur.c + ')',
      why: '取 open 中 f 最小的格子；启发式 h 指向终点，优先试更有希望的格子。',
      stateText: 'g/h/f=' + g[cur.r][cur.c] + '/' + h[cur.r][cur.c] + '/' + f[cur.r][cur.c] + ' · closed ' + closed.size,
      progress: closed.size,
      camera: SHOT_MEDIUM,
      annotations: [{ id: 'cur', text: '(' + cur.r + ',' + cur.c + ') f=' + f[cur.r][cur.c], anchor: () => cellAnchor([cur.r, cur.c]), offset: [0, -18] }],
    }));
    director.stateUpdate(blocks(state));
    yield W(300);

    if (cur.r === GOAL[0] && cur.c === GOAL[1]) {
      paint(cur.r, cur.c, C.path, C.path);
      break;
    }

    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nr = cur.r + dr, nc = cur.c + dc;
      if (!inGrid(nr, nc) || obstacles.has(key(nr, nc)) || closed.has(key(nr, nc))) continue;
      const ng = g[cur.r][cur.c] + 1;
      if (ng >= g[nr][nc]) continue;
      g[nr][nc] = ng;
      f[nr][nc] = ng + h[nr][nc];
      parent.set(key(nr, nc), [cur.r, cur.c]);
      open.push({ r: nr, c: nc, f: f[nr][nc], h: h[nr][nc] });
      paint(nr, nc, C.open, C.open);
      ripple(scene, cellAnchor([nr, nc]).x, cellAnchor([nr, nc]).y, cellAnchor([nr, nc]).z, C.open, 34);
    }
    paint(cur.r, cur.c, C.closed, C.closed);
    director.setBeatState('open ' + open.length + ' · closed ' + closed.size + ' · 已扩展 ' + state.steps + ' 步');
    director.stateUpdate(blocks(state));
    yield W(150);
  }

  const path = [];
  let p = GOAL;
  let guard = 0;
  while (p && guard++ < N * N) {
    path.push(p);
    const k = key(p[0], p[1]);
    if (k === key(...START)) break;
    p = parent.get(k);
  }
  path.reverse();
  path.forEach(([r, c]) => paint(r, c, C.path, C.path));
  const points = path.map(([r, c]) => new THREE.Vector3(CENTER.x - HALF + c * STEP, CENTER.y + 8, CENTER.z - HALF + r * STEP));
  if (points.length > 1) {
    const curve = new THREE.CatmullRomCurve3(points);
    const geo = new THREE.TubeGeometry(curve, Math.max(8, path.length * 3), 3.2, 8, false);
    pathLine = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: C.line, transparent: true, opacity: 0.95, depthWrite: false }));
    scene.add(pathLine);
  }
  stageActive(null);
  const pathText = path.map((p) => '(' + p[0] + ',' + p[1] + ')').join(' → ');
  director.chapter('路径回溯');
  yield S(() => director.beat({
    title: '找到终点',
    why: '从终点沿 parent 回走；每一步 g 都减少 1，路径即最短步数。',
    stateText: '路径长度 ' + (path.length - 1) + ' 步 · 扩展 ' + state.steps + ' 格',
    progress: 100,
    camera: SHOT_FINAL,
    annotations: [
      { id: 'path', text: '路径长度 ' + (path.length - 1) + ' 步', anchor: () => new THREE.Vector3(320, 480, 0), offset: [0, -22], className: 'final' },
      { id: 'steps', text: '扩展 ' + state.steps + ' 格 · closed ' + closed.size, anchor: () => new THREE.Vector3(320, 430, 0), offset: [0, -22], className: 'gold' },
    ],
  }));
  director.stateUpdate(blocks(state));
  status.textContent = 'A*: 路径 ' + pathText + ' · ' + (path.length - 1) + ' 步 · 扩展 ' + state.steps + ' 格';
  yield W(950);
  director.chapter('复盘');
  yield S(() => director.beat({
    title: 'A* = Dijkstra + 启发式',
    why: 'h 可采纳（不高估）时仍最优；曼哈顿 h 在四向网格上可采纳。',
    stateText: '扩展 ' + state.steps + ' 格 · 路径 ' + (path.length - 1) + ' 步',
    progress: 100,
    camera: SHOT_FINAL,
    annotations: [],
  }));
  yield W(700);
}

function cellAnchor([r, c]) {
  return new THREE.Vector3(CENTER.x - HALF + c * STEP, CENTER.y + 26, CENTER.z - HALF + r * STEP);
}

let activeMesh = null;
function stageActive(r, c) {
  if (activeMesh) { activeMesh.material.emissiveIntensity = 0.22; activeMesh = null; }
  if (r === null || r === undefined) return;
  const cell = cells[r] && cells[r][c];
  if (!cell) return;
  activeMesh = cell.mesh;
  cell.mat.emissiveIntensity = 0.9;
}

function restart(autoPlay = true) {
  engine.clear();
  director.reset();
  buildGrid();
  engine.queue(() => runAStar());
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
  const hits = raycaster.intersectObjects(cells.flat().map((c) => c.mesh), false);
  if (!hits.length) return;
  const [cr, cc] = hits[0].object.userData.cell;
  if ((cr === START[0] && cc === START[1]) || (cr === GOAL[0] && cc === GOAL[1])) return;
  const k = key(cr, cc);
  const was = obstacles.has(k);
  if (was) obstacles.delete(k);
  else obstacles.add(k);
  if (!hasPath(obstacles)) {
    if (was) obstacles.add(k); else obstacles.delete(k);
    status.textContent = '这里会封死起点到终点的通路，已撤销';
    return;
  }
  restart(true);
});

input.addButton('随机障碍', () => { obstacles = generateObstacles(); restart(true); });
input.addButton('重播', () => restart(true));
input.addButton('清空', () => { obstacles = new Set(); restart(true); });
buildGrid();
engine.queue(() => runAStar());
scene.start(engine);
