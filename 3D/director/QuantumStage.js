// 3D/director/QuantumStage.js — 量子振幅舞台：振幅柱 + 波形 + 均值线 + 目标标记。
// 负振幅柱向下穿过基线；概率 = |a|²，标签分两行固定在柱阵上方避免互相遮挡。
import * as THREE from 'three';
import { VText } from '../VisualObject3D.js';
import { PALETTE, glowMaterial } from '../Glow.js';

const GREEN = 0x4ade80, RED = 0xfb7185, GOLD = 0xfcd34d, DIM = 0x334155;

export class QuantumStage {
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.n = opts.n ?? 8;
    this.target = Math.min(opts.target ?? 5, this.n - 1);
    this.scale = opts.scale ?? 1;
    this.center = new THREE.Vector3(...(opts.center || [320, 300, 0]));
    this.span = (opts.span ?? (this.n <= 8 ? 760 : 880)) * this.scale;
    this.spacing = this.span / this.n;
    this.baseY = this.center.y;
    this.H = 270 * this.scale;
    this.barW = this.spacing * 0.58;
    this.values = Array(this.n).fill(1 / Math.sqrt(this.n));
    this.measured = false;
    this.bars = [];
    this.labels = [];
    this.probLabels = [];
    this.group = new THREE.Group();
    scene.add(this.group);
    this.build();
    this.offFrame = scene.onFrame((dt) => this.tick(dt));
    this.setAmps(this.values);
  }

  x(i) { return this.center.x + (i - (this.n - 1) / 2) * this.spacing; }

  build() {
    const s = this.scale, base = this.baseY, cx = this.center.x;
    const s0 = this.n <= 8 ? 0.5 : 0.38;
    const rowProb = base + this.H + 46 * s;
    const rowName = base + this.H + 82 * s;

    this.barGeo = new THREE.BoxGeometry(this.barW, 1, Math.max(10 * s, this.barW * 0.75));
    for (let i = 0; i < this.n; i++) {
      const mat = glowMaterial(GREEN, { emissiveIntensity: 0.55 });
      const mesh = new THREE.Mesh(this.barGeo, mat);
      mesh.position.set(this.x(i), base, this.center.z);
      mesh.userData.index = i;
      this.group.add(mesh);
      this.bars.push({ mesh });
      this.labels.push(new VText(this.scene, {
        text: 'x=' + i, x: this.x(i), y: rowName, z: this.center.z,
        color: PALETTE.textDim, scale: s0,
      }));
      this.probLabels.push(new VText(this.scene, {
        text: '—', x: this.x(i), y: rowProb, z: this.center.z,
        color: '#bbf7d0', scale: s0,
      }));
    }

    const baseline = new THREE.Mesh(
      new THREE.BoxGeometry(this.span + 90 * s, 2 * s, 6 * s),
      new THREE.MeshBasicMaterial({ color: 0x475569, transparent: true, opacity: 0.8 }),
    );
    baseline.position.set(cx, base, this.center.z);
    this.group.add(baseline);

    const waveGeo = new THREE.BufferGeometry();
    this.wavePos = new Float32Array(this.n * 3);
    for (let i = 0; i < this.n; i++) {
      this.wavePos[i * 3] = this.x(i);
      this.wavePos[i * 3 + 1] = base;
      this.wavePos[i * 3 + 2] = this.center.z;
    }
    waveGeo.setAttribute('position', new THREE.BufferAttribute(this.wavePos, 3));
    this.wave = new THREE.Line(waveGeo, new THREE.LineBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.8 }));
    this.group.add(this.wave);

    this.meanLine = new THREE.Mesh(
      new THREE.BoxGeometry(this.span + 30 * s, 2.2 * s, 2.2 * s),
      new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.55 }),
    );
    this.meanLine.position.set(cx, base, this.center.z);
    this.group.add(this.meanLine);
    this.meanLabel = new VText(this.scene, {
      text: 'μ', x: cx + this.span / 2 + 40 * s, y: base, z: this.center.z,
      color: '#fde68a', scale: 0.42,
    });
    this.labels.push(this.meanLabel);

    this.ring = new THREE.Mesh(
      new THREE.TorusGeometry(Math.max(20 * s, this.barW * 0.8), 2.6 * s, 8, 36),
      new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.9 }),
    );
    this.ring.rotation.x = Math.PI / 2;
    this.ring.position.set(this.x(this.target), base + 3 * s, this.center.z);
    this.group.add(this.ring);
  }

  probability(i) { return this.values[i] * this.values[i]; }

  probColor(i) {
    if (this.measured) return i === this.target ? '#fde68a' : '#64748b';
    return this.values[i] < 0 ? '#fca5a5' : '#bbf7d0';
  }

  setAmps(values, withLabels = true) {
    this.values = values.slice();
    this.measured = false;
    const H = this.H, base = this.baseY;
    let sum = 0;
    for (let i = 0; i < this.n; i++) {
      const a = values[i];
      sum += a;
      const h = Math.max(Math.abs(a) * H, 0.8);
      const bar = this.bars[i];
      bar.mesh.scale.y = h;
      bar.mesh.position.y = base + (a >= 0 ? h / 2 : -h / 2);
      bar.mesh.material.color.setHex(a < 0 ? RED : GREEN);
      bar.mesh.material.emissive.setHex(a < 0 ? RED : GREEN);
      this.wavePos[i * 3 + 1] = base + a * H;
      if (withLabels) {
        this.probLabels[i].setText((a * a * 100).toFixed(1) + '%', { color: this.probColor(i) });
      }
    }
    this.wave.geometry.attributes.position.needsUpdate = true;
    this.meanLine.position.y = base + (sum / this.n) * H;
    this.meanLabel.sprite.position.y = this.meanLine.position.y;
    if (withLabels) {
      this.meanLabel.setText('μ=' + (sum / this.n >= 0 ? '+' : '') + (sum / this.n).toFixed(2), { color: '#fde68a', scale: 0.42 });
    }
  }

  setTarget(i) {
    this.target = i;
    this.ring.position.x = this.x(i);
    this.labels.forEach((l, k) => {
      if (k < this.n) l.setText('x=' + k, { color: k === i ? '#fde68a' : PALETTE.textDim, scale: this.n <= 8 ? 0.5 : 0.38 });
    });
    if (this.probLabels) {
      this.probLabels.forEach((l, k) => l.setText((this.values[k] * this.values[k] * 100).toFixed(1) + '%', { color: this.probColor(k) }));
    }
  }

  measure(i = this.target) {
    this.measured = true;
    this.bars.forEach((b, k) => {
      const hex = k === i ? GOLD : DIM;
      b.mesh.material.color.setHex(hex);
      b.mesh.material.emissive.setHex(hex);
      this.probLabels[k].setText((this.values[k] * this.values[k] * 100).toFixed(1) + '%', { color: this.probColor(k) });
    });
    this.ring.position.x = this.x(i);
  }

  pos(i) {
    return new THREE.Vector3(this.x(i), this.baseY + Math.max(this.values[i] * this.H, 0) + 34 * this.scale, this.center.z);
  }

  meanPos() {
    return new THREE.Vector3(this.center.x, this.meanLine.position.y + 26 * this.scale, this.center.z);
  }

  barMeshes() { return this.bars.map((b) => b.mesh); }

  tick(dt) {
    this.ring.rotation.z += dt * 1.1;
  }

  dispose() {
    if (this.offFrame) this.offFrame();
    this.labels.forEach((l) => l.remove());
    this.probLabels.forEach((l) => l.remove());
    this.labels = [];
    this.probLabels = [];
    this.group.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
    this.scene.remove(this.group);
    this.bars = [];
  }
}
