/* 屁屁小屋 · 世界：场景切换 / 相机 / 走路寻路 / 热点 */
(function () {
  const P = window.P;
  const U = P.util;

  const SCENES = {
    cottage: {
      label: '小屋',
      walk: [[[86, 524], [1450, 524], [1450, 954], [86, 954]]],
      solids: [
        { x1: 77, x2: 520, y1: 300, y2: 780 },      // 床
        { x1: 110, x2: 545, y1: 776, y2: 960 },     // 礼物堆
        { x1: 686, x2: 950, y1: 556, y2: 826 },     // 蛋糕桌
        { x1: 856, x2: 1002, y1: 690, y2: 846 },    // 小凳
        { x1: 1040, x2: 1450, y1: 590, y2: 916 },   // 沙发
        { x1: 610, x2: 1050, y1: 384, y2: 562 },    // 斗柜
        { x1: 1206, x2: 1496, y1: 324, y2: 608 },   // 书桌
        { x1: 1042, x2: 1236, y1: 150, y2: 566 },   // 书架
        { x1: 504, x2: 636, y1: 300, y2: 556 },     // 绿植
        { x1: 992, x2: 1142, y1: 794, y2: 936 }     // 蒲团
      ],
      depth: { y0: 524, y1: 954, min: 0.80, max: 1.06 },
      spawn: { x: 610, y: 858 },
      npc: { x: 1150, y: 862 },
      npcRow: 0
    },
    farm: {
      label: '农场',
      walk: [[[368, 566], [722, 436], [1188, 600], [804, 752]]],
      solids: [],
      depth: { y0: 436, y1: 752, min: 0.78, max: 1.02 },
      spawn: { x: 780, y: 700 },
      npc: { x: 1046, y: 690 },
      npcRow: 2
    },
    lake: {
      label: '湖边',
      // 木板栈道：左边缘贴水，右上角靠近灯柱，左下角是下水台阶
      walk: [[[800, 604], [1330, 552], [1372, 726], [916, 830]]],
      solids: [],
      depth: { y0: 552, y1: 830, min: 0.82, max: 1.0 },
      spawn: { x: 980, y: 720 },
      npc: { x: 1236, y: 726 },
      npcRow: 2
    },
    tvroom: {
      label: '客厅',
      // 地毯和右侧那片空地板
      walk: [[[300, 738], [1500, 604], [1512, 984], [300, 992]]],
      solids: [
        { x1: 232, x2: 908, y1: 248, y2: 588 },     // 沙发
        { x1: 452, x2: 792, y1: 440, y2: 612 },     // 电视柜
        { x1: 0, x2: 262, y1: 356, y2: 646 },       // 绿植
        { x1: 156, x2: 300, y1: 84, y2: 626 },      // 落地灯
        { x1: 1004, x2: 1190, y1: 366, y2: 572 }    // 边几
      ],
      depth: { y0: 700, y1: 992, min: 0.80, max: 1.04 },
      spawn: { x: 1020, y: 900 },
      npc: { x: 1300, y: 880 },
      npcRow: 0
    },
    bath: {
      label: '澡堂',
      // 木桶前面和右边那条干地
      walk: [[[118, 852], [1404, 748], [1440, 1004], [118, 1004]]],
      solids: [
        { x1: 186, x2: 694, y1: 452, y2: 820 },     // 木桶
        { x1: 48, x2: 224, y1: 600, y2: 802 },      // 木盆
        { x1: 222, x2: 372, y1: 716, y2: 892 },     // 小凳
        { x1: 676, x2: 802, y1: 462, y2: 656 }      // 蕨
      ],
      depth: { y0: 790, y1: 1004, min: 0.84, max: 1.0 },
      spawn: { x: 860, y: 930 },
      npc: { x: 1150, y: 900 },
      npcRow: 0
    },
    roof: {
      label: '楼顶',
      walk: [[[64, 772], [1470, 752], [1512, 1008], [64, 1008]]],
      solids: [
        { x1: 0, x2: 208, y1: 626, y2: 786 },       // 靠垫
        { x1: 214, x2: 402, y1: 676, y2: 800 },     // 毯子
        { x1: 330, x2: 492, y1: 610, y2: 790 },     // 左边花盆
        { x1: 556, x2: 640, y1: 668, y2: 812 },     // 灯笼
        { x1: 1030, x2: 1112, y1: 664, y2: 800 },   // 右边小盆
        { x1: 1382, x2: 1536, y1: 606, y2: 812 }    // 右边大盆
      ],
      depth: { y0: 762, y1: 1008, min: 0.82, max: 1.0 },
      spawn: { x: 760, y: 940 },
      npc: { x: 1010, y: 910 },
      npcRow: 0
    },
    garden: {
      label: '菜园',
      // 屋后那块地：中间是翻好的土垄，人走垄上，也能绕到围栏外那条路
      walk: [[[648, 302], [936, 392], [930, 580], [1210, 760], [980, 970],
        [560, 978], [318, 848], [330, 600]]],
      solids: [
        { x1: 660, x2: 886, y1: 186, y2: 392 },     // 温室
        { x1: 86, x2: 330, y1: 226, y2: 376 },      // 堆肥箱、雨桶、水壶
        { x1: 414, x2: 486, y1: 158, y2: 300 }      // 稻草人
      ],
      depth: { y0: 560, y1: 978, min: 0.80, max: 1.02 },
      spawn: { x: 700, y: 862 },
      npc: { x: 968, y: 872 },
      npcRow: 2
    },
    pasture: {
      label: '牧场',
      walk: [[[648, 404], [944, 508], [930, 720], [780, 908], [600, 940],
        [380, 884], [330, 716], [352, 636]]],
      solids: [
        { x1: 628, x2: 748, y1: 386, y2: 482 }      // 水槽
      ],
      depth: { y0: 560, y1: 940, min: 0.80, max: 1.02 },
      spawn: { x: 760, y: 872 },
      npc: { x: 862, y: 706 },
      npcRow: 2
    },
    town: {
      label: '镇上',
      // 石板广场的下半截：摊位和井都在上边，人不往那边挤
      walk: [[[352, 706], [962, 664], [1024, 874], [700, 972], [378, 936]]],
      solids: [
        { x1: 470, x2: 606, y1: 526, y2: 706 },     // 水井
        { x1: 240, x2: 470, y1: 486, y2: 640 }      // 露天咖啡座
      ],
      depth: { y0: 664, y1: 972, min: 0.80, max: 1.02 },
      spawn: { x: 700, y: 856 },
      npc: { x: 880, y: 776 },
      npcRow: 2
    }
  };
  P.SCENES = SCENES;

  const world = {
    current: 'cottage',
    pos: { x: 780, y: 880 },
    positions: {},
    nav: {},
    walkPath: [],
    walkThen: null,
    pressed: new Set(),
    dir: 'down',
    clock: 0,
    moving: false,
    busy: false,
    hintTimer: null,
    cam: { scale: 1, x: 0, y: 0, base: 1, zoom: 1 },
    focus: { x: 768, y: 512 },
    cine: null
  };
  P.world = world;

  const el = {};
  function grab() {
    el.stage = document.getElementById('stage');
    el.art = document.getElementById('art');
    el.avatar = document.getElementById('avatar');
    el.shadow = document.getElementById('shadow');
    el.plots = document.getElementById('plots');
    el.hint = document.getElementById('stageHint');
  }

  /* ------------------------------------------------------------- 寻路 --- */
  const CELL = 26;

  function buildNav(sceneKey) {
    const scene = SCENES[sceneKey];
    if (world.nav[sceneKey]) return world.nav[sceneKey];
    let x1 = Infinity, x2 = -Infinity, y1 = Infinity, y2 = -Infinity;
    scene.walk.forEach((poly) => poly.forEach(([x, y]) => {
      x1 = Math.min(x1, x); x2 = Math.max(x2, x);
      y1 = Math.min(y1, y); y2 = Math.max(y2, y);
    }));
    const cols = Math.ceil((x2 - x1) / CELL);
    const rows = Math.ceil((y2 - y1) / CELL);
    const pass = new Uint8Array(cols * rows);
    const point = (c, r) => ({ x: x1 + (c + 0.5) * CELL, y: y1 + (r + 0.5) * CELL });
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const p = point(c, r);
        pass[r * cols + c] = walkable(sceneKey, p.x, p.y) ? 1 : 0;
      }
    }
    world.nav[sceneKey] = { x1, y1, x2, y2, cols, rows, pass, point };
    return world.nav[sceneKey];
  }

  function walkable(sceneKey, x, y) {
    const scene = SCENES[sceneKey];
    if (!scene.walk.some((poly) => U.inPoly(poly, x, y))) return false;
    return !scene.solids.some((box) => U.inRect(box, x, y));
  }
  P.walkable = walkable;

  function nearestWalkable(sceneKey, x, y) {
    if (walkable(sceneKey, x, y)) return { x, y };
    const nav = buildNav(sceneKey);
    let best = null;
    let bestScore = Infinity;
    for (let r = 0; r < nav.rows; r += 1) {
      for (let c = 0; c < nav.cols; c += 1) {
        if (!nav.pass[r * nav.cols + c]) continue;
        const p = nav.point(c, r);
        const score = ((p.x - x) * 1.15) ** 2 + (p.y - y) ** 2;
        if (score < bestScore) { bestScore = score; best = p; }
      }
    }
    return best || { ...world.pos };
  }

  function clearLine(sceneKey, a, b) {
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const steps = Math.max(1, Math.ceil(len / 12));
    for (let i = 1; i <= steps; i += 1) {
      const t = i / steps;
      if (!walkable(sceneKey, a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)) return false;
    }
    return true;
  }

  function findPath(sceneKey, from, target) {
    const goal = nearestWalkable(sceneKey, target.x, target.y);
    if (clearLine(sceneKey, from, goal)) return [goal];
    const nav = buildNav(sceneKey);
    const total = nav.cols * nav.rows;
    const cellOf = (p) => {
      const c = U.clamp(Math.floor((p.x - nav.x1) / CELL), 0, nav.cols - 1);
      const r = U.clamp(Math.floor((p.y - nav.y1) / CELL), 0, nav.rows - 1);
      return r * nav.cols + c;
    };
    const start = cellOf(from);
    const end = cellOf(goal);
    if (!nav.pass[start] || !nav.pass[end]) return [];
    const cost = new Float64Array(total).fill(Infinity);
    const prev = new Int32Array(total).fill(-1);
    const closed = new Uint8Array(total);
    const open = [start];
    cost[start] = 0;
    const scoreOf = (i) => cost[i] + U.dist(nav.point(i % nav.cols, Math.floor(i / nav.cols)), goal);
    while (open.length) {
      let at = 0;
      let best = Infinity;
      for (let i = 0; i < open.length; i += 1) {
        const s = scoreOf(open[i]);
        if (s < best) { best = s; at = i; }
      }
      const cur = open.splice(at, 1)[0];
      if (cur === end) break;
      if (closed[cur]) continue;
      closed[cur] = 1;
      const cc = cur % nav.cols;
      const cr = Math.floor(cur / nav.cols);
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (!dx && !dy) continue;
          const nc = cc + dx;
          const nr = cr + dy;
          if (nc < 0 || nc >= nav.cols || nr < 0 || nr >= nav.rows) continue;
          const next = nr * nav.cols + nc;
          if (!nav.pass[next] || closed[next]) continue;
          if (dx && dy) {
            if (!nav.pass[cr * nav.cols + nc] || !nav.pass[nr * nav.cols + cc]) continue;
          }
          const step = U.dist(nav.point(nc, nr), nav.point(cc, cr));
          if (cost[cur] + step < cost[next]) {
            cost[next] = cost[cur] + step;
            prev[next] = cur;
            if (!open.includes(next)) open.push(next);
          }
        }
      }
    }
    if (!Number.isFinite(cost[end])) return [];
    const raw = [goal];
    for (let at = end; at !== start && at >= 0; at = prev[at]) raw.unshift(nav.point(at % nav.cols, Math.floor(at / nav.cols)));
    raw.unshift(from);
    const out = [];
    for (let i = 0; i < raw.length - 1;) {
      let far = raw.length - 1;
      while (far > i + 1 && !clearLine(sceneKey, raw[i], raw[far])) far -= 1;
      out.push(raw[far]);
      i = far;
    }
    return out;
  }

  /* ------------------------------------------------------------- 相机 --- */
  function fitCamera(snap) {
    const W = el.stage.clientWidth;
    const H = el.stage.clientHeight;
    const contain = Math.min(W / P.ART.w, H / P.ART.h);
    const cover = Math.max(W / P.ART.w, H / P.ART.h);
    const portrait = H > W * 1.1;
    // 竖屏：cover 填满（场景够大、无黑边），出口按钮改 fixed 贴屏幕边不依赖场景坐标；
    // 横屏：宽高比离 1.5:1 越远越往里推，减少上下黑边
    const wide = W / H;
    const push = wide > 1.9 ? 1.45 : wide > 1.72 ? 1.26 : 1.12;
    const base = portrait ? cover : Math.min(cover, contain * push);
    const zoom = world.cam.zoom || 1;
    world.cam.base = base;
    world.cam.scale = base * zoom;
    world.cam.w = W;
    world.cam.h = H;
    placeCamera(snap);
    layoutPortraitExits(portrait);
    buildSceneActions(portrait);
  }

  // 竖屏时场景被裁得很窄，沙发、木桶这些热点可能根本不在画面里。
  // 这里把当前场景「能做的事」排成一列小按钮贴在右边，手机上也点得到。
  // 热点文字会随时段变（床白天是「睡觉」、夜里是「一起睡」），变了要重建
  world.refreshActions = () => {
    if (!el.stage) return;
    buildSceneActions(el.stage.clientHeight > el.stage.clientWidth * 1.1);
  };
  const ACTION_PRIORITY = ['shop', 'market', 'bakery', 'store', 'junk', 'bench', 'cafe', 'well', 'gardenPlot', 'animal', 'trough', 'car', 'towel', 'bed', 'tv', 'bath', 'stars', 'fishTogether', 'fish', 'rest', 'cake', 'gifts', 'shelf', 'gallery'];
  let actionsBar = null;
  function buildSceneActions(portrait) {
    if (!actionsBar) {
      actionsBar = document.createElement('nav');
      actionsBar.className = 'scene-actions';
      actionsBar.setAttribute('aria-label', '可做的事');
      el.stage.appendChild(actionsBar);
    }
    if (!portrait) { actionsBar.hidden = true; return; }
    const scene = document.querySelector('.scene.active');
    if (!scene) { actionsBar.hidden = true; return; }
    const spots = [...scene.querySelectorAll('.spot')]
      .filter((node) => node.dataset.action && node.dataset.action !== 'look' && !node.hidden)
      .sort((a, b) => {
        const ia = ACTION_PRIORITY.indexOf(a.dataset.action);
        const ib = ACTION_PRIORITY.indexOf(b.dataset.action);
        return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
      })
      .slice(0, 6);
    actionsBar.hidden = spots.length === 0;
    actionsBar.innerHTML = '';
    spots.forEach((spot) => {
      const label = spot.querySelector('.spot-label');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'scene-action';
      button.textContent = label ? label.textContent : spot.dataset.action;
      button.addEventListener('click', () => {
        P.audio && P.audio.start();
        P.audio && P.audio.sfx('click');
        const act = P.actions && P.actions[spot.dataset.action];
        if (act) act(spot);
      });
      actionsBar.appendChild(button);
    });
  }

  // 竖屏 cover 会裁掉场景两侧，出口按钮贴边就看不见。
  // 竖屏时把出口按钮挪到 stage 层级、绝对定位贴屏幕左右下角（方向键上方），横屏还原。
  function layoutPortraitExits(portrait) {
    const scene = document.querySelector('.scene.active');
    // 上一幕挪到 stage 上的出口不会自己回去，会一直贴在屏幕角上挡住新场景——
    // 每次换场先把它塞回各自的场景。
    [...el.stage.querySelectorAll(':scope > .exit')].forEach((btn) => {
      if (btn.parentElement === scene) return;
      const home = btn.dataset.homeScene
        ? document.querySelector(`.scene[data-scene="${btn.dataset.homeScene}"]`)
        : null;
      btn.classList.remove('exit-fixed', 'exit-grid');
      btn.style.width = '';
      if (btn.dataset.origLeft) { btn.style.left = btn.dataset.origLeft; delete btn.dataset.origLeft; }
      if (btn.dataset.origTop) { btn.style.top = btn.dataset.origTop; delete btn.dataset.origTop; }
      (home || scene || el.stage).appendChild(btn);
    });
    const exits = scene ? [...scene.querySelectorAll('.exit')] : [];
    // 农场现在通往四个地方（湖边/菜园/牧场/镇上）+ 回小屋，一列竖排会占掉半个屏幕，
    // 出口超过 3 个时改成两列小胶囊，从底部往上排。
    const cols = exits.length > 3 ? 2 : 1;
    const gapY = cols > 1 ? 46 : 54;
    const colW = 118;
    exits.forEach((btn, i) => {
      if (!portrait) {
        // 横屏：放回场景，恢复原始坐标
        btn.classList.remove('exit-fixed', 'exit-grid');
        btn.style.width = '';
        if (btn.dataset.origLeft) { btn.style.left = btn.dataset.origLeft; delete btn.dataset.origLeft; }
        if (btn.dataset.origTop) { btn.style.top = btn.dataset.origTop; delete btn.dataset.origTop; }
        btn.style.right = ''; btn.style.bottom = '';
        if (btn.parentElement !== scene && scene) scene.appendChild(btn);
        return;
      }
      if (!btn.dataset.origLeft) {
        btn.dataset.origLeft = btn.style.left;
        btn.dataset.origTop = btn.style.top;
        btn.dataset.origParent = '';
      }
      if (!btn.dataset.homeScene) btn.dataset.homeScene = scene.dataset.scene || '';
      // 移到 stage（无 transform 的定位上下文），绝对定位到屏幕左下角
      if (btn.parentElement !== el.stage) el.stage.appendChild(btn);
      btn.classList.add('exit-fixed');
      btn.classList.toggle('exit-grid', cols > 1);
      const col = i % cols;
      const row = Math.floor(i / cols);
      btn.style.left = `${10 + col * (colW + 6)}px`;
      btn.style.width = cols > 1 ? `${colW}px` : '';
      btn.style.right = 'auto';
      btn.style.top = 'auto';
      btn.style.bottom = `${12 + row * gapY}px`;
    });
  }

  function placeCamera(snap) {
    const { scale, w: W, h: H } = world.cam;
    const fx = world.focus.x;
    const fy = world.focus.y;
    const aw = P.ART.w * scale;
    const ah = P.ART.h * scale;
    let tx = W / 2 - fx * scale;
    let ty = H / 2 - fy * scale;
    if (aw <= W) tx = (W - aw) / 2; else tx = U.clamp(tx, W - aw, 0);
    if (ah <= H) ty = (H - ah) / 2; else ty = U.clamp(ty, H - ah, 0);
    if (snap) { world.cam.x = tx; world.cam.y = ty; }
    el.art.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
  }

  /* 过场用：把镜头推近某一点，演完再放开。zoom 传 null 表示还原 */
  world.cine = function cine(focus, zoom) {
    if (!focus) {
      world.cineSpot = null;
      return;
    }
    world.cineSpot = { x: focus.x, y: focus.y, zoom: zoom || 1.18 };
  };

  P.screenToArt = function screenToArt(clientX, clientY) {
    const rect = el.stage.getBoundingClientRect();
    const s = world.cam.scale;
    return {
      x: (clientX - rect.left - world.cam.x) / s,
      y: (clientY - rect.top - world.cam.y) / s
    };
  };

  /* ------------------------------------------------------------- 角色 --- */
  const DIR_ROW = { down: 0, up: 1, left: 2, right: 3 };
  const DIR_FRAME = { down: 0, up: 1, left: 2, right: 3 };

  function ensureActors() {
    if (!el.avatar) {
      el.avatar = document.createElement('div');
      el.avatar.className = 'actor';
      el.avatar.id = 'avatar';
      el.avatar.setAttribute('role', 'img');
      el.avatar.setAttribute('aria-label', '屁屁');
      el.avatar.innerHTML = '<i class="prop prop-rod"></i><i class="prop prop-hoe"></i><i class="prop prop-can"></i><i class="prop prop-basket"></i><i class="prop prop-towel"></i>';
    }
    if (!el.shadow) {
      el.shadow = document.createElement('div');
      el.shadow.className = 'actor-shadow';
      el.shadow.id = 'shadow';
      el.shadow.setAttribute('aria-hidden', 'true');
    }
  }

  /* ---------------------------------------------------------- 动作节奏 --- */
  // 做活在 JS 里排时间线：CSS 的 keyframes 只能动 transform，会盖掉姿态缩放，
  // 所以干脆在每帧的 paint 里把起伏叠出去。
  const ACTION = {
    dig: { dur: 620, hop: (k) => (k < 0.34 ? -9 * (k / 0.34)
      : k < 0.56 ? -9 + 15 * ((k - 0.34) / 0.22)
        : 6 * (1 - (k - 0.56) / 0.44)) },
    reach: { dur: 560, hop: (k) => -Math.abs(Math.sin(k * Math.PI * 2)) * 3.2 },
    fish: { dur: 700, hop: (k) => -Math.sin(Math.min(1, k * 1.3) * Math.PI) * 5 },
    sit: { dur: 520, hop: (k) => -Math.sin(k * Math.PI) * 2.2 },
    land: { dur: 460, hop: (k) => (k < 0.58 ? -13 * (1 - k / 0.58) : 3.4 * Math.sin(((k - 0.58) / 0.42) * Math.PI)) }
  };
  let acting = null;

  world.act = function act(kind) {
    const spec = ACTION[kind];
    if (!spec) return;
    acting = { spec, t0: performance.now() };
  };

  let lastDust = 0;
  function stepDust(y) {
    const sceneNode = document.querySelector(`.scene[data-scene="${world.current}"]`);
    if (!sceneNode || sceneNode.children.length > 200) return;
    const node = document.createElement('i');
    node.className = 'step-dust';
    node.style.left = `${world.pos.x}px`;
    node.style.top = `${y - 3}px`;
    sceneNode.appendChild(node);
    P.audio && P.audio.sfx && P.audio.sfx('step');
    setTimeout(() => node.remove(), 660);
  }

  function paintAvatar() {
    const scene = SCENES[world.current];
    const depth = scene.depth;
    const t = U.clamp((world.pos.y - depth.y0) / (depth.y1 - depth.y0), 0, 1);
    const scale = U.lerp(depth.min, depth.max, t);
    world.depth = scale;
    el.avatar.style.left = `${world.pos.x}px`;
    el.avatar.style.top = `${world.pos.y}px`;
    el.avatar.style.setProperty('--depth', scale.toFixed(3));
    el.avatar.style.zIndex = String(Math.round(world.pos.y) + 4);
    el.shadow.style.left = `${world.pos.x}px`;
    el.shadow.style.top = `${world.pos.y}px`;
    el.shadow.style.width = `${Math.round(96 * scale)}px`;
    el.shadow.style.zIndex = String(Math.round(world.pos.y) + 3);
    el.shadow.style.opacity = world.moving ? '0.42' : '0.56';
    const row = world.moving ? DIR_ROW[world.dir] : 4;
    const frame = world.moving ? Math.floor(world.clock / 0.13) % 4 : DIR_FRAME[world.dir];
    el.avatar.style.setProperty('--row', row);
    el.avatar.style.setProperty('--frame', frame);

    // 下雨天在外面，人会本能地缩着点肩膀
    const rainy = !!(P.weather && P.weather.is && P.weather.is('rain')
      && (world.current === 'farm' || world.current === 'lake'));
    if (rainy && el.avatar.dataset.rain !== '1') el.avatar.dataset.rain = '1';
    else if (!rainy && el.avatar.dataset.rain) delete el.avatar.dataset.rain;

    /* 走路：一步一颠 + 轻微左右摆；停下时过渡回正，像收住脚 */
    const now = performance.now();
    const step = world.clock * 9.4;
    let hop = world.moving ? -Math.abs(Math.sin(step)) * 4.6 : 0;
    // 站着的时候重心也在慢慢换，不是一根插在地上的桩
    let tilt = world.moving ? Math.sin(step) * 1.25 : Math.sin(now / 2100) * 0.85;

    /* 做动作：在走路的起伏之上再叠一段 */
    if (acting) {
      const k = (now - acting.t0) / acting.spec.dur;
      if (k >= 1) acting = null;
      else hop += acting.spec.hop(k);
    }

    /* 待机呼吸：幅度小到只有盯着看才发现，但整张脸就活了 */
    const tired = !!(P.state && P.state.energy <= 3);
    const breath = 1 + Math.sin(now / (tired ? 620 : 880)) * (tired ? 0.016 : 0.0065);
    if (tired && el.avatar.dataset.tired !== '1') el.avatar.dataset.tired = '1';
    else if (!tired && el.avatar.dataset.tired) delete el.avatar.dataset.tired;

    el.avatar.style.setProperty('--hop', hop.toFixed(2) + 'px');
    el.avatar.style.setProperty('--tilt', tilt.toFixed(2) + 'deg');
    el.avatar.style.setProperty('--breath', breath.toFixed(4));

    if (world.moving) {
      if (el.avatar.dataset.moving !== '1') el.avatar.dataset.moving = '1';
      if (now - lastDust > 330) { lastDust = now; stepDust(world.pos.y); }
    } else if (el.avatar.dataset.moving) {
      delete el.avatar.dataset.moving;
    }
  }

  let last = 0;

  /* 体力见底的时候，走路会慢下来一点，身体也不那么挺 */
  function tiredSpeed() {
    return P.state && P.state.energy <= 3 ? 0.78 : 1;
  }

  /* 姿态与手持物：压扁/前倾不改精灵表，只动 transform 变量 */
  let poseTimer = 0;
  world.pose = '';

  function avatarEl() {
    ensureActors();
    return el.avatar;
  }

  world.avatarDepth = function avatarDepth() {
    return world.depth || 1;
  };

  world.setPose = function setPose(name, ms) {
    const node = avatarEl();
    world.pose = name || '';
    if (name) node.dataset.pose = name;
    else delete node.dataset.pose;
    if (poseTimer) { clearTimeout(poseTimer); poseTimer = 0; }
    if (name && ACTION[name]) world.act(name);
    if (name && ms) poseTimer = setTimeout(() => world.setPose(''), ms);
  };

  world.hold = function hold(kind) {
    const node = avatarEl();
    if (kind) node.dataset.hold = kind;
    else delete node.dataset.hold;
  };

  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    if (!world.busy && !P.ui.modalOpen() && (!P.fishing || P.fishing.phase === 'idle')) {
      let dx = 0;
      let dy = 0;
      world.pressed.forEach((dir) => {
        if (dir === 'up') dy -= 1;
        if (dir === 'down') dy += 1;
        if (dir === 'left') dx -= 1;
        if (dir === 'right') dx += 1;
      });
      const held = dx || dy;
      if (held) {
        world.walkPath = [];
        world.walkThen = null;
        const speed = 240 * dt * tiredSpeed();
        const len = Math.hypot(dx, dy) || 1;
        const nx = world.pos.x + (dx / len) * speed;
        const ny = world.pos.y + (dy / len) * speed;
        if (walkable(world.current, nx, ny)) {
          world.pos.x = nx; world.pos.y = ny;
        } else if (walkable(world.current, nx, world.pos.y)) {
          world.pos.x = nx;
        } else if (walkable(world.current, world.pos.x, ny)) {
          world.pos.y = ny;
        }
        world.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
        world.moving = true;
        world.clock += dt;
      } else if (world.walkPath.length) {
        const target = world.walkPath[0];
        const ddx = target.x - world.pos.x;
        const ddy = target.y - world.pos.y;
        const d = Math.hypot(ddx, ddy);
        const step = 240 * dt * tiredSpeed();
        if (d <= step) {
          world.pos.x = target.x;
          world.pos.y = target.y;
          world.walkPath.shift();
          if (!world.walkPath.length) {
            world.moving = false;
            // 到了地方先转过身对着它，别背对着菜地翻土
            if (world.faceAt) { world.look(world.faceAt.x, world.faceAt.y); world.faceAt = null; }
            const cb = world.walkThen;
            world.walkThen = null;
            if (cb) cb();
          }
        } else {
          world.pos.x += (ddx / d) * step;
          world.pos.y += (ddy / d) * step;
          world.dir = Math.abs(ddx) > Math.abs(ddy) ? (ddx < 0 ? 'left' : 'right') : (ddy < 0 ? 'up' : 'down');
          world.moving = true;
          world.clock += dt;
        }
      } else {
        world.moving = false;
        world.clock = 0;
      }
    } else {
      world.moving = false;
      world.clock = 0;
    }

    // 站久了会自己换个方向看看，不是一直盯着一个点
    if (!world.moving && !world.pose && !world.busy && !P.ui.modalOpen()) {
      if (!world.idleAt) world.idleAt = now;
      if (now - world.idleAt > 11000 && now - (world.glanceAt || 0) > 7000) {
        world.glanceAt = now;
        world.dir = Math.random() < 0.5 ? 'left' : 'right';
      }
    } else {
      world.idleAt = 0;
    }

    // 相机慢慢跟人；往哪边走就先偏过去一点，看得到前面
    const leadX = world.moving ? (world.dir === 'left' ? -26 : world.dir === 'right' ? 26 : 0) : 0;
    const leadY = world.moving ? (world.dir === 'up' ? -18 : world.dir === 'down' ? 12 : 0) : 0;
    const cineSpot = world.cineSpot;
    if (cineSpot) {
      // 过场：镜头往两个人身上推近，别跟着玩家走开
      world.focus.x = U.lerp(world.focus.x, cineSpot.x, 0.085);
      world.focus.y = U.lerp(world.focus.y, cineSpot.y, 0.085);
    } else {
      world.focus.x = U.lerp(world.focus.x, world.pos.x + leadX, 0.1);
      world.focus.y = U.lerp(world.focus.y, world.pos.y + leadY, 0.1);
    }
    const wantZoom = cineSpot ? cineSpot.zoom : 1;
    if (Math.abs((world.cam.zoom || 1) - wantZoom) > 0.002) {
      world.cam.zoom = U.lerp(world.cam.zoom || 1, wantZoom, 0.08);
      world.cam.scale = world.cam.base * world.cam.zoom;
    }
    if (world.cam.scale && el.art) placeCamera(false);

    paintAvatar();
    P.npc && P.npc.paint();
    requestAnimationFrame(tick);
  }

  /* ------------------------------------------------------------- 行为 --- */
  world.walkable = function (x, y) { return walkable(world.current, x, y); };

  world.walkTo = function walkTo(x, y, cb) {
    const path = findPath(world.current, world.pos, { x, y });
    if (!path.length) {
      showHint('这边过不去，点旁边的地面试试');
      return false;
    }
    world.walkPath = path;
    world.walkThen = cb || null;
    world.faceAt = { x, y };
    world.busy = false;
    return true;
  };

  world.say = function () {};

  world.look = function look(x, y) {
    const dx = x - world.pos.x;
    const dy = y - world.pos.y;
    world.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
  };

  world.go = function go(sceneKey, opts = {}) {
    if (!SCENES[sceneKey]) return;
    const from = SCENES[world.current];
    if (world.current !== sceneKey) world.positions[world.current] = { ...world.pos };
    const next = SCENES[sceneKey];
    world.current = sceneKey;
    world.pos = { ...(opts.at || world.positions[sceneKey] || next.spawn) };
    // 存档点要是不小心落在走不到的地方（改过坐标、换过图），别让人卡在墙里
    if (!walkable(sceneKey, world.pos.x, world.pos.y)) {
      const near = nearestWalkable(sceneKey, world.pos.x, world.pos.y);
      if (near) world.pos = { x: near.x, y: near.y };
    }
    world.positions[sceneKey] = { ...world.pos };
    world.walkPath = [];
    world.walkThen = null;
    world.pressed.clear();
    world.moving = false;
    world.setPose('');
    world.hold('');

    document.querySelectorAll('.scene').forEach((node) => {
      node.classList.toggle('active', node.dataset.scene === sceneKey);
    });
    const sceneNode = document.querySelector(`.scene[data-scene="${sceneKey}"]`);
    if (sceneNode) {
      ensureActors();
      sceneNode.appendChild(el.shadow);
      sceneNode.appendChild(el.avatar);
    }
    world.focus = { ...world.pos };
    world.cineSpot = null;
    world.cam.zoom = 1;
    const stageNode = document.getElementById('stage');
    if (stageNode) stageNode.dataset.scene = sceneKey;
    P.state.scene = sceneKey;
    P.state.pos = { ...world.pos };
    fitCamera(true);
    paintAvatar();
    world.act('land');
    // 从黑里淡出来，别突然就站在那儿了
    if (el.avatar) {
      el.avatar.classList.remove('entering');
      void el.avatar.offsetWidth;
      el.avatar.classList.add('entering');
      clearTimeout(world.enterTimer);
      world.enterTimer = setTimeout(() => el.avatar && el.avatar.classList.remove('entering'), 420);
    }
    if (P.npc) {
      // 上一个场景里被强行叫来的人，换场景之后就回自己的日程
      if (P.npc.forced && P.npc.forced !== sceneKey) P.npc.forced = null;
      P.npc.enter(sceneKey);
    }
    P.moments && P.moments.onEnter && P.moments.onEnter(sceneKey);
    P.weather && P.weather.syncRain && P.weather.syncRain();
    P.world.onScene && P.world.onScene(sceneKey);
    P.save();
    if (!opts.quiet) sceneWipe();
    if (from && from.label) {
      const names = {
        cottage: '小屋', farm: '农场', lake: '湖边', tvroom: '客厅',
        bath: '澡堂', roof: '楼顶', garden: '菜园', pasture: '牧场', town: '镇上'
      };
      if (!opts.quiet) showHint(`来到${names[sceneKey]}`);
    }
    P.ui && P.ui.task();
    P.story && P.story.onScene && P.story.onScene(sceneKey);
  };

  /* 换场景的时候，眼前先暗一下再亮起来，像真的跨过一道门 */
  function sceneWipe() {
    if (!el.stage) return;
    const node = document.createElement('i');
    node.className = 'scene-wipe';
    node.setAttribute('aria-hidden', 'true');
    el.stage.appendChild(node);
    setTimeout(() => node.remove(), 560);
  }

  function showHint(text, ms = 2600) {
    if (!el.hint) return;
    el.hint.textContent = text;
    el.hint.classList.add('show');
    clearTimeout(world.hintTimer);
    world.hintTimer = setTimeout(() => el.hint.classList.remove('show'), ms);
  }
  P.showHint = showHint;

  /* ------------------------------------------------------------- 箭头 --- */
  let arrow = null;
  world.pointAt = function pointAt(target) {
    if (!arrow) {
      arrow = document.createElement('div');
      arrow.className = 'quest-arrow';
      arrow.setAttribute('aria-hidden', 'true');
    }
    if (!target) { arrow.remove(); return; }
    const sceneNode = document.querySelector(`.scene[data-scene="${target.scene || world.current}"]`);
    if (!sceneNode) return;
    arrow.style.left = `${target.x}px`;
    arrow.style.top = `${target.y}px`;
    if (arrow.parentNode !== sceneNode) sceneNode.appendChild(arrow);
  };

  /* 点一下地面，在落点闪一圈，让人知道点到了哪 */
  function tapRing(x, y) {
    const sceneNode = document.querySelector(`.scene[data-scene="${world.current}"]`);
    if (!sceneNode) return;
    const node = document.createElement('i');
    node.className = 'tap-ring';
    node.style.left = `${x}px`;
    node.style.top = `${y - 6}px`;
    sceneNode.appendChild(node);
    setTimeout(() => node.remove(), 600);
  }
  world.tapRing = tapRing;

  /* ------------------------------------------------------------- 交互 --- */
  function bindStage() {
    el.stage.addEventListener('pointerdown', (event) => {
      if (event.target.closest('button, .dialog, .sheet, .timing, .dpad')) return;
      if (P.ui.modalOpen() || world.busy) return;
      if (P.fishing && P.fishing.phase !== 'idle') return;
      const p = P.screenToArt(event.clientX, event.clientY);
      if (!walkable(world.current, p.x, p.y)) {
        const near = nearestWalkable(world.current, p.x, p.y);
        if (U.dist(near, p) > 260) return;
        if (world.walkTo(near.x, near.y)) tapRing(near.x, near.y);
        return;
      }
      if (world.walkTo(p.x, p.y)) tapRing(p.x, p.y);
      P.audio && P.audio.start();
    });

    document.addEventListener('keydown', (event) => {
      const map = {
        ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down',
        ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right'
      };
      const dir = map[event.key];
      if (!dir || P.ui.modalOpen()) return;
      event.preventDefault();
      world.pressed.add(dir);
      P.audio && P.audio.start();
    });
    document.addEventListener('keyup', (event) => {
      const map = {
        ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down',
        ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right'
      };
      if (map[event.key]) world.pressed.delete(map[event.key]);
    });
    window.addEventListener('blur', () => world.pressed.clear());

    document.querySelectorAll('[data-move]').forEach((button) => {
      const dir = button.dataset.move;
      button.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        button.setPointerCapture(e.pointerId);
        world.pressed.add(dir);
        P.audio && P.audio.start();
      });
      const stop = () => world.pressed.delete(dir);
      button.addEventListener('pointerup', stop);
      button.addEventListener('pointercancel', stop);
      button.addEventListener('lostpointercapture', stop);
    });

    document.querySelectorAll('.exit').forEach((button) => {
      button.addEventListener('click', () => {
        // 有些「出口」其实要演一段（比如开车），那种走 actions
        if (button.dataset.action) {
          P.audio && P.audio.start();
          P.audio && P.audio.sfx('click');
          const act = P.actions && P.actions[button.dataset.action];
          if (act) act(button);
          return;
        }
        // 楼顶这种只有晚上才对的地方，白天点上去给句提示就好
        const need = Number(button.dataset.needPhase);
        if (need && P.state.phase < need) {
          showHint('天还亮着，等傍晚再上楼顶吧', 2400);
          P.audio && P.audio.sfx('nope');
          return;
        }
        P.audio && P.audio.sfx('page');
        world.go(button.dataset.exit);
      });
    });

    document.querySelectorAll('.spot').forEach((button) => {
      button.addEventListener('click', () => {
        const action = button.dataset.action;
        P.audio && P.audio.start();
        P.audio && P.audio.sfx('click');
        if (P.actions && P.actions[action]) P.actions[action](button);
      });
    });

    const rotateDismiss = document.getElementById('rotateDismiss');
    if (rotateDismiss) {
      rotateDismiss.addEventListener('click', () => {
        el.stage.classList.remove('is-short');
      });
    }

    window.addEventListener('resize', () => fitCamera(false));
    if (window.visualViewport) window.visualViewport.addEventListener('resize', () => fitCamera(false));
  }

  world.init = function init() {
    grab();
    ensureActors();
    bindStage();
    // 只有很窄的竖屏才提示横屏
    if (el.stage.clientWidth < 560 && el.stage.clientHeight > el.stage.clientWidth * 1.1) {
      el.stage.classList.add('is-short');
      setTimeout(() => el.stage.classList.remove('is-short'), 6500);
    }
    fitCamera(true);
    last = performance.now();
    requestAnimationFrame(tick);
  };

  world.enterFromState = function enterFromState() {
    const scene = P.state.scene && SCENES[P.state.scene] ? P.state.scene : 'cottage';
    world.positions = {};
    if (P.state.pos) world.positions[scene] = { ...P.state.pos };
    world.go(scene, { quiet: true, at: P.state.pos });
    // 初始位置不在可行走区时挪回去
    if (!walkable(scene, world.pos.x, world.pos.y)) {
      world.pos = { ...SCENES[scene].spawn };
      world.positions[scene] = { ...world.pos };
    }
  };

  world.refresh = function refresh() {
    fitCamera(false);
  };
})();
