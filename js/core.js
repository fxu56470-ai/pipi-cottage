/* 屁屁小屋 · 核心：存档 / 道具表 / 音效 / 小工具
   所有模块挂在 window.P 上，按 <script> 顺序加载，不用打包工具。 */
(function () {
  const P = (window.P = window.P || {});

  P.ART = { w: 1536, h: 1024 };
  P.PHASES = ['早晨', '午后', '傍晚', '夜里'];
  P.PHASE_TIME = ['06:20', '12:40', '18:10', '21:30'];
  P.SAVE_KEY = 'pipi-cottage-save-v1';

  /* ------------------------------------------------------------- 工具 --- */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  function inRect(r, x, y) {
    return x >= r.x1 && x <= r.x2 && y >= r.y1 && y <= r.y2;
  }
  function inPoly(poly, x, y) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0], yi = poly[i][1];
      const xj = poly[j][0], yj = poly[j][1];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  P.util = { clamp, lerp, rand, pick, dist, inRect, inPoly };

  /* -------------------------------------------------------------- 道具 --- */
  // 种子 → 作物 → 鱼，都用同一个 id 空间，背包就是 { id: 数量 }。
  P.CROP = {
    wheat: { name: '小麦', days: 2, sell: 26, seed: 'seed_wheat', icon: 'item-wheat', tone: '#e8c46a', rarity: 'common',
      note: '熟得最快的一种，扎成一捆很上镜。' },
    carrot: { name: '胡萝卜', days: 3, sell: 44, seed: 'seed_carrot', icon: 'item-carrot', tone: '#e8823c', rarity: 'common',
      note: '从土里拔出来的时候最有成就感。' },
    strawberry: { name: '草莓', days: 4, sell: 78, seed: 'seed_strawberry', icon: 'item-strawberry', tone: '#e2574e', rarity: 'uncommon',
      note: '甜得有点犯规，闻着就开心。' },
    sunflower: { name: '向日葵', days: 5, sell: 130, seed: 'seed_sunflower', icon: 'item-sunflower', tone: '#f7c948', rarity: 'rare',
      note: '长得比人还高，会一直朝着太阳转。' }
  };

  // weather 是可选的：写了就只有这个天气才咬钩
  P.FISH = {
    minnow: { name: '小鲫鱼', value: 16, weight: 30, phases: [0, 1, 2], icon: 'fish-minnow', rarity: 'common',
      note: '湖里最常见的小家伙，游得飞快。' },
    shrimp: { name: '河虾', value: 22, weight: 20, phases: [0, 1, 3], icon: 'fish-shrimp', rarity: 'common',
      note: '躲在芦苇根底下，一网就一串。' },
    carp: { name: '鲤鱼', value: 42, weight: 18, phases: [0, 1, 2], icon: 'fish-carp', rarity: 'common',
      note: '据说这里的鲤鱼都认人，见你来了会凑过来。' },
    frog: { name: '雨蛙', value: 34, weight: 14, phases: [0, 1, 2, 3], weather: ['rain'], icon: 'fish-frog', rarity: 'uncommon',
      note: '它显然不是鱼。你把它放回水里，它又跳回岸上，蹲着看你。' },
    bass: { name: '鲈鱼', value: 64, weight: 13, phases: [1, 2, 3], icon: 'fish-bass', rarity: 'uncommon',
      note: '劲儿特别大，钓上来的时候差点把竿子带走。' },
    trout: { name: '虹鳟', value: 88, weight: 9, phases: [0, 2], icon: 'fish-trout', rarity: 'uncommon',
      note: '身上有一条粉色的线，像被人偷偷画上去的。' },
    catfish: { name: '鲶鱼', value: 128, weight: 9, phases: [0, 1, 2, 3], weather: ['rain'], icon: 'fish-catfish', rarity: 'uncommon',
      note: '下雨天才肯出来。两根胡子比身子还精神。' },
    lily: { name: '睡莲', value: 72, weight: 7, phases: [0, 1, 2], weather: ['cloud', 'rain'], icon: 'fish-lily', rarity: 'uncommon', gift: true,
      note: '雨点落在花瓣上，弹起来，又落回去。' },
    koi: { name: '锦鲤', value: 160, weight: 5, phases: [0, 1, 2, 3], icon: 'fish-koi', rarity: 'rare',
      note: '白色的身子配红斑，看着就很有福气。' },
    moon: { name: '月光鱼', value: 240, weight: 5, phases: [2, 3], icon: 'fish-moon', rarity: 'rare',
      note: '只有天黑透了才浮上来，鳞片会自己发亮。' },
    boot: { name: '一只旧靴子', value: 1, weight: 8, phases: [0, 1, 2, 3], icon: 'fish-boot', junk: true, rarity: 'junk',
      note: '……谁把靴子扔湖里了。' }
  };

  P.ITEM = {
    seed_wheat: { name: '小麦种子', kind: 'seed', crop: 'wheat', price: 10, icon: 'seed-wheat', desc: '2 天成熟，卖 26 金币。' },
    seed_carrot: { name: '胡萝卜种子', kind: 'seed', crop: 'carrot', price: 16, icon: 'seed-carrot', desc: '3 天成熟，卖 44 金币。' },
    seed_strawberry: { name: '草莓种子', kind: 'seed', crop: 'strawberry', price: 30, icon: 'seed-strawberry', desc: '4 天成熟，卖 78 金币。' },
    seed_sunflower: { name: '向日葵种子', kind: 'seed', crop: 'sunflower', price: 48, icon: 'seed-sunflower', desc: '5 天成熟，卖 130 金币。' }
  };
  Object.entries(P.CROP).forEach(([id, crop]) => {
    P.ITEM[id] = { name: crop.name, kind: 'crop', crop: id, price: crop.sell, icon: crop.icon, desc: crop.note };
  });
  Object.entries(P.FISH).forEach(([id, fish]) => {
    P.ITEM['fish_' + id] = {
      name: fish.name, kind: 'fish', fish: id, price: fish.value, icon: fish.icon,
      desc: fish.note, junk: fish.junk
    };
  });

  // 杂货：花金币买的顺手工具，一次买断
  P.TOOLS = {
    rod: {
      name: '好一点的鱼竿', price: 180, icon: 'tool-rod',
      note: '绿区宽一点，收杆的时候不那么慌。',
      effect: '钓鱼时机条更容易'
    },
    can: {
      name: '铜水壶', price: 120, icon: 'tool-can',
      note: '壶嘴压低，一次浇得又匀又快。',
      effect: '浇水不花体力'
    },
    basket: {
      name: '柳条背篓', price: 150, icon: 'tool-basket',
      note: '比手抱得多，装满了也不勒手。',
      effect: '每次收获多一份'
    }
  };
  P.hasTool = (id) => Boolean(P.state && P.state.tools && P.state.tools[id]);

  P.icon = (name) => `assets/${name}.png`;
  P.itemIcon = (id) => {
    const item = P.ITEM[id];
    return item ? P.icon(item.icon) : '';
  };

  /* -------------------------------------------------------------- 状态 --- */
  P.PLOTS = 12;

  P.newState = () => ({
    version: 1,
    day: 1,
    phase: 0,
    phaseStep: 0,
    coins: 28,
    energy: 18,
    energyMax: 18,
    scene: 'cottage',
    weather: 'sun',
    pos: { x: 610, y: 858 },
    bag: { seed_wheat: 4 },
    plots: Array.from({ length: P.PLOTS }, () => ({ tilled: false, seed: null, days: 0, watered: false })),
    hearts: 0,
    quest: 'wake',
    flags: {
      intro: false, gifts: {}, candles: false, ending: false, dinner: false,
      metBoy: false, caughtAny: false, slept: false, finished: false,
      recentEvents: [], dexPaid: 0, goalsDay: 0, goals: [], goalsPaid: 0
    },
    caught: {},
    grown: {},
    tools: {},
    stats: { fished: 0, harvested: 0, sold: 0, daysPlayed: 1, cooked: 0 }
  });

  P.state = null;

  P.save = function save() {
    if (!P.state) return;
    try { localStorage.setItem(P.SAVE_KEY, JSON.stringify(P.state)); } catch (_) {}
  };

  P.load = function load() {
    try {
      const raw = localStorage.getItem(P.SAVE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || data.version !== 1) return null;
      // 补齐新字段，老存档也能开
      const base = P.newState();
      return {
        ...base, ...data,
        flags: { ...base.flags, ...(data.flags || {}) },
        bag: { ...data.bag },
        plots: (data.plots || base.plots).slice(0, P.PLOTS).concat(
          base.plots.slice((data.plots || []).length)
        ),
        stats: { ...base.stats, ...(data.stats || {}) }
      };
    } catch (_) { return null; }
  };

  P.wipe = function wipe() {
    try { localStorage.removeItem(P.SAVE_KEY); } catch (_) {}
  };

  /* -------------------------------------------------------------- 背包 --- */
  P.bagCount = (id) => (P.state.bag[id] || 0);

  P.addItem = function addItem(id, n = 1) {
    if (!P.ITEM[id]) return;
    P.state.bag[id] = (P.state.bag[id] || 0) + n;
    if (P.state.bag[id] <= 0) delete P.state.bag[id];
    P.save();
  };

  /* 手机上给一点点触觉反馈；桌面段没有 navigator.vibrate 就安静跳过 */
  let canVibrate = false;
  try { canVibrate = typeof navigator !== 'undefined' && !!navigator.vibrate; } catch (e) { canVibrate = false; }
  P.vibrate = function vibrate(ms) {
    if (!canVibrate || P.state.mute === true) return;
    try { navigator.vibrate(ms); } catch (e) { /* 有些浏览器不给 */ }
  };

  P.takeItem = function takeItem(id, n = 1) {
    if ((P.state.bag[id] || 0) < n) return false;
    P.addItem(id, -n);
    return true;
  };

  P.bagList = function bagList() {
    return Object.keys(P.state.bag).filter((id) => P.ITEM[id] && P.state.bag[id] > 0);
  };

  /* -------------------------------------------------------------- 时间 --- */
  // 每个动作推进一格；四格一个时段，四个时段一天。
  P.STEP_PER_PHASE = 4;

  P.phase = () => P.state.phase;

  P.spend = function spend(energy = 0, steps = 1) {
    if (energy) {
      P.state.energy = Math.max(0, P.state.energy - energy);
    }
    P.state.phaseStep += steps;
    while (P.state.phaseStep >= P.STEP_PER_PHASE) {
      P.state.phaseStep -= P.STEP_PER_PHASE;
      if (P.state.phase < 3) {
        P.state.phase += 1;
        P.onPhaseChange && P.onPhaseChange(P.state.phase);
      }
    }
    P.ui && P.ui.hud();
    P.save();
  };

  P.hasEnergy = function hasEnergy(n = 1) {
    if (P.state.energy >= n) return true;
    P.ui && P.ui.toast('有点累了，回屋睡一觉吧');
    P.audio && P.audio.sfx('nope');
    return false;
  };

  /* -------------------------------------------------------------- 音效 --- */
  const audio = { ctx: null, on: false, timer: null, step: 0, next: 0, rainWanted: false, rainNode: null, rainGain: null };
  // 四个时段四首小曲：早上的亮、午后的松、傍晚的软、夜里的稀
  const TUNES = [
    {
      beat: 60 / 88,
      chords: [[261.63, 329.63, 392], [349.23, 440, 523.25], [392, 493.88, 587.33], [329.63, 415.3, 493.88]],
      melody: [523.25, 587.33, 659.25, 587.33, 523.25, 440, 392, 440, 523.25, 493.88, 440, 392, 349.23, 392, 440, 523.25],
      vol: 0.026,
      wave: 'triangle'
    },
    {
      beat: 60 / 76,
      chords: [[349.23, 440, 523.25], [261.63, 329.63, 392], [293.66, 349.23, 440], [233.08, 293.66, 349.23]],
      melody: [440, 523.25, 587.33, 523.25, 440, 392, 349.23, 392, 440, 523.25, 698.46, 587.33, 523.25, 440, 392, 349.23],
      vol: 0.023,
      wave: 'triangle'
    },
    {
      beat: 60 / 68,
      chords: [[220, 261.63, 329.63], [174.61, 220, 261.63], [196, 246.94, 293.66], [164.81, 207.65, 246.94]],
      melody: [659.25, 587.33, 523.25, 440, 523.25, 587.33, 659.25, 587.33, 523.25, 493.88, 440, 392, 440, 493.88, 523.25, 440],
      vol: 0.022,
      wave: 'sine'
    },
    {
      beat: 60 / 58,
      chords: [[146.83, 174.61, 220], [130.81, 164.81, 196], [110, 146.83, 174.61], [123.47, 146.83, 185]],
      melody: [293.66, 0, 349.23, 0, 293.66, 0, 261.63, 0, 220, 0, 261.63, 0, 293.66, 0, 0, 0],
      vol: 0.019,
      wave: 'sine'
    }
  ];
  let tuneIndex = 0;

  function ctx() {
    audio.ctx ||= new (window.AudioContext || window.webkitAudioContext)();
    return audio.ctx;
  }

  function note(freq, at, dur, vol, wave = 'sine') {
    const ac = ctx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, at);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(vol, at + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(at);
    osc.stop(at + dur + 0.02);
  }

  function schedule() {
    if (!audio.on) return;
    const ac = ctx();
    const tune = TUNES[tuneIndex] || TUNES[0];
    while (audio.next < ac.currentTime + 0.5) {
      const b = audio.step % 16;
      if (b % 4 === 0) {
        const chord = tune.chords[(b / 4) % tune.chords.length];
        chord.forEach((f) => note(f, audio.next, tune.beat * 3.7, 0.010));
        note(chord[0] / 2, audio.next, tune.beat * 2.6, 0.015, 'triangle');
      }
      const f = tune.melody[b];
      if (f) note(f, audio.next, tune.beat * 0.85, tune.vol, tune.wave);
      audio.step += 1;
      audio.next += tune.beat;
    }
  }

  // 换时段就换曲子，从下一个小节开始，不硬切
  function switchTune(phase) {
    const next = Math.max(0, Math.min(TUNES.length - 1, phase | 0));
    if (next === tuneIndex) return;
    tuneIndex = next;
    audio.step = 0;
    if (audio.on) {
      try { audio.next = Math.max(audio.next || 0, ctx().currentTime + 0.15); } catch (_) {}
    }
  }

  P.audio = {
    get on() { return audio.on; },
    start() {
      if (audio.on) return;
      try {
        const ac = ctx();
        audio.on = true;
        ac.resume().then(() => {
          if (!audio.on) return;
          audio.step = 0;
          audio.next = ac.currentTime + 0.08;
          schedule();
          audio.timer = setInterval(schedule, 260);
          if (audio.rainWanted) P.audio.rain(true);
        }).catch(() => { audio.on = false; P.ui && P.ui.hud(); });
      } catch (_) { audio.on = false; }
      P.ui && P.ui.hud();
    },
    stop() {
      audio.on = false;
      clearInterval(audio.timer);
      audio.timer = null;
      // 关掉雨声节点，但保留「天气是雨」这个意愿，重新开声时再接上
      if (audio.rainNode) {
        try { audio.rainNode.stop(); } catch (_) {}
        audio.rainNode = null;
        audio.rainGain = null;
      }
      try { audio.ctx && audio.ctx.suspend(); } catch (_) {}
      P.ui && P.ui.hud();
    },
    toggle() { audio.on ? this.stop() : this.start(); },
    // 雨声：一条循环的低通白噪，随天气开关
    rain(on) {
      audio.rainWanted = !!on;
      if (!audio.on) return;
      try {
        const ac = ctx();
        if (on && !audio.rainNode) {
          const len = Math.ceil(ac.sampleRate * 2);
          const buf = ac.createBuffer(1, len, ac.sampleRate);
          const data = buf.getChannelData(0);
          for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
          const src = ac.createBufferSource();
          src.buffer = buf;
          src.loop = true;
          const hp = ac.createBiquadFilter();
          hp.type = 'highpass';
          hp.frequency.value = 420;
          const lp = ac.createBiquadFilter();
          lp.type = 'lowpass';
          lp.frequency.value = 2600;
          const gain = ac.createGain();
          gain.gain.setValueAtTime(0.0001, ac.currentTime);
          gain.gain.linearRampToValueAtTime(0.028, ac.currentTime + 1.6);
          src.connect(hp); hp.connect(lp); lp.connect(gain); gain.connect(ac.destination);
          src.start();
          audio.rainNode = src;
          audio.rainGain = gain;
        } else if (!on && audio.rainNode) {
          const gain = audio.rainGain;
          const src = audio.rainNode;
          audio.rainNode = null;
          audio.rainGain = null;
          gain.gain.cancelScheduledValues(ac.currentTime);
          gain.gain.linearRampToValueAtTime(0.0001, ac.currentTime + 0.7);
          setTimeout(() => { try { src.stop(); } catch (_) {} }, 900);
        }
      } catch (_) {}
    },
    tone(freq = 660, dur = 0.12, vol = 0.05, wave = 'sine') {
      if (!audio.on) return;
      try { note(freq, ctx().currentTime, dur, vol, wave); } catch (_) {}
    },
    noise(dur = 0.3, vol = 0.06, from = 900, to = 240) {
      if (!audio.on) return;
      try {
        const ac = ctx();
        const len = Math.ceil(ac.sampleRate * dur);
        const buf = ac.createBuffer(1, len, ac.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < len; i += 1) {
          const fade = (1 - i / len) ** 2;
          data[i] = (Math.random() * 2 - 1) * fade;
        }
        const src = ac.createBufferSource();
        src.buffer = buf;
        const filt = ac.createBiquadFilter();
        filt.type = 'bandpass';
        filt.Q.value = 0.9;
        filt.frequency.setValueAtTime(from, ac.currentTime);
        filt.frequency.exponentialRampToValueAtTime(to, ac.currentTime + dur);
        const gain = ac.createGain();
        gain.gain.value = vol;
        src.connect(filt); filt.connect(gain); gain.connect(ac.destination);
        src.start();
      } catch (_) {}
    },
    sfx(kind) {
      if (!audio.on) return;
      try {
        const ac = ctx();
        const t = ac.currentTime;
        if (kind === 'click') note(660, t, 0.09, 0.035);
        else if (kind === 'dig') this.noise(0.22, 0.09, 420, 140);
        else if (kind === 'water') this.noise(0.35, 0.05, 1400, 700);
        else if (kind === 'plant') { note(523, t, 0.1, 0.04); note(659, t + 0.07, 0.14, 0.035); }
        else if (kind === 'harvest') { note(587, t, 0.1, 0.045); note(784, t + 0.08, 0.12, 0.04); note(988, t + 0.16, 0.18, 0.035); }
        else if (kind === 'coin') { note(1046, t, 0.09, 0.045, 'triangle'); note(1318, t + 0.07, 0.16, 0.035, 'triangle'); }
        else if (kind === 'cast') this.noise(0.3, 0.05, 700, 1500);
        else if (kind === 'bite') { note(988, t, 0.1, 0.05, 'square'); note(1318, t + 0.08, 0.14, 0.04, 'square'); }
        else if (kind === 'plop') { note(220, t, 0.16, 0.05); this.noise(0.3, 0.05, 700, 260); }
        else if (kind === 'catch') { [523, 659, 784, 1046].forEach((f, i) => note(f, t + i * 0.085, 0.22, 0.04, 'triangle')); }
        else if (kind === 'fail') { note(330, t, 0.18, 0.04); note(247, t + 0.14, 0.24, 0.035); }
        else if (kind === 'heart') { [784, 988, 1175].forEach((f, i) => note(f, t + i * 0.07, 0.2, 0.035)); }
        else if (kind === 'nope') note(180, t, 0.14, 0.04, 'square');
        else if (kind === 'step') {
          // 不同地面踩下去的声音不一样：草地闷、木板脆、室内居中
          const scene = P.state.scene;
          const lo = scene === 'farm' ? 260 : scene === 'lake' ? 760 : 480;
          const hi = scene === 'farm' ? 130 : scene === 'lake' ? 420 : 260;
          this.noise(0.055, 0.016, lo, hi);
        }
        else if (kind === 'page') this.noise(0.18, 0.03, 2000, 900);
        else if (kind === 'sleep') { note(392, t, 0.4, 0.03); note(261, t + 0.2, 0.6, 0.03); }
      } catch (_) {}
    }
  };

  /* -------------------------------------------------------------- 主题 --- */
  // 换时段的过场：把 CSS 变量和 body 的 data-phase 一起换掉
  P.applyPhase = function applyPhase() {
    const phase = P.state.phase;
    switchTune(phase);
    document.body.dataset.phase = String(phase);
    const tint = document.getElementById('tint');
    if (tint) tint.dataset.phase = String(phase);
    const stage = document.getElementById('stage');
    if (stage) stage.dataset.phase = String(phase);
  };

  P.dayLabel = () => (P.state.day === 1 ? '第 1 天' : `第 ${P.state.day} 天`);
})();
