/* 屁屁小屋 · 两个人的动作
   把「说一句然后弹插画」改成「先真的动起来」：
   走过去、坐下、靠过去、蒸汽、心跳、镜头推近，演完了再给插画。
   这一层只负责摆位、镜头和小特效，判断什么时候演留给 moments.js。 */
(function () {
  const P = window.P;
  const U = P.util;

  const state = { active: false, saved: null, fg: [], timers: [], staySeat: false };

  function sceneNode(key) {
    return document.querySelector(`.scene[data-scene="${key || P.world.current}"]`);
  }
  function after(ms, fn) {
    const t = setTimeout(fn, ms);
    state.timers.push(t);
    return t;
  }
  function wait(ms) {
    return new Promise((resolve) => after(ms, resolve));
  }

  const duo = (P.duo = {});

  /* ------------------------------------------------------------- 开始/结束 --- */
  duo.active = () => state.active;

  duo.begin = function begin(mode) {
    if (state.active) return false;
    state.active = true;
    state.saved = { pos: { ...P.world.pos }, dir: P.world.dir };
    P.world.busy = true;
    P.world.pressed.clear();
    P.world.cineSpot = null;
    if (P.npc) {
      P.npc.quiet = true;
      P.npc.faceMode = null;
      if (P.npc.unseat) P.npc.unseat();
      if (P.npc.el) {
        delete P.npc.el.dataset.moving;
        if (P.npc.bubble) P.npc.bubble.hidden = true;
      }
    }
    const stage = document.getElementById('stage');
    if (stage) stage.dataset.duo = mode || '';
    return true;
  };

  duo.end = function end() {
    if (!state.active) return;
    state.active = false;
    P.world.busy = false;
    P.world.cine(null);
    state.timers.forEach((t) => clearTimeout(t));
    state.timers = [];
    state.fg.forEach((node) => node.remove());
    state.fg = [];
    const stage = document.getElementById('stage');
    if (stage) stage.dataset.duo = '';
    if (P.npc) {
      P.npc.quiet = false;
      P.npc.faceMode = null;
      if (P.npc.el) {
        delete P.npc.el.dataset.pose;
        delete P.npc.el.dataset.lean;
        delete P.npc.el.dataset.hold;
        delete P.npc.el.dataset.towel;
        P.npc.el.style.transition = '';
        if (P.npc.shadow) P.npc.shadow.style.transition = '';
      }
      P.npc.setMood && P.npc.setMood(P.world.current);
    }
    P.world.setPose('');
    P.world.hold && P.world.hold('');
    const av = document.getElementById('avatar');
    if (av) {
      delete av.dataset.lean;
      delete av.dataset.hold;
      delete av.dataset.towel;
    }
    if (state.saved) {
      P.world.pos = { ...state.saved.pos };
      P.world.dir = state.saved.dir || 'down';
      P.world.focus = { ...P.world.pos };
      state.saved = null;
    }
    // 演完了让他回到这个场景里该待的地方（沙发 / 木桶 / 楼顶栏杆）。
    // 有些演出里他刚坐下、刚擦完头发，这时候不该把他塞回桶里去，用 duo.stay() 关掉。
    const sceneKey = P.world.current;
    const stay = state.staySeat;
    state.staySeat = false;
    if (!stay && P.moments && P.moments.onEnter) {
      setTimeout(() => { if (P.world.current === sceneKey) P.moments.onEnter(sceneKey); }, 60);
    }
  };

  duo.stay = function stay() { state.staySeat = true; };

  /* --------------------------------------------------------------- 摆位 --- */
  // 你自己：站到某一点、换个姿势、朝哪边
  duo.player = function player(spot, pose, dir) {
    if (spot) P.world.pos = { x: spot.x, y: spot.y };
    if (dir) P.world.dir = dir;
    if (pose !== undefined) P.world.setPose(pose);
  };

  // 他：平滑挪到某一点（不是瞬移），换姿势、定朝向
  duo.npc = function npc(spot, pose, face) {
    const him = P.npc;
    if (!him || !him.el) return;
    // 有些场景他本来不在这儿（白天还在农场，你却跑去湖边）：
    // 那就先把他叫进当前场景，淡入一下，别让演出对着空气说话
    const sceneKey = P.world.current;
    const parent = him.el.parentElement;
    const inScene = parent && parent.dataset.scene === sceneKey;
    if (!inScene && him.summon && him.summon(sceneKey, spot)) {
      him.el.style.transition = 'opacity .45s ease';
      him.el.style.opacity = '0';
      him.shadow.style.transition = 'opacity .45s ease';
      him.shadow.style.opacity = '0';
      after(40, () => {
        if (!him.el) return;
        him.el.style.opacity = '1';
        him.shadow.style.opacity = '1';
      });
      after(560, () => {
        if (!him.el) return;
        him.el.style.opacity = '';
        him.shadow.style.opacity = '';
        him.el.style.transition = '';
        him.shadow.style.transition = '';
      });
    }
    if (spot) {
      const m = 'left .62s cubic-bezier(.32,.8,.35,1), top .62s cubic-bezier(.32,.8,.35,1)';
      him.el.style.transition = m;
      him.shadow.style.transition = m;
      him.el.style.left = `${spot.x}px`;
      him.el.style.top = `${spot.y}px`;
      him.shadow.style.left = `${spot.x}px`;
      him.shadow.style.top = `${spot.y}px`;
      him.home = { ...spot };
      after(700, () => {
        if (!him.el) return;
        him.el.style.transition = '';
        him.shadow.style.transition = '';
      });
    }
    if (face) him.faceMode = face;
    if (pose !== undefined) {
      if (pose) him.el.dataset.pose = pose;
      else delete him.el.dataset.pose;
    }
  };

  duo.lean = function lean(who, dir) {
    const node = who === 'npc' ? (P.npc && P.npc.el) : document.getElementById('avatar');
    if (!node) return;
    if (dir) node.dataset.lean = dir;
    else delete node.dataset.lean;
  };

  /* 手上的东西：鱼竿、毛巾。不给 kind 就是放下 */
  duo.hold = function hold(who, kind) {
    const node = who === 'npc' ? (P.npc && P.npc.el) : document.getElementById('avatar');
    if (!node) return;
    if (kind) node.dataset.hold = kind;
    else delete node.dataset.hold;
    if (kind !== 'towel') delete node.dataset.towel;
  };

  /* 毛巾的三种状态：拿在手上 / 举起来擦 / 整条盖头上 */
  duo.towel = function towel(who, state) {
    const node = who === 'npc' ? (P.npc && P.npc.el) : document.getElementById('avatar');
    if (!node) return;
    if (state) node.dataset.towel = state;
    else delete node.dataset.towel;
  };

  /* 自己走过去：不是瞬移，是一小段带弧线的挪动（踩上沙发、跨进木桶、爬上床） */
  duo.glide = function glide(spot, ms) {
    return new Promise((resolve) => {
      const from = { ...P.world.pos };
      const t0 = performance.now();
      const dur = ms || 620;
      const arc = Math.min(26, Math.hypot(spot.x - from.x, spot.y - from.y) * 0.16);
      function step(now) {
        const k = Math.min(1, (now - t0) / dur);
        const e = 1 - Math.pow(1 - k, 3);
        P.world.pos = {
          x: U.lerp(from.x, spot.x, e),
          y: U.lerp(from.y, spot.y, e) - Math.sin(k * Math.PI) * arc
        };
        if (Math.abs(spot.x - from.x) > 6) P.world.dir = spot.x < from.x ? 'left' : 'right';
        if (k < 1) requestAnimationFrame(step);
        else { P.world.pos = { ...spot }; resolve(); }
      }
      requestAnimationFrame(step);
      state.timers.push(setTimeout(resolve, dur + 260));
    });
  };

  /* --------------------------------------------------------------- 镜头 --- */
  duo.cine = function cine(focus, zoom) {
    // 竖屏本来就裁得狠，再推 1.5 倍就只剩两张脸了，压回来一点
    const stage = document.getElementById('stage');
    let z = zoom || 1.18;
    if (stage && stage.clientHeight > stage.clientWidth * 1.1) z = 1 + (z - 1) * 0.55;
    P.world.cine(focus, z);
  };

  /* --------------------------------------------------------------- 小符号 --- */
  const BITS = {
    heart: { chars: ['♥'], color: '#ff9db8', size: [22, 34] },
    zzz: { chars: ['Z', 'z'], color: '#cfd8ff', size: [16, 26] },
    spark: { chars: ['✦', '✧'], color: '#ffe6a3', size: [14, 24] },
    note: { chars: ['♪'], color: '#ffd9a0', size: [18, 28] }
  };

  duo.bits = function bits(spot, kind, n) {
    const scene = sceneNode();
    const conf = BITS[kind] || BITS.heart;
    if (!scene || !spot) return;
    for (let i = 0; i < (n || 3); i += 1) {
      const node = document.createElement('span');
      node.className = 'duo-bit';
      node.textContent = U.pick(conf.chars);
      node.style.cssText = `left:${spot.x + U.rand(-24, 24)}px;top:${spot.y - U.rand(110, 165)}px;`
        + `color:${conf.color};font-size:${U.rand(conf.size[0], conf.size[1])}px;`
        + `text-shadow:0 2px 10px #2a1730cc;animation-delay:${i * 0.16}s`;
      scene.appendChild(node);
      after(2400, () => node.remove());
    }
  };

  duo.steam = function steam(spot, n) {
    const scene = sceneNode();
    if (!scene || !spot) return;
    for (let i = 0; i < (n || 4); i += 1) {
      const node = document.createElement('i');
      node.className = 'duo-steam';
      const s = U.rand(0.7, 1.5);
      node.style.cssText = `left:${spot.x + U.rand(-60, 60)}px;top:${spot.y - U.rand(10, 50)}px;`
        + `transform:translate(-50%,0) scale(${s.toFixed(2)});animation-delay:${i * 0.3}s`;
      scene.appendChild(node);
      after(3200, () => node.remove());
    }
  };

  // 场景里浮一句话，不占对话框
  duo.say = function say(who, text, ms) {
    const scene = sceneNode();
    if (!scene) return;
    const p = who === 'npc' ? ((P.npc && P.npc.home) || P.world.pos) : P.world.pos;
    const node = document.createElement('div');
    node.className = 'speech';
    node.textContent = text;
    node.style.left = `${U.clamp(p.x, 170, P.ART.w - 170)}px`;
    node.style.top = `${p.y - (who === 'npc' ? 200 : 190)}px`;
    scene.appendChild(node);
    after(ms || 2400, () => node.remove());
  };

  /* --------------------------------------------------- 演出用的零碎道具 --- */
  // 演出里临时造出来的东西（鱼线、浮标、蹦出水面的鱼、水珠），
  // 都登记在这里，duo.end() 时一次性清干净，不会留在场景里。
  duo.keep = function keep(node) {
    if (node) state.fg.push(node);
    return node;
  };

  // 湿头发上往下掉的水珠
  duo.drip = function drip(spot, n) {
    const scene = sceneNode();
    if (!scene || !spot) return;
    for (let i = 0; i < (n || 4); i += 1) {
      const node = document.createElement('i');
      node.className = 'duo-drip';
      node.style.cssText = `left:${spot.x + U.rand(-30, 30)}px;top:${spot.y + U.rand(-6, 10)}px;`
        + `animation-delay:${i * 0.22}s`;
      scene.appendChild(node);
      duo.keep(node);
      after(1600 + i * 220, () => node.remove());
    }
  };

  // 一根斜着垂进水里的鱼线
  duo.line = function line(from, to) {
    const scene = sceneNode();
    if (!scene || !from || !to) return null;
    const node = document.createElement('div');
    node.className = 'fishline';
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    node.style.left = `${from.x}px`;
    node.style.top = `${from.y}px`;
    node.style.width = `${Math.hypot(dx, dy)}px`;
    node.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
    scene.appendChild(node);
    return duo.keep(node);
  };

  // 浮标 + 一圈涟漪
  duo.bobber = function bobber(spot) {
    const scene = sceneNode();
    if (!scene || !spot) return null;
    const node = document.createElement('div');
    node.className = 'bobber';
    node.style.left = `${spot.x}px`;
    node.style.top = `${spot.y}px`;
    scene.appendChild(node);
    const ring = document.createElement('div');
    ring.className = 'ripple';
    ring.style.left = `${spot.x}px`;
    ring.style.top = `${spot.y}px`;
    scene.appendChild(ring);
    duo.keep(node);
    duo.keep(ring);
    return node;
  };

  // 水面上蹦一个「！」
  duo.mark = function mark(spot, text) {
    const scene = sceneNode();
    if (!scene || !spot) return null;
    const node = document.createElement('div');
    node.className = 'bite';
    node.textContent = text || '!';
    node.style.left = `${spot.x}px`;
    node.style.top = `${spot.y}px`;
    scene.appendChild(node);
    duo.keep(node);
    after(1100, () => node.remove());
    return node;
  };

  // 有东西蹦出水面
  duo.leap = function leap(spot, icon) {
    const scene = sceneNode();
    if (!scene || !spot) return null;
    const img = document.createElement('img');
    img.className = 'duo-fish';
    img.src = P.icon(icon || 'fish-minnow');
    img.alt = '';
    img.style.left = `${spot.x}px`;
    img.style.top = `${spot.y}px`;
    scene.appendChild(img);
    duo.keep(img);
    after(1300, () => img.remove());
    return img;
  };

  /* ------------------------------------------------------------ 前景裁片 --- */
  // 用同一张场景图的一块盖在角色身上：泡澡时挡住下半身、睡觉时当成被子
  duo.fg = function fg(key, img, box) {
    const scene = sceneNode();
    if (!scene) return null;
    let node = scene.querySelector(`.fg-crop[data-key="${key}"]`);
    if (!node) {
      node = document.createElement('i');
      node.className = 'fg-crop';
      node.dataset.key = key;
      node.setAttribute('aria-hidden', 'true');
      node.style.left = `${box.x}px`;
      node.style.top = `${box.y}px`;
      node.style.width = `${box.w}px`;
      node.style.height = `${box.h}px`;
      node.style.backgroundImage = `url(${img})`;
      node.style.backgroundPosition = `${-box.x}px ${-box.y}px`;
      scene.appendChild(node);
      state.fg.push(node);
    }
    return node;
  };

  /* -------------------------------------------------------------- 若干秒 --- */
  duo.wait = wait;

  // 按顺序演一小段，每步 [毫秒, 做的事]
  duo.seq = async function seq(steps) {
    for (let i = 0; i < steps.length; i += 1) {
      const [ms, fn] = steps[i];
      if (ms) await wait(ms);
      if (typeof fn === 'function') fn();
    }
  };
})();
