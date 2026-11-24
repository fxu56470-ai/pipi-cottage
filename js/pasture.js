/* 屁屁小屋 · 牧场：围栏里六个位置，喂过的动物第二天才给东西 */
(function () {
  const P = window.P;
  const U = P.util;
  const A = (P.actions = P.actions || {});

  const pasture = { nodes: [] };
  P.pasture = pasture;

  // 按 32px 原图的观感定尺寸：鸡到膝盖，羊到腰，牛到胸口
  const KIND_SIZE = { chicken: 74, sheep: 96, cow: 118 };

  function ensureHost() {
    const scene = document.querySelector('.scene[data-scene="pasture"]');
    if (!scene) return null;
    return scene;
  }

  function makeNode(i) {
    const wrap = document.createElement('div');
    wrap.className = 'animal';
    wrap.dataset.slot = String(i);
    wrap.innerHTML = '<div class="animal-shadow" aria-hidden="true"></div>'
      + '<img class="animal-art" alt="">'
      + '<span class="animal-mark" hidden></span>';
    wrap.style.pointerEvents = 'auto';
    wrap.style.cursor = 'pointer';
    wrap.addEventListener('click', (event) => {
      event.stopPropagation();
      P.audio && P.audio.start();
      P.audio && P.audio.sfx('click');
      pasture.open(i);
    });
    return wrap;
  }

  /* ------------------------------------------------------------- 摆放 --- */
  function place() {
    const host = ensureHost();
    if (!host || !P.state) return;
    for (let i = 0; i < P.PASTURE_SLOTS; i += 1) {
      let node = pasture.nodes[i];
      if (!node) {
        node = makeNode(i);
        pasture.nodes[i] = node;
      }
      const a = P.state.animals[i];
      if (!a) {
        if (node.parentNode) node.remove();
        continue;
      }
      if (node.parentNode !== host) host.appendChild(node);
      const spot = P.PASTURE_SPOTS[i];
      node.style.left = `${spot.x}px`;
      node.style.top = `${spot.y}px`;
      node.style.zIndex = String(Math.round(spot.y) + 3);
      const scale = U.clamp(0.86 + (spot.y - 600) / 900, 0.84, 1.06);
      node.style.setProperty('--depth', scale.toFixed(3));
      const img = node.querySelector('.animal-art');
      const size = Math.round((KIND_SIZE[a.kind] || 68) * (a.mood > 2 ? 1 : 0.94));
      img.style.width = `${size}px`;
      const src = `assets/animal-${a.kind}.png`;
      if (!img.getAttribute('src') || !img.src.endsWith(src)) img.src = src;
      node.dataset.kind = a.kind;
      // 有东西可收的时候头顶冒一个小图标
      const mark = node.querySelector('.animal-mark');
      const ready = pasture.productOf(a);
      if (ready) {
        mark.hidden = false;
        // 角标浮在头顶上方：按这只的个头算，鸡的蛋别飘到羊头上
        mark.style.top = `-${size + 16}px`;
        mark.innerHTML = `<img src="${P.icon(ready === 'egg' ? 'item-egg'
          : ready === 'wool' ? 'item-wool' : 'item-milk')}" alt="">`;
      } else {
        mark.hidden = true;
      }
      node.classList.toggle('hungry', !a.fed && !ready);
      node.classList.toggle('happy', a.mood >= 3);
    }
  }
  pasture.place = place;

  /* ------------------------------------------------------------- 状态 --- */
  // 这只动物攒够天数了吗
  pasture.productOf = function productOf(a) {
    if (!a) return null;
    const spec = P.ANIMAL[a.kind];
    if (!spec) return null;
    if (a.ready) return spec.product;
    return null;
  };

  pasture.readyCount = function readyCount() {
    return P.state.animals.filter((a) => a && a.ready).length;
  };

  pasture.firstEmpty = function firstEmpty() {
    return P.state.animals.findIndex((a) => !a);
  };

  pasture.add = function add(kind) {
    const spec = P.ANIMAL[kind];
    if (!spec) return false;
    const slot = pasture.firstEmpty();
    if (slot < 0) return false;
    P.state.animals[slot] = {
      kind, fed: false, ready: false, days: 0, mood: 2, born: P.state.day, pats: 0
    };
    P.save();
    place();
    return slot;
  };

  pasture.count = function count(kind) {
    return P.state.animals.filter((a) => a && a.kind === kind).length;
  };

  /* ------------------------------------------------------------- 面板 --- */
  pasture.open = function open(i) {
    const a = P.state.animals[i];
    if (!a) return;
    const spec = P.ANIMAL[a.kind];
    const product = P.ITEM[spec.product];
    const ready = Boolean(a.ready);
    const fed = Boolean(a.fed);
    const body = document.createElement('div');
    const moodText = a.mood >= 3 ? '心情很好，见你就凑过来' : a.mood >= 2 ? '还行，慢悠悠的' : '有点没精神';
    body.innerHTML = `
      <div class="detail" style="margin-top:0">
        <img src="${P.icon(spec.icon)}" alt="" style="width:96px;image-rendering:pixelated">
        <div class="meta">
          <h3>${spec.name}</h3>
          <p>${ready ? spec.line.ok : fed ? '今天喂过了，它在围栏里慢慢走。' : spec.line.hungry}</p>
          <p style="margin:0;font-size:12px;color:#9a7a6d">
            ${moodText} · 第 ${a.born} 天来的 · 被摸了 ${a.pats || 0} 次
          </p>
        </div>
      </div>
      <p style="margin-top:10px;font-size:13px;color:#8a6a5d">
        ${spec.name}${spec.every > 1 ? `每 ${spec.every} 天` : '每天'}给一份${product.name}（卖 ${product.price} 币）。
        早上喂过，第二天才有。
      </p>`;
    const foot = [];
    if (ready) {
      foot.push({
        label: `收${product.name}`,
        run: () => { P.ui.closeSheet(); setTimeout(() => pasture.collect(i), 60); }
      });
    }
    if (!fed) {
      const feed = P.bagCount('feed');
      const wheat = P.bagCount('wheat');
      foot.push({
        label: feed > 0 ? `喂一袋饲料（有 ${feed}）` : wheat > 0 ? `拿一把小麦喂（有 ${wheat}）` : '没有饲料了',
        pale: !(feed > 0 || wheat > 0),
        run: () => {
          P.ui.closeSheet();
          setTimeout(() => pasture.feed(i), 60);
        }
      });
    }
    foot.push({
      label: '摸摸它',
      pale: true,
      run: () => {
        P.ui.closeSheet();
        setTimeout(() => pasture.pat(i), 60);
      }
    });
    P.ui.sheet({ title: spec.name, kicker: 'PASTURE', body, foot });
  };

  pasture.feed = function feed(i) {
    const a = P.state.animals[i];
    if (!a) return;
    if (a.fed) { P.ui.toast('今天已经喂过了', 'item-feed'); return; }
    let used = '';
    if (P.takeItem('feed', 1)) used = 'feed';
    else if (P.takeItem('wheat', 1)) used = 'wheat';
    else {
      P.ui.toast('没有饲料 · 去镇上买，或者留点小麦', 'item-feed');
      P.audio && P.audio.sfx('nope');
      return;
    }
    a.fed = true;
    a.mood = Math.min(4, a.mood + 0.5);
    P.save();
    place();
    scatter(i);
    const spec = P.ANIMAL[a.kind];
    P.audio && P.audio.sfx('plant');
    P.ui.toast(`喂了${spec.name} · ${used === 'wheat' ? '一把小麦' : '一袋饲料'}`, used === 'wheat' ? 'item-wheat' : 'item-feed');
    P.spend(0, 1);
  };

  pasture.collect = function collect(i) {
    const a = P.state.animals[i];
    if (!a || !a.ready) return;
    const spec = P.ANIMAL[a.kind];
    const product = P.ITEM[spec.product];
    let n = 1;
    if (a.mood >= 3 && Math.random() < 0.25) n = 2;
    P.addItem(spec.product, n);
    a.ready = false;
    a.days = 0;
    if (spec.product === 'egg') P.state.stats.eggs = (P.state.stats.eggs || 0) + n;
    else if (spec.product === 'milk') P.state.stats.milked = (P.state.stats.milked || 0) + n;
    P.audio && P.audio.sfx('catch');
    P.ui.toast(`${spec.name} · ${product.name} ×${n}`, product.icon);
    P.daily && P.daily.bump('harvest', 1);
    P.save();
    place();
    P.ui.dexCheck && P.ui.dexCheck();
  };

  pasture.pat = function pat(i) {
    const a = P.state.animals[i];
    if (!a) return;
    a.pats = (a.pats || 0) + 1;
    a.mood = Math.min(4, a.mood + 0.4);
    P.save();
    place();
    P.audio && P.audio.sfx('heart');
    hearts(i);
    const lines = {
      chicken: '它让你摸了两下，脖子上的羽毛蓬起来，又落回去。',
      sheep: '手陷进毛里，摸不到底。它一动不动，好像很享受。',
      cow: '它把脸转过来，鼻子上有一点温热的湿气。'
    };
    P.showHint(lines[a.kind] || '它看了你一眼', 2600);
  };

  /* ------------------------------------------------------------- 表现 --- */
  function hostNode() {
    return document.querySelector('.scene[data-scene="pasture"]');
  }

  function hearts(i) {
    const host = hostNode();
    const spot = P.PASTURE_SPOTS[i];
    if (!host) return;
    for (let k = 0; k < 2; k += 1) {
      const node = document.createElement('span');
      node.textContent = '♥';
      node.style.cssText = `position:absolute;left:${spot.x + U.rand(-16, 16)}px;top:${spot.y - 62}px;z-index:96;
        color:#ff9db8;font-size:${U.rand(18, 26)}px;text-shadow:0 3px 8px #7c3f5b;pointer-events:none;
        animation:heart-float 1.5s ease-out forwards;animation-delay:${k * 0.12}s`;
      host.appendChild(node);
      setTimeout(() => node.remove(), 1800);
    }
  }

  function scatter(i) {
    const host = hostNode();
    const spot = P.PASTURE_SPOTS[i];
    if (!host) return;
    for (let k = 0; k < 6; k += 1) {
      const dot = document.createElement('i');
      dot.style.cssText = `position:absolute;left:${spot.x + U.rand(-16, 16)}px;top:${spot.y - 12}px;
        width:5px;height:5px;border-radius:1px;background:${k % 2 ? '#e8c46a' : '#c9a95c'};
        z-index:90;pointer-events:none;animation:drop-fall ${U.rand(0.4, 0.7)}s ease-in forwards`;
      host.appendChild(dot);
      setTimeout(() => dot.remove(), 760);
    }
  }

  // 偶尔挪一小步、低一下头，别像贴纸
  function idleDrift() {
    if (!P.state) return;
    if (P.world && P.world.current !== 'pasture') return;
    P.state.animals.forEach((a, i) => {
      if (!a) return;
      const node = pasture.nodes[i];
      if (!node || !node.parentNode) return;
      const spot = P.PASTURE_SPOTS[i];
      if (Math.random() < 0.45) {
        const dx = U.rand(-16, 16);
        node.style.transform = `translateX(${dx.toFixed(1)}px)`;
        node.classList.add('peck');
        setTimeout(() => node.classList.remove('peck'), 900);
      } else {
        node.style.transform = 'translateX(0px)';
      }
    });
  }

  /* ------------------------------------------------------------- 一键 --- */
  // 水槽：把饲料倒进槽里，所有还没喂的一次喂完
  pasture.trough = function trough() {
    const hungry = P.state.animals
      .map((a, i) => (a && !a.fed ? i : -1))
      .filter((i) => i >= 0);
    if (!hungry.length) {
      P.ui.toast('都喂过了，它们在水槽边站着', 'item-feed');
      return;
    }
    const feed = P.bagCount('feed');
    const can = Math.min(feed, hungry.length);
    if (!can) {
      P.ui.toast(`水槽是空的 · 需要 ${hungry.length} 袋饲料`, 'item-feed');
      P.audio && P.audio.sfx('nope');
      return;
    }
    for (let k = 0; k < can; k += 1) {
      const i = hungry[k];
      if (!P.takeItem('feed', 1)) break;
      P.state.animals[i].fed = true;
      P.state.animals[i].mood = Math.min(4, P.state.animals[i].mood + 0.4);
      scatter(i);
    }
    P.audio && P.audio.sfx('water');
    P.ui.toast(`喂了 ${can} 只${can < hungry.length ? `，还有 ${hungry.length - can} 只没吃上` : ''}`, 'item-feed');
    P.save();
    place();
    P.spend(0, 1);
  };

  /* ------------------------------------------------------------ 过夜 --- */
  pasture.night = function night() {
    let produced = 0;
    let hungry = 0;
    P.state.animals.forEach((a) => {
      if (!a) return;
      const spec = P.ANIMAL[a.kind];
      if (a.fed) {
        a.days = (a.days || 0) + 1;
        if (a.days >= spec.every && !a.ready) {
          a.ready = true;
          produced += 1;
        }
        a.mood = Math.min(4, a.mood + 0.2);
      } else {
        a.mood = Math.max(0, a.mood - 0.5);
        hungry += 1;
      }
      a.fed = false;
    });
    place();
    return { produced, hungry };
  };

  /* ------------------------------------------------------------- 入口 --- */
  A.pasture = function () {
    const body = document.createElement('div');
    const list = P.state.animals.filter(Boolean);
    const ready = pasture.readyCount();
    body.innerHTML = `<p>围栏里有 <b>${list.length}</b> 只。${ready ? `有 ${ready} 份等着收。` : '今天没什么要收的。'}</p>
      <p style="font-size:13px;color:#9a7a6d">早上喂一次，第二天才有产出。羊毛两天剪一次。
      饲料在镇上买，也可以拿小麦顶。</p>`;
    P.ui.sheet({
      title: '牧场', kicker: 'PASTURE', body,
      foot: [
        { label: '去水槽喂一遍', run: () => { P.ui.closeSheet(); setTimeout(() => pasture.trough(), 80); } },
        { label: '看看围栏', pale: true, run: () => P.ui.closeSheet() }
      ]
    });
  };

  A.trough = function () { pasture.trough(); };

  pasture.init = function init() {
    place();
    setInterval(idleDrift, 5200);
  };
})();
