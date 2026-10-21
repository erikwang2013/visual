// 3D/director/CameraDirector.js — 镜头导演：镜头位、缓动、用户打断、移动端适配。
// 只依赖 Scene3D 暴露的 camera/controls/onFrame，不改变原有 OrbitControls 行为。
import * as THREE from 'three';

const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const v3 = (p) => (Array.isArray(p) ? new THREE.Vector3(p[0], p[1], p[2]) : p.clone());

export class CameraDirector {
  constructor(scene) {
    this.scene = scene;
    this.camera = scene.camera;
    this.controls = scene.controls;
    this.auto = true;
    this.engaged = false;
    this.anim = null;
    this.lastShot = null;
    this.listeners = [];
    this.rawHome = {
      pos: this.camera.position.clone(),
      target: this.controls.target.clone(),
    };
    this.home = { pos: this.rawHome.pos.clone(), target: this.rawHome.target.clone() };
    this.applyHome(true);
    scene.onResize(() => this.applyHome(this.auto && !this.engaged));
    scene.onFrame((dt) => this.update(dt));
    // 用户拖拽/缩放即视为接管镜头；HUD 上会出现“回正/自动”提示。
    this.controls.addEventListener('start', () => { this.engaged = true; this.setAuto(false); });
  }

  actualAspect() {
    const el = this.scene.renderer.domElement;
    const a = el && el.clientHeight ? el.clientWidth / el.clientHeight : this.camera.aspect;
    return Math.max(0.35, Math.min(a || 1, 4));
  }

  // 窄屏/手机竖屏把机位沿 target 方向拉远，保证主体和标注不被裁切。
  adjustForAspect(pos, target) {
    const aspect = this.actualAspect();
    const narrow = typeof matchMedia !== 'undefined' && matchMedia('(max-width: 900px)').matches;
    let factor = 1;
    if (narrow) factor = Math.max(1.18, 1.12 / aspect);
    else if (aspect < 0.99) factor = Math.min(2.6, 1.12 / aspect);
    if (factor <= 1.001) return pos.clone();
    return target.clone().add(pos.clone().sub(target).multiplyScalar(factor));
  }

  applyHome(snap) {
    const pos = this.adjustForAspect(this.rawHome.pos.clone(), this.rawHome.target);
    this.home = { pos, target: this.rawHome.target.clone() };
    if (snap && this.auto && !this.anim && !this.engaged) {
      this.camera.position.copy(pos);
      this.controls.target.copy(this.home.target);
    }
  }

  onAutoChange(fn) { this.listeners.push(fn); }
  notify() { this.listeners.forEach((fn) => fn(this.auto)); }

  setAuto(on) {
    if (this.auto === on) return;
    this.auto = on;
    if (!on) {
      this.anim = null;
      this.controls.enableDamping = true;
    } else {
      this.controls.enableDamping = false;
      if (this.lastShot) this.shot(this.lastShot.pos, this.lastShot.target, this.lastShot.ms);
      else this.reset();
    }
    this.notify();
  }

  shot(pos, target, opts = {}) {
    if (!this.auto) return;
    this.engaged = true;
    const toTarget = v3(target);
    const toPos = this.adjustForAspect(v3(pos), toTarget);
    const ms = opts.ms ?? 800;
    this.lastShot = { pos: toPos.clone(), target: toTarget.clone(), ms };
    this.anim = {
      fromPos: this.camera.position.clone(),
      toPos,
      fromTarget: this.controls.target.clone(),
      toTarget,
      t: 0,
      d: ms,
      fromFov: this.camera.fov,
      toFov: opts.fov ?? this.camera.fov,
    };
    this.controls.enableDamping = false;
  }

  reset(ms = 900) {
    this.shot(this.home.pos, this.home.target, { ms });
  }

  // 将整个包围盒放进画面；移动端按窄画幅拉远，避免主体被裁切。
  fit(bounds, opts = {}) {
    const box = bounds instanceof THREE.Box3 ? bounds : new THREE.Box3().setFromObject(bounds);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const radius = Math.max(size.x, size.y, size.z) * 0.5 * (opts.padding ?? 1.35);
    const fov = (this.camera.fov * Math.PI) / 180;
    const aspect = Math.max(this.camera.aspect, 0.35);
    let dist = radius / Math.sin(fov / 2);
    if (aspect < 1) dist /= Math.max(aspect * 0.9, 0.45);
    const pos = center.clone().add(new THREE.Vector3(dist * 0.55, dist * 0.5, dist * 0.9));
    this.shot(pos, center, { ms: opts.ms ?? 800 });
  }

  update(dt) {
    if (!this.anim) return;
    this.anim.t += dt * 1000;
    const p = Math.min(this.anim.t / this.anim.d, 1);
    const e = easeInOut(p);
    this.camera.position.lerpVectors(this.anim.fromPos, this.anim.toPos, e);
    this.controls.target.lerpVectors(this.anim.fromTarget, this.anim.toTarget, e);
    if (this.anim.fromFov !== this.anim.toFov) {
      this.camera.fov = this.anim.fromFov + (this.anim.toFov - this.anim.fromFov) * e;
      this.camera.updateProjectionMatrix();
    }
    if (p >= 1) {
      this.anim = null;
      this.controls.enableDamping = this.auto ? false : true;
    }
  }
}
