// 3D/effects/Fx.js
// 类别化特效引擎：独立 rAF 驱动，与算法动画队列互不打断。
// 组件层在命令播放首帧调用 fx('ripple'|'beam'|'flow'|'spark'|'pop'|'land', ...)，
// 是否生效由当前页面的 FX 类别决定（Glow.applyTheme -> setFxCategory）。
// 所有特效均为 MeshBasicMaterial 短生命周期对象，自动回收。
import * as THREE from 'three';

let FX_CAT = 'generic';
export function setFxCategory(cat) { FX_CAT = cat || 'generic'; }

// 每类算法独有 signature 特效，其余共享轻量反馈（ripple/pop）
const CAT = {
  sort:    { beam: 1, pop: 1 },
  search:  { ripple: 1, spark: 1 },
  tree:    { ripple: 1, land: 1 },
  graph:   { ripple: 1, flow: 1 },
  dp:      { ripple: 1, pop: 1 },
  hash:    { ripple: 1, pop: 1 },
  heap:    { ripple: 1, pop: 1 },
  string:  { ripple: 1, pop: 1, spark: 1 },
  link:    { ripple: 1, pop: 1 },
  geom:    { ripple: 1, spark: 1 },
  math:    { ripple: 1 },
  generic: { ripple: 1 },
};

const on = (name) => !!CAT[FX_CAT][name];

// ---- 特效池（独立 rAF 循环） ----
let items = [];
let running = false;
let last = 0;

function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  for (let i = items.length - 1; i >= 0; i--) {
    if (items[i].update(dt)) { items[i].remove(); items.splice(i, 1); }
  }
  window.__fxCount = items.length;   // 验证钩子：当前活动特效数
  if (items.length) requestAnimationFrame(loop);
  else running = false;
}

function add(fxObj) {
  items.push(fxObj);
  if (!running) { running = true; last = performance.now(); requestAnimationFrame(loop); }
}

function makeMesh(scene, geo, color, opacity = 0.9) {
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
  const mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);
  return mesh;
}

function anim(duration, onUpdate, onDone) {
  let t = 0;
  return {
    update(dt) {
      t += dt;
      const p = Math.min(t / duration, 1);
      onUpdate(p);
      if (p >= 1) { if (onDone) onDone(); return true; }
      return false;
    },
    remove() {},   // 清理已由 onDone 完成
  };
}

// ---- 波纹：水平扩散环（访问/命中反馈） ----
export function ripple(scene, x, y, z, color, size = 46) {
  if (!on('ripple')) return;
  const mesh = makeMesh(scene, new THREE.RingGeometry(0.22, 0.44, 28), color, 0.85);
  mesh.position.set(x, y, z);
  mesh.rotation.x = -Math.PI / 2;
  add(anim(0.65, (p) => {
    mesh.scale.setScalar(size * (0.25 + p * 0.75));
    mesh.material.opacity = 0.85 * (1 - p);
  }, () => { scene.remove(mesh); mesh.geometry.dispose(); mesh.material.dispose(); }));
}

// ---- 光束：两点间生长的光柱（排序比较/字符串比对） ----
export function beam(scene, a, b, color, radius = 1.7) {
  if (!on('beam')) return;
  const dir = b.clone().sub(a);
  const len = dir.length();
  if (len < 1e-4) return;
  const mesh = makeMesh(scene, new THREE.CylinderGeometry(radius, radius, 1, 6), color, 0.95);
  mesh.position.copy(a.clone().add(b).multiplyScalar(0.5));
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  add(anim(0.5, (p) => {
    mesh.scale.set(1, Math.max(len * Math.min(p * 1.6, 1), 0.01), 1);
    mesh.material.opacity = 0.95 * (1 - Math.max(0, (p - 0.55) / 0.45));
  }, () => { scene.remove(mesh); mesh.geometry.dispose(); mesh.material.dispose(); }));
}

// ---- 粒子流：小球沿边流动（图算法松弛/遍历） ----
export function flow(scene, a, b, color) {
  if (!on('flow')) return;
  const mesh = makeMesh(scene, new THREE.SphereGeometry(3.2, 8, 8), color, 0.95);
  mesh.position.copy(a);
  add(anim(0.55, (p) => {
    mesh.position.lerpVectors(a, b, p);
    mesh.material.opacity = 0.95 * (1 - p * 0.7);
  }, () => { scene.remove(mesh); mesh.geometry.dispose(); mesh.material.dispose(); }));
}

// ---- 爆散：小粒子向四周飞散淡出（命中/完成反馈） ----
export function spark(scene, x, y, z, color, n = 6) {
  if (!on('spark')) return;
  const meshes = [];
  const dirs = [];
  for (let i = 0; i < n; i++) {
    const d = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.7 + 0.15, Math.random() - 0.5).normalize();
    dirs.push(d);
    const m = makeMesh(scene, new THREE.SphereGeometry(2.2, 6, 6), color, 1);
    m.position.set(x, y, z);
    meshes.push(m);
  }
  add(anim(0.55, (p) => {
    const e = p * p;
    for (let i = 0; i < n; i++) {
      meshes[i].position.set(x + dirs[i].x * e * 46, y + dirs[i].y * e * 46, z + dirs[i].z * e * 46);
      meshes[i].material.opacity = 1 - p;
    }
  }, () => {
    for (const m of meshes) { scene.remove(m); m.geometry.dispose(); m.material.dispose(); }
  }));
}

// ---- 弹出：数值更新时盒子脉冲（不修改组件自身动画） ----
export function pop(scene, mesh, strength = 0.32) {
  if (!on('pop')) return;
  const base = mesh.scale.clone();
  add(anim(0.38, (p) => {
    const s = 1 + strength * Math.sin(p * Math.PI);
    mesh.scale.set(base.x * s, base.y * s, base.z * s);
  }, () => { mesh.scale.copy(base); }));
}

// ---- 落地弹性：树节点插入时压扁回弹 ----
export function land(scene, mesh) {
  if (!on('land')) return;
  const base = mesh.scale.clone();
  add(anim(0.42, (p) => {
    const s = Math.sin(p * Math.PI);
    mesh.scale.set(base.x * (1 + 0.22 * s), base.y * (1 - 0.45 * s), base.z * (1 + 0.22 * s));
  }, () => { mesh.scale.copy(base); }));
}
