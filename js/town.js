/* 屁屁小屋 · 镇上：开车去市集买东西。摊位、面包房、咖啡座、水井，还有一辆皮卡 */
(function () {
  const P = window.P;
  const U = P.util;
  const A = (P.actions = P.actions || {});

  const town = { busy: false };
  P.town = town;

  const FUEL = 8;          // 单程油钱
  const STOCK = {
    seeds: ['seed_corn', 'seed_pumpkin'],
    goods: [
      { id: 'feed', n: 5, price: 30, note: '一袋够喂一只，五袋正好一周' },
      { id: 'fertilizer', n: 3, price: 60, note: '撒一袋，那一格多长一天' },
      { id: 'bouquet', n: 1, price: 45, note: '花摊扎的，可以送他' }
    ]
  };

  /* ------------------------------------------------------------ 开车 --- */
  // 一段小过场：车从左边开过来，停一下，再开走；到了换场景
  function showDrive(text, toTown) {
    return new Promise((resolve) => {
      const stage = document.getElementById('stage');
      if (!stage) { resolve(); return; }
      const ov = document.createElement('div');
      ov.className = 'drive';
      ov.dataset.dir = toTown ? 'out' : 'back';
      ov.innerHTML = `
        <div class="drive-sky"></div>
        <div class="drive-hills"></div>
        <div class="drive-road">
          <i class="drive-line"></i>
          <i class="drive-lamp a"></i><i class="drive-lamp b"></i><i class="drive-lamp c"></i>
          <img class="drive-truck" src="assets/prop-truck.png" alt="">
        </div>
        <p class="drive-text">${text}</p>`;
      stage.appendChild(ov);
      P.audio && P.audio.sfx('step');
      // 引擎声：两下低音，隔一会儿再来一下
      P.audio && P.audio.tone && P.audio.tone(98, 0.5, 0.05, 'sawtooth');
      setTimeout(() => P.audio && P.audio.tone && P.audio.tone(122, 0.6, 0.04, 'sawtooth'), 700);
      setTimeout(() => {
        ov.classList.add('go');
      }, 480);
      setTimeout(() => {
        ov.classList.add('out');
        resolve();
        setTimeout(() => ov.remove(), 520);
      }, 2400);
    });
  }

  /* 去镇上 / 回家：先把油钱付了，再开 */
  async function drive(to) {
    if (town.busy || P.world.busy || P.ui.modalOpen()) return;
    const first = !P.state.flags.townTrips;
    // 买了油卡就刷卡，不扣金币
    const card = P.state.ups && P.state.ups.fuel > 0;
    if (!first && !card && P.state.coins < FUEL) {
      P.ui.toast(`油箱见底了 · 加一次油要 ${FUEL} 金币`, 'ui-coin');
      P.audio && P.audio.sfx('nope');
      return;
    }
    town.busy = true;
    P.world.busy = true;
    if (!first) {
      if (card) {
        P.state.ups.fuel -= 1;
        if (P.state.ups.fuel <= 0) {
          P.ui.toast('油卡用完了 · 下次要付油钱了', 'ui-coin');
        }
      } else {
        P.state.coins -= FUEL;
      }
      P.ui.hud();
    }
    P.state.flags.townTrips = (P.state.flags.townTrips || 0) + 1;
    P.spend(0, 1);
    const line = to === 'town'
      ? (first ? '车钥匙就挂在门后。油表指针在中间，够开一趟。'
        : card ? `刷了油卡，还剩 ${P.state.ups.fuel} 次。沿着湖边那条路往东。`
          : `加了 ${FUEL} 块油，沿着湖边那条路往东。`)
      : '车厢里堆着买的东西，一路晃回去。';
    await showDrive(line, to === 'town');
    P.world.busy = false;
    town.busy = false;
    P.world.go(to, { quiet: false });
    if (to === 'town') {
      if (!P.state.flags.truckTold) {
        P.state.flags.truckTold = true;
        P.save();
        setTimeout(() => {
          P.ui.toast('镇上的东西比农场全，就是贵一点', 'ui-coin');
        }, 900);
      }
      setTimeout(() => town.paintJunk(), 700);
      // 好感够了，他会自己搭车跟来，站在井边等你
      if ((P.state.hearts || 0) >= 6 && P.npc && P.npc.summon) {
        setTimeout(() => {
          if (P.world.current === 'town' && P.state.phase >= 1 && P.state.phase <= 2) {
            P.npc.summon('town', { x: 892, y: 792 });
          }
        }, 620);
      }
    }
  }
  town.drive = drive;

  /* ------------------------------------------------------------ 市集 --- */
  A.market = function market() {
    const body = document.createElement('div');
    const coins = P.state.coins;
    body.innerHTML = `<p class="shop-tip">棚子底下摆着镇上才有的东西。
      手头有 <b>${coins}</b> 金币。买完直接放进背包。</p>`;
    const head = document.createElement('h4');
    head.className = 'shop-head';
    head.textContent = '种子（农场买不到）';
    body.appendChild(head);

    STOCK.seeds.forEach((id) => {
      const seed = P.ITEM[id];
      const crop = P.CROP[seed.crop];
      const have = P.bagCount(id);
      const row = document.createElement('div');
      row.className = 'shop-row';
      row.innerHTML = `
        <img src="${P.icon(seed.icon)}" alt="">
        <div class="info">
          <strong>${seed.name}${have ? ` <em class="own">有 ${have}</em>` : ''}</strong>
          <small>${crop.days} 天 · 卖 ${crop.sell} 币</small>
        </div>
        <span class="price"><img src="assets/ui-coin.png" alt="">${seed.price}</span>`;
      const buy = document.createElement('button');
      buy.type = 'button';
      buy.className = 'btn';
      buy.textContent = '买一颗';
      buy.addEventListener('click', () => buyItem(id, 1, seed.price));
      row.appendChild(buy);
      body.appendChild(row);
    });

    const head2 = document.createElement('h4');
    head2.className = 'shop-head';
    head2.textContent = '杂物';
    body.appendChild(head2);
    STOCK.goods.forEach((g) => {
      const item = P.ITEM[g.id];
      const have = P.bagCount(g.id);
      const row = document.createElement('div');
      row.className = 'shop-row';
      row.innerHTML = `
        <img src="${P.icon(item.icon)}" alt="">
        <div class="info">
          <strong>${item.name} ×${g.n}${have ? ` <em class="own">有 ${have}</em>` : ''}</strong>
          <small>${g.note}</small>
        </div>
        <span class="price"><img src="assets/ui-coin.png" alt="">${g.price}</span>`;
      const buy = document.createElement('button');
      buy.type = 'button';
      buy.className = 'btn';
      buy.textContent = '买一份';
      buy.addEventListener('click', () => buyItem(g.id, g.n, g.price));
      row.appendChild(buy);
      body.appendChild(row);
    });

    // 卖东西：一次把背篓里能换钱的都换掉，省得一样一样点
    const head3 = document.createElement('h4');
    head3.className = 'shop-head';
    head3.textContent = '把东西卖给他们';
    body.appendChild(head3);
    const sellables = P.bagList().filter((id) => ['crop', 'fish', 'goods'].includes(P.ITEM[id].kind));
    const total = sellables.reduce((sum, id) => sum + P.ITEM[id].price * P.bagCount(id), 0);
    const sellRow = document.createElement('div');
    sellRow.className = 'shop-row';
    sellRow.innerHTML = `
      <img src="assets/tool-basket.png" alt="">
      <div class="info">
        <strong>全部卖掉</strong>
        <small>${sellables.length ? `${sellables.length} 种 · 一共 ${total} 金币` : '背篓里没有能卖的东西'}</small>
      </div>
      <span class="price">${sellables.length ? `<img src="assets/ui-coin.png" alt="">${total}` : '—'}</span>`;
    if (sellables.length) {
      const sell = document.createElement('button');
      sell.type = 'button';
      sell.className = 'btn';
      sell.textContent = '一次卖完';
      sell.addEventListener('click', () => {
        let sum = 0;
        let kinds = 0;
        sellables.forEach((id) => {
          const n = P.bagCount(id);
          if (!n) return;
          sum += P.ITEM[id].price * n;
          kinds += n;
          P.takeItem(id, n);
        });
        P.state.coins += sum;
        P.state.stats.sold += kinds;
        P.audio && P.audio.sfx('coin');
        P.daily && P.daily.bump('sell', kinds);
        P.ui.toast(`卖掉 ${kinds} 份 · +${sum} 金币`, 'ui-coin');
        P.ui.hud();
        P.save();
        P.ui.closeSheet();
        setTimeout(() => A.market(), 120);
      });
      sellRow.appendChild(sell);
    }
    body.appendChild(sellRow);

    const head4 = document.createElement('h4');
    head4.className = 'shop-head';
    head4.textContent = '棚子后面的牲口';
    body.appendChild(head4);
    const cap = P.pastureCap();
    const empty = cap - P.state.animals.filter(Boolean).length;
    P.ANIMAL_ORDER.forEach((kind) => {
      const spec = P.ANIMAL[kind];
      const product = P.ITEM[spec.product];
      const row = document.createElement('div');
      row.className = 'shop-row';
      row.innerHTML = `
        <img src="${P.icon(spec.icon)}" alt="" style="image-rendering:pixelated">
        <div class="info">
          <strong>${spec.name}</strong>
          <small>${spec.every > 1 ? `每 ${spec.every} 天` : '每天'}一份${product.name}（${product.price} 币）· ${spec.note}</small>
        </div>
        <span class="price"><img src="assets/ui-coin.png" alt="">${spec.price}</span>`;
      const buy = document.createElement('button');
      buy.type = 'button';
      buy.className = 'btn';
      buy.textContent = empty > 0 ? '牵回去' : '牧场满了';
      buy.disabled = empty <= 0;
      buy.addEventListener('click', () => {
        if (P.state.coins < spec.price) {
          P.ui.toast(`金币不够，${spec.name}要 ${spec.price} 币`, 'ui-coin');
          P.audio && P.audio.sfx('nope');
          return;
        }
        if (P.pasture.firstEmpty() < 0) {
          P.ui.toast(P.hasUp('fence') ? '八个位置都满了' : '六个位置都满了 · 杂货铺能买围栏木料', 'animal-sheep');
          return;
        }
        P.state.coins -= spec.price;
        P.pasture.add(kind);
        P.audio && P.audio.sfx('catch');
        P.ui.toast(`${spec.name}牵回牧场了 · 记得每天早上喂`, spec.icon);
        P.ui.hud();
        P.save();
        P.ui.closeSheet();
        setTimeout(() => A.market(), 140);
      });
      row.appendChild(buy);
      body.appendChild(row);
    });

    const note = document.createElement('p');
    note.className = 'shop-tip';
    note.style.marginTop = '12px';
    note.innerHTML = `牧场还空着 <b>${empty}</b> 个位置（一共 ${cap} 个${cap < P.PASTURE_MAX ? '，接一段围栏能到 8 个' : ''}）。`;
    body.appendChild(note);

    P.ui.sheet({
      title: '市集大棚', kicker: 'MARKET', body,
      foot: [{ label: '逛逛别处', pale: true, run: () => P.ui.closeSheet() }]
    });

    function buyItem(id, n, price) {
      if (P.state.coins < price) {
        P.ui.toast(`金币不够，要 ${price} 币`, 'ui-coin');
        P.audio && P.audio.sfx('nope');
        return;
      }
      P.state.coins -= price;
      P.addItem(id, n);
      P.audio && P.audio.sfx('coin');
      P.ui.toast(`买到 ${P.ITEM[id].name} ×${n}`, P.ITEM[id].icon);
      P.ui.hud();
      P.save();
      P.ui.closeSheet();
      setTimeout(() => A.market(), 120);
    }
  };

  /* ---------------------------------------------------------- 面包房 --- */
  A.bakery = function bakery() {
    const body = document.createElement('div');
    body.innerHTML = `<p class="shop-tip">烤箱一直在响。玻璃柜里是刚出炉的，
      老板说这条路一天只有两班车，所以面包要提前烤。</p>`;
    const items = [
      { id: 'bread', name: '一条面包', price: 14, energy: 3, icon: 'item-bread', note: '热的，掰开会掉渣。吃了回 3 点体力。' },
      { id: 'tart', name: '一个果挞', price: 36, energy: 5, icon: 'item-tart', note: '上面铺着半个果园。回 5 点体力。' }
    ];
    items.forEach((it) => {
      const row = document.createElement('div');
      row.className = 'shop-row';
      row.innerHTML = `
        <img src="${P.icon(it.icon)}" alt="">
        <div class="info"><strong>${it.name}</strong><small>${it.note}</small></div>
        <span class="price"><img src="assets/ui-coin.png" alt="">${it.price}</span>`;
      const buy = document.createElement('button');
      buy.type = 'button';
      buy.className = 'btn';
      buy.textContent = '买来吃';
      buy.addEventListener('click', () => {
        if (P.state.coins < it.price) {
          P.ui.toast('金币不够', 'ui-coin');
          P.audio && P.audio.sfx('nope');
          return;
        }
        if (P.state.energy >= P.state.energyMax) {
          P.ui.toast('现在不饿，体力是满的', 'ui-drop');
          return;
        }
        P.state.coins -= it.price;
        P.state.energy = Math.min(P.state.energyMax, P.state.energy + it.energy);
        P.audio && P.audio.sfx('coin');
        P.ui.toast(`吃了${it.name} · 体力 +${it.energy}`, it.icon);
        P.ui.hud();
        P.save();
      });
      row.appendChild(buy);
      body.appendChild(row);
    });
    P.ui.sheet({
      title: '面包房', kicker: 'BAKERY', body,
      foot: [{ label: '出去', pale: true, run: () => P.ui.closeSheet() }]
    });
  };

  /* ------------------------------------------------------------ 咖啡 --- */
  A.cafe = function cafe() {
    if (P.state.flags.cafeDay === P.state.day) {
      P.ui.toast('今天已经坐过一会儿了', 'ui-heart');
      return;
    }
    const price = 32;
    const body = document.createElement('div');
    const here = P.npc && P.npc.here && P.world.current === 'town';
    body.innerHTML = `<p class="shop-tip">露天的两张小圆桌，椅子有点矮。
      一杯 ${price} 金币，可以坐一下午。</p>
      <p style="font-size:13px;color:#9a7a6d">${here
        ? '他也在，正靠在井边等你。'
        : '一个人坐也还行，看别人买菜。'}</p>`;
    P.ui.sheet({
      title: '咖啡座', kicker: 'CAFE', body,
      foot: [{
        label: `坐下喝一杯（${price}）`,
        run: async () => {
          if (P.state.coins < price) {
            P.ui.toast('金币不够', 'ui-coin');
            P.audio && P.audio.sfx('nope');
            return;
          }
          P.state.coins -= price;
          P.state.flags.cafeDay = P.state.day;
          P.state.energy = Math.min(P.state.energyMax, P.state.energy + 4);
          P.audio && P.audio.sfx('coin');
          P.ui.hud();
          P.save();
          P.ui.closeSheet();
          P.spend(0, 1);
          if (here) {
            await P.ui.say([
              { who: '旁白', text: '你端着杯子过去，他往旁边挪了挪，把井沿让出一块。' },
              { who: '闷葫芦', text: '……买了什么。' },
              { who: '旁白', text: '你一样一样给他看。他点头，看到最后那束花的时候停了一下。' },
              { who: '闷葫芦', text: '这个，是给谁的。' }
            ], { endLabel: '你猜' });
            P.remember && P.remember('cafe');
            P.state.hearts = Math.min(10, (P.state.hearts || 0) + 1);
          } else {
            await P.ui.say([
              { who: '旁白', text: '你找了个靠里的位置。咖啡有点苦，但你坐了很久。' },
              { who: '旁白', text: '隔壁桌的人在讲今年的收成，声音不大，听着像在念什么。' }
            ], { endLabel: '起身' });
          }
          P.ui.hud();
          P.save();
        }
      }, { label: '不坐了', pale: true, run: () => P.ui.closeSheet() }]
    });
  };

  /* ------------------------------------------------------------ 水井 --- */
  A.well = function well() {
    const body = document.createElement('div');
    body.innerHTML = `<p>井口有一圈被绳子磨亮的石头。往下看，能看见自己的一小块影子。</p>
      <p style="font-size:13px;color:#9a7a6d">镇上的人往里丢硬币，说丢进去的愿望会被人记着。</p>`;
    P.ui.sheet({
      title: '水井', kicker: 'WELL', body,
      foot: [{
        label: '丢一枚硬币（5）',
        run: () => {
          if (P.state.coins < 5) { P.ui.toast('身上没有零钱了', 'ui-coin'); return; }
          P.state.coins -= 5;
          P.ui.hud();
          P.save();
          P.ui.closeSheet();
          P.audio && P.audio.sfx('plop');
          const pool = [
            '硬币沉下去，过了两秒才有回声。',
            '水面上的影子晃了一下，又平了。',
            '你想了想，没说出来。井知道就行。'
          ];
          P.ui.toast(pool[Math.floor(Math.random() * pool.length)], 'ui-coin');
        }
      }, { label: '只是看看', pale: true, run: () => P.ui.closeSheet() }]
    });
  };

  /* ---------------------------------------------------------- 旧货摊 --- */
  // 井边那块布上每天摆三样东西。同样的日子抽到同样的货（按天数做种子），
  // 免得反复进出刷出不一样的价。
  const JUNK_POOL = [
    { id: 'key', price: 4, note: '铜的，齿磨圆了。老板说不知道开哪扇门。' },
    { id: 'marble', price: 5, note: '对着光看，里面冻着一小段红。' },
    { id: 'postcard', price: 6, note: '字被水泡过，只剩一句「等我」还认得出来。' },
    { id: 'bouquet', price: 28, note: '昨天扎的，边上有两朵已经垂了。' },
    { id: 'egg', price: 24, note: '一板鸡蛋，不知道是谁家多出来的。' },
    { id: 'feed', n: 3, price: 13, note: '袋口开着，撒了一点出来。' },
    { id: 'fertilizer', n: 2, price: 26, note: '旧铁罐装的，标签自己写的。' },
    { id: 'seed_corn', price: 42, note: '用报纸包的一小把，说是自己留的种。' },
    { id: 'seed_pumpkin', price: 68, note: '数了数，比市集便宜两块。' },
    { id: 'seed_wheat', n: 3, price: 19, note: '三小包，够种一排。' },
    { id: 'wool', price: 96, note: '一团洗过的旧羊毛，有点结块。' }
  ];

  function junkStock() {
    const day = P.state.day;
    const flags = P.state.flags;
    if (flags.junkDay !== day) {
      flags.junkDay = day;
      flags.junkSold = [];
    }
    // 简单的按天哈希：同一天永远是同一批
    const pool = JUNK_POOL.map((item, i) => ({ ...item, key: i }));
    let seed = (day * 2654435761) % 2147483647;
    const rnd = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    const out = [];
    for (let i = 0; i < 3 && pool.length; i += 1) {
      out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
    }
    return out;
  }
  town.junkStock = junkStock;

  // 布上摆的就是今天这三样，买走一样就少一个
  town.paintJunk = function paintJunk() {
    const host = document.querySelector('.scene[data-scene="town"] .junk-goods');
    if (!host) return;
    const sold = P.state.flags.junkSold || [];
    const stock = junkStock()
      .filter((item) => !sold.includes(item.key))
      .filter((item) => P.ITEM[item.id]);
    host.innerHTML = stock.map((item, i) => {
      const art = P.ITEM[item.id];
      return `<img src="${P.icon(art.icon)}" alt="" style="--i:${i}">`;
    }).join('');
  };

  A.junk = function junk() {
    const sold = P.state.flags.junkSold || [];
    const stock = junkStock();
    const body = document.createElement('div');
    body.innerHTML = `<p class="shop-tip">一块旧毯子铺在井边的地上，上面摆着三样东西。
      老头说都是别人不要的，随便给点就行。</p>`;
    const head = document.createElement('h4');
    head.className = 'shop-head';
    head.textContent = `今天这三样（${P.state.day} 号）`;
    body.appendChild(head);

    stock.forEach((item) => {
      const art = P.ITEM[item.id];
      const gone = sold.includes(item.key);
      const n = item.n || 1;
      const row = document.createElement('div');
      row.className = 'shop-row';
      row.innerHTML = `
        <img src="${P.icon(art.icon)}" alt="">
        <div class="info">
          <strong>${art.name}${n > 1 ? ` ×${n}` : ''}</strong>
          <small>${item.note}</small>
        </div>
        <span class="price">${gone ? '没了' : `<img src="assets/ui-coin.png" alt="">${item.price}`}</span>`;
      const buy = document.createElement('button');
      buy.type = 'button';
      buy.className = 'btn';
      buy.textContent = gone ? '已经买走' : '买下';
      buy.disabled = gone;
      buy.addEventListener('click', () => {
        if (P.state.coins < item.price) {
          P.ui.toast(`金币不够，要 ${item.price} 币`, 'ui-coin');
          P.audio && P.audio.sfx('nope');
          return;
        }
        P.state.coins -= item.price;
        P.addItem(item.id, n);
        P.state.flags.junkSold = [...(P.state.flags.junkSold || []), item.key];
        P.state.stats.junk = (P.state.stats.junk || 0) + 1;
        P.audio && P.audio.sfx('coin');
        P.ui.toast(`买到 ${art.name} · 老板说「拿走吧」`, art.icon);
        P.ui.hud();
        P.save();
        town.paintJunk();
        P.ui.closeSheet();
        setTimeout(() => A.junk(), 130);
      });
      row.appendChild(buy);
      body.appendChild(row);
    });

    // 他这里收东西比市集多两成 —— 但也只收能卖的
    const head2 = document.createElement('h4');
    head2.className = 'shop-head';
    head2.textContent = '卖给他（比市集多两成）';
    body.appendChild(head2);
    const sellables = P.bagList().filter((id) => ['crop', 'fish', 'goods'].includes(P.ITEM[id].kind));
    const base = sellables.reduce((sum, id) => sum + P.ITEM[id].price * P.bagCount(id), 0);
    const total = Math.round(base * 1.25);
    const row = document.createElement('div');
    row.className = 'shop-row';
    row.innerHTML = `
      <img src="assets/tool-basket.png" alt="">
      <div class="info">
        <strong>一次全给他</strong>
        <small>${sellables.length ? `${sellables.length} 种 · 比市集多 ${total - base} 金币` : '背篓里没有能卖的东西'}</small>
      </div>
      <span class="price">${sellables.length ? `<img src="assets/ui-coin.png" alt="">${total}` : '—'}</span>`;
    if (sellables.length) {
      const sell = document.createElement('button');
      sell.type = 'button';
      sell.className = 'btn';
      sell.textContent = '都给他';
      sell.addEventListener('click', () => {
        let count = 0;
        sellables.forEach((id) => {
          const n = P.bagCount(id);
          if (!n) return;
          count += n;
          P.takeItem(id, n);
        });
        P.state.coins += total;
        P.state.stats.sold += count;
        P.audio && P.audio.sfx('coin');
        P.daily && P.daily.bump('sell', count);
        P.ui.toast(`卖给他 ${count} 份 · +${total} 金币`, 'ui-coin');
        P.ui.hud();
        P.save();
        P.ui.closeSheet();
        setTimeout(() => A.junk(), 130);
      });
      row.appendChild(sell);
    }
    body.appendChild(row);

    const tip = document.createElement('p');
    tip.className = 'shop-tip';
    tip.style.marginTop = '12px';
    tip.textContent = '明天换一批。他收东西不挑，就是给得少。';
    body.appendChild(tip);

    P.ui.sheet({
      title: '井边的旧货摊', kicker: 'JUNK', body,
      foot: [{ label: '站起来', pale: true, run: () => P.ui.closeSheet() }]
    });
  };

  /* ---------------------------------------------------------- 杂货铺 --- */
  A.store = function store() {
    const body = document.createElement('div');
    body.innerHTML = `<p class="shop-tip">木亭子里堆着麻袋和木箱，柜台擦得很干净。
      手头有 <b>${P.state.coins}</b> 金币。</p>`;

    const head2 = document.createElement('h4');
    head2.className = 'shop-head';
    head2.textContent = '大件（买完直接给你装上）';
    body.appendChild(head2);
    P.UPGRADE_ORDER.forEach((key) => {
      const up = P.UPGRADE[key];
      const owned = key === 'fuel' ? false : P.hasUp(key);
      const left = key === 'fuel' ? (P.state.ups.fuel || 0) : 0;
      const el = document.createElement('div');
      el.className = 'shop-row';
      el.innerHTML = `
        <img src="${P.icon(up.icon)}" alt="">
        <div class="info">
          <strong>${up.name}${owned ? ' <em class="own">已装好</em>' : key === 'fuel' && left ? ` <em class="own">还剩 ${left} 次</em>` : ''}</strong>
          <small>${up.effect} · ${up.note}</small>
        </div>
        <span class="price"><img src="assets/ui-coin.png" alt="">${up.price}</span>`;
      const buy = document.createElement('button');
      buy.type = 'button';
      buy.className = 'btn';
      buy.textContent = owned ? '装好了' : '买下';
      buy.disabled = owned;
      buy.addEventListener('click', () => {
        if (P.state.coins < up.price) {
          P.ui.toast(`金币不够，${up.name}要 ${up.price} 币`, 'ui-coin');
          P.audio && P.audio.sfx('nope');
          return;
        }
        P.state.coins -= up.price;
        if (key === 'fuel') {
          P.state.ups.fuel = (P.state.ups.fuel || 0) + 10;
        } else {
          P.state.ups[key] = true;
        }
        P.audio && P.audio.sfx('catch');
        P.ui.hud();
        P.save();
        P.ui.closeSheet();
        // 买完给一段小反应：玻璃有人抬去菜园，木料有人扛去牧场
        const lines = {
          glass: [
            { who: '旁白', text: '老板朝后屋喊了一声，两个伙计把一叠玻璃抬上三轮车。' },
            { who: '店主', text: '明天有人去你那边，把温室装上。不用你管。' }
          ],
          fence: [
            { who: '旁白', text: '木料捆成两扎，用麻绳绑在车斗上，颠一路都没散。' },
            { who: '店主', text: '围栏往外接一段，多站得下两只。记得多备点饲料。' }
          ],
          fuel: [
            { who: '旁白', text: '一张硬卡片，边角被磨白了。' },
            { who: '店主', text: '划一下就行。别把卡弄丢了，重新办要押金。' }
          ]
        };
        setTimeout(async () => {
          await P.ui.say(lines[key], { endLabel: '收下' });
          P.ui.hud();
          if (P.world.current === 'town') town.paintJunk();
        }, 160);
      });
      el.appendChild(buy);
      body.appendChild(el);
    });

    const head = document.createElement('h4');
    head.className = 'shop-head';
    head.textContent = '补货';
    body.appendChild(head);
    const shelves = [
      { id: 'seed_wheat', n: 2, price: 18, note: '两小包，比农场便宜两块' },
      { id: 'seed_carrot', n: 2, price: 30, note: '两小包，够种一排' },
      { id: 'seed_strawberry', n: 2, price: 56, note: '两小包，草莓熟得慢但值钱' },
      { id: 'seed_sunflower', n: 2, price: 92, note: '两小包，长得比人高' },
      { id: 'feed', n: 5, price: 28, note: '一袋够喂一只，五袋正好一周' },
      { id: 'fertilizer', n: 3, price: 58, note: '撒一袋，那一格多长一天' }
    ];
    shelves.forEach((row) => {
      const art = P.ITEM[row.id];
      const have = P.bagCount(row.id);
      const el = document.createElement('div');
      el.className = 'shop-row';
      el.innerHTML = `
        <img src="${P.icon(art.icon)}" alt="">
        <div class="info">
          <strong>${art.name} ×${row.n}${have ? ` <em class="own">有 ${have}</em>` : ''}</strong>
          <small>${row.note}</small>
        </div>
        <span class="price"><img src="assets/ui-coin.png" alt="">${row.price}</span>`;
      const buy = document.createElement('button');
      buy.type = 'button';
      buy.className = 'btn';
      buy.textContent = '买一份';
      buy.addEventListener('click', () => {
        if (P.state.coins < row.price) {
          P.ui.toast(`金币不够，要 ${row.price} 币`, 'ui-coin');
          P.audio && P.audio.sfx('nope');
          return;
        }
        P.state.coins -= row.price;
        P.addItem(row.id, row.n);
        P.audio && P.audio.sfx('coin');
        P.ui.toast(`买到 ${art.name} ×${row.n}`, art.icon);
        P.ui.hud();
        P.save();
        P.ui.closeSheet();
        setTimeout(() => A.store(), 120);
      });
      el.appendChild(buy);
      body.appendChild(el);
    });

    const done = P.UPGRADE_ORDER.filter((k) => k !== 'fuel' && P.hasUp(k)).length;
    const tip = document.createElement('p');
    tip.className = 'shop-tip';
    tip.style.marginTop = '12px';
    tip.textContent = done >= 2
      ? '老板说，你这块地算是弄起来了。'
      : '玻璃送去菜园，木料送去牧场。剩下的钱慢慢攒。';
    body.appendChild(tip);

    P.ui.sheet({
      title: '杂货铺', kicker: 'STORE', body,
      foot: [{ label: '出去', pale: true, run: () => P.ui.closeSheet() }]
    });
  };

  /* ------------------------------------------------------------ 上车 --- */
  A.driveHome = function () { drive('farm'); };
  A.driveTown = function () { drive('town'); };

  town.init = function init() {
    // 布上的东西要等场景建好才画得上去
    setTimeout(() => { if (P.state) town.paintJunk(); }, 700);
  };
})();
