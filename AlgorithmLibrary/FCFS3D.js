// AlgorithmLibrary/FCFS3D.js — 先来先服务调度
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
import { DEFAULT_PROCS, makeProcInfo, zoneLabel, playSchedule } from './osCommon.js';
applyTheme('FCFS3D');

const scene = new Scene3D('scene', { cameraPos: [0, 260, 700], fov: 55 });
const engine = new AnimationEngine({ speed: 1.2 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });
const status = panel.addStatus('');

const procs = DEFAULT_PROCS;
makeProcInfo(scene, procs);
zoneLabel(scene, '就绪队列', -560, 148);
zoneLabel(scene, 'CPU', 380, 148);
zoneLabel(scene, '时间轴（甘特图）', -560, 8);
let run = null;

// 模拟：按到达时间依次入队，CPU 空闲则取队首
function simFCFS() {
  const events = [];
  const rem = new Map(procs.map(p => [p.id, p.srv]));
  const order = [...procs].sort((a, b) => a.arr - b.arr);
  let t = 0, idx = 0, queue = [], cpu = null, finished = 0;
  while (finished < procs.length) {
    const arr = [];
    while (idx < order.length && order[idx].arr <= t) { queue.push(order[idx].id); arr.push(order[idx].id); idx++; }
    let run = null, done = [];
    if (!cpu && queue.length) run = queue.shift();
    else if (cpu) run = cpu;
    if (run) {
      rem.set(run, rem.get(run) - 1);
      if (rem.get(run) === 0) { done = [run]; finished++; cpu = null; }
      else cpu = run;
    }
    let msg = 't=' + t;
    if (arr.length) msg += '：' + arr.join('、') + ' 到达，进入就绪队列';
    if (run && !done.length) msg += '；' + run + ' 开始运行（剩余 ' + rem.get(run) + '）';
    if (done.length) msg += '；' + done[0] + ' 服务完成';
    events.push({ t, arr, q: [...queue], run, done, msg });
    t++;
  }
  return events;
}

function runFCFS() {
  clearAll();
  run = playSchedule(scene, C, status, simFCFS(), procs, {
    cpuX: 380, cpuY: 100, queueX: -320, queueY: 100, gap: 92, spawnX: -740,
    finishX: -520, finishY: -95, ganttX: -520, ganttY: -40, unit: 46, clockX: -520, clockY: 185,
  });
}

function clearAll() {
  engine.clear();
  if (run) { run.clear(); run = null; }
  status.textContent = '已清空';
}

panel.addButton('运行 FCFS', runFCFS);
panel.addButton('清空', clearAll);
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

scene.start(engine);
