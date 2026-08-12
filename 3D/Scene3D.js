// 3D/Scene3D.js
import * as THREE from 'three';
import { OrbitControls } from '../ThirdParty/three/examples/jsm/controls/OrbitControls.js';
import { CURRENT_THEME } from './Glow.js';
import { tickVisuals } from './VisualObject3D.js';

export const BGCSS = { top: '#0a0f2e', bottom: '#030514' };

export class Scene3D {
  constructor(containerId, opts = {}) {
    const container = document.getElementById(containerId);
    this.width = container.clientWidth || window.innerWidth;
    this.height = container.clientHeight || window.innerHeight;
    const th = opts.theme || CURRENT_THEME || {};

    try {
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch (e) {
      // WebGL 不可用：错误提示 + 降级链接（spec §8）
      container.innerHTML = '<div class="webgl-error">当前浏览器不支持 WebGL，无法显示 3D 动画。<br><a href="index.html">返回目录</a></div>';
      throw e;
    }
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.width, this.height);
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = this.makeBackgroundTexture(
      new THREE.Color(opts.bgTop || th.bgTop || BGCSS.top),
      new THREE.Color(opts.bgBottom || th.bgBottom || BGCSS.bottom));

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

    // 控制器（target 与 lookAt 同步，否则 controls.update() 会把相机拉回原点）
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(...lookAt);
    this.controls.enableDamping = true;
    window.__s3d = this; // QA 调试钩子
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 80;
    this.controls.maxDistance = 1800;
    // 滚轮策略：页面可滚动时滚轮滚动页面，否则滚轮缩放；按住 Ctrl/⌘ 始终缩放
    this.controls.enableZoom = false;
    const canvas = this.renderer.domElement;
    canvas.addEventListener('wheel', (e) => {
      const pageScrollable = document.documentElement.scrollHeight > window.innerHeight + 4;
      if (!e.ctrlKey && !e.metaKey && pageScrollable) return;
      e.preventDefault();
      const offset = new THREE.Vector3().subVectors(this.camera.position, this.controls.target);
      const dist = offset.length();
      const factor = e.deltaY > 0 ? 1.12 : 0.9;
      const nd = Math.min(Math.max(dist * factor, this.controls.minDistance), this.controls.maxDistance);
      this.camera.position.copy(this.controls.target).addScaledVector(offset.normalize(), nd);
    }, { passive: false });

    // 雾
    this.scene.fog = new THREE.FogExp2(th.fog ?? 0x0a0f2e, th.fogDensity ?? 0.00045);

    if (opts.stars !== false) this.addStars(opts.starCount || 400, th.stars);
    if (opts.ground !== false) this.addGround();

    window.addEventListener('resize', () => this.resize());
    if (typeof ResizeObserver !== 'undefined') {
      this.ro = new ResizeObserver(() => this.resize());
      this.ro.observe(container);
    }
    this.resize();
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

  addStars(count, starColors) {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const palette = starColors || [0xffffff, 0xbfdbfe, 0x93c5fd, 0xe0f2fe];
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
    const th = CURRENT_THEME || {};
    const grid = new THREE.GridHelper(1400, 42, th.ground ?? 0x3b82f6, th.groundEm ?? 0x1e3a8a);
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
      tickVisuals(dt);
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
