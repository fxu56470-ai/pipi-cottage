/* 屁屁小屋 · 农场：菜地的透视网格、翻土 / 播种 / 浇水 / 收获、睡觉换天 */
(function () {
  const P = window.P;
  const U = P.util;
  const A = (P.actions = P.actions || {});

  // 菜地：农场围栏里那块空地的四个角（美术像素）。u 沿「顶角 → 右角」，
  // v 沿「顶角 → 左角」，这样横竖排都跟着透视走。
  // 菜地的四个角（美术像素坐标），中间用双线性插值切出 4×3 格。
  // 这四个点贴着栅栏里那块空地，别随便改小——改小了泥土会在草地中间孤零零一块。
  const FIELD = {
    T: { x: 716, y: 468 },
    R: { x: 1179, y: 597 },
    B: { x: 806, y: 711 },
    L: { x: 421, y: 579 }
  };
  const COLS = 4;
  const ROWS = 3;

  function at(u, v) {
    const { T, R, B, L } = FIELD;
    return {
      x: (1 - u) * (1 - v) * T.x + u * (1 - v) * R.x + u * v * B.x + (1 - u) * v * L.x,
      y: (1 - u) * (1 - v) * T.y + u * (1 - v) * R.y + u * v * B.y + (1 - u) * v * L.y
    };
  }

  const farm = { nodes: [] };
  P.farm = farm;

  /* --------------------------------------------------------- 建立格子 --- */
  // 用 SVG 把这块地画成「犁过的格子」：横竖各几条虚线，格子刚好对齐
  function drawGrid() {
    const svg = document.getElementById('fieldLines');
    if (!svg) return;
    const parts = [];
    for (let i = 0; i <= COLS; i += 1) {
      const a = at(i / COLS, 0);
      const b = at(i / COLS, 1);
      parts.push(`M${a.x.toFixed(1)} ${a.y.toFixed(1)}L${b.x.toFixed(1)} ${b.y.toFixed(1)}`);
    }
    for (let j = 0; j <= ROWS; j += 1) {
      const a = at(0, j / ROWS);
      const b = at(1, j / ROWS);
      parts.push(`M${a.x.toFixed(1)} ${a.y.toFixed(1)}L${b.x.toFixed(1)} ${b.y.toFixed(1)}`);
    }
    svg.innerHTML = `<path d="${parts.join(' ')}"/>`;
  }


  function build() {
    const host = document.getElementById('plots');
    if (!host || host.dataset.built) return;
    host.dataset.built = '1';
    drawGrid();
    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        const u0 = col / COLS;
        const u1 = (col + 1) / COLS;
        const v0 = row / ROWS;
        const v1 = (row + 1) / ROWS;
        const corners = [at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)];
        const xs = corners.map((p) => p.x);
        const ys = corners.map((p) => p.y);
        const x1 = Math.min(...xs);
        const y1 = Math.min(...ys);
        const w = Math.max(...xs) - x1;
        const h = Math.max(...ys) - y1;
        const clip = corners.map((p) => `${(((p.x - x1) / w) * 100).toFixed(2)}% ${(((p.y - y1) / h) * 100).toFixed(2)}%`).join(', ');
        const index = row * COLS + col;

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'plot';
        button.style.left = `${x1}px`;
        button.style.top = `${y1}px`;
        button.style.width = `${w}px`;
        button.style.height = `${h}px`;
        button.style.zIndex = String(Math.round(y1 + h) + 2);
        button.dataset.index = String(index);
        button.setAttribute('aria-label', `第 ${index + 1} 块地`);
        const crop = document.createElement('img');
        crop.className = 'crop';
        crop.alt = '';
        crop.draggable = false;
        button.appendChild(crop);
        button.addEventListener('click', (event) => {
          event.stopPropagation();
          P.audio && P.audio.start();
          tapPlot(index, corners);
        });
        host.appendChild(button);

        // 泥土/高亮是独立一层：被 clip-path 裁成斜的四边形，压在按钮下面
        const zone = document.createElement('div');
        zone.className = 'plot-zone';
        Object.assign(zone.style, {
          left: `${x1}px`, top: `${y1}px`, width: `${w}px`, height: `${h}px`,
          clipPath: `polygon(${clip})`, zIndex: String(Math.round(y1 + h))
        });
        zone.innerHTML = '<i class="soil"></i><i class="hover"></i>';
        host.appendChild(zone);

        farm.nodes.push({ index, row, col, button, zone, crop, corners, x1, y1, w, h });
      }
    }
    paint();
  }

  /* ------------------------------------------------------------- 绘制 --- */
  function stageOf(plot) {
    const crop = P.CROP[plot.seed];
    if (!crop) return 0;
    if (plot.days >= crop.days) return 3;
    if (plot.days <= 0) return 0;
    const t = plot.days / crop.days;
    return t < 0.45 ? 1 : 2;
  }

  function paint() {
    farm.nodes.forEach((node) => {
      const plot = P.state.plots[node.index];
      const crop = plot.seed ? P.CROP[plot.seed] : null;
      const ripe = Boolean(crop && plot.days >= crop.days);
      const stage = stageOf(plot);
      node.button.classList.toggle('tilled', plot.tilled);
      node.button.classList.toggle('has-crop', Boolean(crop));
      node.button.classList.toggle('ripe', ripe);
      // 泥土是独立一层（被裁剪），状态类要单独同步
      node.zone.classList.toggle('tilled', plot.tilled);
      node.zone.classList.toggle('dry', plot.tilled && !plot.watered);
      node.zone.classList.toggle('wet', plot.tilled && plot.watered);
      node.zone.classList.toggle('ripe', ripe);
      const scale = 4.3 + node.row * 0.85;      // 越靠前越大，成熟时基本铺满一格
      if (crop) {
        const src = `assets/crop-${plot.seed}-${stage}.png`;
        if (!node.crop.src.endsWith(src)) node.crop.src = src;
        node.crop.style.width = `${Math.round(32 * scale)}px`;
        node.crop.style.bottom = `${6 + node.row * 2}%`;
      }
      node.button.setAttribute('aria-label', plot.seed
        ? `${crop.name}${ripe ? '，可以收了' : ''}`
        : (plot.tilled ? '空的土地' : '还没翻的草地'));
    });
  }
  farm.paint = paint;

  /* 过了一夜，进农场时让作物各长一截（轻轻弹一下），
     不然「作物长大了」只是数值变化，看不出来 */
  function growPop() {
    const host = document.querySelector('.scene[data-scene="farm"]');
    if (!host) return;
    const crops = [...host.querySelectorAll('.crop')];
    crops.forEach((node, i) => {
      node.classList.remove('grow-pop');
      void node.offsetWidth;
      setTimeout(() => {
        node.classList.add('grow-pop');
        setTimeout(() => node.classList.remove('grow-pop'), 700);
      }, i * 85);
    });
  }

  const prevOnScene = P.world && P.world.onScene;
  if (P.world) {
    P.world.onScene = function (scene) {
      if (typeof prevOnScene === 'function') prevOnScene(scene);
      if (scene !== 'farm') return;
      if (P.state.flags.growShown === P.state.day) return;
      P.state.flags.growShown = P.state.day;
      setTimeout(growPop, 260);
    };
  }

  /* ------------------------------------------------------------- 操作 --- */
  function approach(corners) {
    // 站在格子靠观众的那条边前面一点
    const left = corners[3];
    const right = corners[2];
    return { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 + 26 };
  }

  function tapPlot(index, corners) {
    if (P.world.busy) return;
    const point = approach(corners);
    const plot = P.state.plots[index];
    P.world.look(point.x, point.y);
    // 点下去先在格子上亮一下，让人知道点到了哪一格（走位要时间）
    markTarget(index);
    const go = () => act(index);
    if (U.dist(P.world.pos, point) < 150) go();
    else P.world.walkTo(point.x, point.y, go);
  }

  let targetTimer = 0;
  function markTarget(index) {
    const cell = farm.nodes[index];
    if (!cell || !cell.button) return;
    const node = cell.button;
    node.classList.remove('targeted');
    void node.offsetWidth;
    node.classList.add('targeted');
    clearTimeout(targetTimer);
    targetTimer = setTimeout(() => node.classList.remove('targeted'), 1100);
  }

  function needSeed() {
    const seeds = Object.keys(P.ITEM).filter((id) => P.ITEM[id].kind === 'seed' && P.bagCount(id) > 0);
    if (!seeds.length) {
      P.ui.toast('没有种子了 · 点顶上的金币，或者点左边的种子箱', 'seed-wheat');
      P.audio && P.audio.sfx('nope');
      return null;
    }
    return seeds;
  }

  async function act(index) {
    const plot = P.state.plots[index];
    const crop = plot.seed ? P.CROP[plot.seed] : null;

    if (!plot.tilled) {
      if (!P.hasEnergy(1)) return;
      P.state.energy -= 1;
      plot.tilled = true;
      P.audio && P.audio.sfx('dig');
      if (P.world) {
        P.world.hold('hoe');
        P.world.setPose('dig', 640);
        setTimeout(() => P.world && P.world.hold(''), 460);
      }
      puff(index, 'assets/soil-dry.png');
      P.spend(0, 1);
      paint();
      P.daily && P.daily.bump('till');
      P.story && P.story.check('till');
      return;
    }

    if (!plot.seed) {
      const seeds = needSeed();
      if (!seeds) return;
      if (seeds.length === 1) return plant(index, seeds[0]);
      // 多种种子：给个小选择
      const body = document.createElement('div');
      body.innerHTML = '<p>这块地想种点什么？</p>';
      const grid = document.createElement('div');
      grid.className = 'grid';
      seeds.forEach((id) => {
        const item = P.ITEM[id];
        const slot = document.createElement('button');
        slot.type = 'button';
        slot.className = 'slot';
        slot.innerHTML = `<img src="${P.itemIcon(id)}" alt=""><b>${item.name}</b><span class="n">${P.bagCount(id)}</span>`;
        slot.addEventListener('click', () => { P.ui.closeSheet(); plant(index, id); });
        grid.appendChild(slot);
      });
      body.appendChild(grid);
      P.ui.sheet({ title: '播种', kicker: 'PLANT', body });
      return;
    }

    if (plot.days >= crop.days) {
      harvest(index);
      return;
    }

    if (!plot.watered) {
      // 有铜水壶就不用使劲，浇水不花体力
      const easy = P.hasTool('can');
      if (!easy && !P.hasEnergy(1)) return;
      if (!easy) P.state.energy -= 1;
      plot.watered = true;
      P.audio && P.audio.sfx('water');
      P.world && P.world.hold('can');
      P.world && P.world.setPose('reach', 620);
      setTimeout(() => { if (P.world) P.world.hold(''); }, 640);
      splash(index);
      P.spend(0, 1);
      paint();
      P.daily && P.daily.bump('water');
      P.story && P.story.check('water');
      if (plot.days === 0) P.showHint('浇好水了。睡一觉，它会自己长');
      return;
    }

    const left = crop.days - plot.days;
    P.showHint(`${crop.name}还要 ${left} 天才能收，先睡一觉吧`);
    P.audio && P.audio.sfx('nope');
  }

  function plant(index, seedId) {
    const item = P.ITEM[seedId];
    if (!item || !P.takeItem(seedId, 1)) return;
    const plot = P.state.plots[index];
    plot.seed = item.crop;
    plot.days = 0;
    plot.watered = false;
    P.audio && P.audio.sfx('plant');
    paint();
    P.save();
    P.daily && P.daily.bump('plant');
    P.story && P.story.check('plant');
    P.ui.toast(`种下了${P.CROP[item.crop].name}`, item.icon);
  }

  function harvest(index) {
    const plot = P.state.plots[index];
    const cropId = plot.seed;
    const crop = P.CROP[cropId];
    const amount = 1 + (P.hasTool('basket') ? 1 : 0) + (Math.random() < 0.28 ? 1 : 0);
    P.addItem(cropId, amount);
    // 收的时候留一颗种子：这样只要还在种，就永远不会彻底断种
    P.addItem(crop.seed, 1);
    P.state.grown[cropId] = (P.state.grown[cropId] || 0) + amount;
    P.state.stats.harvested += amount;
    plot.seed = null;
    plot.days = 0;
    plot.watered = false;
    plot.tilled = true;
    P.audio && P.audio.sfx('harvest');
    if (P.world) {
      P.world.hold('basket');
      P.world.setPose('reach', 520);
      setTimeout(() => P.world && P.world.hold(''), 620);
    }
    P.ui.toast(`收成 ${crop.name} ×${amount} · 留了 1 颗种子`, crop.icon);
    pop(index, `+${amount}`);
    harvestBurst(index, crop.icon, amount);
    paint();
    P.daily && P.daily.bump('harvest', amount);
    P.story && P.story.check('harvest');
    P.ui.dexCheck && P.ui.dexCheck();
    P.spend(0, 1);
  }

  /* ------------------------------------------------------------- 表现 --- */
  function centreOf(index) {
    const node = farm.nodes[index];
    const p = at((node.col + 0.5) / COLS, (node.row + 0.5) / ROWS);
    return { x: p.x, y: p.y };
  }

  function pop(index, text) {
    const host = document.querySelector('.scene[data-scene="farm"]');
    if (!host) return;
    const p = centreOf(index);
    const node = document.createElement('div');
    node.textContent = text;
    node.style.cssText = `position:absolute;left:${p.x}px;top:${p.y}px;z-index:95;transform:translate(-50%,-50%);
      font:800 30px Nunito,sans-serif;color:#fff5d6;text-shadow:0 3px 0 #8a5a3a,0 0 18px #ffcf7a;
      pointer-events:none;animation:pop-up .95s ease-out forwards`;
    host.appendChild(node);
    setTimeout(() => node.remove(), 980);
  }

  /* 收下来的东西从土里蹦出来，飞两下才没 —— 光加数字太干 */
  function harvestBurst(index, icon, amount) {
    const host = document.querySelector('.scene[data-scene="farm"]');
    if (!host) return;
    const p = centreOf(index);
    const n = U.clamp(amount + 1, 2, 5);
    for (let i = 0; i < n; i += 1) {
      const img = document.createElement('img');
      img.src = P.icon(icon);
      img.alt = '';
      img.style.cssText = `position:absolute;left:${p.x + U.rand(-20, 20)}px;top:${p.y + U.rand(-8, 4)}px;
        width:${U.rand(30, 44)}px;image-rendering:pixelated;pointer-events:none;z-index:80;
        filter:drop-shadow(0 4px 4px #3a2a2355);
        animation:crop-fly ${U.rand(0.7, 1.05)}s ease-out forwards;animation-delay:${i * 0.06}s`;
      host.appendChild(img);
      setTimeout(() => img.remove(), 1200);
    }
  }

  function puff(index, src) {
    const host = document.querySelector('.scene[data-scene="farm"]');
    if (!host) return;
    const p = centreOf(index);
    for (let i = 0; i < 7; i += 1) {
      const dot = document.createElement('i');
      const size = U.rand(8, 15);
      dot.style.cssText = `position:absolute;left:${p.x + U.rand(-24, 24)}px;top:${p.y + U.rand(-6, 12)}px;
        width:${size}px;height:${size}px;border-radius:${U.rand(2, 5)}px;background:${i % 3 === 0 ? '#9d7350' : '#7b563c'};
        opacity:.9;z-index:24;--dx:${U.rand(-36, 36)}px;
        image-rendering:pixelated;animation:soil-fly ${U.rand(0.44, 0.72)}s ease-out forwards;pointer-events:none`;
      host.appendChild(dot);
      setTimeout(() => dot.remove(), 800);
    }
  }

  function splash(index) {
    const host = document.querySelector('.scene[data-scene="farm"]');
    if (!host) return;
    const p = centreOf(index);
    for (let i = 0; i < 6; i += 1) {
      const dot = document.createElement('i');
      dot.style.cssText = `position:absolute;left:${p.x + U.rand(-30, 30)}px;top:${p.y + U.rand(-18, 6)}px;
        width:6px;height:6px;border-radius:50%;background:#a9e2d6;opacity:.9;z-index:30;
        animation:drop-fall ${U.rand(0.35, 0.6)}s ease-in forwards;pointer-events:none`;
      host.appendChild(dot);
      setTimeout(() => dot.remove(), 660);
    }
  }

  /* ------------------------------------------------------------ 睡觉 --- */
  A.bed = async function bed() {
    if (P.world.busy || P.ui.modalOpen()) return;
    const spot = { x: 560, y: 700 };
    async function doSleep() {
      await P.ui.say([
        { who: '旁白', text: '钻进被子里，很快就不困了。' }
      ], { endLabel: '睡吧' });
      await P.sleep();
    }
    const run = async () => {
      const s = P.state;
      const late = s.phase >= 2;
      const close = (s.hearts || 0) >= 4;
      const heard = !!(P.npc && P.npc.here);
      // 几点都能拉他一起睡：白天躺下就当把这一天提前过完了
      const lead = late
        ? (heard ? '夜已经深了。他还在屋里，灯还没灭。' : '夜已经深了。他在外头忙，一会儿也该回来了。')
        : (heard ? '天还亮着。他就在旁边，被子晒过，闻着有太阳味。' : '被子晒过，蓬蓬的。这会儿躺下，这一天就算过去了。');
      const choices = [];
      if (close) {
        choices.push({ label: '靠过去亲一下', end: true, run: () => { setTimeout(() => A.kiss && A.kiss(), 90); } });
      }
      choices.push({ label: late ? '和他一起睡' : '拉他一起躺一会儿', end: true, run: () => { setTimeout(() => A.sleepTogether && A.sleepTogether(), 90); } });
      choices.push({ label: '自己睡', end: true, run: () => { doSleep(); } });
      await P.ui.say([{ who: '旁白', text: lead, choices }], { endLabel: '睡吧' });
    };
    if (U.dist(P.world.pos, spot) > 220) P.world.walkTo(spot.x, spot.y, run);
    else run();
  };

  P.sleep = async function sleep() {
    const fade = document.getElementById('fade');
    const s = P.state;
    const before = {
      coins: s.coins,
      harvested: s.stats.harvested || 0,
      fished: s.stats.fished || 0,
      watered: s.plots.filter((plot) => plot.seed && plot.watered).length,
      growing: s.plots.filter((plot) => plot.seed).length
    };
    P.world.busy = true;
    P.audio && P.audio.sfx('sleep');
    fade.classList.add('on');
    await new Promise((r) => setTimeout(r, 700));

    // 作物：浇过水的长一天
    s.plots.forEach((plot) => {
      if (plot.seed && plot.watered) plot.days += 1;
      plot.watered = false;
    });
    s.day += 1;
    s.stats.daysPlayed = s.day;
    s.phase = 0;
    s.phaseStep = 0;
    s.energy = s.energyMax;
    s.flags.slept = true;
    P.daily && P.daily.roll();
    // 掷今天的天气；下雨就把地替你浇了
    if (P.weather) {
      P.weather.roll();
      P.weather.apply();
      before.rained = P.weather.waterAll();
    }
    paint();
    P.save();
    P.ui.hud();
    P.applyPhase();

    await new Promise((r) => setTimeout(r, 900));
    fade.classList.remove('on');
    P.world.busy = false;
    P.showHint(`第 ${s.day} 天 · 早上好`, 3000);
    if (P.npc) P.npc.enter(P.world.current);
    P.story && P.story.check('sleep');
    P.world.go(P.world.current, { quiet: true, at: P.SCENES.cottage.spawn });
    P.story && P.story.onMorning && P.story.onMorning();
    await morningCard(s, before);
    if (P.dailyEvent) await P.dailyEvent();
  };

  // 每种天气几句随手写的话，每天随机挑一句
  const WEATHER_LINE = {
    sun: [
      '外面太阳很好，晒得被子一股暖味。',
      '天很干净，远处的山看得清轮廓。',
      '阳光斜着照进来，把地板切成一块一块的。'
    ],
    cloud: [
      '天亮得很慢，云压得低，像是要下雨又没下。',
      '外面有雾，草地是湿的，踩上去会留下脚印。',
      '风比昨天大，窗户一直在响。'
    ],
    rain: [
      '雨点打在小屋的瓦上，声音很密。',
      '外面下着雨，水从屋檐连成一条线。',
      '雨把院子里的土泡软了，空气里有股泥味。'
    ]
  };

  // 每天起床第一件事：看一眼昨天干了什么。等玩家点「起床」再继续。
  function morningCard(s, before) {
    const harvest = (s.stats.harvested || 0) - before.harvested;
    const fish = (s.stats.fished || 0) - before.fished;
    const coins = s.coins - before.coins;
    const lines = [];
    if (before.rained) {
      lines.push(`昨晚下了雨，${before.rained} 块地替你浇过了，今天不用挑水。`);
    } else if (before.watered) {
      lines.push(`昨晚 ${before.watered} 块地浇了水，作物都长了一天。`);
    } else if (before.growing) {
      lines.push('昨晚没浇水，地里那几株停了一天。');
    } else {
      lines.push('地里还没种东西，今天是空的。');
    }
    const bits = [];
    if (harvest) bits.push(`收了 ${harvest} 次`);
    if (fish) bits.push(`钓了 ${fish} 条`);
    if (coins) bits.push(`金币 ${coins > 0 ? '+' : ''}${coins}`);
    lines.push(bits.length ? `昨天的账：${bits.join(' · ')}。` : '昨天没什么进账，也没关系。');
    if (P.weather) {
      const kind = P.weather.get();
      const pool = WEATHER_LINE[kind] || WEATHER_LINE.sun;
      lines.push(`${P.weather.info().mark} ${pool[Math.floor(Math.random() * pool.length)]}`);
    }
    const goals = P.daily ? P.daily.summary() : '';
    if (goals) lines.push(`桌上压着一张纸条，是他的字：<br>${goals}`);
    // 昨晚是一起睡的，早上提一句
    if (s.flags.sleptWithDay === s.day - 1) {
      lines.splice(1, 0, s.hearts >= 8
        ? '他比你起得早，被子往上给你掖了掖，才下床去烧水。'
        : '他先醒了，坐在床边发了会儿呆，又把被子给你拉好。');
    }

    P.ui.sheet({
      title: `第 ${s.day} 天`, kicker: 'MORNING',
      body: `<p>${lines.join('</p><p>')}</p>`,
      foot: [{ label: '起床', run: () => P.ui.closeSheet() }]
    });
    return P.ui.sheetClosed();
  }

  /* --------------------------------------------------------- 他搭把手 --- */
  // 早上在农场跟他说话，可以让他帮着弄一块地。一天一次。
  farm.canHelp = function canHelp() {
    const s = P.state;
    if (!s || s.flags.helpDay === s.day) return false;
    return true;
  };

  farm.help = function help() {
    const s = P.state;
    if (s.flags.helpDay === s.day) return '今天已经帮过了。';
    s.flags.helpDay = s.day;
    const empty = s.plots.findIndex((plot) => !plot.tilled);
    if (empty >= 0) {
      s.plots[empty].tilled = true;
      paint();
      P.daily && P.daily.bump('till');
      P.save();
      return '他弯腰把离你最近的一格草皮翻开了，土翻得很松，连草根都挑了。';
    }
    const dry = s.plots.findIndex((plot) => plot.tilled && plot.seed && !plot.watered);
    if (dry >= 0) {
      s.plots[dry].watered = true;
      paint();
      P.daily && P.daily.bump('water');
      P.save();
      return '他把水顺着根浇下去，水一下子渗进土里，没留一点在叶子上。';
    }
    P.save();
    return '地里没什么要弄的。他看了一圈，说那就歇着吧。';
  };

  A.shop = function shop() {
    P.ui.shop();
  };

  farm.build = build;
  farm.init = function init() {
    build();
    paint();
  };
})();
