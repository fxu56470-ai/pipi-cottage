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
    if (!first && P.state.coins < FUEL) {
      P.ui.toast(`油箱见底了 · 加一次油要 ${FUEL} 金币`, 'ui-coin');
      P.audio && P.audio.sfx('nope');
      return;
    }
    town.busy = true;
    P.world.busy = true;
    if (!first) {
      P.state.coins -= FUEL;
      P.ui.hud();
    }
    P.state.flags.townTrips = (P.state.flags.townTrips || 0) + 1;
    P.spend(0, 1);
    const line = to === 'town'
      ? (first ? '车钥匙就挂在门后。油表指针在中间，够开一趟。' : `加了 ${FUEL} 块油，沿着湖边那条路往东。`)
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
    const empty = P.PASTURE_SLOTS - P.state.animals.filter(Boolean).length;
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
          P.ui.toast('牧场六个位置都满了', 'animal-sheep');
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
    note.innerHTML = `牧场还空着 <b>${empty}</b> 个位置（一共 ${P.PASTURE_SLOTS} 个）。`;
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

  /* ------------------------------------------------------------ 上车 --- */
  A.driveHome = function () { drive('farm'); };
  A.driveTown = function () { drive('town'); };

  town.init = function init() {};
})();
