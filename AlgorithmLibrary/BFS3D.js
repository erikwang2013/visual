// AlgorithmLibrary/BFS3D.js — BFS：图城 + 分层波前 + 队列状态 + 镜头导演。
// 节点按 BFS 层同心排布；队列/visited/dist 进右侧实时面板；镜头在建立/出队/分层/结果之间切换。
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { GeneratorEngine, W, S } from '../3D/GeneratorEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { VNode, VText, VTorus } from '../3D/VisualObject3D.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
import { ripple, flow } from '../3D/effects/Fx.js';
import { StoryDirector } from '../3D/director/StoryDirector.js';
import { InputKit } from '../3D/director/InputKit.js';
applyTheme('BFS3D');

const scene = new Scene3D('scene', { cameraPos: [560, 500, 850], lookAt: [320, 300, 0], fov: 50 });
const engine = new GeneratorEngine({ speed: 1 });
const panel = new ControlPanel({ engine });
const input = new InputKit(panel);
const status = panel.addStatus('就绪');

const N = 8;
const STAGE = new THREE.Vector3(320, 300, 0);
const EDGES = [[0, 1], [0, 6], [0, 7], [1, 2], [1, 5], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7]];
const COLOR = {
  await: 0x64748b, frontier: 0xfbbf24, current: 0x22d3ee,
  visited: 0x4ade80, tree: 0xfde047, edge: 0x64748b, ring: 0x3b82f6,
};

const adj = Array.from({ length: N }, () => []);
EDGES.forEach(([a, b]) => { adj[a].push(b); adj[b].push(a); });
const nodeView = new Map();
const nodeLabels = new Map();
const edgeView = new Map();
const layerRings = new Map();
let activeRing = null;
let beacon = null;
let platform = null;
let currentSource = 0;

const director = new StoryDirector(scene, {
  title: 'BFS · 图城',
  total: N,
  onReplay: () => restart(currentSource, true),
});

const sourceSelect = input.addSelect('源点', Array.from({ length: N }, (_, i) => i), 0, (v) => restart(Number(v), true));

function edgeKey(a, b) { return a < b ? a + '-' + b : b + '-' + a; }
function fmtQueue(q) { return '[' + q.join(', ') + ']'; }

function bfsFrom(source) {
  const dist = Array(N).fill(Infinity);
  const parent = Array(N).fill(-1);
  const order = [];
  const queue = [source];
  const byLevel = new Map();
  dist[source] = 0;
  for (let head = 0; head < queue.length; head++) {
    const u = queue[head];
    order.push(u);
    if (!byLevel.has(dist[u])) byLevel.set(dist[u], []);
    byLevel.get(dist[u]).push(u);
    for (const v of adj[u]) {
      if (dist[v] !== Infinity) continue;
      dist[v] = dist[u] + 1;
      parent[v] = u;
      queue.push(v);
    }
  }
  return { dist, parent, order, byLevel };
}

function layoutFor(source, scale = 1) {
  const info = bfsFrom(source);
  const positions = new Map();
  const levels = [...info.byLevel.keys()].sort((a, b) => a - b);
  const maxLevel = Math.max(0, ...levels.filter(Number.isFinite));
  const step = maxLevel > 1 ? Math.min(180, 360 / (maxLevel - 1)) : 180;
  for (const level of levels) {
    const ids = info.byLevel.get(level);
    if (level === 0) {
      positions.set(ids[0], STAGE.clone().add(new THREE.Vector3(0, 20, 0)));
      continue;
    }
    const r = (200 + (level - 1) * step) * scale;
    const offset = level % 2 ? Math.PI / Math.max(ids.length, 1) : 0;
    ids.forEach((id, i) => {
      const a = -Math.PI / 2 + offset + (i * Math.PI * 2) / ids.length;
      positions.set(id, new THREE.Vector3(
        STAGE.x + Math.cos(a) * r,
        STAGE.y + (level % 2 ? 12 : -12),
        STAGE.z + Math.sin(a) * r,
      ));
    });
  }
  return { ...info, positions, maxLevel, step };
}

function makeTube(a, b, color, opacity) {
  const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([a, b]), 8, 2.4, 6);
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
  const mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);
  return mesh;
}

function disposeMesh(mesh) {
  if (!mesh) return;
  scene.remove(mesh);
  mesh.traverse((o) => {
    if (o.geometry && !o.isSprite) o.geometry.dispose();
    if (o.material) o.material.dispose();
  });
}

function clearView() {
  nodeView.forEach((v) => { disposeMesh(v.mesh); v.remove(); });
  nodeView.clear();
  nodeLabels.forEach((l) => { disposeMesh(l.sprite); l.remove(); });
  nodeLabels.clear();
  edgeView.forEach((e) => disposeMesh(e.mesh));
  edgeView.clear();
  layerRings.forEach((r) => disposeMesh(r));
  layerRings.clear();
  if (activeRing) { disposeMesh(activeRing.mesh); activeRing.remove(); activeRing = null; }
  if (beacon) { disposeMesh(beacon); beacon = null; }
  if (platform) { disposeMesh(platform); platform = null; }
  director.annotations.clear();
  director.state.clear();
}

function buildGraph(source) {
  clearView();
  const isMobile = typeof matchMedia !== 'undefined' && matchMedia('(max-width: 900px)').matches;
  const scale = isMobile ? 0.7 : 1;
  const info = layoutFor(source, scale);

  platform = new THREE.Group();
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(620 * scale, 64),
    new THREE.MeshBasicMaterial({ color: 0x0a0f2e, transparent: true, opacity: 0.58, side: THREE.DoubleSide, depthWrite: false }),
  );
  disc.rotation.x = -Math.PI / 2;
  disc.position.set(STAGE.x, STAGE.y - 44, STAGE.z);
  const rim = new THREE.Mesh(
    new THREE.RingGeometry(610 * scale, 620 * scale, 64),
    new THREE.MeshBasicMaterial({ color: COLOR.ring, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false }),
  );
  rim.rotation.x = -Math.PI / 2;
  rim.position.set(STAGE.x, STAGE.y - 43, STAGE.z);
  platform.add(disc, rim);
  scene.add(platform);

  for (let level = 1; level <= info.maxLevel; level++) {
    const r = (200 + (level - 1) * info.step) * scale;
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(r, 1.1, 6, 120),
      new THREE.MeshBasicMaterial({ color: COLOR.ring, transparent: true, opacity: 0.1, depthWrite: false }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(STAGE.x, STAGE.y - 32, STAGE.z);
    scene.add(ring);
    layerRings.set(level, ring);
  }

  for (let i = 0; i < N; i++) {
    const p = info.positions.get(i);
    if (!p) continue;
    const node = new VNode(scene, { radius: Math.max(20, 28 * scale), x: p.x, y: p.y, z: p.z, label: String(i), labelScale: isMobile ? 0.7 : 0.75, color: COLOR.await, emissive: 0x1e293b });
    node.mesh.userData.nodeId = i;
    nodeView.set(i, node);
    const label = new VText(scene, { text: '', x: p.x, y: p.y - 44 * scale, z: p.z, color: PALETTE.textDim, scale: isMobile ? 0.5 : 0.55 });
    nodeLabels.set(i, label);
  }

  for (const [a, b] of EDGES) {
    const pa = info.positions.get(a);
    const pb = info.positions.get(b);
    if (!pa || !pb) continue;
    edgeView.set(edgeKey(a, b), { mesh: makeTube(pa, pb, COLOR.edge, 0.28) });
  }

  const sourcePos = info.positions.get(source);
  if (sourcePos) {
    beacon = new THREE.Group();
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(1.8 * scale, 1.8 * scale, 170 * scale, 8),
      new THREE.MeshBasicMaterial({ color: COLOR.current, transparent: true, opacity: 0.26, depthWrite: false }),
    );
    beam.position.y = 85 * scale;
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(38 * scale, 2.2, 8, 40),
      new THREE.MeshBasicMaterial({ color: COLOR.current, transparent: true, opacity: 0.8 }),
    );
    ring.rotation.x = Math.PI / 2;
    beacon.add(beam, ring);
    beacon.position.copy(sourcePos);
    scene.add(beacon);
  }

  activeRing = new VTorus(scene, { radius: 42 * scale, color: COLOR.current });
  activeRing.mesh.rotation.x = Math.PI / 2;
  activeRing.mesh.visible = false;

  director.stateUpdate({ queue: [], visited: [], dist: Array(N).fill(Infinity), layer: 0, current: null });
  director.setProgress(0);
  status.textContent = '';
}

function setNodeColor(id, color) {
  const node = nodeView.get(id);
  if (node) node.setColor(color, color);
}

function setEdgeColor(a, b, color, opacity) {
  const e = edgeView.get(edgeKey(a, b));
  if (!e) return;
  e.mesh.material.color.setHex(color);
  e.mesh.material.opacity = opacity;
}

function highlightLayer(level) {
  layerRings.forEach((ring, l) => {
    ring.material.color.setHex(l === level ? COLOR.current : COLOR.ring);
    ring.material.opacity = l === level ? 0.32 : 0.05;
  });
}

function focusShot(pos) {
  return {
    pos: [pos.x + 380, pos.y + 400, pos.z + 700],
    target: [pos.x, pos.y, pos.z],
    ms: 760,
  };
}

const SHOT_ESTABLISH = { pos: [560, 500, 850], target: [320, 300, 0], ms: 900 };
const SHOT_SOURCE = { pos: [540, 500, 820], target: [320, 300, 0], ms: 700 };
const SHOT_LAYER = { pos: [600, 560, 920], target: [320, 300, 0], ms: 800 };
const SHOT_FINAL = { pos: [320, 620, 860], target: [320, 300, 0], ms: 900 };

function* runBFS(source) {
  director.reset();
  const visited = new Set([source]);
  const queue = [source];
  const dist = Array(N).fill(Infinity);
  const parents = Array(N).fill(-1);
  const order = [];
  dist[source] = 0;
  let head = 0;
  let level = 0;

  director.chapter('建立');
  yield S(() => director.beat({
    title: '图城就位',
    why: '节点 = 岛，边 = 桥；颜色代表状态，右侧面板是实时队列与 dist。',
    stateText: '8 节点 · 10 条边 · 未访问',
    progress: 0,
    camera: SHOT_ESTABLISH,
    annotations: [{ id: 'title', text: 'BFS：先访问距离最近的节点', anchor: () => new THREE.Vector3(STAGE.x, STAGE.y + 150, STAGE.z), offset: [0, -22] }],
  }));
  yield W(650);

  setNodeColor(source, COLOR.frontier);
  nodeView.get(source).pulse(0.25);
  nodeLabels.get(source).setText('d=0');
  const sourcePos = nodeView.get(source).mesh.position;
  beacon.position.copy(sourcePos);
  director.chapter('第 0 层 · 源点');
  yield S(() => director.beat({
    title: '源点入队',
    why: 'BFS 从源点开始；dist[S] = 0，队列 FIFO 保证按距离非降处理。',
    stateText: '队列 ' + fmtQueue(queue) + ' · dist[' + source + '] = 0',
    progress: 1,
    camera: SHOT_SOURCE,
    annotations: [
      { id: 'source', text: '源点 ' + source + ' · dist 0', anchor: () => nodeView.get(source).mesh.position.clone().add(new THREE.Vector3(0, 48, 0)), offset: [0, -18], className: 'gold' },
      { id: 'layer0', text: '第 0 层：只有源点', anchor: () => new THREE.Vector3(STAGE.x, STAGE.y + 100, STAGE.z), offset: [0, -20] },
    ],
  }));
  yield S(() => director.stateUpdate({ queue: [...queue], visited: [...visited], dist, layer: 0, current: source }));
  yield W(750);

  while (head < queue.length) {
    const cur = queue[head++];
    const curLevel = dist[cur];
    if (curLevel > level) {
      level = curLevel;
      highlightLayer(level);
      director.chapter('第 ' + level + ' 层');
      yield S(() => director.beat({
        title: '进入第 ' + level + ' 层',
        why: '上一层全部出队后才进入下一层；这就是“波前”逐层推进。',
        stateText: '当前层 ' + level + ' · 已访问 ' + visited.size + '/' + N,
        progress: visited.size,
        camera: SHOT_LAYER,
        annotations: [{ id: 'layer', text: '第 ' + level + ' 层波前', anchor: () => new THREE.Vector3(STAGE.x, STAGE.y + 105, STAGE.z), offset: [0, -24] }],
      }));
      yield W(560);
    }

    const curPos = nodeView.get(cur).mesh.position;
    setNodeColor(cur, COLOR.current);
    nodeView.get(cur).pulse(0.28);
    activeRing.mesh.visible = true;
    activeRing.mesh.position.copy(curPos);
    order.push(cur);
    director.chapter('第 ' + curLevel + ' 层');
    yield S(() => director.beat({
      title: '出队 ' + cur,
      why: '队首出队；扫描它的邻接点，未访问的邻居将在这一拍入队。',
      stateText: '队列 ' + fmtQueue(queue.slice(head)) + ' · dist[' + cur + '] = ' + dist[cur],
      progress: visited.size,
      camera: focusShot(curPos),
      annotations: [
        { id: 'current', text: '出队 ' + cur + ' · dist ' + dist[cur], anchor: () => nodeView.get(cur).mesh.position.clone().add(new THREE.Vector3(0, 48, 0)), offset: [0, -18] },
      ],
    }));
    yield S(() => director.stateUpdate({ queue: queue.slice(head), visited: [...visited], dist, layer: curLevel, current: cur, order: [...order] }));
    yield W(480);

    for (const nb of adj[cur]) {
      if (visited.has(nb)) continue;
      visited.add(nb);
      parents[nb] = cur;
      dist[nb] = dist[cur] + 1;
      queue.push(nb);
      setNodeColor(nb, COLOR.frontier);
      nodeView.get(nb).pulse(0.18);
      nodeLabels.get(nb).setText('d=' + dist[nb]);
      setEdgeColor(cur, nb, COLOR.frontier, 0.9);
      flow(scene, curPos.clone().add(new THREE.Vector3(0, 18, 0)), nodeView.get(nb).mesh.position.clone().add(new THREE.Vector3(0, 18, 0)), COLOR.frontier);
      ripple(scene, nodeView.get(nb).mesh.position.x, nodeView.get(nb).mesh.position.y, nodeView.get(nb).mesh.position.z, COLOR.frontier, 48);
      yield S(() => {
        director.stateUpdate({ queue: queue.slice(head), visited: [...visited], dist, layer: curLevel, current: cur, order: [...order] });
        director.setBeatState('队列 ' + fmtQueue(queue.slice(head)) + ' · 已发现 ' + visited.size + '/' + N);
        director.setProgress(visited.size);
      });
      yield W(240);
    }

    setNodeColor(cur, COLOR.visited);
    nodeLabels.get(cur).setText('d=' + dist[cur]);
    yield W(220);
  }

  const tree = [];
  for (let i = 0; i < N; i++) if (i !== source && parents[i] >= 0) tree.push([parents[i], i]);
  tree.forEach(([u, v]) => setEdgeColor(u, v, COLOR.tree, 0.95));
  activeRing.mesh.visible = false;
  highlightLayer(0);
  director.chapter('最短路径树');
  yield S(() => director.beat({
    title: '最短路径树',
    why: '第一次到达某个节点时，dist 已经是最短；父边连起来就是 BFS 树。',
    stateText: '已访问 ' + visited.size + '/' + N + ' · 树边 ' + tree.length + ' 条',
    progress: N,
    camera: SHOT_FINAL,
    annotations: [
      { id: 'tree', text: '首次到达 = 最短路径', anchor: () => new THREE.Vector3(STAGE.x, STAGE.y + 170, STAGE.z), offset: [0, -22], className: 'final' },
      { id: 'order', text: 'BFS 顺序：' + order.join(' → '), anchor: () => new THREE.Vector3(STAGE.x, STAGE.y + 125, STAGE.z), offset: [0, -22], className: 'gold' },
    ],
  }));
  yield S(() => director.stateUpdate({ queue: [], visited: [...visited], dist, layer: level, current: null, order: [...order], tree }));
  yield S(() => { status.textContent = 'BFS 顺序: ' + order.join(' → ') + ' · 树边 ' + tree.length + ' 条'; });
  yield W(950);

  director.chapter('复盘');
  yield S(() => director.beat({
    title: '队列是 BFS 的灵魂',
    why: 'FIFO 保证距离非降；每个节点只入队一次，因此总复杂度 O(V+E)。',
    stateText: 'O(V+E) · 每个节点恰好访问一次',
    progress: N,
    camera: SHOT_FINAL,
    annotations: [],
  }));
  yield W(700);
}

function restart(source, autoPlay = true) {
  currentSource = source;
  engine.clear();
  director.reset();
  buildGraph(source);
  engine.queue(() => runBFS(source));
  sourceSelect.value = String(source);
  if (autoPlay) engine.toggle();
}

// 点击节点直接设为源点；拖动超过 6px 视为 OrbitControls 操作。
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let pointerDown = null;
const canvas = scene.renderer.domElement;
canvas.addEventListener('pointerdown', (e) => { pointerDown = { x: e.clientX, y: e.clientY }; });
canvas.addEventListener('pointerup', (e) => {
  if (!pointerDown) return;
  const moved = Math.hypot(e.clientX - pointerDown.x, e.clientY - pointerDown.y);
  pointerDown = null;
  if (moved > 6) return;
  const r = canvas.getBoundingClientRect();
  pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(pointer, scene.camera);
  const hits = raycaster.intersectObjects([...nodeView.values()].map((v) => v.mesh), false);
  if (hits.length) {
    const id = hits[0].object.userData.nodeId;
    if (id !== undefined && id !== currentSource) restart(id, true);
  }
});

input.addButton('重播', () => restart(currentSource, true));
input.addButton('清空', () => { engine.clear(); director.reset(); buildGraph(currentSource); status.textContent = ''; });

buildGraph(0);
engine.queue(() => runBFS(0));
scene.start(engine);
