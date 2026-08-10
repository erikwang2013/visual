# 3D 基础设施 + 模式验证页面 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 搭建 three.js 3D 基础设施（场景/发光材质/图元/动画引擎/控件），并完成 5 个验证页面（StackArray、BST、BFS、DPFib、RotateScale3D），证明 5 种可视化模式组件可用。

**Architecture:** 共享 `3D/` 模块库（ES module，importmap 解析 `three`）＋ 5 个模式组件（Array3D/Tree3D/Graph3D/Table3D/Geometry3D）＋ 每页独立 HTML/JS 算法脚本。页面脚本计算布局坐标、驱动模式组件、经 AnimationEngine 排队动画。深空科幻视觉：粒子星空＋发光网格地面＋发光球体节点。

**Tech Stack:** three.js r160（本地，无 CDN）、原生 DOM（淘汰 jQuery）、OrbitControls、Playwright（browser MCP）验证。

**Spec:** `docs/superpowers/specs/2026-08-10-threejs-3d-rewrite-design.md`

---

## 重要约定

- 所有 `3D/` 模块内 import 使用相对路径；页面与模式组件 `import * as THREE from 'three'` 由页面 importmap 解析。
- 坐标系统：three.js 场景单位 ≈ 像素。对象在 XY 平面为主，Z 为正前方（相机朝向 +Z 方向），z=0 为默认平面。
- 页面 HTML 统一结构（替代旧 template.html 模式），不再引入 jQuery / 旧 AnimationLibrary。
- 动画引擎命令：`{ duration(ms), fn(progress), undo() }`。`fn` 每帧以进度 0→1 调用；`undo` 在撤销时立即还原状态。

---

### Task 1: three.js 本地化与提交

**Files:**
- Create: `ThirdParty/three/build/three.module.js`（已下载，1.27MB）
- Create: `ThirdParty/three/examples/jsm/controls/OrbitControls.js`（已下载，29KB）

- [ ] **Step 1: 验证文件完整性**

Run: `head -c 100 ThirdParty/three/build/three.module.js && grep -c "OrbitControls" ThirdParty/three/examples/jsm/controls/OrbitControls.js`
Expected: 输出 three.js license 注释（REVISION 行）与 `OrbitControls` 出现 ≥3 次

- [ ] **Step 2: 提交**

```bash
git add ThirdParty/three/build/three.module.js ThirdParty/three/examples/jsm/controls/OrbitControls.js
git commit -m "chore: add three.js r160 and OrbitControls locally"
```

---

### Task 2: 3D/Scene3D.js — 通用场景

**Files:**
- Create: `3D/Scene3D.js`

- [ ] **Step 1: 写实现**

```js
// 3D/Scene3D.js
import * as THREE from 'three';
import { OrbitControls } from '../ThirdParty/three/examples/jsm/controls/OrbitControls.js';

export const BGCSS = { top: '#0a0f2e', bottom: '#030514' };

export class Scene3D {
  constructor(containerId, opts = {}) {
    const container = document.getElementById(containerId);
    this.width = container.clientWidth || window.innerWidth;
    this.height = container.clientHeight || window.innerHeight;

    try {
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch (e) {
      // WebGL 不可用：错误提示 + 降级链接（spec §8）
      container.innerHTML = '<div class="webgl-error">当前浏览器不支持 WebGL，无法显示 3D 动画。<br><a href="Algorithms.html">返回目录</a></div>';
      throw e;
    }
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.width, this.height);
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = this.makeBackgroundTexture(
      new THREE.Color(opts.bgTop || BGCSS.top),
      new THREE.Color(opts.bgBottom || BGCSS.bottom));

    // 相机
    const camPos = opts.cameraPos || [0, 260, 420];
    this.camera = new THREE.PerspectiveCamera(opts.fov || 50, this.width / this.height, 1, 4000);
    this.camera.position.set(...camPos);
    const lookAt = opts.lookAt || [0, 0, 0];
    this.camera.lookAt(...lookAt);

    // 光照
    this.scene.add(new THREE.AmbientLight(0x8899cc, 0.9));
    const dir = new THREE.DirectionalLight(0xffffff, 1.1);
    dir.position.set(200, 400, 300);
    this.scene.add(dir);
    const point = new THREE.PointLight(0x7dd3fc, 0.7, 2000);
    point.position.copy(this.camera.position);
    this.scene.add(point);
    this.followLight = point;

    // 控制器
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 80;
    this.controls.maxDistance = 1800;

    // 雾
    this.scene.fog = new THREE.FogExp2(0x0a0f2e, 0.00045);

    if (opts.stars !== false) this.addStars(opts.starCount || 400);
    if (opts.ground !== false) this.addGround();

    window.addEventListener('resize', () => this.resize());
  }

  makeBackgroundTexture(top, bottom) {
    const c = document.createElement('canvas');
    c.width = 4; c.height = 256;
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, '#' + top.getHexString());
    g.addColorStop(1, '#' + bottom.getHexString());
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 4, 256);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  addStars(count) {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const palette = [0xffffff, 0xbfdbfe, 0x93c5fd, 0xe0f2fe];
    for (let i = 0; i < count; i++) {
      positions[i*3]   = (Math.random() - 0.5) * 1800;
      positions[i*3+1] = (Math.random() - 0.5) * 1200 + 200;
      positions[i*3+2] = -200 - Math.random() * 1400;
      const c = new THREE.Color(palette[Math.floor(Math.random() * palette.length)]);
      colors[i*3] = c.r; colors[i*3+1] = c.g; colors[i*3+2] = c.b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({ size: 1.8, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false });
    const points = new THREE.Points(geo, mat);
    points.name = 'stars';
    this.scene.add(points);
  }

  addGround() {
    const grid = new THREE.GridHelper(1400, 42, 0x3b82f6, 0x1e3a8a);
    grid.position.y = -10;
    grid.material.transparent = true;
    grid.material.opacity = 0.35;
    grid.name = 'ground';
    this.scene.add(grid);
  }

  start(engine) {
    const clock = new THREE.Clock();
    const loop = () => {
      requestAnimationFrame(loop);
      const dt = Math.min(clock.getDelta(), 0.05);
      if (engine) engine.tick(dt);
      this.followLight.position.copy(this.camera.position);
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    };
    loop();
  }

  resize() {
    const container = this.renderer.domElement.parentElement;
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  add(obj) { this.scene.add(obj); }
  remove(obj) { this.scene.remove(obj); }
}
```

- [ ] **Step 2: 语法验证**

Run: `node --check 3D/Scene3D.js`
Expected: 无输出（语法正确）

- [ ] **Step 3: 提交**

```bash
git add 3D/Scene3D.js
git commit -m "feat(3d): add Scene3D base scene with stars, ground, fog, controls"
```

---

### Task 3: 3D/Glow.js — 深空科幻调色板与材质工厂

**Files:**
- Create: `3D/Glow.js`

- [ ] **Step 1: 写实现**

```js
// 3D/Glow.js
import * as THREE from 'three';

export const PALETTE = {
  node:        0x4a90e2, nodeEmissive:  0x143a6e,
  highlight:   0x22d3ee, highlightEmissive: 0x0e7490,
  red:         0xef4444, redEmissive:   0x7f1d1d,
  blue:        0x3b82f6, blueEmissive:  0x1d4ed8,
  green:       0x22c55e, greenEmissive: 0x166534,
  orange:      0xf97316, orangeEmissive: 0x7c2d12,
  yellow:      0xfacc15, yellowEmissive: 0x713f12,
  purple:      0xa855f7, purpleEmissive: 0x581c87,
  edge:        0x7dd3fc, edgeEmissive:  0x1e3a8a,
  ground:      0x3b82f6,
  text:        '#ffffff',
  textDim:     '#9db8d9',
  textGlow:    '#7dd3fc',
};

export function glowMaterial(color, opts = {}) {
  const emissive = opts.emissive !== undefined ? opts.emissive : color;
  const intensity = opts.emissiveIntensity !== undefined ? opts.emissiveIntensity : 0.45;
  return new THREE.MeshStandardMaterial({
    color, emissive, emissiveIntensity: intensity,
    roughness: opts.roughness ?? 0.35,
    metalness: opts.metalness ?? 0.15,
    transparent: opts.transparent ?? false,
    opacity: opts.opacity ?? 1,
  });
}

export function textTexture(text, opts = {}) {
  const size = opts.size || 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size * 0.5;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = `bold ${opts.fontSize || Math.floor(size * 0.34)}px "Noto Sans SC", "Microsoft YaHei", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const color = opts.color || PALETTE.text;
  const glow = opts.glow || PALETTE.textGlow;
  ctx.shadowColor = glow;
  ctx.shadowBlur = 12;
  ctx.fillStyle = color;
  ctx.fillText(String(text), canvas.width / 2, canvas.height / 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function makeTextSprite(text, opts = {}) {
  const tex = textTexture(text, opts);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  const scale = opts.scale || 1;
  sprite.scale.set(100 * scale, 50 * scale, 1);
  return sprite;
}

export function setSpriteText(sprite, text, opts = {}) {
  const tex = textTexture(text, opts);
  sprite.material.map = tex;
  sprite.material.needsUpdate = true;
  const scale = opts.scale || 1;
  sprite.scale.set(100 * scale, 50 * scale, 1);
}
```

- [ ] **Step 2: 语法验证**

Run: `node --check 3D/Glow.js`
Expected: 无输出

- [ ] **Step 3: 提交**

```bash
git add 3D/Glow.js
git commit -m "feat(3d): add glow palette and material/text factories"
```

---

### Task 4: 3D/VisualObject3D.js — 3D 图元

**Files:**
- Create: `3D/VisualObject3D.js`

- [ ] **Step 1: 写实现**

```js
// 3D/VisualObject3D.js
import * as THREE from 'three';
import { glowMaterial, makeTextSprite, setSpriteText, PALETTE } from './Glow.js';

// ---- 通用补间辅助 ----
export function tween(obj, key, from, to, t, easing = easeInOut) {
  obj[key] = from + (to - from) * easing(t);
}
export function easeInOut(t) { return t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t+2, 2)/2; }

// ---- 发光球体节点 ----
export class VNode {
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.radius = opts.radius || 22;
    const mat = glowMaterial(opts.color || PALETTE.node, { emissive: opts.emissive, emissiveIntensity: 0.5 });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(this.radius, 24, 18), mat);
    this.mesh.position.set(opts.x ?? 0, opts.y ?? 0, opts.z ?? 0);
    this.label = null;
    if (opts.label !== undefined && opts.label !== null && opts.label !== '') {
      this.label = makeTextSprite(opts.label, { scale: 1.1 });
      this.label.position.set(0, this.radius + 18, 0);
      this.mesh.add(this.label);
    }
    scene.add(this.mesh);
  }
  setText(text) { if (this.label) setSpriteText(this.label, text, { scale: 1.1 }); }
  setColor(color, emissive) {
    const m = this.mesh.material;
    m.color.setHex(color);
    m.emissive.setHex(emissive ?? color);
  }
  setHighlight(on) {
    if (on) this.setColor(PALETTE.highlight, PALETTE.highlightEmissive);
    else this.setColor(PALETTE.node, PALETTE.nodeEmissive);
  }
  moveTo(x, y, z, duration = 500) { this.tweenPos = { from: this.mesh.position.clone(), to: new THREE.Vector3(x, y, z), t: 0, d: duration, done: false }; }
  pulse(strength = 0.25) { this.pulseVal = { t: 0, d: 600, strength, done: false }; }
  update(dt) {
    if (this.tweenPos) {
      this.tweenPos.t += dt * 1000;
      const p = Math.min(this.tweenPos.t / this.tweenPos.d, 1);
      const e = easeInOut(p);
      this.mesh.position.lerpVectors(this.tweenPos.from, this.tweenPos.to, e);
      if (p >= 1) this.tweenPos = null;
    }
    if (this.pulseVal) {
      this.pulseVal.t += dt * 1000;
      const p = this.pulseVal.t / this.pulseVal.d;
      if (p >= 1) { this.mesh.scale.set(1, 1, 1); this.pulseVal = null; }
      else this.mesh.scale.setScalar(1 + this.pulseVal.strength * Math.sin(p * Math.PI));
    }
  }
  remove() { this.scene.remove(this.mesh); }
}

// ---- 盒子（数组元素/表格单元等） ----
export class VBox {
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.w = opts.w || 50; this.h = opts.h || 50; this.d = opts.d || 50;
    const mat = glowMaterial(opts.color || PALETTE.node, { emissive: opts.emissive, emissiveIntensity: 0.35 });
    this.mesh = new THREE.Mesh(new THREE.BoxGeometry(this.w, this.h, this.d), mat);
    this.mesh.position.set(opts.x ?? 0, opts.y ?? 0, opts.z ?? 0);
    this.label = null;
    if (opts.label !== undefined && opts.label !== null && opts.label !== '') {
      this.label = makeTextSprite(opts.label, { scale: 1 });
      this.label.position.set(0, 0, this.d / 2 + 14);
      this.mesh.add(this.label);
    }
    scene.add(this.mesh);
  }
  setText(text) { if (this.label) setSpriteText(this.label, text, { scale: 1 }); }
  setColor(color, emissive) {
    const m = this.mesh.material;
    m.color.setHex(color);
    m.emissive.setHex(emissive ?? color);
  }
  setHighlight(on) {
    if (on) this.setColor(PALETTE.highlight, PALETTE.highlightEmissive);
    else this.setColor(PALETTE.node, PALETTE.nodeEmissive);
  }
  moveTo(x, y, z, duration = 500) { this.tweenPos = { from: this.mesh.position.clone(), to: new THREE.Vector3(x, y, z), t: 0, d: duration, done: false }; }
  update(dt) {
    if (this.tweenPos) {
      this.tweenPos.t += dt * 1000;
      const p = Math.min(this.tweenPos.t / this.tweenPos.d, 1);
      this.mesh.position.lerpVectors(this.tweenPos.from, this.tweenPos.to, easeInOut(p));
      if (p >= 1) this.tweenPos = null;
    }
  }
  remove() { this.scene.remove(this.mesh); }
}

// ---- 柱状体（排序/柱状图） ----
export class VBar {
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.w = opts.w || 40; this.d = opts.d || 40;
    const mat = glowMaterial(opts.color || PALETTE.node, { emissive: opts.emissive, emissiveIntensity: 0.5 });
    this.mesh = new THREE.Mesh(new THREE.BoxGeometry(this.w, 1, this.d), mat);
    this.baseX = opts.x ?? 0; this.baseZ = opts.z ?? 0;
    this.setHeight(opts.height ?? 1);
    scene.add(this.mesh);
  }
  setHeight(h) {
    this.height = h;
    this.mesh.scale.y = Math.max(h, 0.5);
    this.mesh.position.set(this.baseX, (this.mesh.scale.y) / 2, this.baseZ);
  }
  setColor(color, emissive) {
    const m = this.mesh.material;
    m.color.setHex(color);
    m.emissive.setHex(emissive ?? color);
  }
  setHighlight(on) {
    if (on) this.setColor(PALETTE.highlight, PALETTE.highlightEmissive);
    else this.setColor(PALETTE.node, PALETTE.nodeEmissive);
  }
  remove() { this.scene.remove(this.mesh); }
}

// ---- 两点间管状连线 ----
export function tubeBetween(scene, a, b, opts = {}) {
  const color = opts.color || PALETTE.edge;
  const points = [a, b];
  const curve = new THREE.CatmullRomCurve3(points);
  const geo = new THREE.TubeGeometry(curve, 2, opts.radius || 2.5, 6, false);
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: opts.opacity ?? 0.55 });
  const mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);
  return mesh;
}

// ---- 圆环（高亮环，绕节点旋转） ----
export class VTorus {
  constructor(scene, opts = {}) {
    this.scene = scene;
    const mat = glowMaterial(opts.color || PALETTE.highlight, { emissive: PALETTE.highlightEmissive, emissiveIntensity: 0.7, transparent: true, opacity: 0.85 });
    this.mesh = new THREE.Mesh(new THREE.TorusGeometry(opts.radius || 30, 3, 8, 32), mat);
    this.mesh.position.set(opts.x ?? 0, opts.y ?? 0, opts.z ?? 0);
    scene.add(this.mesh);
  }
  moveTo(x, y, z, duration = 500) { this.tweenPos = { from: this.mesh.position.clone(), to: new THREE.Vector3(x, y, z), t: 0, d: duration, done: false }; }
  update(dt) {
    this.mesh.rotation.x += dt * 1.5;
    this.mesh.rotation.z += dt * 0.8;
    if (this.tweenPos) {
      this.tweenPos.t += dt * 1000;
      const p = Math.min(this.tweenPos.t / this.tweenPos.d, 1);
      this.mesh.position.lerpVectors(this.tweenPos.from, this.tweenPos.to, easeInOut(p));
      if (p >= 1) this.tweenPos = null;
    }
  }
  remove() { this.scene.remove(this.mesh); }
}

// ---- 文字 Sprite ----
export class VText {
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.sprite = makeTextSprite(opts.text || '', { color: opts.color, scale: opts.scale || 1 });
    this.sprite.position.set(opts.x ?? 0, opts.y ?? 0, opts.z ?? 0);
    scene.add(this.sprite);
  }
  setText(text, opts) { setSpriteText(this.sprite, text, opts); }
  moveTo(x, y, z, duration = 500) { this.tweenPos = { from: this.sprite.position.clone(), to: new THREE.Vector3(x, y, z), t: 0, d: duration, done: false }; }
  update(dt) {
    if (this.tweenPos) {
      this.tweenPos.t += dt * 1000;
      const p = Math.min(this.tweenPos.t / this.tweenPos.d, 1);
      this.sprite.position.lerpVectors(this.tweenPos.from, this.tweenPos.to, easeInOut(p));
      if (p >= 1) this.tweenPos = null;
    }
  }
  remove() { this.scene.remove(this.sprite); }
}

// ---- 3D 箭头（top 指示器等） ----
export class VArrow {
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.group = new THREE.Group();
    const shaftMat = glowMaterial(opts.color || PALETTE.highlight, { emissive: PALETTE.highlightEmissive, emissiveIntensity: 0.7 });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 26, 8), shaftMat);
    shaft.position.y = 13;
    const head = new THREE.Mesh(new THREE.ConeGeometry(8, 16, 12), shaftMat);
    head.position.y = 34;
    this.group.add(shaft, head);
    this.group.position.set(opts.x ?? 0, opts.y ?? 0, opts.z ?? 0);
    if (opts.down) this.group.rotation.z = Math.PI;
    scene.add(this.group);
  }
  moveTo(x, y, z, duration = 500) { this.tweenPos = { from: this.group.position.clone(), to: new THREE.Vector3(x, y, z), t: 0, d: duration, done: false }; }
  update(dt) {
    if (this.tweenPos) {
      this.tweenPos.t += dt * 1000;
      const p = Math.min(this.tweenPos.t / this.tweenPos.d, 1);
      this.group.position.lerpVectors(this.tweenPos.from, this.tweenPos.to, easeInOut(p));
      if (p >= 1) this.tweenPos = null;
    }
  }
  remove() { this.scene.remove(this.group); }
}

// 引擎统一更新所有对象
export function updateAll(dt, list) {
  for (const o of list) if (o.update) o.update(dt);
}
```

- [ ] **Step 2: 语法验证**

Run: `node --check 3D/VisualObject3D.js`
Expected: 无输出

- [ ] **Step 3: 提交**

```bash
git add 3D/VisualObject3D.js
git commit -m "feat(3d): add visual primitives (node/box/bar/tube/torus/text/arrow)"
```

---

### Task 5: 3D/AnimationEngine.js — 动画命令队列

**Files:**
- Create: `3D/AnimationEngine.js`

- [ ] **Step 1: 写实现**

```js
// 3D/AnimationEngine.js
// 命令模型：{ duration(ms), fn(progress 0..1), undo() }
// 支持 play/pause/step/undo、速度控制、撤销栈（快照还原）。

export class AnimationEngine {
  constructor({ speed = 1 } = {}) {
    this.queue = [];
    this.current = null;      // 正在执行的命令 {cmd, elapsed}
    this.done = [];           // 已完成的命令（用于 undo）
    this.speed = speed;
    this.playing = false;
    this.listeners = [];
  }

  onStateChange(cb) { this.listeners.push(cb); }
  notify() { for (const cb of this.listeners) cb(this); }

  addCommand(cmd) { this.queue.push(cmd); this.notify(); }

  play() { this.playing = true; this.notify(); }
  pause() { this.playing = false; this.notify(); }
  toggle() { this.playing ? this.pause() : this.play(); }

  // step：跳过动画，瞬间完成当前命令并推进
  step() {
    this.pause();
    if (this.current) { this.finishCurrent(); return; }
    if (this.queue.length) { this.current = { cmd: this.queue.shift(), elapsed: Infinity }; this.finishCurrent(); }
    this.notify();
  }

  finishCurrent() {
    const { cmd } = this.current;
    cmd.fn(1);
    this.done.push(cmd);
    this.current = null;
    if (this.queue.length) {
      this.current = { cmd: this.queue.shift(), elapsed: 0 };
    }
  }

  undo() {
    this.pause();
    const cmd = this.done.pop();
    if (cmd && cmd.undo) cmd.undo();
    if (!this.current && this.queue.length) {
      // 撤销后把下一个待执行命令让位：不自动回退队列，仅停止
    }
    this.notify();
  }

  clear() { this.queue = []; this.done = []; this.current = null; this.playing = false; this.notify(); }

  tick(dt) {
    if (!this.playing) return;
    if (!this.current && this.queue.length) {
      this.current = { cmd: this.queue.shift(), elapsed: 0 };
    }
    if (!this.current) { this.playing = false; this.notify(); return; }
    const { cmd, elapsed } = this.current;
    const next = elapsed + dt * 1000 * this.speed;
    const d = Math.max(cmd.duration, 1);
    const p = Math.min(next / d, 1);
    cmd.fn(p);
    this.current.elapsed = next;
    if (p >= 1) this.finishCurrent();
  }
}
```

- [ ] **Step 2: 语法验证**

Run: `node --check 3D/AnimationEngine.js`
Expected: 无输出

- [ ] **Step 3: 提交**

```bash
git add 3D/AnimationEngine.js
git commit -m "feat(3d): add animation command queue with play/step/undo"
```

---

### Task 6: 3D/ControlPanel.js — 控件与播放条（原生 DOM）

**Files:**
- Create: `3D/ControlPanel.js`

- [ ] **Step 1: 写实现**

```js
// 3D/ControlPanel.js
// 原生 DOM 控件，替代旧 jQuery 控件体系。
// 页面 HTML 结构：
//   <div id="controls"></div>  算法控件区（按钮/输入）
//   <div id="playbar"></div>   播放控制条

export class ControlPanel {
  constructor({ controlsId = 'controls', playbarId = 'playbar', engine } = {}) {
    this.controlsEl = document.getElementById(controlsId);
    this.playbarEl = document.getElementById(playbarId);
    this.engine = engine;
    if (engine) this.buildPlaybar();
  }

  addButton(label, onClick) {
    const btn = document.createElement('button');
    btn.className = 'algo-btn';
    btn.textContent = label;
    btn.addEventListener('click', onClick);
    this.controlsEl.appendChild(btn);
    return btn;
  }

  addInput(placeholder, onEnter, maxLen = 10) {
    const input = document.createElement('input');
    input.className = 'algo-input';
    input.placeholder = placeholder;
    input.maxLength = maxLen;
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && onEnter) onEnter(input.value);
    });
    this.controlsEl.appendChild(input);
    return input;
  }

  addLabel(text) {
    const span = document.createElement('span');
    span.className = 'algo-label';
    span.textContent = text;
    this.controlsEl.appendChild(span);
    return span;
  }

  addStatus(text) {
    const el = document.createElement('div');
    el.className = 'algo-status';
    el.textContent = text;
    this.controlsEl.appendChild(el);
    return el;
  }

  addSlider(label, min, max, step, value, onInput) {
    const wrap = document.createElement('span');
    wrap.className = 'algo-slider';
    const lbl = document.createElement('span');
    lbl.textContent = label;
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = min; slider.max = max; slider.step = step; slider.value = value;
    const out = document.createElement('b');
    out.textContent = value;
    slider.addEventListener('input', () => { out.textContent = slider.value; if (onInput) onInput(parseFloat(slider.value)); });
    wrap.append(lbl, slider, out);
    this.controlsEl.appendChild(wrap);
    return slider;
  }

  buildPlaybar() {
    this.playbarEl.innerHTML = '';
    const mkBtn = (label, fn) => {
      const b = document.createElement('button');
      b.className = 'play-btn';
      b.textContent = label;
      b.addEventListener('click', fn);
      this.playbarEl.appendChild(b);
      return b;
    };
    this.playBtn = mkBtn('▶ 播放', () => this.engine.toggle());
    mkBtn('⏭ 单步', () => this.engine.step());
    mkBtn('↩ 撤销', () => this.engine.undo());
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = 0.25; slider.max = 3; slider.step = 0.25; slider.value = 1;
    slider.className = 'speed-slider';
    slider.title = '动画速度';
    slider.addEventListener('input', () => { this.engine.speed = parseFloat(slider.value); });
    this.playbarEl.appendChild(slider);
    this.engine.onStateChange(() => {
      if (!this.playBtn) return;
      this.playBtn.textContent = this.engine.playing ? '⏸ 暂停' : '▶ 播放';
      this.playBtn.disabled = false;
    });
  }
}
```

- [ ] **Step 2: 语法验证**

Run: `node --check 3D/ControlPanel.js`
Expected: 无输出

- [ ] **Step 3: 提交**

```bash
git add 3D/ControlPanel.js
git commit -m "feat(3d): add native-DOM control panel with playbar"
```

---

### Task 7: 3D/modes/Array3D.js — 数组/柱状模式

**Files:**
- Create: `3D/modes/Array3D.js`

- [ ] **Step 1: 写实现**

```js
// 3D/modes/Array3D.js
// 一维数组：盒子槽位 + 底部下标标签；bar 模式：柱体高度=值。
import * as THREE from 'three';
import { VBox, VBar, VText, tubeBetween } from '../VisualObject3D.js';
import { PALETTE } from '../Glow.js';

export class Array3D {
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.type = opts.type || 'box';
    this.count = opts.count || 15;
    this.w = opts.w || 50;
    this.h = opts.h || 50;
    this.spacing = opts.spacing || 62;
    this.startX = opts.startX ?? 0;
    this.startY = opts.startY ?? 0;
    this.z = opts.z ?? 0;
    this.elems = [];
    this.indexLabels = [];
    this.lines = [];
  }

  create() {
    const half = (this.count - 1) / 2;
    for (let i = 0; i < this.count; i++) {
      const x = this.startX + (i - half) * this.spacing;
      const y = this.startY;
      if (this.type === 'box') {
        const box = new VBox(this.scene, { w: this.w, h: this.h, d: this.h * 0.6, x, y, z: this.z, label: '', color: PALETTE.node, emissive: PALETTE.nodeEmissive });
        this.elems.push(box);
      } else {
        const bar = new VBar(this.scene, { x, z: this.z, height: 6, color: PALETTE.node, emissive: PALETTE.nodeEmissive });
        this.elems.push(bar);
      }
      const lbl = new VText(this.scene, { text: i, x, y: y - 42, z: this.z, color: PALETTE.textDim, scale: 0.7 });
      this.indexLabels.push(lbl);
    }
  }

  xOf(i) { const half = (this.count - 1) / 2; return this.startX + (i - half) * this.spacing; }

  setValue(i, value, cmd) {
    const el = this.elems[i];
    if (this.type === 'box') {
      if (value === '') {
        cmd({ duration: 200, fn: () => el.setText(''), undo: () => {} });
      } else {
        cmd({ duration: 200, fn: () => el.setText(String(value)), undo: () => el.setText('') });
      }
    } else {
      const v = parseInt(value) || 1;
      cmd({ duration: 300, fn: () => el.setHeight(v * 6), undo: () => {} });
    }
  }

  highlight(i, cmd, color) {
    const el = this.elems[i];
    const c = color || PALETTE.highlight;
    cmd({ duration: 250, fn: (p) => { el.mesh.material.emissiveIntensity = 0.35 + p * 0.55; el.mesh.material.color.setHex(c); }, undo: () => { el.mesh.material.emissiveIntensity = 0.35; el.mesh.material.color.setHex(PALETTE.node); } });
  }

  unhighlight(i, cmd) {
    const el = this.elems[i];
    cmd({ duration: 250, fn: (p) => { el.mesh.material.emissiveIntensity = 0.35 + (1-p) * 0.55; el.mesh.material.color.lerpColors(new THREE.Color(PALETTE.highlight), new THREE.Color(PALETTE.node), p); }, undo: () => {} });
  }

  swap(i, j, cmd) {
    const a = this.elems[i], b = this.elems[j];
    const ax = this.xOf(i), bx = this.xOf(j);
    const ay = a.mesh.position.y, by = b.mesh.position.y;
    cmd({ duration: 450, fn: (p) => { a.mesh.position.x = ax + (bx - ax) * p; b.mesh.position.x = bx + (ax - bx) * p; a.mesh.position.y = ay + 60 * Math.sin(p * Math.PI); b.mesh.position.y = by + 60 * Math.sin(p * Math.PI); }, undo: () => { a.mesh.position.set(ax, ay, this.z); b.mesh.position.set(bx, by, this.z); } });
  }

  addLine(from, to, cmd, opts) {
    const f = this.elems[from].mesh.position, t = this.elems[to].mesh.position;
    const mesh = tubeBetween(this.scene, f.clone(), t.clone(), opts);
    this.lines.push(mesh);
    return mesh;
  }

  clearLines() { for (const l of this.lines) this.scene.remove(l); this.lines = []; }
}
```

---

### Task 8: 3D/modes/Tree3D.js — 树模式

**Files:**
- Create: `3D/modes/Tree3D.js`

- [ ] **Step 1: 写实现**

```js
// 3D/modes/Tree3D.js
// 节点 = 发光球体；父子 = 管状连线；页面算法负责布局坐标。
// 删除节点后重画整棵树的连线（简单可靠）。
import * as THREE from 'three';
import { VNode, VText, tubeBetween } from '../VisualObject3D.js';
import { PALETTE } from '../Glow.js';

export class Tree3D {
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.radius = opts.radius || 20;
    this.nodes = new Map();   // id -> { node, x, y, z, parentId }
    this.edgeMeshes = [];
    this.defaultColor = opts.color || PALETTE.node;
  }

  addNode(id, label, x, y, z, opts = {}) {
    const node = new VNode(this.scene, {
      radius: this.radius, x, y, z,
      label, color: opts.color || this.defaultColor,
      emissive: opts.emissive,
    });
    this.nodes.set(id, { node, x, y, z, parentId: opts.parentId ?? null, color: opts.color || this.defaultColor, highlighted: false });
    this.drawEdges();
    return node;
  }

  removeNode(id) {
    const entry = this.nodes.get(id);
    if (!entry) return;
    entry.node.remove();
    this.nodes.delete(id);
    this.drawEdges();
  }

  moveNode(id, x, y, z, cmd) {
    const e = this.nodes.get(id);
    if (!e) return;
    const from = { x: e.x, y: e.y, z: e.z };
    cmd({ duration: 500, fn: (p) => {
      const t = ease(p);
      e.node.mesh.position.set(from.x + (x - from.x) * t, from.y + (y - from.y) * t, from.z + (z - from.z) * t);
    }, undo: () => { e.node.mesh.position.set(from.x, from.y, from.z); } });
    e.x = x; e.y = y; e.z = z;
  }

  setColor(id, color, emissive) {
    const e = this.nodes.get(id);
    if (!e) return;
    e.color = color;
    e.node.setColor(color, emissive);
  }

  highlight(id, cmd) {
    const e = this.nodes.get(id);
    if (!e) return;
    if (e.highlighted) return;
    e.highlighted = true;
    const base = e.color;
    cmd({ duration: 300, fn: (p) => {
      e.node.mesh.material.color.lerpColors(new THREE.Color(base), new THREE.Color(PALETTE.highlight), p);
      e.node.mesh.material.emissive.setHex(PALETTE.highlightEmissive);
      e.node.mesh.scale.setScalar(1 + p * 0.18);
    }, undo: () => { e.node.mesh.material.color.setHex(base); e.node.mesh.material.emissive.setHex(base); e.node.mesh.scale.set(1, 1, 1); } });
  }

  unhighlight(id, cmd) {
    const e = this.nodes.get(id);
    if (!e) return;
    if (!e.highlighted) return;
    e.highlighted = false;
    const base = e.color;
    cmd({ duration: 300, fn: (p) => {
      e.node.mesh.material.color.lerpColors(new THREE.Color(PALETTE.highlight), new THREE.Color(base), p);
      e.node.mesh.material.emissive.setHex(base);
      e.node.mesh.scale.setScalar(1 + (1 - p) * 0.18);
    }, undo: () => {} });
  }

  drawEdges() {
    for (const m of this.edgeMeshes) this.scene.remove(m);
    this.edgeMeshes = [];
    for (const [id, e] of this.nodes) {
      if (e.parentId == null) continue;
      const p = this.nodes.get(e.parentId);
      if (!p) continue;
      const a = e.node.mesh.position.clone();
      const b = p.node.mesh.position.clone();
      const dir = b.clone().sub(a).normalize();
      a.addScaledVector(dir, this.radius + 2);
      b.addScaledVector(dir, this.radius + 2);
      this.edgeMeshes.push(tubeBetween(this.scene, a, b, { color: PALETTE.edge, opacity: 0.5, radius: 2 }));
    }
  }

  clear() {
    for (const e of this.nodes.values()) e.node.remove();
    for (const m of this.edgeMeshes) this.scene.remove(m);
    this.nodes = new Map();
    this.edgeMeshes = [];
  }
}

function ease(t) { return t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t+2, 2)/2; }
```

- [ ] **Step 2: 语法验证**

Run: `node --check 3D/modes/Tree3D.js`
Expected: 无输出

- [ ] **Step 3: 提交**

```bash
git add 3D/modes/Tree3D.js
git commit -m "feat(3d): add Tree3D mode"
```

---

### Task 9: 3D/modes/Graph3D.js — 图模式

**Files:**
- Create: `3D/modes/Graph3D.js`

- [ ] **Step 1: 写实现**

```js
// 3D/modes/Graph3D.js
// 节点 = 发光球体（算法给坐标）；边 = 管状连线（半透明，可点亮）；
// 支持有向箭头、边权重标签、节点距离标签。
import * as THREE from 'three';
import { VNode, VText, tubeBetween } from '../VisualObject3D.js';
import { PALETTE } from '../Glow.js';

export class Graph3D {
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.nodes = new Map();   // id -> {node, label, x, y, z}
    this.edges = new Map();   // "a->b" -> {mesh, weightLabel, baseColor}
    this.radius = opts.radius || 20;
  }

  addNode(id, label, x, y, z, opts = {}) {
    const node = new VNode(this.scene, { radius: this.radius, x, y, z, label, color: opts.color || PALETTE.node, emissive: opts.emissive });
    this.nodes.set(id, { node, label, x, y, z });
    return node;
  }

  positionNode(id, x, y, z, cmd) {
    const e = this.nodes.get(id);
    if (!e) return;
    const from = { x: e.x, y: e.y, z: e.z };
    cmd({ duration: 450, fn: (p) => { const t = ease(p); e.node.mesh.position.set(from.x + (x-from.x)*t, from.y + (y-from.y)*t, from.z + (z-from.z)*t); }, undo: () => e.node.mesh.position.set(from.x, from.y, from.z) });
    e.x = x; e.y = y; e.z = z;
  }

  addEdge(a, b, opts = {}) {
    const key = `${a}->${b}`;
    if (this.edges.has(key)) return;
    const A = this.nodes.get(a), B = this.nodes.get(b);
    if (!A || !B) return;
    const p1 = A.node.mesh.position.clone();
    const p2 = B.node.mesh.position.clone();
    const dir = p2.clone().sub(p1).normalize();
    p1.addScaledVector(dir, this.radius + 3);
    p2.addScaledVector(dir, this.radius + 3);
    const mesh = tubeBetween(this.scene, p1, p2, { color: opts.color || PALETTE.edge, opacity: 0.55, radius: opts.radius || 2.5 });
    let weightLabel = null;
    if (opts.weight !== undefined) {
      const mid = p1.clone().add(p2).multiplyScalar(0.5).add(new THREE.Vector3(0, 16, 0));
      weightLabel = new VText(this.scene, { text: String(opts.weight), x: mid.x, y: mid.y, z: mid.z, color: PALETTE.textDim, scale: 0.65 });
    }
    this.edges.set(key, { mesh, weightLabel, baseColor: opts.color || PALETTE.edge, baseOpacity: opts.opacity ?? 0.55, directed: !!opts.directed });
  }

  lightEdge(a, b, on, cmd) {
    const key = `${a}->${b}`;
    const e = this.edges.get(key);
    if (!e) return;
    cmd({ duration: 250, fn: (p) => {
      if (on) { e.mesh.material.color.setHex(PALETTE.highlight); e.mesh.material.opacity = 0.45 + p * 0.5; e.mesh.material.emissiveIntensity = p; }
      else { e.mesh.material.color.setHex(e.baseColor); e.mesh.material.opacity = e.baseOpacity; e.mesh.material.emissiveIntensity = 0; }
    }, undo: () => { e.mesh.material.color.setHex(e.baseColor); e.mesh.material.opacity = e.baseOpacity; } });
  }

  highlightNode(id, cmd, color) {
    const e = this.nodes.get(id);
    if (!e) return;
    const c = color || PALETTE.highlight;
    cmd({ duration: 250, fn: (p) => { e.node.mesh.material.color.lerpColors(new THREE.Color(PALETTE.node), new THREE.Color(c), p); e.node.mesh.material.emissive.setHex(PALETTE.highlightEmissive); e.node.mesh.scale.setScalar(1 + p * 0.15); }, undo: () => { e.node.mesh.material.color.setHex(PALETTE.node); e.node.mesh.material.emissive.setHex(PALETTE.nodeEmissive); e.node.mesh.scale.set(1, 1, 1); } });
  }

  dehighlightNode(id, cmd) {
    const e = this.nodes.get(id);
    if (!e) return;
    cmd({ duration: 250, fn: (p) => { e.node.mesh.material.color.lerpColors(new THREE.Color(PALETTE.highlight), new THREE.Color(PALETTE.node), p); e.node.mesh.material.emissive.setHex(PALETTE.nodeEmissive); e.node.mesh.scale.setScalar(1 + (1-p) * 0.15); }, undo: () => {} });
  }

  setNodeLabel(id, text) {
    const e = this.nodes.get(id);
    if (e) e.node.setText(text);
  }

  setLabel(id, text, x, y, z) {
    const e = this.nodes.get(id);
    if (!e) return;
    if (e.labelSprite) { e.labelSprite.remove(); }
    const spr = new VText(this.scene, { text, x, y, z, color: PALETTE.textGlow, scale: 0.7 });
    e.labelSprite = spr;
  }
}

function ease(t) { return t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t+2, 2)/2; }
```

- [ ] **Step 2: 语法验证**

Run: `node --check 3D/modes/Graph3D.js`
Expected: 无输出

- [ ] **Step 3: 提交**

```bash
git add 3D/modes/Graph3D.js
git commit -m "feat(3d): add Graph3D mode"
```

---

### Task 10: 3D/modes/Table3D.js — 表格模式

**Files:**
- Create: `3D/modes/Table3D.js`

- [ ] **Step 1: 写实现**

```js
// 3D/modes/Table3D.js
// 竖直 3D 网格面板：行沿 x，列沿 z，单元格为凸起的扁平盒子。
import * as THREE from 'three';
import { VBox, VText } from '../VisualObject3D.js';
import { PALETTE } from '../Glow.js';

export class Table3D {
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.rows = opts.rows || 2;
    this.cols = opts.cols || 10;
    this.cw = opts.cellW || 64;
    this.ch = opts.cellH || 48;
    this.startX = opts.startX ?? 0;
    this.startY = opts.startY ?? 120;
    this.cells = [];     // [r][c] -> VBox
    this.rowLabels = [];
    this.colLabels = [];
  }

  create() {
    const halfR = (this.rows - 1) / 2, halfC = (this.cols - 1) / 2;
    for (let r = 0; r < this.rows; r++) {
      this.cells[r] = [];
      for (let c = 0; c < this.cols; c++) {
        const x = this.startX + (c - halfC) * this.cw;
        const z = (halfR - r) * this.ch * 0.85;
        const box = new VBox(this.scene, { w: this.cw - 8, h: this.ch - 8, d: 26, x, y: this.startY, z, label: '', color: PALETTE.node, emissive: PALETTE.nodeEmissive });
        this.cells[r][c] = box;
      }
      const lbl = new VText(this.scene, { text: '行' + r, x: this.startX - halfC * this.cw - 50, y: this.startY, z: (halfR - r) * this.ch * 0.85, color: PALETTE.textDim, scale: 0.7 });
      this.rowLabels.push(lbl);
    }
    for (let c = 0; c < this.cols; c++) {
      const x = this.startX + (c - halfC) * this.cw;
      const lbl = new VText(this.scene, { text: String(c), x, y: this.startY - 50, z: (halfR + 1) * this.ch * 0.85, color: PALETTE.textDim, scale: 0.7 });
      this.colLabels.push(lbl);
    }
  }

  setCell(r, c, value, cmd) {
    const box = this.cells[r][c];
    if (!box) return;
    cmd({ duration: 250, fn: () => box.setText(String(value)), undo: () => box.setText('') });
  }

  setRowLabel(r, text) {
    const l = this.rowLabels[r];
    if (l) l.setText(text);
  }

  highlightCell(r, c, cmd) {
    const box = this.cells[r][c];
    if (!box) return;
    const baseY = box.mesh.position.y;
    cmd({ duration: 300, fn: (p) => { box.mesh.material.color.lerpColors(new THREE.Color(PALETTE.node), new THREE.Color(PALETTE.highlight), p); box.mesh.material.emissive.setHex(PALETTE.highlightEmissive); box.mesh.position.y = baseY + Math.sin(p * Math.PI) * 8; }, undo: () => { box.mesh.material.color.setHex(PALETTE.node); box.mesh.material.emissive.setHex(PALETTE.nodeEmissive); box.mesh.position.y = baseY; } });
  }

  unhighlightCell(r, c, cmd) {
    const box = this.cells[r][c];
    if (!box) return;
    cmd({ duration: 300, fn: (p) => { box.mesh.material.color.lerpColors(new THREE.Color(PALETTE.highlight), new THREE.Color(PALETTE.node), p); box.mesh.material.emissive.setHex(PALETTE.nodeEmissive); }, undo: () => {} });
  }
}
```

- [ ] **Step 2: 语法验证**

Run: `node --check 3D/modes/Table3D.js`
Expected: 无输出

- [ ] **Step 3: 提交**

```bash
git add 3D/modes/Table3D.js
git commit -m "feat(3d): add Table3D mode"
```

---

### Task 11: 3D/modes/Geometry3D.js — 几何变换模式

**Files:**
- Create: `3D/modes/Geometry3D.js`

- [ ] **Step 1: 写实现**

```js
// 3D/modes/Geometry3D.js
// 3D 坐标轴（XYZ 彩色箭头）+ 多面体（带线框），支持旋转/平移/缩放动画。
import * as THREE from 'three';
import { glowMaterial } from '../Glow.js';
import { easeInOut } from '../VisualObject3D.js';

export class Geometry3D {
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.axisLen = opts.axisLen || 220;
    this.shape = null;
    this.axes = new THREE.Group();
    this.scene.add(this.axes);
    this.addAxes();
  }

  addAxes() {
    const colors = [0xef4444, 0x22c55e, 0x3b82f6]; // X 红 Y 绿 Z 蓝
    const names = ['X', 'Y', 'Z'];
    const dirs = [[1,0,0],[0,1,0],[0,0,1]];
    dirs.forEach((d, i) => {
      const mat = glowMaterial(colors[i], { emissiveIntensity: 0.5 });
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, this.axisLen * 0.8, 8), mat);
      shaft.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...d));
      shaft.position.set(d[0] * this.axisLen * 0.4, d[1] * this.axisLen * 0.4, d[2] * this.axisLen * 0.4);
      const head = new THREE.Mesh(new THREE.ConeGeometry(9, 22, 12), mat);
      head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...d));
      head.position.set(d[0] * this.axisLen * 0.84, d[1] * this.axisLen * 0.84, d[2] * this.axisLen * 0.84);
      this.axes.add(shaft, head);
    });
    // 轴刻度网格
    const grid = new THREE.GridHelper(this.axisLen * 2, 10, 0x1e3a8a, 0x1e3a8a);
    grid.material.transparent = true; grid.material.opacity = 0.5;
    grid.position.y = -4;
    this.axes.add(grid);
    void names;
  }

  addShape(geometry, opts = {}) {
    const mat = glowMaterial(opts.color || 0xa855f7, { emissiveIntensity: 0.55, transparent: opts.transparent, opacity: opts.opacity ?? 0.85 });
    // 支持传入几何数组（合成形状，如房子=盒+锥），合成 Group，位置/旋转仍统一操作
    const build = (g) => {
      const m = new THREE.Mesh(g, mat);
      const wire = new THREE.LineSegments(new THREE.EdgesGeometry(g), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }));
      m.add(wire);
      return m;
    };
    if (Array.isArray(geometry)) {
      this.shape = new THREE.Group();
      for (const g of geometry) this.shape.add(build(g));
    } else {
      this.shape = build(geometry);
    }
    this.scene.add(this.shape);
  }

  // 相对当前位置 + 角度（累计变换由页面维护矩阵并调用 setTransform）
  setTransform(pos, euler) {
    if (!this.shape) return;
    this.shape.position.copy(pos);
    this.shape.rotation.set(euler.x, euler.y, euler.z);
  }

  animateTo(from, to, cmd, duration = 800) {
    if (!this.shape) return;
    const fromPos = from.pos.clone(), toPos = to.pos.clone();
    const fromRot = from.rot.clone(), toRot = to.rot.clone();
    cmd({ duration, fn: (p) => { const t = easeInOut(p); this.shape.position.lerpVectors(fromPos, toPos, t); this.shape.rotation.x = fromRot.x + (toRot.x - fromRot.x) * t; this.shape.rotation.y = fromRot.y + (toRot.y - fromRot.y) * t; this.shape.rotation.z = fromRot.z + (toRot.z - fromRot.z) * t; }, undo: () => this.setTransform(fromPos, fromRot) });
  }
}
```

---

### Task 12: 页面样式与模板

**Files:**
- Create: `visualizationPageStyle3d.css`
- Create: `template3d.html`（新页面模板，供后续 44 页参考）

- [ ] **Step 1: 写 CSS**

```css
/* visualizationPageStyle3d.css */
body { margin:0; background:#030514; color:#e2e8f0; font-family:"Noto Sans SC","Microsoft YaHei",sans-serif; overflow:hidden; }
#app { display:flex; flex-direction:column; height:100vh; }
#header { display:flex; align-items:center; gap:16px; padding:10px 18px; background:rgba(10,15,46,.6); border-bottom:1px solid rgba(59,130,246,.25); }
#header h1 { font-size:18px; margin:0; color:#e0f2fe; text-shadow:0 0 12px rgba(59,130,246,.5); }
.home-link { color:#7dd3fc; text-decoration:none; font-size:13px; margin-left:auto; }
#controls { display:flex; flex-wrap:wrap; gap:8px; align-items:center; padding:10px 18px; background:rgba(10,15,46,.5); }
.algo-btn { background:rgba(59,130,246,.15); color:#bfdbfe; border:1px solid rgba(59,130,246,.4); padding:6px 14px; border-radius:8px; cursor:pointer; font-size:13px; transition:all .15s; }
.algo-btn:hover { background:rgba(59,130,246,.32); box-shadow:0 0 10px rgba(59,130,246,.3); }
.algo-btn:disabled { opacity:.4; cursor:not-allowed; }
.algo-input { background:rgba(3,5,20,.8); color:#e2e8f0; border:1px solid rgba(59,130,246,.4); border-radius:8px; padding:6px 10px; font-size:13px; width:110px; }
.algo-input:focus { outline:none; border-color:#22d3ee; box-shadow:0 0 8px rgba(34,211,238,.35); }
.algo-label { color:#9db8d9; font-size:13px; }
.algo-status { color:#7dd3fc; font-size:13px; min-height:16px; font-family:ui-monospace,monospace; }
.algo-slider { display:inline-flex; align-items:center; gap:8px; font-size:13px; color:#9db8d9; }
.algo-slider input[type=range] { accent-color:#22d3ee; }
.algo-slider b { color:#7dd3fc; min-width:32px; text-align:right; font-weight:normal; }
.webgl-error { padding:40px; text-align:center; color:#f87171; font-size:15px; line-height:2; }
.webgl-error a { color:#7dd3fc; }
#scene { flex:1; position:relative; min-height:0; }
#scene canvas { display:block; }
#playbar { display:flex; gap:8px; align-items:center; padding:8px 18px; background:rgba(10,15,46,.5); border-top:1px solid rgba(59,130,246,.25); }
.play-btn { background:rgba(59,130,246,.15); color:#bfdbfe; border:1px solid rgba(59,130,246,.4); padding:4px 12px; border-radius:6px; cursor:pointer; font-size:12px; }
.play-btn:hover { background:rgba(59,130,246,.32); }
.speed-slider { width:160px; accent-color:#3b82f6; }
footer { text-align:center; padding:6px; font-size:12px; color:#64748b; background:rgba(3,5,20,.8); position:fixed; bottom:0; width:100%; }
```

- [ ] **Step 2: 写页面模板**

```html
<!-- template3d.html — 3D 页面统一模板 -->
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="renderer" content="webkit">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<meta name="keywords" content="算法可视化,二叉树,红黑树,索引,visual.erik.xyz">
<title>算法页面</title>
<link rel="shortcut icon" href="favicon.ico">
<link rel="stylesheet" href="visualizationPageStyle3d.css">
<script type="importmap">
{ "imports": { "three": "./ThirdParty/three/build/three.module.js" } }
</script>
</head>
<body>
<div id="app">
  <header id="header">
    <h1>算法标题</h1>
    <a href="Algorithms.html" class="home-link">← 返回目录</a>
  </header>
  <div id="controls"></div>
  <div id="scene"></div>
  <div id="playbar"></div>
</div>
<footer>
  <a href="Algorithms.html" style="color:#64748b;">算法可视化</a>
  <script async src="//busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js"></script>
  <span id="busuanzi_container_page_pv"> | 本文总阅读量 <span id="busuanzi_value_page_pv">0</span> 次</span>
</footer>
<script type="module" src="AlgorithmLibrary/PAGE3D.js"></script>
</body>
</html>
```

- [ ] **Step 3: 语法验证（模板为静态文件，验证结构）**

Run: `grep -c "importmap\|AlgorithmLibrary/PAGE3D.js" template3d.html`
Expected: 输出 2

- [ ] **Step 4: 提交**

```bash
git add visualizationPageStyle3d.css template3d.html
git commit -m "feat(3d): add 3D page stylesheet and page template"
```

---

### Task 13: StackArray.html + AlgorithmLibrary/StackArray3D.js（Array3D 模式验证）

**Files:**
- Modify: `StackArray.html`（整体替换）
- Create: `AlgorithmLibrary/StackArray3D.js`

- [ ] **Step 1: 替换 StackArray.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="renderer" content="webkit">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<meta name="keywords" content="算法可视化,二叉树,红黑树,索引,visual.erik.xyz">
<title>堆栈（数组实现）</title>
<link rel="shortcut icon" href="favicon.ico">
<link rel="stylesheet" href="visualizationPageStyle3d.css">
<script type="importmap">
{ "imports": { "three": "./ThirdParty/three/build/three.module.js" } }
</script>
</head>
<body>
<div id="app">
  <header id="header">
    <h1>堆栈（数组实现）</h1>
    <a href="Algorithms.html" class="home-link">← 返回目录</a>
  </header>
  <div id="controls"></div>
  <div id="scene"></div>
  <div id="playbar"></div>
</div>
<footer>
  <a href="Algorithms.html" style="color:#64748b;">算法可视化</a>
  <script async src="//busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js"></script>
  <span id="busuanzi_container_page_pv"> | 本文总阅读量 <span id="busuanzi_value_page_pv">0</span> 次</span>
</footer>
<script type="module" src="AlgorithmLibrary/StackArray3D.js"></script>
</body>
</html>
```

- [ ] **Step 2: 写页面脚本**

```js
// AlgorithmLibrary/StackArray3D.js
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { Array3D } from '../3D/modes/Array3D.js';
import { VText, VBox, VArrow } from '../3D/VisualObject3D.js';
import { PALETTE } from '../3D/Glow.js';

const SIZE = 15;
const scene = new Scene3D('scene', { cameraPos: [0, 220, 640], fov: 55 });
const engine = new AnimationEngine({ speed: 1.2 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand({ duration, fn, undo: undo || (() => {}) });

// 数组槽位（中心 x=0）
const array = new Array3D(scene, { count: SIZE, startY: -40, w: 46, h: 46, spacing: 50 });
array.create();

// top 指示器（数组右侧上方）
const rightX = array.xOf(SIZE - 1);
const topLabel = new VText(scene, { text: 'top', x: rightX + 70, y: 60, z: 0, color: PALETTE.textGlow, scale: 0.8 });
const topBox = new VBox(scene, { w: 46, h: 46, d: 28, x: rightX + 70, y: -40, z: 0, label: '0', color: PALETTE.blue, emissive: PALETTE.blueEmissive });
const arrow = new VArrow(scene, { x: rightX + 70, y: 0, z: 0, down: true });

// 浮动提示标签（顶部中央）
const hint = new VText(scene, { text: '', x: 0, y: 200, z: 0, color: PALETTE.textGlow, scale: 0.9 });
const status = panel.addStatus('');

const state = { top: 0, data: new Array(SIZE) };
void topLabel;

function moveArrowTo(x, y, duration) {
  C(duration, (p) => {
    const sx = arrow.group.position.x, sy = arrow.group.position.y;
    arrow.group.position.x = sx + (x - sx) * p;
    arrow.group.position.y = sy + (y - sy) * p;
  });
}

function push(value) {
  if (state.top >= SIZE) { status.textContent = '栈已满'; return; }
  status.textContent = '入栈: ' + value;
  hint.setText('入栈: ' + value);
  // 高亮目标槽位
  array.highlight(state.top, C);
  moveArrowTo(array.xOf(state.top), -40, 350);
  // 浮动值标签动画到槽位
  const tmp = new VText(scene, { text: value, x: 0, y: 200, z: 0, color: PALETTE.text, scale: 1 });
  const targetX = array.xOf(state.top);
  C(450, (p) => {
    tmp.sprite.position.x = 0 + (targetX - 0) * p;
    tmp.sprite.position.y = 200 + (-40 - 200) * p;
  }, () => { tmp.remove(); });
  state.data[state.top] = value;
  array.setValue(state.top, value, C);
  C(60, () => tmp.remove(), () => {});
  state.top++;
  // 更新 top 显示
  C(150, () => topBox.setText(String(state.top)));
  array.unhighlight(state.top - 1, C);
  status.textContent = '';
  hint.setText('');
}

function pop() {
  if (state.top <= 0) { status.textContent = '栈为空'; return; }
  const value = state.data[state.top - 1];
  status.textContent = '出栈: ' + value;
  hint.setText('出栈: ' + value);
  state.top--;
  moveArrowTo(array.xOf(state.top), -40, 350);
  array.setValue(state.top, '', C);
  C(150, () => topBox.setText(String(state.top)));
  status.textContent = '';
  hint.setText('');
}

function clear() {
  for (let i = 0; i < state.top; i++) array.setValue(i, '', C);
  state.top = 0;
  moveArrowTo(rightX + 70, 0, 300);
  C(150, () => topBox.setText('0'));
}

// 控件
let pushInput = panel.addInput('输入数字', (v) => { if (v) push(v.trim()); }, 6);
panel.addButton('入栈', () => { if (pushInput.value) push(pushInput.value.trim()); });
panel.addButton('出栈', pop);
panel.addButton('清空', clear);
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

// 初始空栈箭头位置
arrow.group.position.set(rightX + 70, 0, 0);

scene.start(engine);
```

- [ ] **Step 3: 浏览器验证**

Run: `python3 -m http.server 8000`（后台）→ 打开 `http://localhost:8000/StackArray.html`，验证：
- 页面加载无控制台错误；星空/地面/15 个槽位可见
- 输入 5 点"入栈"：浮动标签动画→值落入槽位→箭头移动→top 更新
- 点"出栈"：值清空、top 回退
- 拖拽旋转、滚轮缩放、播放/暂停/单步/撤销按钮可用

- [ ] **Step 4: 提交**

```bash
git add StackArray.html AlgorithmLibrary/StackArray3D.js
git commit -m "feat(3d): port StackArray to three.js (Array3D mode validation)"
```

---

### Task 14: BST.html + AlgorithmLibrary/BST3D.js（Tree3D 模式验证）

**Files:**
- Modify: `BST.html`（整体替换，结构同 Task 13，标题「二叉搜索树」，脚本 `AlgorithmLibrary/BST3D.js`）
- Create: `AlgorithmLibrary/BST3D.js`

- [ ] **Step 1: 替换 BST.html**

同 Task 13 模板，替换：`<title>二叉搜索树</title>`、`<h1>二叉搜索树</h1>`、`src="AlgorithmLibrary/BST3D.js"`。

- [ ] **Step 2: 写页面脚本**

```js
// AlgorithmLibrary/BST3D.js
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { Tree3D } from '../3D/modes/Tree3D.js';
import { PALETTE } from '../3D/Glow.js';

const scene = new Scene3D('scene', { cameraPos: [0, 240, 560], fov: 55 });
const engine = new AnimationEngine({ speed: 1.2 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand({ duration, fn, undo: undo || (() => {}) });

const tree = new Tree3D(scene);
const status = panel.addStatus('');

// ---- 树数据 ----
let root = null;         // { key, left, right, parent }
let nextId = 0;
const treeState = new Map();  // key -> { node, entry }

function findNode(key) {
  let cur = root;
  while (cur) { if (key === cur.key) return cur; cur = key < cur.key ? cur.left : cur.right; }
  return null;
}

function insertRec(node, key) {
  if (!node) return { key, left: null, right: null, parent: null, id: nextId++ };
  if (key < node.key) { node.left = insertRec(node.left, key); node.left.parent = node.key; }
  else if (key > node.key) { node.right = insertRec(node.right, key); node.right.parent = node.key; }
  return node;
}

function removeRec(node, key) {
  if (!node) return null;
  if (key < node.key) { node.left = removeRec(node.left, key); if (node.left) node.left.parent = node.key; }
  else if (key > node.key) { node.right = removeRec(node.right, key); if (node.right) node.right.parent = node.key; }
  else {
    if (!node.left) return node.right;
    if (!node.right) return node.left;
    let pred = node.left;
    while (pred.right) pred = pred.right;
    node.key = pred.key;
    node.left = removeRec(node.left, pred.key);
    if (node.left) node.left.parent = node.key;
  }
  return node;
}

function layoutPositions() {
  const order = [];
  (function inOrder(n) { if (!n) return; inOrder(n.left); order.push(n); inOrder(n.right); })(root);
  const pos = new Map();
  const total = order.length;
  order.forEach((n, i) => {
    const depth = depthOf(n);
    pos.set(n.key, { x: (i - (total - 1) / 2) * (64 + depth * 14), y: 180 - depth * 95, z: depth * 2 });
  });
  return pos;
}

function depthOf(n) {
  let d = 0, cur = n;
  while (cur.parent != null) { d++; cur = findNode(cur.parent); if (!cur) break; }
  return d;
}

function drawAll() {
  tree.clear();
  treeState.clear();
  const pos = layoutPositions();
  (function walk(n) {
    if (!n) return;
    const p = pos.get(n.key);
    const vn = tree.addNode(n.key, String(n.key), p.x, p.y, p.z, { parentId: n.parent ?? null });
    treeState.set(n.key, { node: vn });
    walk(n.left);
    walk(n.right);
  })(root);
}

function highlightPath(key) {
  let cur = root;
  const path = [];
  while (cur && cur.key !== key) { path.push(cur.key); cur = key < cur.key ? cur.left : cur.right; }
  if (cur) path.push(cur.key);
  path.forEach(k => tree.highlight(k, C));
  return !!cur;
}

function insertValue(v) {
  const key = parseInt(v);
  if (isNaN(key)) return;
  if (findNode(key)) { status.textContent = key + ' 已存在'; return; }
  status.textContent = '插入 ' + key;
  root = insertRec(root, key);
  drawAll();
  tree.highlight(key, C);
  status.textContent = '';
}

function removeValue(v) {
  const key = parseInt(v);
  if (!findNode(key)) { status.textContent = key + ' 不存在'; return; }
  status.textContent = '删除 ' + key;
  root = removeRec(root, key);
  drawAll();
  status.textContent = '';
}

function findValue(v) {
  const key = parseInt(v);
  const found = highlightPath(key);
  status.textContent = found ? key + ' 存在' : key + ' 不存在';
}

function randomTree() {
  tree.clear();
  treeState.clear();
  root = null;
  nextId = 0;
  const vals = [...new Set(Array.from({ length: 12 }, () => Math.floor(Math.random() * 90) + 10))];
  for (const v of vals) root = insertRec(root, v);
  drawAll();
}

// 控件
let input = panel.addInput('输入数字', (v) => { if (v) insertValue(v); }, 6);
panel.addButton('插入', () => { if (input.value) insertValue(input.value); });
panel.addButton('删除', () => { if (input.value) removeValue(input.value); });
panel.addButton('查找', () => { if (input.value) findValue(input.value); });
panel.addButton('随机生成', randomTree);
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

// 初始随机树
randomTree();
scene.start(engine);
```

- [ ] **Step 3: 浏览器验证**

打开 `http://localhost:8000/BST.html`：
- 随机树渲染：多层 z 错开、父子连线、节点发光
- 插入新值：路径高亮 → 新节点出现
- 删除：节点消失、连线重绘
- 查找：路径高亮

- [ ] **Step 4: 提交**

```bash
git add BST.html AlgorithmLibrary/BST3D.js
git commit -m "feat(3d): port BST to three.js (Tree3D mode validation)"
```

---

### Task 15: BFS.html + AlgorithmLibrary/BFS3D.js（Graph3D 模式验证）

**Files:**
- Modify: `BFS.html`（整体替换）
- Create: `AlgorithmLibrary/BFS3D.js`

- [ ] **Step 1: 替换 BFS.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="renderer" content="webkit">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<meta name="keywords" content="算法可视化,广度优先搜索,图,BFS,visual.erik.xyz">
<title>广度优先搜索</title>
<link rel="shortcut icon" href="favicon.ico">
<link rel="stylesheet" href="visualizationPageStyle3d.css">
<script type="importmap">
{ "imports": { "three": "./ThirdParty/three/build/three.module.js" } }
</script>
</head>
<body>
<div id="app">
  <header id="header">
    <h1>广度优先搜索（BFS）</h1>
    <a href="Algorithms.html" class="home-link">← 返回目录</a>
  </header>
  <div id="controls"></div>
  <div id="scene"></div>
  <div id="playbar"></div>
</div>
<footer>
  <a href="Algorithms.html" style="color:#64748b;">算法可视化</a>
  <script async src="//busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js"></script>
  <span id="busuanzi_container_page_pv"> | 本文总阅读量 <span id="busuanzi_value_page_pv">0</span> 次</span>
</footer>
<script type="module" src="AlgorithmLibrary/BFS3D.js"></script>
</body>
</html>
```

- [ ] **Step 2: 写页面脚本**

```js
// AlgorithmLibrary/BFS3D.js
// 随机无向图（圆形布局）→ BFS 遍历动画：当前节点高亮、访问边点亮、
// 队列可视化（顶部一排小盒，出队左移）、遍历顺序状态提示。
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { Graph3D } from '../3D/modes/Graph3D.js';
import { VBox, VText } from '../3D/VisualObject3D.js';
import { PALETTE } from '../3D/Glow.js';

const scene = new Scene3D('scene', { cameraPos: [0, 300, 620], fov: 55 });
const engine = new AnimationEngine({ speed: 1.2 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand({ duration, fn, undo: undo || (() => {}) });

const N = 8;
const R = 230;
const graph = new Graph3D(scene, { radius: 17 });
for (let i = 0; i < N; i++) {
  const a = (i / N) * Math.PI * 2 - Math.PI / 2;
  graph.addNode(String(i), String(i), Math.cos(a) * R, 0, Math.sin(a) * R);
}

let adj = Array.from({ length: N }, () => []);

function randomGraph() {
  for (const key of [...graph.edges.keys()]) {
    const e = graph.edges.get(key);
    scene.remove(e.mesh);
    if (e.weightLabel) e.weightLabel.remove();
    graph.edges.delete(key);
  }
  adj = Array.from({ length: N }, () => []);
  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      if (Math.random() < 0.35) {
        graph.addEdge(String(i), String(j));
        adj[i].push(j); adj[j].push(i);
      }
    }
  }
  // 保证连通：补一个环
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N;
    if (!adj[i].includes(j)) {
      graph.addEdge(String(i), String(j));
      adj[i].push(j); adj[j].push(i);
    }
  }
}

// 队列可视化（顶部一排小盒，入队弹出，出队左移）
const queueBoxes = []; // {id, box}

function enqueueBox(id) {
  const x = -190 + queueBoxes.length * 55;
  const box = new VBox(scene, { w: 42, h: 42, d: 22, x, y: 180, z: 0, label: id, color: PALETTE.blue, emissive: PALETTE.blueEmissive });
  box.mesh.scale.setScalar(0.01);
  C(300, (p) => { box.mesh.scale.setScalar(0.01 + p * 0.99); });
  queueBoxes.push({ id, box });
}

function dequeueBox() {
  const e = queueBoxes.shift();
  if (!e) return;
  C(250, (p) => { e.box.mesh.scale.setScalar(1 - p); }, () => e.box.remove());
  queueBoxes.forEach(({ box }) => {
    const from = box.mesh.position.x;
    C(300, (p) => { box.mesh.position.x = from - 55 * p; });
  });
}

const status = panel.addStatus('');
const hint = new VText(scene, { text: '', x: 0, y: 235, z: 0, color: PALETTE.textGlow, scale: 0.85 });

function bfs() {
  engine.clear();
  // 复位节点与边颜色
  for (let i = 0; i < N; i++) graph.dehighlightNode(String(i), C);
  for (const key of graph.edges.keys()) {
    const [a, b] = key.split('->');
    graph.lightEdge(a, b, false, C);
  }
  while (queueBoxes.length) dequeueBox();

  const visited = new Set();
  const order = [];
  const queue = [];
  const startId = '0';
  visited.add(startId);
  queue.push(startId);
  enqueueBox(startId);
  graph.highlightNode(startId, C, 0x34d399);
  hint.setText('起点 0 入队');

  function visitNext() {
    if (!queue.length) { finish(); return; }
    const cur = queue.shift();
    order.push(cur);
    dequeueBox();
    graph.highlightNode(cur, C);
    hint.setText('出队 ' + cur + '，访问其邻居');
    let pending = 0;
    for (const nb of adj[Number(cur)]) {
      const nbId = String(nb);
      if (visited.has(nbId)) continue;
      visited.add(nbId);
      queue.push(nbId);
      pending++;
      graph.lightEdge(cur, nbId, true, C);
      C(90, () => enqueueBox(nbId));
      graph.highlightNode(nbId, C, 0x34d399);
    }
    C(200, () => visitNext());
  }

  function finish() {
    status.textContent = 'BFS 顺序: ' + order.join(' → ');
    hint.setText('遍历完成，访问顺序: ' + order.join(' → '));
  }

  visitNext();
}

function resetAll() {
  engine.clear();
  queueBoxes.forEach((e) => e.box.remove());
  queueBoxes.length = 0;
  randomGraph();
  for (let i = 0; i < N; i++) graph.dehighlightNode(String(i), C);
  hint.setText('新图已生成，点击 BFS 开始遍历');
}

randomGraph();

// 控件
panel.addButton('BFS', bfs);
panel.addButton('新图', resetAll);
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

scene.start(engine);
```

- [ ] **Step 3: 浏览器验证**

打开 `http://localhost:8000/BFS.html`：
- 随机图渲染：8 个悬浮节点球 + 半透明连线（含环，保证连通）
- BFS：起点入队 → 依次出队，邻居变绿、边点亮、顶部队列小盒伸缩
- 遍历结束：状态栏显示访问顺序
- 新图：图重建

- [ ] **Step 4: 提交**

```bash
git add BFS.html AlgorithmLibrary/BFS3D.js
git commit -m "feat(3d): port BFS to three.js (Graph3D mode validation)"
```

---

### Task 16: DPFib.html + AlgorithmLibrary/DPFib3D.js（Table3D 模式验证）

**Files:**
- Modify: `DPFib.html`（整体替换）
- Create: `AlgorithmLibrary/DPFib3D.js`

- [ ] **Step 1: 替换 DPFib.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="renderer" content="webkit">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<meta name="keywords" content="算法可视化,斐波那契,动态规划,DP,visual.erik.xyz">
<title>斐波那契（动态规划）</title>
<link rel="shortcut icon" href="favicon.ico">
<link rel="stylesheet" href="visualizationPageStyle3d.css">
<script type="importmap">
{ "imports": { "three": "./ThirdParty/three/build/three.module.js" } }
</script>
</head>
<body>
<div id="app">
  <header id="header">
    <h1>斐波那契（动态规划）</h1>
    <a href="Algorithms.html" class="home-link">← 返回目录</a>
  </header>
  <div id="controls"></div>
  <div id="scene"></div>
  <div id="playbar"></div>
</div>
<footer>
  <a href="Algorithms.html" style="color:#64748b;">算法可视化</a>
  <script async src="//busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js"></script>
  <span id="busuanzi_container_page_pv"> | 本文总阅读量 <span id="busuanzi_value_page_pv">0</span> 次</span>
</footer>
<script type="module" src="AlgorithmLibrary/DPFib3D.js"></script>
</body>
</html>
```

- [ ] **Step 2: 写页面脚本**

```js
// AlgorithmLibrary/DPFib3D.js
// 动态规划计算斐波那契：3D 表格面板，F[0]=0、F[1]=1 预填，
// 计算时两个操作数单元格高亮发光，结果单元格留光迹。
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { Table3D } from '../3D/modes/Table3D.js';
import { VText } from '../3D/VisualObject3D.js';
import { PALETTE } from '../3D/Glow.js';

const scene = new Scene3D('scene', { cameraPos: [0, 240, 640], fov: 55 });
const engine = new AnimationEngine({ speed: 1.2 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand({ duration, fn, undo: undo || (() => {}) });

const MAXN = 15;
const table = new Table3D(scene, { rows: 1, cols: MAXN + 1, startY: 40, cellW: 64, cellH: 48 });
table.create();
table.setRowLabel(0, 'F');

const hint = new VText(scene, { text: '', x: 0, y: 210, z: 0, color: PALETTE.textGlow, scale: 0.85 });
const status = panel.addStatus('');

const F = new Array(MAXN + 1).fill(null);
F[0] = 0;
F[1] = 1;
table.setCell(0, 0, '0', C);
table.setCell(0, 1, '1', C);

let n = 6;

function compute() {
  for (let i = 2; i <= n; i++) {
    const a = F[i - 1], b = F[i - 2];
    table.highlightCell(0, i - 1, C);
    table.highlightCell(0, i - 2, C);
    hint.setText('F[' + i + '] = F[' + (i - 1) + '] + F[' + (i - 2) + '] = ' + a + ' + ' + b + ' = ' + (a + b));
    F[i] = a + b;
    table.setCell(0, i, String(F[i]), C);
    table.unhighlightCell(0, i - 1, C);
    table.unhighlightCell(0, i - 2, C);
    table.highlightCell(0, i, C); // 结果留光迹
  }
  hint.setText('完成: F[' + n + '] = ' + F[n]);
  status.textContent = 'F[' + n + '] = ' + F[n];
}

function clearAll() {
  for (let i = 2; i <= MAXN; i++) {
    F[i] = null;
    table.setCell(0, i, '', C);
    table.unhighlightCell(0, i, C);
  }
  hint.setText('');
  status.textContent = '';
}

// 控件
let nInput = panel.addInput('n (1-15)', (v) => { const x = parseInt(v, 10); if (x >= 1 && x <= MAXN) n = x; }, 3);
panel.addButton('计算', compute);
panel.addButton('清空', clearAll);
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

scene.start(engine);
```

- [ ] **Step 3: 浏览器验证**

打开 `http://localhost:8000/DPFib.html`：
- 表格面板渲染：列标签 0..15，F[0]=0、F[1]=1 已填
- 计算：从 i=2 开始，操作数单元格高亮并上下浮动 → 结果出现 → 操作数恢复、结果留光迹
- 清空：2..15 格清空、光迹消失

- [ ] **Step 4: 提交**

```bash
git add DPFib.html AlgorithmLibrary/DPFib3D.js
git commit -m "feat(3d): port DPFib to three.js (Table3D mode validation)"
```

---

### Task 17: RotateScale3D.html + AlgorithmLibrary/RotateScale3D3D.js（Geometry3D 模式验证）

**Files:**
- Modify: `RotateScale3D.html`（整体替换）
- Create: `AlgorithmLibrary/RotateScale3D3D.js`

- [ ] **Step 1: 替换 RotateScale3D.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="renderer" content="webkit">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<meta name="keywords" content="算法可视化,旋转,缩放,3D,几何变换,visual.erik.xyz">
<title>旋转与缩放（3D）</title>
<link rel="shortcut icon" href="favicon.ico">
<link rel="stylesheet" href="visualizationPageStyle3d.css">
<script type="importmap">
{ "imports": { "three": "./ThirdParty/three/build/three.module.js" } }
</script>
</head>
<body>
<div id="app">
  <header id="header">
    <h1>旋转与缩放（3D）</h1>
    <a href="Algorithms.html" class="home-link">← 返回目录</a>
  </header>
  <div id="controls"></div>
  <div id="scene"></div>
  <div id="playbar"></div>
</div>
<footer>
  <a href="Algorithms.html" style="color:#64748b;">算法可视化</a>
  <script async src="//busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js"></script>
  <span id="busuanzi_container_page_pv"> | 本文总阅读量 <span id="busuanzi_value_page_pv">0</span> 次</span>
</footer>
<script type="module" src="AlgorithmLibrary/RotateScale3D3D.js"></script>
</body>
</html>
```

- [ ] **Step 2: 写页面脚本**

```js
// AlgorithmLibrary/RotateScale3D3D.js
// 3D 坐标轴（XYZ 彩色箭头）+ 网格地面 + "房子"多面体。
// 绕 Z 旋转 + X/Y 缩放（v' = R·S·v），动画补间 + 实时变换矩阵显示。
import * as THREE from 'three';
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { Geometry3D } from '../3D/modes/Geometry3D.js';
import { VText, easeInOut } from '../3D/VisualObject3D.js';
import { PALETTE } from '../3D/Glow.js';

const scene = new Scene3D('scene', { cameraPos: [0, 260, 620], fov: 55 });
const engine = new AnimationEngine({ speed: 1.2 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand({ duration, fn, undo: undo || (() => {}) });

const geo = new Geometry3D(scene, { axisLen: 200 });
// 房子 = 盒身 + 四棱锥屋顶（合成 Group）
geo.addShape([new THREE.BoxGeometry(100, 64, 64), new THREE.ConeGeometry(70, 56, 4)], { color: 0xa855f7, opacity: 0.92 });
geo.shape.children[1].position.y = 32 + 28;
geo.shape.children[1].rotation.y = Math.PI / 4;

const matrixText = new VText(scene, { text: '', x: 0, y: -130, z: 0, color: PALETTE.textDim, scale: 0.72 });
const hint = new VText(scene, { text: '', x: 0, y: 230, z: 0, color: PALETTE.textGlow, scale: 0.8 });

let angleDeg = 0, scaleX = 1, scaleY = 1;

function updateMatrix() {
  const rad = angleDeg * Math.PI / 180;
  const m00 = (Math.cos(rad) * scaleX).toFixed(2);
  const m01 = (-Math.sin(rad) * scaleY).toFixed(2);
  const m10 = (Math.sin(rad) * scaleX).toFixed(2);
  const m11 = (Math.cos(rad) * scaleY).toFixed(2);
  matrixText.setText('M = [ ' + m00 + '  ' + m01 + ' ]   [ ' + m10 + '  ' + m11 + ' ]');
}

function applyTransform() {
  const fromRot = geo.shape.rotation.z;
  const fromSX = geo.shape.scale.x, fromSY = geo.shape.scale.y;
  const toRot = angleDeg * Math.PI / 180;
  hint.setText('旋转 ' + angleDeg + '°，缩放 (' + scaleX + ', ' + scaleY + ')');
  C(700, (p) => {
    const t = easeInOut(p);
    geo.shape.rotation.z = fromRot + (toRot - fromRot) * t;
    geo.shape.scale.set(fromSX + (scaleX - fromSX) * t, fromSY + (scaleY - fromSY) * t, 1);
  });
  C(60, updateMatrix);
}

function reset() {
  angleDeg = 0; scaleX = 1; scaleY = 1;
  rotSlider.value = 0; sxSlider.value = 1; sySlider.value = 1;
  applyTransform();
  hint.setText('已重置');
}

panel.addLabel('旋转角（绕 Z 轴）');
const rotSlider = panel.addSlider('θ', -180, 180, 5, 0, (v) => { angleDeg = v; });
panel.addLabel('缩放');
const sxSlider = panel.addSlider('X', 0.2, 3, 0.1, 1, (v) => { scaleX = v; });
const sySlider = panel.addSlider('Y', 0.2, 3, 0.1, 1, (v) => { scaleY = v; });
panel.addButton('应用', applyTransform);
panel.addButton('重置', reset);
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

updateMatrix();
scene.start(engine);
```

- [ ] **Step 3: 浏览器验证**

打开 `http://localhost:8000/RotateScale3D.html`：
- XYZ 彩色箭头坐标轴 + 网格地面 + 紫色"房子"
- 拖 θ 滑块到 90 → 应用：房子绕 Z 轴动画旋转，矩阵文本实时更新
- 缩放 X=2 → 应用：房子横向拉伸

- [ ] **Step 4: 提交**

```bash
git add RotateScale3D.html AlgorithmLibrary/RotateScale3D3D.js
git commit -m "feat(3d): port RotateScale3D to three.js (Geometry3D mode validation)"
```

---

### Task 18: Playwright 冒烟验证 5 个验证页 + 收尾提交

**Files:** 无（验证与收尾）

- [ ] **Step 1: 启动本地服务器**

Run: `cd /home/project/visual && python3 -m http.server 8000`（后台运行）
Expected: http://localhost:8000 可访问

- [ ] **Step 2: 逐页冒烟验证**

用 Playwright（browser MCP）依次打开 5 页，每页检查：

1. 控制台无红色报错（browser_console_messages level=error 为空）
2. 截图确认渲染：星空背景 + 网格地面 + 发光图元（browser_take_screenshot）
3. 控件操作：
   - StackArray.html：入栈 3 个值 → 柱体依次出现；出栈 → 消失；清空
   - BST.html：随机生成 → 多层树渲染；插入 50 → 路径高亮 → 新节点出现
   - BFS.html：随机图渲染；点 BFS → 遍历动画（节点变绿、边点亮、顶部队列盒出现）
   - DPFib.html：计算 → 单元格逐个高亮填充；清空
   - RotateScale3D.html：θ 滑块拖到 90 → 应用 → 房子旋转；缩放 X=2 → 应用
4. 播放条：▶ 播放 / ⏭ 单步 / ↩ 撤销 / 速度滑块均可点击，动画正常推进
5. WebGL 降级：无（本机支持 WebGL 时无需验证，仅确认无 JS 异常）

- [ ] **Step 3: 修复发现的问题并复验**

若某页报错或渲染异常：修复对应 `3D/` 或 `AlgorithmLibrary/` 文件后重新打开该页，直到控制台无错误。

- [ ] **Step 4: 收尾提交**

```bash
git add 3D/ ThirdParty/ visualizationPageStyle3d.css template3d.html StackArray.html BST.html BFS.html DPFib.html RotateScale3D.html AlgorithmLibrary/
git commit -m "feat(3d): 3D infrastructure + 5 mode validation pages (phase 1)"
```

（若前面任务均已各自提交，本步无新改动则跳过 commit。）

- [ ] **Step 5: 阶段验收**

- [ ] 5 个 mode（Array3D/Tree3D/Graph3D/Table3D/Geometry3D）均经真实页面验证可用
- [ ] 基础设施（Scene3D/Glow/VisualObject3D/AnimationEngine/ControlPanel）无阻塞问题
- [ ] 播放条四件套（播放/单步/撤销/速度）可用
- [ ] 结果同步给用户：展示 1-2 张截图，确认视觉风格符合"深空科幻"，再进入 2a 批次（44 页）


