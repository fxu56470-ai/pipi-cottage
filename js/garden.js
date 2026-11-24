/* 屁屁小屋 · 后院菜园：屋后那块开出来的地，20 格，比前院大得多
   —— 土是整过的，不用翻，站下去就能种；分三档开垦，最后一档装洒水器 */
(function () {
  const P = window.P;
  const U = P.util;
  const A = (P.actions = P.actions || {});

  // 菜园土垄的四个角（美术像素），跟背景里那块翻好的土对齐
  // 对着背景里那块深棕土垄的四个角如实量的，差 10px 网格就会压到草地上
  const FIELD = {
    T: { x: 775, y: 452 },
    R: { x: 1075, y: 562 },
    B: { x: 710, y: 778 },
    L: { x: 418, y: 596 }
  };
  const COLS = 5;
  const ROWS = 4;

  function at(u, v) {
    const { T, R, B, L } = FIELD;
    return {
      x: (1 - u) * (1 - v) * T.x + u * (1 - v) * R.x + u * v * B.x + (1 - u) * v * L.x,
      y: (1 - u) * (1 - v) * T.y + u * (1 - v) * R.y + u * v * B.y + (1 - u) * v * L.y
    };
  }

  const garden = { nodes: [] };
  P.garden = garden;

  const lv = () => P.state.flags.gardenLv || 0;
  garden.rowsOpen = () => P.GARDEN_TIERS[Math.min(lv(), P.GARDEN_TIERS.length - 1)].rows;
  garden.capacity = () => garden.rowsOpen() * COLS;
  // 开垦从靠近自己的那两排开始（等距图里 row 越大越靠前）
  garden.isOpen = (index) => Math.floor(index / COLS) >= ROWS - garden.rowsOpen();
  garden.hasScarecrow = () => lv() >= 1;
  garden.hasSprinkler = () => lv() >= 2;

  /* --------------------------------------------------------- 建立格子 --- */
  function drawGrid() {
    const svg = document.getElementById('gardenLines');
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
    const host = document.getElementById('gardenPlots');
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
        const clip = corners
          .map((p) => `${(((p.x - x1) / w) * 100).toFixed(2)}% ${(((p.y - y1) / h) * 100).toFixed(2)}%`)
          .join(', ');
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
        button.setAttribute('aria-label', `菜园第 ${index + 1} 格`);
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

        // 菜园的土是背景图里就翻好的，这里只叠高亮和「浇过水」的暗色
        const zone = document.createElement('div');
        zone.className = 'plot-zone backyard';
        Object.assign(zone.style, {
          left: `${x1}px`, top: `${y1}px`, width: `${w}px`, height: `${h}px`,
          clipPath: `polygon(${clip})`, zIndex: String(Math.round(y1 + h))
        });
        zone.innerHTML = '<i class="hover"></i>';
        host.appendChild(zone);

        garden.nodes.push({ index, row, col, button, zone, crop, corners, x1, y1, w, h });
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
    if (!P.state) return;
    const scene = document.querySelector('.scene[data-scene="garden"]');
    if (scene) scene.classList.toggle('glass-lit', P.hasUp('glass'));
    garden.nodes.forEach((node) => {
      const open = garden.isOpen(node.index);
      const plot = P.state.garden[node.index] || { seed: null, days: 0, watered: false };
      const crop = plot.seed ? P.CROP[plot.seed] : null;
      const ripe = Boolean(crop && plot.days >= crop.days);
      node.button.classList.toggle('locked', !open);
      node.button.classList.toggle('has-crop', Boolean(crop));
      node.button.classList.toggle('ripe', ripe);
      node.zone.classList.toggle('backyard-wet', open && Boolean(crop) && plot.watered);
      node.zone.classList.toggle('ripe', ripe);
      // 等距格子的包围盒有 150px 宽，但相邻格只错开 70px，
      // 作物比这个宽就会压到隔壁那格上，所以按格间距定尺寸
      const scale = 2.0 + node.row * 0.2;
      if (crop) {
        const src = `assets/crop-${plot.seed}-${stageOf(plot)}.png`;
        if (!node.crop.getAttribute('src') || !node.crop.src.endsWith(src)) node.crop.src = src;
        node.crop.style.width = `${Math.round(32 * scale)}px`;
        node.crop.style.bottom = `${12 + node.row * 2}%`;
      } else {
        node.crop.removeAttribute('src');
      }
      node.button.setAttribute('aria-label', !open
        ? '还没开垦的荒草'
        : (crop ? `${crop.name}${ripe ? '，可以收了' : ''}` : '空着的菜地'));
    });
  }
  garden.paint = paint;

  /* ------------------------------------------------------------- 操作 --- */
  function approach(corners) {
    const left = corners[3];
    const right = corners[2];
    return { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 + 24 };
  }

  function tapPlot(index, corners) {
    if (!garden.isOpen(index)) { garden.ledger(); return; }
    if (P.world.busy) return;
    const point = approach(corners);
    P.world.look(point.x, point.y);
    markTarget(index);
    const go = () => act(index);
    if (U.dist(P.world.pos, point) < 130) go();
    else P.world.walkTo(point.x, point.y, go);
  }

  let targetTimer = 0;
  function markTarget(index) {
    const cell = garden.nodes[index];
    if (!cell) return;
    cell.button.classList.remove('targeted');
    void cell.button.offsetWidth;
    cell.button.classList.add('targeted');
    clearTimeout(targetTimer);
    targetTimer = setTimeout(() => cell.button.classList.remove('targeted'), 1100);
  }

  function seedsInBag() {
    return Object.keys(P.ITEM).filter((id) => P.ITEM[id].kind === 'seed' && P.bagCount(id) > 0);
  }

  async function act(index) {
    const plot = P.state.garden[index];
    const crop = plot.seed ? P.CROP[plot.seed] : null;

    if (!plot.seed) {
      const seeds = seedsInBag();
      if (!seeds.length) {
        P.ui.toast('没有种子了 · 前院种子箱，或者去镇上买', 'seed-wheat');
        P.audio && P.audio.sfx('nope');
        return;
      }
      if (seeds.length === 1) { plant(index, seeds[0]); return; }
      const body = document.createElement('div');
      body.innerHTML = '<p>这块地种点什么？后院的地深，长得比前院快一点。</p>';
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
      P.ui.sheet({ title: '种点什么', kicker: 'GARDEN', body });
      return;
    }

    if (plot.days >= crop.days) { harvest(index); return; }

    if (!plot.watered) {
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
      return;
    }

    // 已经浇过了：有肥料就问问要不要催一催
    const fert = P.bagCount('fertilizer');
    if (fert > 0) {
      const left = crop.days - plot.days;
      const body = document.createElement('div');
      body.innerHTML = `<p>${crop.name}还要 <b>${left}</b> 天。地里的水还够，可以再催一催。</p>
        <p style="font-size:13px;color:#9a7a6d">背包里有 ${fert} 袋肥料。</p>`;
      P.ui.sheet({
        title: crop.name, kicker: '照顾一下', body,
        foot: [
          { label: '撒一袋肥料（+1 天）', run: () => { P.ui.closeSheet(); fertilize(index); } },
          { label: '让它慢慢长', pale: true, run: () => P.ui.closeSheet() }
        ]
      });
      return;
    }
    P.showHint(`${crop.name}还要 ${crop.days - plot.days} 天，先睡一觉吧`);
    P.audio && P.audio.sfx('nope');
  }

  function plant(index, seedId) {
    const item = P.ITEM[seedId];
    if (!item || !P.takeItem(seedId, 1)) return;
    const plot = P.state.garden[index];
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

  function fertilize(index) {
    if (!P.takeItem('fertilizer', 1)) return;
    const plot = P.state.garden[index];
    const crop = P.CROP[plot.seed];
    if (!crop) return;
    plot.days += 1;
    P.audio && P.audio.sfx('plant');
    puff(index, '#7bbf59');
    if (plot.days >= crop.days) {
      P.ui.toast(`${crop.name}熟了，可以收了`, crop.icon);
      P.audio && P.audio.sfx('harvest');
    } else {
      P.ui.toast(`撒了肥料 · 还差 ${crop.days - plot.days} 天`, 'item-fertilizer');
    }
    paint();
    P.save();
    P.spend(0, 1);
  }

  function harvest(index) {
    const plot = P.state.garden[index];
    const cropId = plot.seed;
    const crop = P.CROP[cropId];
    let amount = 1 + (P.hasTool('basket') ? 1 : 0);
    // 后院立着稻草人，鸟不来偷，多收一份的机会更大
    if (garden.hasScarecrow() && Math.random() < 0.45) amount += 1;
    else if (Math.random() < 0.2) amount += 1;
    P.addItem(cropId, amount);
    P.addItem(crop.seed, 1);
    P.state.grown[cropId] = (P.state.grown[cropId] || 0) + amount;
    P.state.stats.harvested += amount;
    plot.seed = null;
    plot.days = 0;
    plot.watered = false;
    P.audio && P.audio.sfx('harvest');
    if (P.world) {
      P.world.hold('basket');
      P.world.setPose('reach', 520);
      setTimeout(() => P.world && P.world.hold(''), 620);
    }
    P.ui.toast(`收成 ${crop.name} ×${amount} · 留了 1 颗种子`, crop.icon);
    pop(index, `+${amount}`);
    burst(index, crop.icon, amount);
    paint();
    P.daily && P.daily.bump('harvest', amount);
    P.story && P.story.check('harvest');
    P.ui.dexCheck && P.ui.dexCheck();
    P.spend(0, 1);
  }

  /* ------------------------------------------------------------- 表现 --- */
  function centreOf(index) {
    const node = garden.nodes[index];
    const p = at((node.col + 0.5) / COLS, (node.row + 0.5) / ROWS);
    return { x: p.x, y: p.y };
  }

  function pop(index, text) {
    const host = document.querySelector('.scene[data-scene="garden"]');
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

  function burst(index, icon, amount) {
    const host = document.querySelector('.scene[data-scene="garden"]');
    if (!host) return;
    const p = centreOf(index);
    const n = U.clamp(amount + 1, 2, 5);
    for (let i = 0; i < n; i += 1) {
      const img = document.createElement('img');
      img.src = P.icon(icon);
      img.alt = '';
      img.style.cssText = `position:absolute;left:${p.x + U.rand(-18, 18)}px;top:${p.y + U.rand(-8, 4)}px;
        width:${U.rand(28, 40)}px;image-rendering:pixelated;pointer-events:none;z-index:80;
        filter:drop-shadow(0 4px 4px #3a2a2355);
        animation:crop-fly ${U.rand(0.7, 1.05)}s ease-out forwards;animation-delay:${i * 0.06}s`;
      host.appendChild(img);
      setTimeout(() => img.remove(), 1200);
    }
  }

  function splash(index) {
    const host = document.querySelector('.scene[data-scene="garden"]');
    if (!host) return;
    const p = centreOf(index);
    for (let i = 0; i < 6; i += 1) {
      const dot = document.createElement('i');
      dot.style.cssText = `position:absolute;left:${p.x + U.rand(-26, 26)}px;top:${p.y + U.rand(-14, 6)}px;
        width:6px;height:6px;border-radius:50%;background:#a9e2d6;opacity:.9;z-index:30;
        animation:drop-fall ${U.rand(0.35, 0.6)}s ease-in forwards;pointer-events:none`;
      host.appendChild(dot);
      setTimeout(() => dot.remove(), 660);
    }
  }

  function puff(index, color) {
    const host = document.querySelector('.scene[data-scene="garden"]');
    if (!host) return;
    const p = centreOf(index);
    for (let i = 0; i < 7; i += 1) {
      const dot = document.createElement('i');
      const size = U.rand(6, 11);
      dot.style.cssText = `position:absolute;left:${p.x + U.rand(-20, 20)}px;top:${p.y + U.rand(-6, 8)}px;
        width:${size}px;height:${size}px;border-radius:50%;background:${color};opacity:.85;z-index:24;
        animation:soil-fly ${U.rand(0.44, 0.72)}s ease-out forwards;pointer-events:none`;
      host.appendChild(dot);
      setTimeout(() => dot.remove(), 800);
    }
  }

  /* -------------------------------------------------------------- 账本 --- */
  garden.ledger = function ledger() {
    const l = lv();
    const next = P.GARDEN_TIERS[l + 1];
    const rows = garden.rowsOpen();
    const planted = P.state.garden.slice(0, garden.capacity()).filter((plot) => plot.seed).length;
    const glass = P.hasUp('glass');
    const body = document.createElement('div');
    const rowsHtml = P.GARDEN_TIERS.map((tier, i) => {
      const done = i <= l;
      return `<div class="achv ${done ? 'done' : ''}">
        <span class="mark">${done ? '★' : '·'}</span>
        <div><strong>${i === 0 ? '屋后这块地' : i === 1 ? '清一垄杂草' : '整块地 + 洒水器'}</strong>
        <em>${tier.label}</em></div>
        <span class="num">${done ? '有' : `${tier.price} 币`}</span>
      </div>`;
    }).join('');
    body.innerHTML = `<p>屋后这块地比前院宽，土也松。现在开着 <b>${rows} 排 · ${rows * COLS} 格</b>，
        种着 ${planted} 格。${garden.hasSprinkler() ? '洒水器每天早上自己转一圈。' : ''}</p>
      <div class="achv-list">${rowsHtml}${glassRow(glass)}</div>
      <p style="font-size:13px;color:#9a7a6d">菜园的土是整过的，不用翻，站过去就能种。
      收的时候一样会留一颗种子。${garden.hasScarecrow() ? '<br>稻草人立在北边，鸟不太敢下来。' : ''}
      ${glass ? '<br>温室里有一点暖光，晚上也不全黑——作物一晚当两晚用。' : ''}</p>`;
    P.ui.sheet({
      title: '菜园',
      kicker: next ? `还能再开 ${next.rows - rows} 排` : '全开了',
      body,
      foot: next
        ? [{
          label: `开垦：${next.price} 金币`,
          run: () => {
            if (P.state.coins < next.price) {
              P.ui.toast('金币不够 · 去卖点东西，或者去镇上', 'ui-coin');
              P.audio && P.audio.sfx('nope');
              return;
            }
            const prevRows = rows;
            P.state.coins -= next.price;
            P.state.flags.gardenLv = l + 1;
            if (l + 1 >= 2) P.state.tools.sprinkler = true;
            P.audio && P.audio.sfx('harvest');
            P.ui.hud();
            P.save();
            P.ui.closeSheet();
            paint();
            growIn(prevRows);
            P.ui.toast(`菜园又开了 ${next.rows - rows} 排`, 'item-carrot');
            setTimeout(() => garden.ledger(), 260);
          }
        }]
        : [{ label: '合上账本', pale: true, run: () => P.ui.closeSheet() }]
    });
  };

  function glassRow(glass) {
    return `<div class="achv ${glass ? 'done' : ''}">
      <span class="mark">${glass ? '★' : '·'}</span>
      <div><strong>温室</strong>
      <em>${glass ? '玻璃装好了，里面一直比外面暖' : '门锁着，玻璃碎了一地。镇上杂货铺有卖'}</em></div>
      <span class="num">${glass ? '有' : '1100 币'}</span>
    </div>`;
  }

  // 新开的那几排，土翻起来的动静。prev 是开垦前的排数
  function growIn(prev) {
    const host = document.querySelector('.scene[data-scene="garden"]');
    if (!host) return;
    garden.nodes.forEach((node, i) => {
      if (!garden.isOpen(node.index)) return;
      if (Math.floor(node.index / COLS) >= ROWS - (prev || 0)) return;
      setTimeout(() => {
        for (let k = 0; k < 5; k += 1) {
          const p = at((node.col + U.rand(0.15, 0.85)) / COLS, (node.row + U.rand(0.15, 0.85)) / ROWS);
          const dot = document.createElement('i');
          dot.style.cssText = `position:absolute;left:${p.x}px;top:${p.y}px;width:7px;height:7px;
            border-radius:2px;background:#8a6a4a;z-index:30;pointer-events:none;
            animation:soil-fly .6s ease-out forwards`;
          host.appendChild(dot);
          setTimeout(() => dot.remove(), 700);
        }
      }, i * 40);
    });
  }

  /* ------------------------------------------------------------ 过夜 --- */
  garden.night = function night() {
    let grew = 0;
    // 温室修好以后地温高，一晚上能当天用
    const speed = P.hasUp('glass') ? 2 : 1;
    P.state.garden.forEach((plot, i) => {
      if (!garden.isOpen(i)) { plot.watered = false; return; }
      if (garden.hasSprinkler() && plot.seed && !plot.watered) plot.watered = true;
      if (plot.seed && plot.watered) { plot.days += speed; grew += 1; }
      plot.watered = false;
    });
    return grew;
  };

  /* ------------------------------------------------------------- 入口 --- */
  A.garden = function () { garden.ledger(); };

  garden.init = function init() {
    build();
    paint();
  };
})();
