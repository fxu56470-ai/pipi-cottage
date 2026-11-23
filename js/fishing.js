/* 屁屁小屋 · 钓鱼：抛竿 → 等 → 咬钩 → 时机条 */
(function () {
  const P = window.P;
  const U = P.util;
  const A = (P.actions = P.actions || {});

  const WATER = { x1: 250, y1: 440, x2: 860, y2: 890 };
  const CAST_FROM = { x: 900, y: 712 };
  const fish = { busy: false, phase: 'idle', bobber: null, line: null, timer: null, bar: null, raf: 0 };
  P.fishing = fish;

  function stage() { return document.getElementById('stage'); }

  function clearTimers() {
    clearTimeout(fish.timer);
    cancelAnimationFrame(fish.raf);
    document.removeEventListener('keydown', onKey);
  }

  function cleanup() {
    P.world.setPose && P.world.setPose('');
    P.world.hold && P.world.hold('');
    clearTimers();
    fish.busy = false;
    fish.phase = 'idle';
    [fish.bobber, fish.line, fish.bar].forEach((node) => node && node.remove());
    fish.bobber = null;
    fish.line = null;
    fish.bar = null;
    document.querySelectorAll('.bite, .ripple').forEach((n) => n.remove());
  }

  function artPoint(node) {
    const scene = document.querySelector('.scene[data-scene="lake"]');
    if (scene && !node.parentNode) scene.appendChild(node);
    return node;
  }

  function makeBobber(x, y) {
    const node = document.createElement('div');
    node.className = 'bobber';
    node.style.left = `${x}px`;
    node.style.top = `${y}px`;
    artPoint(node);
    return node;
  }

  function makeLine() {
    const node = document.createElement('div');
    node.className = 'fishline';
    artPoint(node);
    return node;
  }

  // 杆尖的位置：鱼竿在角色手里，向左上斜出去，线从这里垂到浮标
  function rodTip() {
    const depth = P.world.avatarDepth ? P.world.avatarDepth() : 0.94;
    return { x: P.world.pos.x - 106 * depth, y: P.world.pos.y - 44 * depth };
  }

  function drawLine(bobX, bobY) {
    if (!fish.line) return;
    const start = rodTip();
    const dx = bobX - start.x;
    const dy = bobY - start.y;
    const len = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);
    fish.line.style.left = `${start.x}px`;
    fish.line.style.top = `${start.y}px`;
    fish.line.style.width = `${len}px`;
    fish.line.style.transform = `rotate(${angle}rad)`;
  }

  function ripple(x, y) {
    const scene = document.querySelector('.scene[data-scene="lake"]');
    if (!scene) return;
    const node = document.createElement('div');
    node.className = 'ripple';
    node.style.left = `${x}px`;
    node.style.top = `${y}px`;
    scene.appendChild(node);
    setTimeout(() => node.remove(), 3200);
  }

  /* ------------------------------------------------------------- 抛竿 --- */
  async function cast() {
    if (fish.busy) return;
    if (!P.hasEnergy(1)) return;
    fish.busy = true;
    P.state.energy -= 1;
    P.spend(0, 1);
    P.ui.hud();

    const from = P.world.pos;
    const bob = {
      x: U.clamp(from.x - 210, WATER.x1 + 60, WATER.x2 - 40),
      y: U.clamp(from.y + 40, WATER.y1 + 60, WATER.y2 - 30)
    };
    P.world.setPose && P.world.setPose('fish');
    P.world.hold && P.world.hold('rod');
    const av = document.getElementById('avatar');
    if (av) {
      av.classList.add('casting');
      setTimeout(() => av.classList.remove('casting'), 780);
    }
    const tip = rodTip();
    fish.line = makeLine();
    fish.bobber = makeBobber(tip.x, tip.y);
    fish.bobber.style.transition = 'left .55s cubic-bezier(.3,.8,.5,1), top .55s cubic-bezier(.3,.8,.5,1)';
    drawLine(tip.x, tip.y);
    P.audio && P.audio.sfx('cast');
    P.showHint(isRain() ? '下雨了，水里的东西比平时活跃' : '抛竿……等它咬钩，别急');
    await new Promise((r) => setTimeout(r, 60));
    fish.bobber.style.left = `${bob.x}px`;
    fish.bobber.style.top = `${bob.y}px`;
    const anim = setInterval(() => drawLine(bob.x, bob.y), 40);
    await new Promise((r) => setTimeout(r, 600));
    clearInterval(anim);
    drawLine(bob.x, bob.y);
    fish.bobber.style.transition = '';
    ripple(bob.x, bob.y);
    P.audio && P.audio.sfx('plop');

    fish.phase = 'wait';
    const waitMs = U.rand(1500, 4200);
    fish.timer = setTimeout(() => bite(bob), waitMs);
  }

  /* ------------------------------------------------------------- 咬钩 --- */
  function bite(bob) {
    if (fish.phase !== 'wait') return;
    fish.phase = 'bite';
    P.audio && P.audio.sfx('bite');
    const scene = document.querySelector('.scene[data-scene="lake"]');
    const mark = document.createElement('div');
    mark.className = 'bite';
    mark.textContent = '!';
    mark.style.left = `${bob.x}px`;
    mark.style.top = `${bob.y}px`;
    scene.appendChild(mark);
    fish.bobber.style.transition = 'top .12s ease-out';
    fish.bobber.style.top = `${bob.y + 14}px`;
    ripple(bob.x, bob.y);
    // 竿尖被拽一下，人也跟着顿一顿
    const av = document.getElementById('avatar');
    if (av) {
      av.dataset.bite = '1';
      setTimeout(() => { if (av) delete av.dataset.bite; }, 1500);
      P.world.act && P.world.act('fish');
    }
    P.vibrate && P.vibrate(28);
    P.showHint('咬钩了！快点一下水面', 1400);
    // 咬钩后 1.6 秒内没反应就跑掉了
    fish.timer = setTimeout(() => {
      if (fish.phase === 'bite') fail('鱼吐了钩，跑掉了……');
    }, 1600);
  }

  /* -------------------------------------------------------------- QTE --- */
  function openBar() {
    const bar = document.createElement('div');
    bar.className = 'timing';
    // 雨天鱼贪嘴，绿区宽一点；好鱼竿再宽一点
    const rain = isRain();
    const wide = (rain ? 1.25 : 1) * (P.hasTool('rod') ? 1.3 : 1);
    const zone = U.clamp(U.rand(24, 40) * wide, 22, 62);   // 绿区宽度（百分比）
    const start = U.rand(6, Math.max(8, 94 - zone));
    const perfect = U.rand(30, 60);
    bar.innerHTML = `
      <strong>看准时机，点一下</strong>
      <div class="track"><div class="zone" style="left:${start}%;width:${zone}%"></div>
        <div class="zone perfect" style="left:${start + zone * 0.4}%;width:${zone * 0.2}%"></div>
        <div class="marker" style="left:0%"></div></div>
      <div class="tip2">绿区里停住就能钓上来 · 空格也行${rain ? ' · 雨天它比较急' : ''}</div>`;
    stage().appendChild(bar);
    fish.bar = bar;
    const marker = bar.querySelector('.marker');
    let pos = 0;
    let dir = 1;
    const speed = rain ? 0.52 : 0.62;
    let lastT = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.05, (now - lastT) / 1000);
      lastT = now;
      pos += dir * speed * dt * 100;
      if (pos >= 100) { pos = 100; dir = -1; }
      if (pos <= 0) { pos = 0; dir = 1; }
      marker.style.left = `${pos}%`;
      fish.zone = { start, end: start + zone, perfectStart: start + zone * 0.4, perfectEnd: start + zone * 0.6 };
      fish.raf = requestAnimationFrame(loop);
    };
    fish.raf = requestAnimationFrame(loop);
    fish.sweep = { pos: () => pos };
    fish.phase = 'qte';
    clearTimeout(fish.timer);
    fish.timer = setTimeout(() => {
      if (fish.phase === 'qte') fail('线松了，鱼跑了……');
    }, 5200);
    document.addEventListener('keydown', onKey);
    bar.addEventListener('pointerdown', strike);
  }

  function onKey(event) {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      strike();
    }
  }

  function strike() {
    if (fish.phase !== 'qte') return;
    const pos = fish.sweep ? fish.sweep.pos() : 0;
    const zone = fish.zone;
    const inZone = pos >= zone.start && pos <= zone.end;
    const perfect = pos >= zone.perfectStart && pos <= zone.perfectEnd;
    if (!inZone) {
      fail('手一抖，鱼线空了');
      return;
    }
    land(perfect);
  }

  /* 正中绿心的时候，屏幕上要有个东西替他叫一声 ---------------------- */
  function perfectFlash() {
    // 挂在 body 上，结算面板弹出来的时候它还在上面飘
    const node = document.createElement('div');
    node.className = 'perfect-flash';
    node.textContent = 'PERFECT';
    node.setAttribute('aria-hidden', 'true');
    document.body.appendChild(node);
    setTimeout(() => node.remove(), 1200);
    P.vibrate && P.vibrate([12, 40, 18]);
  }

  /* 上钩的东西先蹦出水面，再收进手里 ------------------------------- */
  function fishLeap(x, y, icon, perfect) {
    const scene = document.querySelector('.scene[data-scene="lake"]');
    if (!scene) return;
    const img = document.createElement('img');
    img.src = P.icon(icon);
    img.alt = '';
    img.className = 'fish-leap' + (perfect ? ' perfect' : '');
    img.style.left = `${x}px`;
    img.style.top = `${y}px`;
    scene.appendChild(img);
    setTimeout(() => img.remove(), 1000);
    for (let i = 0; i < (perfect ? 10 : 6); i += 1) {
      const dot = document.createElement('i');
      dot.className = 'leap-drop';
      dot.style.cssText = `left:${x + U.rand(-18, 18)}px;top:${y}px;--dx:${U.rand(-26, 26)}px;`;
      scene.appendChild(dot);
      setTimeout(() => dot.remove(), 700);
    }
  }

  /* ------------------------------------------------------------- 收杆 --- */
  function isRain() {
    return P.weather && P.weather.is && P.weather.is('rain');
  }

  function pickFish(perfect) {
    const phase = P.state.phase;
    const weather = (P.weather && P.weather.get && P.weather.get()) || 'sun';
    const pool = Object.entries(P.FISH).filter(([, f]) => f.phases.includes(phase)
      && (!f.weather || f.weather.includes(weather)));
    const weighted = [];
    pool.forEach(([id, f]) => {
      let w = f.weight;
      if (perfect && !f.junk) w *= 1.8;
      // 雨天出没的鱼，雨天更容易上钩
      if (isRain() && f.weather && f.weather.includes('rain')) w *= 1.5;
      for (let i = 0; i < Math.max(1, Math.round(w)); i += 1) weighted.push(id);
    });
    return U.pick(weighted) || 'minnow';
  }

  async function land(perfect) {
    fish.phase = 'landing';
    clearTimers();
    P.world && P.world.act && P.world.act('land');
    const id = pickFish(perfect);
    const item = P.FISH[id];
    const first = !P.state.caught[id];
    P.state.caught[id] = (P.state.caught[id] || 0) + 1;
    P.state.stats.fished += 1;
    // 连击和雨天战绩，成就那边要用
    const st = P.state;
    st.flags.perfectStreak = perfect ? (st.flags.perfectStreak || 0) + 1 : 0;
    st.flags.bestStreak = Math.max(st.flags.bestStreak || 0, st.flags.perfectStreak);
    if (isRain()) st.stats.rainFished = (st.stats.rainFished || 0) + 1;
    P.addItem(`fish_${id}`, 1);
    P.audio && P.audio.sfx('catch');
    if (perfect) perfectFlash();
    if (first) P.audio && P.audio.tone(1046, 0.3, 0.05, 'triangle');
    // 浮标可能已经被清掉了，兜个底：从他面前的水面蹦出来
    const bx = fish.bobber ? parseFloat(fish.bobber.style.left) || 0
      : U.clamp(P.world.pos.x - 232, WATER.x1 + 70, WATER.x2 - 40);
    const by = fish.bobber ? parseFloat(fish.bobber.style.top) || 0 : P.world.pos.y + 26;
    fishLeap(bx, by, item.icon, perfect);
    if (fish.bobber) {
      fish.bobber.style.transition = 'opacity .2s, top .2s';
      fish.bobber.style.top = `${parseFloat(fish.bobber.style.top) - 40}px`;
      fish.bobber.style.opacity = '0';
    }
    P.state.flags.caughtAny = true;
    if (isRain() && (id === 'frog' || id === 'catfish')) P.state.flags.rainCatch = true;
    P.story && P.story.check('fish');
    P.daily && P.daily.bump('fish');
    if (isRain()) P.daily && P.daily.bump('fishRain');
    P.save();
    P.ui.dexCheck && P.ui.dexCheck();

    const rarity = { common: '常见', uncommon: '少见', rare: '稀有', junk: '杂物' }[item.rarity] || '';
    // 多留半拍，让人看清鱼是蹦上来的，别一结算就盖住
    await new Promise((r) => setTimeout(r, 620));
    cleanup();
    P.ui.sheet({
      title: first ? `第一次见到${item.name}` : (perfect ? '漂亮的收杆！' : '钓上来啦'),
      kicker: first ? 'NEW' : (perfect ? 'PERFECT' : 'CATCH'),
      body: `<div class="detail" style="margin-top:0">
          <img src="${P.icon(item.icon)}" alt="">
          <div class="meta">
            <h3>${item.name}</h3>
            <p>${item.note}</p>
            <p style="margin:0;font-size:12px;color:#9a7a6d">${item.junk ? '这东西……也能卖 1 金币' : `能卖 ${item.value} 金币`}${rarity ? ` · ${rarity}` : ''}</p>
          </div>
        </div>${first ? '<p style="margin:12px 0 0">图鉴里多了一条。</p>' : ''}`,
      foot: [
        { label: '放进背包', run: () => P.ui.closeSheet() },
        { label: '再钓一次', pale: true, run: () => { P.ui.closeSheet(); setTimeout(() => cast(), 200); } }
      ]
    });
  }

  function fail(text) {
    if (fish.phase === 'idle') return;
    cleanup();
    P.audio && P.audio.sfx('fail');
    P.showHint(text, 2200);
  }

  /* ------------------------------------------------------------- 入口 --- */
  fish.pick = pickFish;                    // 方便调试时抽查概率
  fish.land = land;

  A.fish = async function fishAction() {
    if (fish.busy) return;
    if (P.ui.modalOpen()) return;
    if (!P.hasEnergy(1)) return;
    P.world.walkTo(CAST_FROM.x, CAST_FROM.y, () => {
      P.world.look(WATER.x1, WATER.y1);
      cast();
    });
  };

  // 点水面也算
  P.fishingInit = function init() {    const scene = document.querySelector('.scene[data-scene="lake"]');
    if (!scene) return;
    scene.addEventListener('pointerdown', (event) => {
      if (fish.phase === 'bite') {
        event.preventDefault();
        openBar();
        return;
      }
      if (fish.phase === 'qte') {
        event.preventDefault();
        strike();
      }
    });
  };
})();
