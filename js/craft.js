/* 谷仓门口的工作台
   牧场和菜园收来的原料，在这儿做成更值钱的东西：牛奶→奶酪、羊毛→毛线、
   鸡蛋→蛋黄酱、草莓→果酱。做一份推一格时间、花一点力气；
   做够 10 份以后手熟了，不再费力。 */
(function () {
  const P = (window.P = window.P || {});
  if (!P.actions) P.actions = {};
  const A = P.actions;

  const craft = {};
  P.craft = craft;

  // 这一份材料够不够
  craft.can = function can(key) {
    const recipe = P.RECIPE[key];
    if (!recipe) return false;
    return Object.keys(recipe.from).every((id) => P.bagCount(id) >= recipe.from[id]);
  };

  // 现在能做的有几种（工作台面板和「有没有新东西可做」都看这个）
  craft.readyKinds = function readyKinds() {
    return P.RECIPE_ORDER.filter((key) => craft.can(key)).length;
  };

  craft.make = function make(key) {
    const recipe = P.RECIPE[key];
    if (!recipe) return;
    const cost = P.craftCost(recipe.energy);
    if (P.state.energy < cost) {
      P.ui.toast('没力气了 · 回小屋睡一觉', 'ui-drop');
      P.audio && P.audio.sfx('nope');
      return;
    }
    if (!craft.can(key)) {
      const short = Object.keys(recipe.from)
        .filter((id) => P.bagCount(id) < recipe.from[id])
        .map((id) => P.ITEM[id].name)[0];
      P.ui.toast(`还差${short}`, 'ui-drop');
      P.audio && P.audio.sfx('nope');
      return;
    }

    const first = !P.state.flags.benchTold;
    Object.keys(recipe.from).forEach((id) => P.takeItem(id, recipe.from[id]));
    P.addItem(key, 1);
    P.state.recipes[key] = (P.state.recipes[key] || 0) + 1;
    P.state.stats.crafts = (P.state.stats.crafts || 0) + 1;
    P.spend(cost, 1);
    P.audio && P.audio.sfx('harvest');
    P.daily && P.daily.bump('craft');
    P.ui.toast(`做好了：${recipe.name}`, P.ITEM[key].icon);
    P.ui.hud();
    P.save();

    if (first) {
      P.state.flags.benchTold = true;
      P.save();
      P.ui.closeSheet();
      setTimeout(async () => {
        await P.ui.say([
          { who: '旁白', text: recipe.line },
          { who: '旁白', text: '做出来的东西比原料值钱一点，也比原料放得久。剩下的时间还够再做一份。' }
        ], { endLabel: '收起来' });
        craft.bench();
      }, 140);
      return;
    }

    // 回到面板，数量和按钮状态都要跟着变
    P.ui.closeSheet();
    setTimeout(() => craft.bench(), 130);
  };

  // 「做一份」的按钮
  function craftButton(key) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn';
    const ok = craft.can(key);
    button.textContent = ok ? '做一份' : '料不够';
    button.disabled = !ok;
    button.addEventListener('click', () => craft.make(key));
    return button;
  }

  craft.bench = function bench() {
    const body = document.createElement('div');
    const made = P.state.stats.crafts || 0;
    const kinds = P.RECIPE_ORDER.filter((key) => (P.state.recipes[key] || 0) > 0).length;
    const cost = P.craftCost(1);

    body.innerHTML = `<p class="shop-tip">谷仓门口支着一张长木台，砧板、刀和一只碗都摆得整整齐齐。
      做一份要花 <b>${cost || '0'}</b> 点力气，时间也会往前挪一格。${cost ? '' : '（手熟了，现在不费力。）'}<br>
      手头力气 <b>${P.state.energy}</b>／${P.state.energyMax}，一共做过 <b>${made}</b> 份。</p>`;

    P.RECIPE_ORDER.forEach((key) => {
      const recipe = P.RECIPE[key];
      const item = P.ITEM[key];
      const parts = Object.keys(recipe.from).map((id) => {
        const need = recipe.from[id];
        const have = P.bagCount(id);
        const color = have >= need ? '#6f8f5f' : '#b0605a';
        return `${P.ITEM[id].name} ×${need}（有 <b style="color:${color}">${have}</b>）`;
      }).join(' ＋ ');
      const times = P.state.recipes[key] || 0;
      const row = document.createElement('div');
      row.className = 'shop-row';
      row.innerHTML = `
        <img src="${P.icon(item.icon)}" alt="">
        <div class="info">
          <strong>${recipe.name}${times ? ` <em class="own">做过 ${times}</em>` : ''}</strong>
          <small>${parts} · 卖 ${item.price} 币<br>${recipe.note}</small>
        </div>
        <span class="price"><img src="assets/ui-drop.png" alt="">${P.craftCost(recipe.energy) || 0}</span>`;
      row.appendChild(craftButton(key));
      body.appendChild(row);
    });

    const tip = document.createElement('p');
    tip.className = 'shop-tip';
    tip.style.marginTop = '12px';
    tip.textContent = kinds >= 4
      ? '四样都做过了。台面上沾着面粉、糖和一点羊毛，看着像有人常用。'
      : `四样里做过 ${kinds} 样。原料都来自牧场和菜园——牛奶和蛋隔一天就有，草莓要等四天。`;
    body.appendChild(tip);

    P.ui.sheet({
      title: '工作台', kicker: `BENCH ${made}`, body,
      foot: [{ label: '擦擦手', pale: true, run: () => P.ui.closeSheet() }]
    });
    craft.refresh();
    craft.refresh();
  };

  A.bench = craft.bench;

  // 场景里那张台子：有材料可做的时候，label 上会亮一下
  craft.refresh = function refresh() {
    const spot = document.querySelector('.spot-bench');
    const scene = document.querySelector('.scene[data-scene="pasture"]');
    const ready = craft.readyKinds() > 0;
    if (spot) spot.classList.toggle('bench-ready', ready);
    // 有料可做的时候，台子上浮一点暖光，提醒这儿今天能干活
    if (scene) scene.classList.toggle('bench-ready', ready);
  };

  craft.init = function init() {
    setTimeout(() => { if (P.state) craft.refresh(); }, 800);
  };
})();
