/* 屁屁小屋 · 男主角「闷葫芦」：日程、出现、对话入口、送礼 */
(function () {
  const P = window.P;
  const U = P.util;

  // 他的日程：早上在农场盯着地，午后去湖边钓鱼，天黑了回小屋。
  const SCHEDULE = { 0: 'farm', 1: 'farm', 2: 'lake', 3: 'cottage' };

  const npc = {
    el: null,
    shadow: null,
    bubble: null,
    here: false,
    facing: 'left'
  };
  P.npc = npc;

  function ensure() {
    if (npc.el) return;
    npc.shadow = document.createElement('div');
    npc.shadow.className = 'npc-shadow';
    npc.el = document.createElement('div');
    npc.el.className = 'npc';
    npc.el.setAttribute('role', 'img');
    npc.el.setAttribute('aria-label', '闷葫芦');
    npc.el.innerHTML = '<i class="prop prop-rod"></i><i class="prop prop-hoe"></i><span class="npc-bubble" hidden></span>';
    npc.bubble = npc.el.querySelector('.npc-bubble');
    npc.el.style.pointerEvents = 'auto';
    npc.el.style.cursor = 'pointer';
    npc.el.addEventListener('click', (event) => {
      event.stopPropagation();
      npc.talk();
    });
  }

  npc.sceneFor = function sceneFor(phase) {
    const ph = phase === undefined ? P.state.phase : phase;
    // 下雨天他不待在露天的地方，回屋里去
    if (P.weather && P.weather.is && P.weather.is('rain')) {
      return ph >= 2 ? 'cottage' : 'tvroom';
    }
    return SCHEDULE[ph] || 'farm';
  };

  /* 一天四个时段他分别在哪 —— 「任务」面板里要列出来 */
  npc.scheduleInfo = function scheduleInfo() {
    const rainy = !!(P.weather && P.weather.is && P.weather.is('rain'));
    return P.PHASES.map((label, i) => {
      const key = npc.sceneFor(i);
      const scene = P.SCENES[key];
      return {
        label,
        time: P.PHASE_TIME[i],
        where: scene ? scene.label : '不知道去哪儿了',
        now: i === P.state.phase,
        rainy
      };
    });
  };

  npc.enter = function enter(sceneKey) {
    ensure();
    npc.place(sceneKey);
  };

  npc.place = function place(sceneKey) {
    const target = npc.forced === sceneKey ? sceneKey : npc.sceneFor();
    const sceneNode = document.querySelector(`.scene[data-scene="${sceneKey}"]`);
    if (!sceneNode) return;
    if (target !== sceneKey) {
      npc.el.remove();
      npc.shadow.remove();
      npc.here = false;
      return;
    }
    const spot = P.SCENES[sceneKey].npc;
    sceneNode.appendChild(npc.shadow);
    sceneNode.appendChild(npc.el);
    npc.el.style.left = `${spot.x}px`;
    npc.el.style.top = `${spot.y}px`;
    npc.shadow.style.left = `${spot.x}px`;
    npc.shadow.style.top = `${spot.y}px`;
    npc.home = { ...spot };
    npc.here = true;
    npc.paint();
    npc.setMood(sceneKey);
    npc.scheduleIdle();
    npc.scheduleStroll();
  };

  /* 场景里的常态：农场握着锄头，湖边举着鱼竿 */
  npc.setMood = function setMood(sceneKey) {
    if (!npc.el) return;
    delete npc.el.dataset.pose;
    delete npc.el.dataset.hold;
    if (npc.quiet) return;
    if (sceneKey === 'lake') {
      npc.el.dataset.hold = 'rod';
      npc.el.dataset.pose = 'fish';
    } else if (sceneKey === 'farm') {
      npc.el.dataset.hold = 'hoe';
    }
  };

  /* 干活：农场里隔一会儿刨一下，别让他像个雕像 */
  let idleTimer = 0;
  npc.scheduleIdle = function scheduleIdle() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      npc.act();
      npc.scheduleIdle();
    }, 6500 + Math.random() * 7000);
  };

  /* 踱步：他会自己在附近挪两步，别一直钉在同一个像素上 */
  let strollTimer = 0;
  let strolling = false;

  npc.scheduleStroll = function scheduleStroll() {
    clearTimeout(strollTimer);
    strollTimer = setTimeout(() => {
      npc.stroll();
      npc.scheduleStroll();
    }, 7200 + Math.random() * 8200);
  };

  npc.stroll = function stroll() {
    if (!npc.el || !npc.here || npc.quiet || strolling) return;
    if (npc.el.dataset.pose === 'fish') return;         // 钓着鱼就别乱走了
    if (P.ui && P.ui.modalOpen()) return;
    if (P.world && P.world.busy) return;
    const conf = P.SCENES[P.world.current];
    if (!conf || !npc.home) return;
    // 你在旁边站着的时候，他会往你这边挪一点，而不是只顾自己晃
    const dx = (P.world && P.world.pos ? P.world.pos.x : npc.home.x) - npc.home.x;
    const dy = (P.world && P.world.pos ? P.world.pos.y : npc.home.y) - npc.home.y;
    const away = Math.hypot(dx, dy);
    let dir;
    if (away > 210 && away < 470 && Math.abs(dy) < 140 && Math.abs(dx) > 40) {
      dir = dx < 0 ? -1 : 1;
    } else {
      dir = Math.random() < 0.5 ? -1 : 1;
    }
    // 有些场景里他是摆在家具边上画的，脚下未必落在可走区；
    // 那种情况只让他小幅挪一下重心，别真的走进墙里。
    const free = P.world.walkable(npc.home.x, npc.home.y);
    let span = free ? 28 + Math.random() * 46 : 9 + Math.random() * 10;
    let tx = npc.home.x + dir * span;
    if (free && !P.world.walkable(tx, npc.home.y)) {
      tx = npc.home.x - dir * span;
      if (!P.world.walkable(tx, npc.home.y)) return;
    }
    const dur = Math.round((0.62 + span / 190) * 100) / 100;
    const el = npc.el;
    const sh = npc.shadow;
    strolling = true;
    el.style.transition = `left ${dur}s ease-in-out, top ${dur}s ease-in-out`;
    sh.style.transition = `left ${dur}s ease-in-out, top ${dur}s ease-in-out`;
    el.dataset.moving = '1';
    npc.facing = dir > 0 ? 'right' : 'left';
    el.style.left = `${tx}px`;
    sh.style.left = `${tx}px`;
    npc.home.x = tx;
    setTimeout(() => {
      strolling = false;
      if (!npc.el) return;
      el.style.transition = '';
      sh.style.transition = '';
      delete el.dataset.moving;
    }, dur * 1000 + 60);
  };

  /* 强行把他放到某个场景的某个位置（比如楼顶） */
  npc.summon = function summon(sceneKey, spot) {
    ensure();
    const sceneNode = document.querySelector(`.scene[data-scene="${sceneKey}"]`);
    if (!sceneNode) return false;
    const target = spot || P.SCENES[sceneKey].npc;
    npc.forced = sceneKey;
    sceneNode.appendChild(npc.shadow);
    sceneNode.appendChild(npc.el);
    npc.el.style.left = `${target.x}px`;
    npc.el.style.top = `${target.y}px`;
    npc.shadow.style.left = `${target.x}px`;
    npc.shadow.style.top = `${target.y}px`;
    npc.home = { ...target };
    npc.here = true;
    npc.paint();
    npc.setMood(sceneKey);
    npc.scheduleIdle();
    return true;
  };

  npc.act = function act() {
    if (!npc.el || !npc.here || npc.quiet) return;
    if (P.ui && P.ui.modalOpen()) return;
    const scene = P.world.current;
    if (npc.sceneFor() !== scene) return;
    if (scene === 'farm') {
      npc.el.dataset.hold = 'hoe';
      npc.el.dataset.pose = 'dig';
      setTimeout(() => { if (npc.el) delete npc.el.dataset.pose; }, 620);
      setTimeout(() => { if (npc.el && npc.here) npc.el.dataset.hold = 'hoe'; }, 700);
    } else if (scene === 'lake') {
      // 甩一下竿，浮标那边会有小水花
      npc.el.dataset.pose = 'fish';
      if (P.world && U.dist(P.world.pos, npc.home) < 420) {
        P.audio && P.audio.sfx('plop');
        rippleAt(npc.home.x - 120, npc.home.y + 30);
      }
    }
  };

  function rippleAt(x, y) {
    const scene = document.querySelector(`.scene[data-scene="${P.world.current}"]`);
    if (!scene) return;
    const node = document.createElement('div');
    node.className = 'ripple';
    node.style.left = `${x}px`;
    node.style.top = `${y}px`;
    scene.appendChild(node);
    setTimeout(() => node.remove(), 3200);
  }

  npc.paint = function paint() {
    if (!npc.el || !npc.here) return;
    const clock = performance.now();
    const depthConf = P.SCENES[P.world.current].depth;
    const t = U.clamp((npc.home.y - depthConf.y0) / (depthConf.y1 - depthConf.y0), 0, 1);
    const scale = U.lerp(depthConf.min, depthConf.max, t);
    npc.el.style.setProperty('--depth', scale.toFixed(3));
    // 你走近了，他会转过头来看你 —— 除非他手上正忙着
    if (!npc.faceMode && !npc.el.dataset.pose && !npc.el.dataset.moving && P.world && P.world.pos) {
      const dx = P.world.pos.x - npc.home.x;
      const dy = P.world.pos.y - npc.home.y;
      if (Math.abs(dx) < 300 && Math.abs(dy) < 260 && Math.abs(dx) > 12) {
        npc.facing = dx < 0 ? 'left' : 'right';
      }
    }
    // faceMode 是过场时强行定的朝向（背对镜头看电视、躺下、一起看星星）
    const row = npc.faceMode === 'up' ? 1
      : npc.faceMode === 'down' ? 0
        : npc.faceMode === 'left' ? 2
          : npc.faceMode === 'right' ? 3
            : (npc.facing === 'right' ? 3 : 2);
    npc.el.style.setProperty('--row', row);
    const walking = npc.el.dataset.moving === '1';
    npc.el.style.setProperty('--frame', walking ? Math.floor(clock / 118) % 4 : 0);
    // 站着的活人不会一动不动：呼吸 + 一点点重心偏移
    npc.el.style.setProperty('--breath', (1 + Math.sin(clock / 1060) * 0.0075).toFixed(4));
    npc.el.style.setProperty('--tilt', (Math.sin(clock / 2400) * 0.55).toFixed(2) + 'deg');
    npc.el.style.zIndex = String(Math.round(npc.home.y) + 5);
    npc.shadow.style.zIndex = String(Math.round(npc.home.y) + 4);
    npc.shadow.style.width = `${Math.round(100 * scale)}px`;
    const cue = npc.quiet ? '' : (P.story && P.story.npcCue && P.story.npcCue());
    if (cue && npc.bubble) {
      npc.bubble.hidden = false;
      npc.bubble.textContent = cue;
    } else if (npc.bubble) {
      npc.bubble.hidden = true;
    }
  };

  npc.approach = function approach() {
    return { x: npc.home.x, y: npc.home.y + 86 };
  };

  npc.talk = function talk() {
    if (!npc.here) {
      P.ui.toast('他这会儿不在，去别处看看', 'ui-heart');
      return;
    }
    if (P.ui.modalOpen()) return;
    const point = npc.approach();
    const open = () => {
      P.world.look(npc.home.x, npc.home.y);
      npc.facing = P.world.pos.x > npc.home.x ? 'right' : 'left';
      P.story.talk();
    };
    if (U.dist(P.world.pos, point) > 170) P.world.walkTo(point.x, point.y, open);
    else open();
  };

  npc.give = async function give(itemId) {
    if (!npc.here) {
      P.ui.toast(`他不在${P.SCENES[P.world.current].label}，等会儿再送吧`, 'ui-heart');
      return;
    }
    const item = P.ITEM[itemId];
    if (!item) return;
    const point = npc.approach();
    const run = async () => {
      if (!P.takeItem(itemId, 1)) return;
      P.state.hearts = Math.min(10, P.state.hearts + 1);
      P.audio && P.audio.sfx('heart');
      floatHearts();
      const lines = P.story.giftLines(item);
      await P.ui.say(lines, { endLabel: '嗯' });
      P.story.check('gift');
      P.daily && P.daily.bump('gift');
      P.ui.hud();
      P.save();
    };
    if (U.dist(P.world.pos, point) > 170) P.world.walkTo(point.x, point.y, run);
    else run();
  };

  function floatHearts() {
    const scene = document.querySelector(`.scene[data-scene="${P.world.current}"]`);
    if (!scene) return;
    for (let i = 0; i < 3; i += 1) {
      const node = document.createElement('span');
      node.textContent = '♥';
      node.style.cssText = `position:absolute;left:${npc.home.x + U.rand(-30, 30)}px;top:${npc.home.y - 210}px;z-index:96;
        color:#ff9db8;font-size:${U.rand(24, 34)}px;text-shadow:0 3px 8px #7c3f5b;pointer-events:none;
        animation:heart-float 1.5s ease-out forwards;animation-delay:${i * 0.12}s`;
      scene.appendChild(node);
      setTimeout(() => node.remove(), 1800);
    }
  }
  npc.floatHearts = floatHearts;
  npc.quiet = false;

  npc.init = function init() {
    ensure();
    npc.place(P.world.current);
  };
})();
