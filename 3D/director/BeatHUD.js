// 3D/director/BeatHUD.js — 当前节拍 HUD：场景角标 + 右侧“当前动作/为什么/进度/图例”。
// 只做 DOM，不碰 3D；按钮通过 onAction 回调给 StoryDirector。
const DEFAULT_LEGEND = [
  { label: '未访问', color: '#475569' },
  { label: '候选', color: '#fbbf24' },
  { label: '当前', color: '#22d3ee' },
  { label: '已访问', color: '#4ade80' },
  { label: '树边', color: '#fde047' },
];

export class BeatHUD {
  constructor({ title = '', total = 8, sceneEl, sideEl, legend } = {}) {
    this.total = Math.max(1, total);
    this.legend = legend || DEFAULT_LEGEND;
    this.done = 0;
    this.actions = [];
    this.title = title;

    this.overlay = document.createElement('div');
    this.overlay.className = 'story-overlay';
    this.overlay.setAttribute('aria-hidden', 'true');
    this.overlay.innerHTML = '<span class="story-overlay-kicker"></span><b class="story-overlay-chapter"></b><span class="story-overlay-beat"></span>';
    if (sceneEl) sceneEl.appendChild(this.overlay);

    this.panel = document.createElement('div');
    this.panel.className = 'beat-panel';
    this.panel.setAttribute('role', 'status');
    this.panel.setAttribute('aria-live', 'polite');
    this.panel.innerHTML = `
      <div class="beat-head">
        <div><div class="beat-kicker"></div><div class="beat-title">就绪</div></div>
        <div class="beat-actions">
          <button type="button" data-act="camera">镜头 自动</button>
          <button type="button" data-act="replay">↺ 重播</button>
        </div>
      </div>
      <div class="beat-why"></div>
      <div class="beat-state"></div>
      <div class="beat-timeline"><div class="beat-progress"></div><div class="beat-dots"></div></div>
      <div class="beat-legend"></div>`;
    if (sideEl) {
      // 当前动作面板放最前；“算法说明”静态介绍紧随其后。
      sideEl.insertBefore(this.panel, sideEl.firstChild);
    }

    this.kicker = this.panel.querySelector('.beat-kicker');
    this.titleEl = this.panel.querySelector('.beat-title');
    this.whyEl = this.panel.querySelector('.beat-why');
    this.stateEl = this.panel.querySelector('.beat-state');
    this.progressEl = this.panel.querySelector('.beat-progress');
    this.dotsEl = this.panel.querySelector('.beat-dots');
    this.legendEl = this.panel.querySelector('.beat-legend');
    this.legendEl.innerHTML = this.legend.map((l) =>
      `<span><i class="dot" style="background:${l.color}"></i>${l.label}</span>`
    ).join('');
    this.overlayKicker = this.overlay.querySelector('.story-overlay-kicker');
    this.overlayChapter = this.overlay.querySelector('.story-overlay-chapter');
    this.overlayBeat = this.overlay.querySelector('.story-overlay-beat');
    this.cameraBtn = this.panel.querySelector('[data-act="camera"]');
    this.replayBtn = this.panel.querySelector('[data-act="replay"]');
    this.cameraBtn.addEventListener('click', () => this.emit('camera'));
    this.replayBtn.addEventListener('click', () => this.emit('replay'));
    if (this.total > 24) { this.dotsEl.style.display = 'none'; this.dots = []; }
    else this.buildDots();
    this.setTitle(title);
  }

  onAction(fn) { this.actions.push(fn); }
  emit(act) { this.actions.forEach((fn) => fn(act)); }

  buildDots() {
    this.dotsEl.innerHTML = '';
    for (let i = 0; i < this.total; i++) {
      const d = document.createElement('i');
      d.className = 'beat-dot';
      this.dotsEl.appendChild(d);
    }
    this.dots = [...this.dotsEl.children];
  }

  setTitle(title) {
    this.title = title;
    this.kicker.textContent = title;
    this.overlayKicker.textContent = title;
  }

  setChapter(name) {
    this.overlayChapter.textContent = name;
    if (this.title) this.kicker.textContent = this.title + ' · ' + name;
  }

  setBeat({ title = '', why = '', state = '' } = {}) {
    this.titleEl.textContent = title;
    this.whyEl.textContent = why;
    this.stateEl.textContent = state;
    this.overlayBeat.textContent = title;
    this.panel.classList.remove('flash');
    void this.panel.offsetWidth;
    this.panel.classList.add('flash');
  }

  setStateText(text) {
    this.stateEl.textContent = text;
  }

  setProgress(done) {
    this.done = Math.max(0, Math.min(this.total, done));
    this.progressEl.style.width = (this.done / this.total) * 100 + '%';
    if (this.dots) this.dots.forEach((d, i) => {
      d.classList.toggle('done', i < this.done);
      d.classList.toggle('active', i === this.done - 1);
    });
  }

  setCameraAuto(on) {
    this.cameraBtn.textContent = on ? '镜头 自动' : '镜头 手动';
    this.cameraBtn.classList.toggle('manual', !on);
  }

  reset() {
    this.done = 0;
    this.titleEl.textContent = '就绪';
    this.whyEl.textContent = '';
    this.stateEl.textContent = '';
    this.progressEl.style.width = '0%';
    if (this.dots) this.dots.forEach((d) => d.classList.remove('done', 'active'));
    this.overlayChapter.textContent = '';
    this.overlayBeat.textContent = '';
    this.kicker.textContent = this.title;
  }
}
