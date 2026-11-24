/* 屁屁小屋 · 界面：HUD / 对话框 / 背包 / 图鉴 / 任务 / 商店 */
(function () {
  const P = window.P;

  const ui = {
    sheetEl: null,
    dialogEl: null,
    typing: null,
    queue: [],
    resolve: null
  };
  P.ui = ui;

  const $ = (id) => document.getElementById(id);

  /* --------------------------------------------------------------- HUD --- */
  /* 数字变了就跳一下，一眼看见自己刚挣了多少 / 掉了多少 */
  function setNum(el, value, tone, kind) {
    const next = String(value);
    const prev = el.textContent;
    if (prev === next) return;
    el.textContent = next;
    if (prev === '' || prev === null) return;
    el.classList.remove('num-bump', 'num-gain', 'num-loss');
    void el.offsetWidth;
    el.classList.add('num-bump');
    if (tone === 'gain' && kind !== 'energy') el.classList.add('num-gain');
    if (tone === 'loss' || (kind === 'energy' && tone === 'loss')) el.classList.add('num-loss');
    clearTimeout(el.numTimer);
    el.numTimer = setTimeout(() => el.classList.remove('num-gain', 'num-loss'), 900);
  }

  ui.hud = function hud() {
    const s = P.state;
    if (!s) return;
    const dayLabel = $('dayLabel');
    if (dayLabel) dayLabel.textContent = `第 ${s.day} 天`;
    const phaseLabel = $('phaseLabel');
    if (phaseLabel) phaseLabel.textContent = `${P.PHASES[s.phase]} ${P.PHASE_TIME[s.phase]}`;
    const coin = $('coinValue');
    if (coin) setNum(coin, s.coins, Number(s.coins) >= Number(coin.textContent || 0) ? 'gain' : 'loss');
    const energy = $('energyValue');
    if (energy) setNum(energy, s.energy, Number(s.energy) >= Number(energy.textContent || 0) ? 'gain' : 'loss', 'energy');
    const bar = $('energyBar');
    if (bar) bar.style.width = `${Math.round((s.energy / s.energyMax) * 100)}%`;
    const chip = $('energyChip');
    if (chip) chip.classList.toggle('low', s.energy <= 4);
    const sound = $('soundButton');
    if (sound) {
      sound.textContent = P.audio.on ? '♫' : '♪';
      sound.setAttribute('aria-pressed', String(P.audio.on));
    }
    // 任务按钮上挂一个「还剩几件小事」的小红点
    const questChip = $('questButton');
    if (questChip && P.daily) {
      const left = P.daily.list().filter((goal) => !goal.done).length;
      if (left) questChip.dataset.badge = String(left);
      else delete questChip.dataset.badge;
    }
    const dayChip = $('dayChip');
    if (dayChip) {
      const spot = hisSpot();
      dayChip.title = spot ? `第 ${s.day} 天 · 这个点他在${spot}` : '看看今天的进度';
    }
    P.applyPhase && P.applyPhase();
    P.weather && P.weather.apply && P.weather.apply();
  };

  /* -------------------------------------------------------------- toast --- */
  ui.toast = function toast(text, icon) {
    const host = $('toasts');
    if (!host) return;
    const node = document.createElement('div');
    node.className = 'toast';
    node.innerHTML = `${icon ? `<img src="${P.icon(icon)}" alt="">` : ''}<span>${text}</span>`;
    host.appendChild(node);
    setTimeout(() => {
      node.classList.add('out');
      setTimeout(() => node.remove(), 320);
    }, 1900);
  };

  /* ------------------------------------------------------------ 任务条 --- */
  // 这个点他在哪儿，顺手写进日期按钮的提示里
  function hisSpot() {
    if (!P.npc || !P.npc.sceneFor || !P.SCENES) return '';
    const key = P.npc.sceneFor();
    const scene = P.SCENES[key];
    return scene ? scene.label : '';
  }

  ui.task = function task() {
    if (!P.story) return;
    const quest = P.story.current();
    const text = $('taskText');
    const tag = $('taskTag');
    const hint = $('taskHint');
    if (!quest) {
      if (tag) tag.textContent = '自由';
      if (text) text.textContent = '日子还长，随便逛逛吧';
      if (hint) hint.textContent = '种地 · 钓鱼 · 客厅 · 澡堂 · 楼顶';
      return;
    }
    if (tag) tag.textContent = quest.done ? '做完啦' : `第 ${quest.index + 1} 步`;
    if (text) text.textContent = quest.text;
    if (hint) hint.textContent = quest.hint || '';
  };

  /* ------------------------------------------------------------ 对话框 --- */
  function dialogEls() {
    return {
      box: $('dialog'),
      who: $('dialogWho'),
      text: $('dialogText'),
      tip: $('dialogTip'),
      next: $('dialogNext'),
      choices: $('dialogChoices')
    };
  }

  ui.modalOpen = function modalOpen() {
    return Boolean(ui.sheetEl) || Boolean(ui.dialogEl);
  };

  ui.say = function say(lines, opts = {}) {
    return new Promise((resolve) => {
      // 允许直接写一个字符串数组：那种一律当旁白，省得每句都套 {who, text}
      const list = (Array.isArray(lines) ? lines.slice() : [lines])
        .map((line) => (typeof line === 'string' ? { who: '旁白', text: line } : line))
        .filter((line) => line && line.text);
      const wrap = dialogEls();
      if (!wrap.box || !list.length) { resolve(); return; }
      ui.dialogEl = wrap.box;
      ui.queue = list;
      ui.resolve = resolve;
      wrap.box.classList.add('open');
      wrap.box.dataset.mode = opts.mode || 'talk';
      ui.nextDialog(opts);
    });
  };

  ui.nextDialog = function nextDialog(opts = {}) {
    const wrap = dialogEls();
    if (!ui.dialogEl) return;
    if (ui.typing) {                     // 第一下：把字全部显示出来
      ui.finishTyping();
      return;
    }
    if (!ui.queue.length) {
      ui.closeDialog();
      return;
    }
    const line = ui.queue.shift();
    const who = line.who || (opts.who || '他');
    wrap.who.textContent = who;
    wrap.who.classList.toggle('narrator', who === '旁白');
    wrap.choices.hidden = true;
    wrap.choices.innerHTML = '';
    wrap.next.hidden = false;
    wrap.tip.textContent = ui.queue.length ? '点这里 / 空格 继续' : (opts.tip || '点这里 / 空格 结束');
    wrap.next.textContent = ui.queue.length ? '继续 →' : (opts.endLabel || '好');

    const full = line.text;
    let i = 0;
    wrap.text.textContent = '';
    ui.typing = { full, i: 0, node: wrap.text, timer: null };
    ui.typing.timer = setInterval(() => {
      const t = ui.typing;
      if (!t) return;
      t.i += 1;
      t.node.textContent = t.full.slice(0, t.i);
      if (t.i >= t.full.length) ui.finishTyping();
    }, line.fast ? 8 : 26);

    if (line.choices) {
      ui.finishTyping();
      wrap.next.hidden = true;
      wrap.choices.hidden = false;
      line.choices.forEach((choice) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = choice.label;
        button.addEventListener('click', async () => {
          P.audio && P.audio.sfx('click');
          wrap.choices.hidden = true;
          if (choice.say) await ui.say(choice.say);
          if (choice.run) await choice.run();
          if (choice.end) {
            ui.queue = [];
            ui.closeDialog();
          } else {
            ui.nextDialog(opts);
          }
        });
        wrap.choices.appendChild(button);
      });
    }
  };

  ui.finishTyping = function finishTyping() {
    const t = ui.typing;
    if (!t) return;
    clearInterval(t.timer);
    t.node.textContent = t.full;
    ui.typing = null;
  };

  ui.closeDialog = function closeDialog() {
    const wrap = dialogEls();
    if (ui.typing) { clearInterval(ui.typing.timer); ui.typing = null; }
    ui.queue = [];
    ui.dialogEl = null;
    if (wrap.box) wrap.box.classList.remove('open');
    const resolve = ui.resolve;
    ui.resolve = null;
    if (resolve) resolve();
  };

  function bindDialog() {
    const wrap = dialogEls();
    if (!wrap.box) return;
    wrap.box.addEventListener('click', (event) => {
      if (event.target.closest('.choices')) return;
      ui.nextDialog();
    });
    document.addEventListener('keydown', (event) => {
      if (!ui.dialogEl) return;
      if (event.key === ' ' || event.key === 'Enter' || event.key === 'ArrowRight') {
        event.preventDefault();
        ui.nextDialog();
      }
      if (event.key === 'Escape') ui.closeDialog();
    });
  }

  /* -------------------------------------------------------------- 面板 --- */
  ui.sheet = function sheet(opts) {
    ui.closeSheet();
    const wrap = document.createElement('div');
    wrap.className = 'sheet';
    wrap.innerHTML = `
      <div class="card" role="dialog" aria-modal="true" aria-label="${opts.title}">
        <div class="card-head">
          <h2>${opts.title}</h2>
          <span class="kicker">${opts.kicker || ''}</span>
          <button class="x" type="button" aria-label="关闭">×</button>
        </div>
        <div class="card-body"></div>
        ${opts.foot ? '<div class="card-foot"></div>' : ''}
      </div>`;
    const body = wrap.querySelector('.card-body');
    if (typeof opts.body === 'string') body.innerHTML = opts.body;
    else if (typeof opts.body === 'function') opts.body(body);
    else if (opts.body) body.appendChild(opts.body);
    if (opts.foot) {
      const foot = wrap.querySelector('.card-foot');
      opts.foot.forEach((button) => {
        const node = document.createElement('button');
        node.type = 'button';
        node.className = `btn ${button.pale ? 'pale' : ''}`;
        node.textContent = button.label;
        node.addEventListener('click', () => { P.audio && P.audio.sfx('click'); button.run && button.run(); });
        foot.appendChild(node);
      });
    }
    wrap.addEventListener('click', (event) => {
      if (event.target === wrap) ui.closeSheet();
    });
    wrap.querySelector('.x').addEventListener('click', () => ui.closeSheet());
    wrap.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') ui.closeSheet();
    });
    document.body.appendChild(wrap);
    ui.sheetEl = wrap;
    P.audio && P.audio.sfx('page');
    if (opts.onMount) opts.onMount(body, wrap);
    if (typeof opts.onClose === 'function') ui._sheetCloseCb = opts.onClose;
    return wrap;
  };

  // 等这个弹窗被关掉（点按钮、点遮罩、点 × 、按 ESC 都算）
  ui.sheetClosed = function sheetClosed() {
    return new Promise((resolve) => {
      let done = false;
      const finish = () => { if (done) return; done = true; resolve(); };
      const prev = ui._sheetCloseCb;
      ui._sheetCloseCb = () => { if (prev) prev(); finish(); };
      // 万一根本没能打开（比如被别的东西挡住了），也给个上限
      const poll = setInterval(() => {
        if (!ui.sheetEl) { clearInterval(poll); finish(); }
      }, 400);
    });
  };

  ui.closeSheet = function closeSheet() {
    if (ui.sheetEl) {
      const node = ui.sheetEl;
      ui.sheetEl = null;
      // 关得有个下落的过程，别啪一下就没
      node.classList.add('closing');
      setTimeout(() => node.remove(), 190);
      const cb = ui._sheetCloseCb;
      ui._sheetCloseCb = null;
      if (cb) { try { cb(); } catch (_) {} }
      P.ui.refreshDexHint && P.ui.refreshDexHint();
    }
  };

  /* -------------------------------------------------------------- 背包 --- */
  ui.bag = function bag() {
    const ids = P.bagList();
    const make = (body) => {
      if (!ids.length) {
        body.innerHTML = '<p>背包是空的。去农场种点东西，或者到湖边钓两条鱼。</p>';
        return;
      }
      const grid = document.createElement('div');
      grid.className = 'grid';
      ids.forEach((id) => {
        const item = P.ITEM[id];
        const slot = document.createElement('button');
        slot.type = 'button';
        slot.className = 'slot';
        slot.innerHTML = `<img src="${P.itemIcon(id)}" alt=""><b>${item.name}</b><span class="n">${P.bagCount(id)}</span>`;
        slot.addEventListener('click', () => {
          grid.querySelectorAll('.slot').forEach((n) => n.classList.remove('selected'));
          slot.classList.add('selected');
          showDetail(detail, id);
        });
        grid.appendChild(slot);
      });
      body.innerHTML = '';
      body.appendChild(grid);
      const detail = document.createElement('div');
      detail.className = 'detail';
      detail.hidden = true;
      body.appendChild(detail);
    };

    const showDetail = (host, id) => {
      const item = P.ITEM[id];
      const count = P.bagCount(id);
      host.hidden = false;
      host.innerHTML = `
        <img src="${P.itemIcon(id)}" alt="">
        <div class="meta">
          <h3>${item.name} ×${count}</h3>
          <p>${item.desc || ''}</p>
          <div class="row"></div>
        </div>`;
      const row = host.querySelector('.row');
      if (item.kind === 'seed') {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn';
        b.textContent = '去种下';
        b.addEventListener('click', () => {
          ui.closeSheet();
          P.world.go('farm');
          P.showHint('点菜地里空着的那格就能种下');
        });
        row.appendChild(b);
      } else if (item.kind === 'crop' || item.kind === 'fish' || item.kind === 'goods') {
        const sell = document.createElement('button');
        sell.type = 'button';
        sell.className = 'btn';
        sell.textContent = `卖掉 +${item.price}`;
        sell.addEventListener('click', () => {
          if (!P.takeItem(id, 1)) return;
          P.state.coins += item.price;
          P.state.stats.sold += 1;
          P.audio && P.audio.sfx('coin');
          P.daily && P.daily.bump('sell');
          ui.toast(`${item.name} 卖掉了 +${item.price}`, 'ui-coin');
          ui.hud();
          P.save();
          ui.bag();
        });
        row.appendChild(sell);
      }
      const fishMeta = item.kind === 'fish' ? P.FISH[item.fish] : null;
      const giftable = fishMeta
        ? Boolean(fishMeta.gift || fishMeta.value >= 60)
        : (id === 'wheat' || id === 'strawberry' || item.kind === 'gift'
          || id === 'egg' || id === 'milk' || id === 'bouquet');
      if (giftable) {
        const give = document.createElement('button');
        give.type = 'button';
        give.className = 'btn pale';
        give.textContent = '送给他';
        give.addEventListener('click', async () => {
          ui.closeSheet();
          await P.npc.give(id);
        });
        row.appendChild(give);
      }
    };

    ui.sheet({
      title: '背包', kicker: 'BAG', body: (body) => make(body),
      foot: [{ label: '种子箱 · 买种子', run: () => { ui.closeSheet(); setTimeout(() => ui.shop(), 60); } }]
    });
  };

  /* -------------------------------------------------------------- 图鉴 --- */
  // 稀有度：常见 / 少见 / 稀有 / 杂物，只影响牌子的颜色和小圆点
  const RARITY = {
    common: { name: '常见', dot: '#b9a898', n: 1 },
    uncommon: { name: '少见', dot: '#6f9fc4', n: 2 },
    rare: { name: '稀有', dot: '#d08a3c', n: 3 },
    junk: { name: '杂物', dot: '#a99a90', n: 0 }
  };
  // 收满多少种给多少金币，一次只发一档
  const DEX_TIERS = [
    { n: 5, coins: 60 }, { n: 9, coins: 140 }, { n: 13, coins: 220 },
    { n: 15, coins: 360 }, { n: 17, coins: 520 }
  ];

  function whereFish(f) {
    const bits = [];
    bits.push(f.phases.length >= 4 ? '什么时候都行' : f.phases.map((i) => P.PHASES[i]).join(' / '));
    if (f.weather) bits.push(`只在${f.weather.map((k) => (P.WEATHER[k] || {}).name || k).join('或')}天`);
    return bits.join(' · ');
  }

  function dexEntries() {
    const crops = Object.keys(P.CROP).map((id) => {
      const c = P.CROP[id];
      const n = P.state.grown[id] || 0;
      return {
        key: `crop-${id}`, table: '作物', name: c.name, icon: c.icon, note: c.note,
        rarity: c.rarity || 'common', known: n > 0, count: n, unit: '收过',
        where: `${c.days} 天成熟 · 种子箱有卖`, value: c.sell
      };
    });
    const fishes = Object.keys(P.FISH).map((id) => {
      const f = P.FISH[id];
      const n = P.state.caught[id] || 0;
      return {
        key: `fish-${id}`, table: '湖里', name: f.name, icon: f.icon, note: f.note,
        rarity: f.rarity || 'common', known: n > 0, count: n, unit: '钓到',
        where: whereFish(f), value: f.value, gift: f.gift
      };
    });
    return { crops, fishes, all: crops.concat(fishes) };
  }
  ui.dexEntries = dexEntries;

  // 收满一档就发金币；钓鱼、收菜、打开图鉴时都会查一遍
  ui.dexCheck = function dexCheck() {
    if (!P.state) return 0;
    const total = dexEntries().all.filter((entry) => entry.known).length;
    const flags = P.state.flags;
    let paid = flags.dexPaid || 0;
    let changed = false;
    while (paid < DEX_TIERS.length && total >= DEX_TIERS[paid].n) {
      const tier = DEX_TIERS[paid];
      P.state.coins += tier.coins;
      paid += 1;
      changed = true;
      ui.toast(`图鉴收满 ${tier.n} 种 · 奖励 ${tier.coins} 金币`, 'ui-coin');
      P.audio && P.audio.sfx('coin');
    }
    if (changed) {
      flags.dexPaid = paid;
      P.save();
      ui.hud();
    }
    return total;
  };

  ui.dex = function dex() {
    const { crops, fishes, all } = dexEntries();
    const have = all.filter((entry) => entry.known).length;
    const total = all.length;

    const card = (entry) => {
      const r = RARITY[entry.rarity] || RARITY.common;
      const dots = Array.from({ length: 3 }, (_, i) => `<i class="${i < r.n ? 'on' : ''}" style="--c:${r.dot}"></i>`).join('');
      return `<button type="button" class="dex-item ${entry.known ? 'known' : 'unknown'}" data-key="${entry.key}"
          style="--tone:${r.dot}" aria-label="${entry.known ? entry.name : '还没遇到'}">
        <i class="rarity">${dots}</i>
        <img src="${P.icon(entry.icon)}" alt="">
        <strong>${entry.known ? entry.name : '？？？'}</strong>
        <em>${entry.known ? `${entry.unit} ${entry.count} ${entry.table === '湖里' ? '次' : '份'}` : entry.where}</em>
      </button>`;
    };

    const next = DEX_TIERS.find((tier) => tier.n > have);
    const tip = next ? `再收 ${next.n - have} 种就能拿 ${next.coins} 金币。` : '全收齐了。这个农场已经认得你。';
    const pct = Math.round((have / total) * 100);

    const wrap = ui.sheet({
      title: '收集册',
      kicker: `${have} / ${total}`,
      body: `<div class="dex-head">
          <div class="dex-bar"><i style="width:${pct}%"></i></div>
          <p>${tip}</p>
        </div>
        <div class="dex-section"><h4>田里 · ${crops.filter((e) => e.known).length}/${crops.length}</h4>
          <div class="dex">${crops.map(card).join('')}</div></div>
        <div class="dex-section"><h4>湖里 · ${fishes.filter((e) => e.known).length}/${fishes.length}</h4>
          <div class="dex">${fishes.map(card).join('')}</div></div>
        <p class="dex-note">灰着的只写了在哪儿能遇到。点开一个看看。</p>`,
      onMount: (body) => {
        body.addEventListener('click', (event) => {
          const button = event.target.closest('.dex-item');
          if (!button) return;
          const entry = all.find((item) => item.key === button.dataset.key);
          if (entry) openDexEntry(entry);
        });
      }
    });
    ui.dexCheck();
    return wrap;
  };

  function openDexEntry(entry) {
    const r = RARITY[entry.rarity] || RARITY.common;
    const body = entry.known
      ? `<div class="detail" style="margin-top:0">
          <img src="${P.icon(entry.icon)}" alt="">
          <div class="meta">
            <h3>${entry.name}</h3>
            <p>${entry.note || ''}</p>
            <p style="margin:0;font-size:12px;color:#9a7a6d">${r.name} · ${entry.unit} ${entry.count} 次 · 一个卖 ${entry.value} 金币</p>
          </div>
        </div>
        <p style="margin-top:12px">${entry.where}。</p>`
      : `<p class="dex-blank">还没遇到。<b>${entry.where}</b>，去碰碰运气。</p>
        <p class="dex-blank" style="color:#bda9a0">凑齐了会记在这里，也会给金币。</p>`;
    ui.sheet({
      title: entry.known ? entry.name : '？？？',
      kicker: r.name,
      body,
      foot: [
        { label: '回去看收集册', run: () => { ui.closeSheet(); setTimeout(() => ui.dex(), 80); } }
      ]
    });
  }

  /* -------------------------------------------------------------- 任务 --- */
  /* ------------------------------------------------------------ 回忆 --- */
  // 每一个两个人待在一起的时候，都会在照片墙上留下一格
  const MOMENTS = [
    { key: 'tv', name: '一起看电视', art: 'assets/moment-tv.webp', where: '客厅 · 点沙发', line: '靠垫立起来一半，你的头刚好能靠住。' },
    { key: 'bath', name: '一起泡澡', art: 'assets/moment-bath.webp', where: '澡堂 · 点浴桶', line: '水汽把镜子糊住了，谁也没先起来。' },
    { key: 'stars', name: '楼顶看星星', art: 'assets/roof-art.webp', pos: '12% 62%', where: '楼顶 · 点垫子', line: '他数到二十一，你数到十七，谁也没数完。' },
    { key: 'dinner', name: '一起吃晚饭', art: 'assets/room-birthday-26-optimized.webp', pos: '48% 62%', where: '屋里有鱼有菜时 · 点饭桌', line: '两副碗筷，他把你爱吃的往你那边推。' },
    { key: 'kiss', name: '一个吻', art: 'assets/moment-kiss.webp', where: '夜里回小屋 · 点床', line: '他耳朵尖红起来，过了好一会儿才说：再来一下。' },
    { key: 'sleep', name: '一起睡', art: 'assets/moment-sleep.webp', where: '回小屋点床 · 选「和他一起睡」', line: '留了一半被子给他，他躺下的时候肩膀是松的。' },
    { key: 'fish', name: '一起钓鱼', art: 'assets/lake-art.webp', pos: '60% 56%', where: '湖边 · 点栈桥', line: '两根浮标并排立在水上，风一吹一起晃。' },
    { key: 'towel', name: '递条毛巾', art: 'assets/bath-art.webp', pos: '46% 42%', where: '泡完澡 · 站到桶边点「递毛巾」', line: '把毛巾递过去，他擦得很慢，像在拖时间。' },
    { key: 'cafe', name: '镇上的咖啡座', art: 'assets/town-art.webp', pos: '26% 60%', where: '镇上 · 他也在的时候点咖啡座', line: '井沿让出一块给你，杯子放在膝上，谁也没先开口。' }
  ];

  ui.memories = function memories() {
    const got = MOMENTS.filter((m) => P.memoryOf && P.memoryOf(m.key)).length;
    const cards = MOMENTS.map((m) => {
      const rec = P.memoryOf ? P.memoryOf(m.key) : null;
      const art = `<img src="${m.art}" alt="" loading="lazy"
        style="display:block;width:100%;aspect-ratio:3/2;object-fit:cover;object-position:${m.pos || '50% 50%'};
        image-rendering:auto;border-radius:6px;${rec ? '' : 'filter:grayscale(1) brightness(.22)'}">`;
      return `<div class="memo ${rec ? '' : 'locked'}">
        ${art}
        <b>${rec ? m.name : '还没发生'}</b>
        <span>${rec ? m.line : `还没解锁 · ${m.where}`}</span>
        ${rec ? `<em>第 ${rec.day} 天 · 一起 ${rec.times || 1} 次</em>` : '<em>&nbsp;</em>'}
      </div>`;
    }).join('');
    ui.sheet({
      title: '照片墙',
      kicker: `${got} / ${MOMENTS.length}`,
      body: `<p>两个人待在一起的时候，墙上会多一格。现在还空着的那些，去把它填上。</p>
        <div class="memo-grid">${cards}</div>`,
      foot: [{ label: '关上灯', run: () => ui.closeSheet() }]
    });
  };

  ui.record = function record() {
    const list = P.achv.list();
    const done = list.filter((item) => item.done).length;
    const rows = list.map((item) => {
      const pct = item.total ? Math.round((item.now / item.total) * 100) : 0;
      return `<div class="achv ${item.done ? 'done' : ''}">
        <span class="mark">${item.done ? '★' : '·'}</span>
        <div>
          <strong>${item.name}</strong>
          <em>${item.note}</em>
          ${item.done ? '' : `<span class="bar"><i style="width:${pct}%"></i></span>`}
        </div>
        <span class="num">${item.done ? '完成' : `${item.now}/${item.total}`}</span>
      </div>`;
    }).join('');
    ui.sheet({
      title: '这些日子',
      kicker: `${done} / ${list.length}`,
      body: `<p>在这里做过的事会自己留记号。不用刻意去刷，做着做着就有了。</p>
        <div class="achv-list">${rows}</div>`
    });
  };

  /* ---------------------------------------------------------- 今天的纸条 --- */
  function goalBlock() {
    const goals = P.daily ? P.daily.list() : [];
    if (!goals.length) return '';
    const done = goals.filter((goal) => goal.done).length;
    const rows = goals.map((goal) => `
      <div class="goal ${goal.done ? 'done' : ''}">
        <span class="mark">${goal.done ? '✓' : '·'}</span>
        <div>
          <strong>${goal.text}</strong>
          <span class="gbar"><i style="width:${Math.round((goal.now / goal.n) * 100)}%"></i></span>
        </div>
        <span class="num">${goal.done ? `+${goal.coins}` : `${goal.now}/${goal.n}`}</span>
      </div>`).join('');
    return `<div class="goals">
      <h4>今天的三件小事 · ${done}/${goals.length}</h4>
      ${rows}
      <p class="goals-tip">${done >= goals.length ? '做完了。剩下的时间归你。' : '做完了给金币，三件都做完还有一份。'}</p>
    </div>`;
  }

  // 刚做完的那条要闪一下，不然只看见数字变了
  let flashGoal = '';
  ui.markGoalDone = function markGoalDone(id) {
    flashGoal = id;
    clearTimeout(ui.flashTimer);
    ui.flashTimer = setTimeout(() => { flashGoal = ''; }, 1500);
  };

  // 面板开着的时候，进度条要跟着动
  ui.goalsLive = function goalsLive() {
    const host = document.getElementById('goalWrap');
    if (!host) return;
    host.innerHTML = goalBlock();
    if (!flashGoal) return;
    const goals = P.daily ? P.daily.list() : [];
    const index = goals.findIndex((goal) => goal.id === flashGoal);
    const rows = host.querySelectorAll('.goal');
    if (index >= 0 && rows[index]) {
      const row = rows[index];
      row.classList.add('just-done');
      setTimeout(() => row.classList.remove('just-done'), 1000);
    }
  };

  // 他一天的行程，收在那行提示里，点一下才展开
  function schedTable() {
    if (!P.npc || !P.npc.scheduleInfo) return '';
    const rows = P.npc.scheduleInfo();
    const body = rows.map((row) => `<span class="sched-row${row.now ? ' now' : ''}">
        <b>${row.label}</b><em>${row.time}</em><i>${row.where}</i></span>`).join('');
    return `<button class="sched-toggle" type="button" aria-expanded="false">看一天</button>
      <span class="sched-body" hidden>${body}</span>`;
  }

  ui.quests = function quests() {
    const list = P.story.list();
    const spot = hisSpot();
    const html = `${spot ? `<p class="q-where">这个点他一般在<b>${spot}</b>。${schedTable()}</p>` : ''}
      <div id="goalWrap">${goalBlock()}</div>
      <h4 class="qhead">故事线</h4>
      <div class="qlist">${list.map((q) => `
      <div class="qitem ${q.done ? 'done' : ''} ${q.current ? 'now' : ''}">
        <span class="mark">${q.done ? '✓' : q.current ? '·' : ''}</span>
        <div><strong>${q.title}</strong><br>${q.text}</div>
      </div>`).join('')}</div>`;
    const wrap = ui.sheet({ title: '今天要做的事', kicker: 'TO DO', body: html });
    const toggle = wrap && wrap.querySelector('.sched-toggle');
    const body = wrap && wrap.querySelector('.sched-body');
    if (toggle && body) {
      toggle.addEventListener('click', () => {
        const open = body.hidden;
        body.hidden = !open;
        toggle.textContent = open ? '收起' : '看一天';
        toggle.setAttribute('aria-expanded', String(open));
      });
    }
  };

  /* -------------------------------------------------------------- 商店 --- */
  ui.shop = function shop() {
    const body = document.createElement('div');
    body.innerHTML = `<p class="shop-tip">木箱里放着种子。种下去、浇上水，等它长大。
      收的时候会留下 <b>一颗种子</b>，所以只要还在种，就不会真的断种。<br>
      手头有 <b>${P.state.coins}</b> 金币。</p>`;
    const head0 = document.createElement('h4');
    head0.className = 'shop-head';
    head0.textContent = '种子';
    body.appendChild(head0);
    Object.keys(P.CROP).forEach((id) => {
      const seedId = P.CROP[id].seed;
      const seed = P.ITEM[seedId];
      const have = P.bagCount(seedId);
      const row = document.createElement('div');
      row.className = 'shop-row';
      row.innerHTML = `
        <img src="${P.icon(seed.icon)}" alt="">
        <div class="info">
          <strong>${seed.name}${have ? ` <em class="own">有 ${have}</em>` : ''}</strong>
          <small>${P.CROP[id].days} 天 · 卖 ${P.CROP[id].sell} 币</small>
        </div>
        <span class="price"><img src="assets/ui-coin.png" alt="">${seed.price}</span>`;
      const buyOne = document.createElement('button');
      buyOne.type = 'button';
      buyOne.className = 'btn';
      buyOne.textContent = '买一颗';
      buyOne.addEventListener('click', () => buySeed(seedId, 1));
      const buyFive = document.createElement('button');
      buyFive.type = 'button';
      buyFive.className = 'btn pale';
      buyFive.textContent = '×5';
      buyFive.addEventListener('click', () => buySeed(seedId, 5));
      row.appendChild(buyOne);
      row.appendChild(buyFive);
      body.appendChild(row);
    });

    function buySeed(seedId, n) {
      const seed = P.ITEM[seedId];
      const cost = seed.price * n;
      if (P.state.coins < cost) {
        P.ui.toast(n > 1 ? `金币不够，${n} 颗要 ${cost} 币` : '金币不够，先去卖点东西', 'ui-coin');
        P.audio && P.audio.sfx('nope');
        return;
      }
      P.state.coins -= cost;
      P.addItem(seedId, n);
      P.audio && P.audio.sfx('coin');
      ui.toast(`买到 ${seed.name} ×${n}`, seed.icon);
      ui.hud();
      P.save();
      ui.shop();
    }

    // 杂货：金币除了买种子，还能换几件顺手的家伙
    const head = document.createElement('h4');
    head.className = 'shop-head';
    head.textContent = '木箱边上的杂货';
    body.appendChild(head);
    Object.keys(P.TOOLS).forEach((id) => {
      const tool = P.TOOLS[id];
      const owned = P.hasTool(id);
      const row = document.createElement('div');
      row.className = `shop-row tool ${owned ? 'owned' : ''}`;
      row.innerHTML = `
        <img src="${P.icon(tool.icon)}" alt="">
        <div class="info">
          <strong>${tool.name}</strong>
          <small>${owned ? tool.effect : tool.note}</small>
        </div>
        <span class="price">${owned ? '已有' : `<img src="assets/ui-coin.png" alt="">${tool.price}`}</span>`;
      if (!owned) {
        const buy = document.createElement('button');
        buy.type = 'button';
        buy.className = 'btn';
        buy.textContent = '买下';
        buy.addEventListener('click', () => {
          if (P.state.coins < tool.price) {
            ui.toast('金币不够，先去卖点东西', 'ui-coin');
            P.audio && P.audio.sfx('nope');
            return;
          }
          P.state.coins -= tool.price;
          P.state.tools[id] = true;
          P.audio && P.audio.sfx('coin');
          ui.toast(`买到${tool.name}`, tool.icon);
          ui.hud();
          P.save();
          ui.shop();
        });
        row.appendChild(buy);
      }
      body.appendChild(row);
    });

    ui.sheet({
      title: '种子箱', kicker: 'SEEDS', body,
      foot: [{ label: '合上箱子', pale: true, run: () => ui.closeSheet() }]
    });
  };

  /* -------------------------------------------------------------- 菜单 --- */
  ui.menu = function menu() {
    const save = P.state;
    const restart = { label: '重新开始', pale: true, run: () => {} };
    ui.sheet({
      title: '小屋', kicker: 'MENU', body: `
        <p>第 ${save.day} 天 · ${P.PHASES[save.phase]}　金币 ${save.coins}　好感 ${save.hearts} / 10</p>
        <div class="qlist">
          <div class="qitem"><span class="mark">?</span><div><strong>怎么玩</strong><br>点地面走动（键盘 WASD / 方向键）。<br>点菜地：翻土 → 播种 → 浇水 → 等一天。<br>农场上面是屋后菜园（二十格，土是现成的），右边是牧场（养鸡羊牛）。<br>农场左下角能开车去镇上：镇上有玉米南瓜种子、饲料、肥料和牲口。<br>点水面：抛竿，浮标沉下去再点一下。<br>小屋右下角能去客厅，客厅往里是澡堂，澡堂上楼是楼顶。<br>点床睡觉，进入第二天，作物和动物才会长。</div></div>
          <div class="qitem"><span class="mark">♪</span><div><strong>声音</strong><br>右上角的 ♪ 可以开关音乐和音效。</div></div>
          <div class="qitem" id="menuRecord" role="button" tabindex="0"><span class="mark">★</span><div><strong>这些日子</strong><br>看看已经做成了哪些事。</div></div>
          <div class="qitem" id="menuMemories" role="button" tabindex="0"><span class="mark">♡</span><div><strong>照片墙</strong><br>两个人待在一起的那些时候，一格一格挂着。</div></div>
          <div class="qitem" id="menuGarden" role="button" tabindex="0"><span class="mark">≋</span><div><strong>屋后菜园</strong><br>二十格地，能一档一档地开。</div></div>
          <div class="qitem" id="menuPasture" role="button" tabindex="0"><span class="mark">☘</span><div><strong>牧场</strong><br>喂过的动物，第二天才给东西。</div></div>
        </div>`,
      foot: [
        { label: P.audio.on ? '关掉音乐' : '打开音乐', pale: true, run: () => { P.audio.toggle(); ui.hud(); ui.closeSheet(); } },
        restart,
        { label: '回到标题', pale: true, run: () => { P.save(); location.href = 'index.html'; } },
        { label: '重看序章', pale: true, run: () => { P.save(); location.href = 'story.html'; } },
        { label: '种子箱', pale: true, run: () => { ui.closeSheet(); setTimeout(() => ui.shop(), 60); } }
      ],
      onMount: (body, wrap) => {
        const row = wrap.querySelector('#menuRecord');
        if (row) {
          const open = () => { ui.closeSheet(); setTimeout(() => ui.record(), 120); };
          row.addEventListener('click', open);
          row.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); }
          });
        }
        const jumpTo = (id, scene) => {
          const row = wrap.querySelector(id);
          if (!row) return;
          const go = () => { ui.closeSheet(); setTimeout(() => P.world.go(scene), 120); };
          row.addEventListener('click', go);
          row.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); go(); }
          });
        };
        jumpTo('#menuGarden', 'garden');
        jumpTo('#menuPasture', 'pasture');
        const memo = wrap.querySelector('#menuMemories');
        if (memo) {
          const openWall = () => { ui.closeSheet(); setTimeout(() => ui.memories(), 120); };
          memo.addEventListener('click', openWall);
          memo.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openWall(); }
          });
        }
        // 重置存档要按两下，第一下只是把按钮变成「真的重来？」
        const button = wrap.querySelectorAll('.card-foot .btn')[1];
        if (!button) return;
        button.addEventListener('click', (event) => {
          if (button.dataset.armed === '1') return;
          event.stopImmediatePropagation();
          button.dataset.armed = '1';
          button.textContent = '真的重来？进度会没';
          P.audio && P.audio.sfx('nope');
          setTimeout(() => {
            if (button.dataset.armed === '1') {
              button.dataset.armed = '';
              button.textContent = '重新开始';
            }
          }, 4200);
        }, true);
        button.addEventListener('click', () => {
          if (button.dataset.armed !== '1') return;
          P.wipe();
          location.href = 'index.html?fresh=1';
        });
      }
    });
  };

  ui.init = function init() {
    bindDialog();
    const bag = $('bagButton');
    if (bag) bag.addEventListener('click', () => { P.audio && P.audio.sfx('click'); ui.bag(); });
    const dex = $('dexButton');
    if (dex) dex.addEventListener('click', () => { P.audio && P.audio.sfx('click'); ui.dex(); });
    const quest = $('questButton');
    if (quest) quest.addEventListener('click', () => { P.audio && P.audio.sfx('click'); ui.quests(); });
    const sound = $('soundButton');
    if (sound) sound.addEventListener('click', () => { P.audio.toggle(); });
    const menu = $('menuButton');
    if (menu) menu.addEventListener('click', () => { P.audio && P.audio.sfx('click'); ui.menu(); });
    const dayChip = $('dayChip');
    if (dayChip) dayChip.addEventListener('click', () => { P.audio && P.audio.sfx('click'); ui.quests(); });
    // 点金币直接开种子箱：手机上不用跑回农场找那个木箱
    const coinChip = document.getElementById('coinButton') || document.querySelector('.chip[title="金币"]');
    if (coinChip) {
      coinChip.setAttribute('role', 'button');
      coinChip.setAttribute('tabindex', '0');
      coinChip.style.cursor = 'pointer';
      coinChip.title = '金币 · 点开种子箱';
      const openShop = () => { P.audio && P.audio.sfx('click'); ui.shop(); };
      coinChip.addEventListener('click', openShop);
      coinChip.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openShop(); }
      });
    }
    ui.hud();
  };
})();
