// AlgorithmLibrary/RR3D.js — 时间片轮转调度（时间片=2）
import { Scene3D } from '../3D/Scene3D.js';
import { AnimationEngine } from '../3D/AnimationEngine.js';
import { ControlPanel } from '../3D/ControlPanel.js';
import { PALETTE, applyTheme } from '../3D/Glow.js';
import { DEFAULT_PROCS, makeProcInfo, zoneLabel, playSchedule } from './osCommon.js';
applyTheme('RR3D');

const scene = new Scene3D('scene', { cameraPos: [0, 260, 700], fov: 55 });
const engine = new AnimationEngine({ speed: 1.2 });
const panel = new ControlPanel({ engine });
const C = (duration, fn, undo) => engine.addCommand(typeof duration === 'object' ? duration : { duration, fn, undo: undo || (() => {}) });
const status = panel.addStatus('');

const procs = DEFAULT_PROCS;
const Q = 2; // 时间片长度
makeProcInfo(scene, procs);
zoneLabel(scene, '就绪队列', -560, 148);
zoneLabel(scene, 'CPU（时间片 2）', 320, 148);
zoneLabel(scene, '时间轴（甘特图）', -560, 8);
let run = null;

// 模拟：每个时间片耗尽未完成则回到队尾，循环取队首
function simRR() {
  const events = [];
  const rem = new Map(procs.map(p => [p.id, p.srv]));
  const order = [...procs].sort((a, b) => a.arr - b.arr);
  let t = 0, idx = 0, queue = [], cpu = null, finished = 0, qLeft = 0, preempted = false;
  while (finished < procs.length) {
    const arr = [];
    while (idx < order.length && order[idx].arr <= t) { queue.push(order[idx].id); arr.push(order[idx].id); idx++; }
    preempted = false;
    if (cpu && qLeft === 0 && rem.get(cpu) > 0) { queue.push(cpu); cpu = null; qLeft = 0; preempted = true; }
    let run = null, done = [];
    if (!cpu && queue.length) { run = queue.shift(); qLeft = Q; }
    else if (cpu) run = cpu;
    if (run) {
      rem.set(run, rem.get(run) - 1);
      if (rem.get(run) === 0) { done = [run]; finished++; cpu = null; qLeft = 0; }
      else { cpu = run; qLeft--; }
    }
    let msg = 't=' + t;
    if (arr.length) msg += '：' + arr.join('、') + ' 到达';
    if (preempted) msg += '；时间片用完，' + queue[queue.length - 1] + ' 回到队尾';
    if (run && !done.length) msg += '；' + run + ' 获得 CPU（剩余 ' + rem.get(run) + '）';
    if (done.length) msg += '；' + done[0] + ' 完成';
    events.push({ t, arr, q: [...queue], run, done, msg });
    t++;
  }
  return events;
}

function runRR() {
  clearAll();
  run = playSchedule(scene, C, status, simRR(), procs, {
    cpuX: 380, cpuY: 100, queueX: -320, queueY: 100, gap: 92, spawnX: -740,
    finishX: -520, finishY: -95, ganttX: -520, ganttY: -40, unit: 46, clockX: -520, clockY: 185,
  });
}

function clearAll() {
  engine.clear();
  if (run) { run.clear(); run = null; }
  status.textContent = '已清空';
}

panel.addButton('运行RR', runRR);
panel.addButton('清空', clearAll);
panel.addLabel('（拖拽旋转视角，滚轮缩放）');

scene.start(engine);
