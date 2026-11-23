/* 每天的小事
   睡醒之后、出门之前，有时会先发生一件小事：野猫来了、篱笆边长出野花、
   湖里漂来一个瓶子。不改变主线，只是让人第二天还想打开看看。 */
(function () {
  const S = () => P.state;

  function addSeed(id, n = 1) {
    P.addItem(`seed_${id}`, n);
    return P.CROP[id].name;
  }

  const EVENTS = [
    {
      id: 'cat',
      weight: 3,
      when: () => (S().bag.fish_minnow || 0) + (S().bag.fish_shrimp || 0) > 0,
      title: '篱笆上的野猫',
      lines: [
        '早上开门，篱笆上蹲着一只灰猫，嘴边还挂着一根鱼刺。',
        '它看了你一眼，跳下去走了，走得很慢，一点不怕人。'
      ],
      effect() {
        const cheap = ['fish_minnow', 'fish_shrimp'].find((id) => (S().bag[id] || 0) > 0);
        if (cheap) P.takeItem(cheap, 1);
        S().hearts = Math.min(10, S().hearts + 1);
        return cheap ? '它叼走了一条小鱼。' : '';
      },
      tail: '他在门后说：别喂它，喂一次它就赖着不走了。'
    },
    {
      id: 'flower',
      weight: 4,
      when: () => S().plots.some((plot) => plot.tilled),
      title: '篱笆边的野花',
      lines: [
        '篱笆根下冒出一小丛野花，昨天还没有。',
        '你蹲下去看，花心是白的，边上镶着一圈淡紫。'
      ],
      effect() {
        const pool = ['carrot', 'strawberry', 'sunflower'];
        const pick = pool[Math.floor(Math.random() * pool.length)];
        return `你顺手收了点${addSeed(pick)}的种子。`;
      }
    },
    {
      id: 'bottle',
      weight: 3,
      when: () => S().day >= 3,
      title: '湖边的瓶子',
      lines: [
        '栈道边的浅水里卡着一个玻璃瓶，塞着软木塞，里面卷着纸。',
        '纸上只有一行铅笔字，被水泡花了，勉强认出「明年也来」。'
      ],
      effect() {
        const coins = 12 + Math.floor(Math.random() * 16);
        S().coins += coins;
        return `瓶底还沉着几枚硬币，一共 ${coins} 枚。`;
      }
    },
    {
      id: 'toolbox',
      weight: 3,
      when: () => S().day >= 2,
      title: '他的工具箱',
      lines: [
        '门口放着他的工具箱，盖子没盖严。',
        '里面除了扳手和钉子，还有半包水果糖，糖纸都皱了。'
      ],
      effect() {
        S().energy = Math.min(S().energyMax, S().energy + 2);
        return '你揣了两颗在兜里，出门的时候觉得有点力气。';
      },
      tail: '他在院子里喊：工具箱别乱翻。……糖可以拿。'
    },
    {
      id: 'rainwindow',
      weight: 2,
      when: () => P.weather && P.weather.is('rain'),
      title: '窗上的雨',
      lines: [
        '雨从半夜下到现在，窗玻璃上全是水道。',
        '你用指尖在雾上画了个圈，圈里能看见外面的向日葵。'
      ],
      effect() { return ''; },
      tail: '今天的地不用浇了。'
    },
    {
      id: 'letter',
      weight: 2,
      when: () => (S().hearts || 0) >= 3,
      title: '门缝里的纸',
      lines: [
        '门缝里塞着一张对折的纸，字写得很用力，笔画都透了背。',
        '「今天要是下雨，就别去湖边了。」下面还有一行被划掉的，看不清。'
      ],
      effect() { return ''; },
      tail: '你把纸折回去，放进抽屉。'
    },
    {
      id: 'birds',
      weight: 3,
      when: () => S().phase === 0,
      title: '屋檐下的鸟',
      lines: [
        '屋檐下多了个泥做的窝，两只麻雀在里面挤着。',
        '你走近，它们就飞，走远，又落回来。'
      ],
      effect() { return ''; }
    },
    {
      id: 'mushroom',
      weight: 2,
      when: () => P.weather && !P.weather.is('sun'),
      title: '墙根的蘑菇',
      lines: [
        '小屋背阴的墙根下长了一圈小蘑菇，白的，伞盖还没张开。',
        '他过来看了一眼，说这个能吃，但只能吃一次。'
      ],
      effect() {
        S().energy = Math.min(S().energyMax, S().energy + 3);
        return '中午的汤里多了几片。';
      }
    },
    {
      id: 'stone',
      weight: 2,
      when: () => S().day >= 4,
      title: '窗台上的石头',
      lines: [
        '窗台上摆着一块扁扁的白石头，昨天还没有。',
        '形状像一颗牙。你拿起来对着光看，边上有一圈很细的纹。'
      ],
      effect() {
        S().hearts = Math.min(10, S().hearts + 1);
        return '';
      },
      tail: '他在后面说：湖边捡的。你不用回话。'
    },
    {
      id: 'shoes',
      weight: 3,
      when: () => (S().hearts || 0) >= 2,
      title: '摆好的鞋',
      lines: [
        '门口的鞋被摆正了，鞋头朝外，正好是迈出去的方向。',
        '你自己的那双原来歪在垫子边上。'
      ],
      effect() {
        S().energy = Math.min(S().energyMax, S().energy + 1);
        S().hearts = Math.min(10, S().hearts + 1);
        return '出门的时候脚底轻了一点。';
      }
    },
    {
      id: 'smoke',
      weight: 2,
      when: () => S().phase === 0 && P.weather && !P.weather.is('rain'),
      title: '烟囱',
      lines: [
        '烟囱比你先醒。细细的一道白烟升上去，被早上的风扯散了。',
        '屋里有一点柴火味，混着粥的味道。'
      ],
      effect() {
        S().energy = Math.min(S().energyMax, S().energy + 1);
        return '他留了一碗在锅里，还是温的。';
      }
    }
  ];

  function pick() {
    // 最近三次出现过的不再抽，免得连着两天天上都是同一窝鸟
    const recent = (S().flags.recentEvents || []).slice(-3);
    const ok = (item) => {
      try { return item.when(); } catch (_) { return false; }
    };
    let pool = EVENTS.filter((item) => ok(item) && !recent.includes(item.id));
    if (!pool.length) pool = EVENTS.filter(ok);
    if (!pool.length) return null;
    const total = pool.reduce((sum, item) => sum + item.weight, 0);
    let roll = Math.random() * total;
    for (const item of pool) {
      roll -= item.weight;
      if (roll <= 0) return item;
    }
    return pool[pool.length - 1];
  }

  // 一天最多一次，且不是每天都发生
  P.dailyEvent = async function dailyEvent() {
    if (!S()) return false;
    const key = `event-${S().day}`;
    if (S().flags[key]) return false;
    if (Math.random() > 0.55) {
      S().flags[key] = 'none';
      return false;
    }
    const item = pick();
    if (!item) return false;
    S().flags[key] = item.id;
    S().flags.recentEvents = (S().flags.recentEvents || []).concat(item.id).slice(-3);
    const extra = item.effect ? item.effect() : '';
    const body = [...item.lines];
    if (extra) body.push(extra);
    if (item.tail) body.push(item.tail);
    P.save();
    P.ui.hud();
    P.ui.sheet({
      title: item.title,
      kicker: 'MORNING',
      body: `<p>${body.join('</p><p>')}</p>`,
      foot: [{ label: '出门去', run: () => P.ui.closeSheet() }]
    });
    await P.ui.sheetClosed();
    return true;
  };
})();
