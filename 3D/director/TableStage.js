// 3D/director/TableStage.js — DP 表格舞台：格阵 + 行列轴标 + 焦点环 + 依赖箭头 + 地形拉伸。
// 页面只改数值/颜色/箭头；输入变化时 dispose() 后重建。
import * as THREE from 'three';
import { VBox, VText } from '../VisualObject3D.js';
import { PALETTE } from '../Glow.js';

const UP = new THREE.Vector3(0, 1, 0);

// 文字纹理走 Glow 缓存、Sprite 几何由 three.js 全站共享：只释放格子的私有几何和材质。
function release(scene, obj) {
  if (!obj) return;
  const root = obj.mesh || obj.sprite || obj.group || obj;
  obj.remove?.();
  scene.remove(root);
  root.traverse?.((o) => {
    if (o.geometry && !o.isSprite) o.geometry.dispose();
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
  });
}

function makeArrow(scene) {
  const geo = new THREE.BufferGeometry();
  const line = new THREE.Line(geo, new THREE.LineDashedMaterial({
    color: 0x67e8f9, dashSize: 5, gapSize: 3.5, transparent: true, opacity: 0.95, depthWrite: false,
  }));
  line.frustumCulled = false;
  const head = new THREE.Mesh(
    new THREE.ConeGeometry(5.5, 13, 8),
    new THREE.MeshBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.95, depthWrite: false }),
  );
  head.frustumCulled = false;
  scene.add(line, head);
  const v0 = new THREE.Vector3(), v1 = new THREE.Vector3(), v2 = new THREE.Vector3();
  return { line, head, geo, v0, v1, v2, curve: new THREE.QuadraticBezierCurve3(v0, v1, v2) };
}

export class TableStage {
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.rows = opts.rows;
    this.cols = opts.cols;
    this.cw = opts.cellW ?? 44;
    this.ch = opts.cellH ?? 36;
    this.cd = opts.cellD ?? 12;
    this.stepX = this.cw + (opts.gapX ?? 6);
    this.stepY = this.ch + (opts.gapY ?? 6);
    const [ox, oy, oz] = opts.origin || [320, 440, 0];
    this.ox = ox; this.oy = oy; this.oz = oz;
    this.x0 = ox - ((this.cols - 1) * this.stepX) / 2;
    this.y0 = oy + ((this.rows - 1) * this.stepY) / 2;
    this.base = opts.color ?? 0x60a5fa;
    this.textScale = opts.textScale ?? 0.5;
    this.rowLabelOffset = opts.rowLabelOffset ?? 30;
    this.colLabelOffset = opts.colLabelOffset ?? 1;
    this.arrowZ = oz + (opts.arrowZ ?? 34);
    this.cells = [];
    this.labels = [];
    this.arrows = Array.from({ length: opts.arrows ?? 14 }, () => makeArrow(scene));
    this.arrowUsed = 0;

    for (let i = 0; i < this.rows; i++) {
      const row = [];
      for (let j = 0; j < this.cols; j++) {
        const box = new VBox(scene, {
          w: this.cw, h: this.ch, d: this.cd,
          x: this.xOf(j), y: this.yOf(i), z: oz,
          color: this.base, emissive: this.base,
        });
        row.push(box);
      }
      this.cells.push(row);
    }

    if (opts.rowLabels) this.setRowLabels(opts.rowLabels);
    if (opts.colLabels) this.setColLabels(opts.colLabels);
    if (opts.corner) {
      this.labels.push(new VText(scene, {
        text: opts.corner,
        x: this.x0 - this.cw / 2 - this.rowLabelOffset,
        y: this.y0 + this.ch / 2 + 22,
        z: oz + 4, color: PALETTE.textDim, scale: 0.5,
      }));
    }

    const r = Math.hypot(this.cw, this.ch) / 2 + 7;
    this.ring = new THREE.Mesh(
      new THREE.TorusGeometry(r, 2.3, 8, 36),
      new THREE.MeshBasicMaterial({ color: PALETTE.highlight, transparent: true, opacity: 0.95, depthWrite: false }),
    );
    this.ring.position.z = oz + 38;
    this.ring.visible = false;
    scene.add(this.ring);
  }

  xOf(j) { return this.x0 + j * this.stepX; }
  yOf(i) { return this.y0 - i * this.stepY; }

  at(i, j) { return new THREE.Vector3(this.xOf(j), this.yOf(i), this.oz); }

  cell(i, j) { return this.cells[i] && this.cells[i][j]; }

  anchor(i, j, dy = 0) {
    return new THREE.Vector3(this.xOf(j), this.yOf(i) + this.ch / 2 + 18 + dy, this.oz + 18);
  }

  labelZ(scaleZ) {
    // 标签保持在拉伸后盒子的前表面（盒子后表面固定于 z=0，front=(2s-1)·d/2）
    return this.cd / 2 + 14 / (scaleZ || 1);
  }

  setValue(i, j, text, color) {
    const c = this.cell(i, j);
    if (!c) return;
    c.setText(String(text));
    if (c.label) {
      c.label.visible = true;
      c.label.scale.multiplyScalar(this.textScale);
      c.label.position.z = this.labelZ(c.mesh.scale.z);
    }
    if (color !== undefined) c.setColor(color, color);
  }

  hideValue(i, j) {
    const c = this.cell(i, j);
    if (!c || !c.label) return;
    c.label.visible = false;
  }

  setColor(i, j, color) {
    const c = this.cell(i, j);
    if (c) c.setColor(color, color);
  }

  setExtrude(i, j, s) {
    const c = this.cell(i, j);
    if (!c) return;
    c.mesh.scale.z = s;
    c.mesh.position.z = this.oz + ((s - 1) * this.cd) / 2;
    if (c.label) c.label.position.z = this.labelZ(s);
  }

  setRowLabels(list) {
    list.forEach((text, k) => {
      const t = new VText(this.scene, {
        text, x: this.x0 - this.cw / 2 - this.rowLabelOffset, y: this.yOf(k + 1),
        z: this.oz + 4, color: PALETTE.textDim, scale: 0.48,
      });
      this.labels.push(t);
    });
  }

  setColLabels(list) {
    list.forEach((text, j) => {
      const t = new VText(this.scene, {
        text, x: this.xOf(j + this.colLabelOffset), y: this.y0 + this.ch / 2 + 22,
        z: this.oz + 4, color: PALETTE.textDim, scale: 0.46,
      });
      this.labels.push(t);
    });
  }

  focus(i, j) {
    this.ring.position.set(this.xOf(j), this.yOf(i), this.oz + 38);
    this.ring.visible = true;
  }

  hideFocus() { this.ring.visible = false; }

  // 依赖箭头：从 (i0,j0) 指向 (i1,j1)；bend 为弧顶额外前凸量。
  arrow(i0, j0, i1, j1, color = 0x67e8f9, bend = 0) {
    if (this.arrowUsed >= this.arrows.length) return null;
    const a = this.arrows[this.arrowUsed++];
    const from = this.at(i0, j0);
    const to = this.at(i1, j1);
    from.z = to.z = this.arrowZ;
    const dist = from.distanceTo(to);
    a.v0.copy(from);
    a.v2.copy(to);
    a.v1.addVectors(from, to).multiplyScalar(0.5);
    a.v1.z += 14 + Math.min(44, dist * 0.14) + bend;
    a.curve.needsUpdate = true;
    a.geo.setFromPoints(a.curve.getPoints(22));
    a.line.computeLineDistances();
    a.line.material.color.setHex(color);
    a.head.material.color.setHex(color);
    const tan = a.curve.getTangent(1).normalize();
    a.head.position.copy(to).addScaledVector(tan, -7);
    a.head.quaternion.setFromUnitVectors(UP, tan);
    a.line.visible = true;
    a.head.visible = true;
    return a;
  }

  clearArrows() {
    this.arrowUsed = 0;
    for (const a of this.arrows) {
      a.line.visible = false;
      a.head.visible = false;
    }
  }

  reset() {
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        const c = this.cells[i][j];
        if (c.label) c.label.visible = false;
        this.setColor(i, j, this.base);
        this.setExtrude(i, j, 1);
      }
    }
    this.clearArrows();
    this.hideFocus();
  }

  dispose() {
    for (const row of this.cells) for (const c of row) release(this.scene, c);
    for (const l of this.labels) release(this.scene, l);
    for (const a of this.arrows) {
      this.scene.remove(a.line, a.head);
      a.geo.dispose();
      a.line.material.dispose();
      a.head.geometry.dispose();
      a.head.material.dispose();
    }
    this.scene.remove(this.ring);
    this.ring.geometry.dispose();
    this.ring.material.dispose();
    this.cells = [];
    this.labels = [];
    this.arrows = [];
  }
}
