// 3D/director/StoryDirector.js — 把镜头、标注、HUD、状态面板串成“导演层”。
// 页面生成器只需在节拍边界调用 chapter/beat/stateUpdate；动画仍由 GeneratorEngine 驱动。
import { CameraDirector } from './CameraDirector.js';
import { AnnotationLayer } from './AnnotationLayer.js';
import { BeatHUD } from './BeatHUD.js';
import { StateInspector } from './StateInspector.js';

export class StoryDirector {
  constructor(scene, opts = {}) {
    this.scene = scene;
    const sideEl = document.querySelector('#side-panel');
    this.hud = new BeatHUD({
      title: opts.title || '',
      total: opts.total || 8,
      sceneEl: scene.renderer.domElement.parentElement,
      sideEl,
      legend: opts.legend,
    });
    this.annotations = new AnnotationLayer(scene);
    this.camera = new CameraDirector(scene);
    this.state = new StateInspector(sideEl);

    this.camera.onAutoChange((on) => this.hud.setCameraAuto(on));
    this.hud.setCameraAuto(this.camera.auto);
    this.hud.onAction((act) => {
      if (act === 'camera') this.camera.setAuto(!this.camera.auto);
      if (act === 'replay' && typeof opts.onReplay === 'function') opts.onReplay();
    });
  }

  reset() {
    this.hud.reset();
    this.annotations.clear();
    this.state.clear();
    this.camera.setAuto(true);
    this.camera.reset(600);
  }

  chapter(name) {
    this.hud.setChapter(name);
  }

  beat({ title = '', why = '', stateText = '', progress, camera, annotations } = {}) {
    this.hud.setBeat({ title, why, state: stateText });
    if (progress !== undefined) this.hud.setProgress(progress);
    if (camera) this.camera.shot(camera.pos, camera.target, { ms: camera.ms, fov: camera.fov });
    this.annotations.clear();
    if (annotations) {
      annotations.forEach((a, i) => this.annotations.set(a.id || 'a' + i, a));
    }
  }

  stateUpdate(state) {
    this.state.update(state);
  }

  setBeatState(text) {
    this.hud.setStateText(text);
  }

  setProgress(done) {
    this.hud.setProgress(done);
  }
}
