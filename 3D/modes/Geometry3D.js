// 3D/modes/Geometry3D.js
// 3D 坐标轴（XYZ 彩色箭头）+ 多面体（带线框），支持旋转/平移/缩放动画。
import * as THREE from 'three';
import { glowMaterial, PALETTE } from '../Glow.js';
import { easeInOut } from '../VisualObject3D.js';
import { ripple, spark } from '../effects/Fx.js';

export class Geometry3D {
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.axisLen = opts.axisLen || 220;
    this.shape = null;
    this.axes = new THREE.Group();
    this.axes.position.set(opts.x ?? 0, opts.y ?? 0, opts.z ?? 0);
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
    ripple(this.scene, 0, 0, 0, opts.color || 0xa855f7, 110);
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
    let fxDone = false;
    cmd({ duration, fn: (p) => { if (!fxDone) { fxDone = true; spark(this.scene, this.shape.position.x, this.shape.position.y, this.shape.position.z, PALETTE.highlight, 5); } const t = easeInOut(p); this.shape.position.lerpVectors(fromPos, toPos, t); this.shape.rotation.x = fromRot.x + (toRot.x - fromRot.x) * t; this.shape.rotation.y = fromRot.y + (toRot.y - fromRot.y) * t; this.shape.rotation.z = fromRot.z + (toRot.z - fromRot.z) * t; }, undo: () => this.setTransform(fromPos, fromRot) });
  }
}
