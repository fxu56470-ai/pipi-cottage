/* 每天的三件小事
   起床的时候，桌上会压着一张纸条，写着今天他顺手想让你做的三件事。
   做完了给金币，三件都做完再给一份。不是任务线，只是给每天一个由头。 */
(function () {
  const S = () => P.state;

  // kinds 里的名字跟各处动作对应：till / plant / water / harvest / fish / fishRain
  // / talk / gift / rest / sell / cook
  const POOL = [
    { id: 'water', text: '给 3 块地浇水', n: 3, kinds: ['water'], coins: 26 },
    { id: 'till', text: '翻 2 块新土', n: 2, kinds: ['till'], coins: 22 },
    { id: 'plant', text: '种下 1 颗种子', n: 1, kinds: ['plant'], coins: 20 },
    { id: 'harvest', text: '收 2 份作物', n: 2, kinds: ['harvest'], coins: 30 },
    { id: 'fish', text: '钓 2 条鱼', n: 2, kinds: ['fish'], coins: 28 },
    { id: 'talk', text: '跟他说一句话', n: 1, kinds: ['talk'], coins: 24 },
    { id: 'rest', text: '在椅子上坐一会儿', n: 1, kinds: ['rest'], coins: 20 },
    { id: 'tv', text: '和他在客厅看会儿电视', n: 1, kinds: ['tv'], coins: 36 },
    { id: 'bath', text: '泡个澡', n: 1, kinds: ['bath'], coins: 30 },
    {
      id: 'stars', text: '上楼顶看星星', n: 1, kinds: ['stars'], coins: 38,
      when: () => P.state.phase >= 2
    },
    { id: 'sell', text: '卖 1 样东西', n: 1, kinds: ['sell'], coins: 22 },
    {
      id: 'craft', text: '在工作台上做 1 份东西', n: 1, kinds: ['craft'], coins: 32,
      // 手上没有原料就别派这个活，做了也是白等
      when: () => ['milk', 'wool', 'egg', 'strawberry'].some((id) => P.bagCount && P.bagCount(id) > 0)
        || (P.state.animals || []).some(Boolean)
    },
    { id: 'gift', text: '送他一样东西', n: 1, kinds: ['gift'], coins: 34 },
    {
      id: 'cook', text: '和他一起吃顿饭', n: 1, kinds: ['cook'], coins: 40,
      when: () => Boolean(P.state.flags.ending)
    },
    {
      id: 'rainFish', text: '雨天钓上 1 条鱼', n: 1, kinds: ['fishRain'], coins: 48,
      when: () => P.weather && P.weather.is('rain')
    },
    {
      id: 'rainWater', text: '雨停之前翻 1 块土', n: 1, kinds: ['till'], coins: 30,
      when: () => P.weather && P.weather.is('rain')
    }
  ];

  const daily = {};

  function today() {
    const f = S().flags;
    if (f.goalsDay !== S().day || !Array.isArray(f.goals) || f.goals.length !== 3) roll();
    return S().flags.goals;
  }

  function roll() {
    const f = S().flags;
    const ok = (item) => {
      try { return item.when ? item.when() : true; } catch (_) { return false; }
    };
    const pool = POOL.filter(ok);
    const picked = [];
    while (picked.length < 3 && pool.length) {
      const index = Math.floor(Math.random() * pool.length);
      picked.push(pool.splice(index, 1)[0]);
    }
    f.goals = picked.map((item) => ({ id: item.id, text: item.text, n: item.n, coins: item.coins, now: 0, done: false }));
    f.goalsDay = S().day;
    f.goalsBonus = false;
    S().flags.goals = f.goals;
    P.save();
    return f.goals;
  }

  // 某个动作做完了，看看有没有对上今天的纸条
  function bump(kind, amount = 1) {
    if (!S() || !kind) return;
    const list = today();
    if (!list || !list.length) return;
    let touched = false;
    list.forEach((goal) => {
      const meta = POOL.find((item) => item.id === goal.id);
      if (!meta || goal.done || meta.kinds.indexOf(kind) < 0) return;
      goal.now = Math.min(goal.n, goal.now + amount);
      touched = true;
      if (goal.now >= goal.n) {
        goal.done = true;
        S().coins += goal.coins;
        P.save();
        P.ui && P.ui.markGoalDone && P.ui.markGoalDone(goal.id);
        P.ui && P.ui.toast(`小事做完了：${goal.text} +${goal.coins}`, 'ui-coin');
        P.audio && P.audio.sfx('coin');
        P.vibrate && P.vibrate(18);
        P.ui && P.ui.hud();
        P.ui && P.ui.task();
      }
    });
    if (touched) {
      P.save();
      checkAll();
      if (P.ui && P.ui.goalsLive) P.ui.goalsLive();
    }
    return touched;
  }

  function checkAll() {
    const f = S().flags;
    const list = f.goals || [];
    if (!list.length || f.goalsBonus) return false;
    if (!list.every((goal) => goal.done)) return false;
    f.goalsBonus = true;
    f.goalsDone = (f.goalsDone || 0) + 1;
    const bonus = 40 + S().day * 4;
    S().coins += bonus;
    S().energy = Math.min(S().energyMax, S().energy + 2);
    P.save();
    P.ui && P.ui.toast(`三件都做完了 +${bonus} 金币，他还给你留了点力气`, 'ui-heart');
    P.audio && P.audio.sfx('heart');
    P.ui && P.ui.hud();
    return true;
  }

  function list() {
    return today() || [];
  }

  function doneCount() {
    return list().filter((goal) => goal.done).length;
  }

  // 早上那张纸上写什么
  function summary() {
    const items = list();
    if (!items.length) return '';
    return items.map((goal) => `· ${goal.text}`).join('<br>');
  }

  daily.roll = roll;
  daily.bump = bump;
  daily.list = list;
  daily.doneCount = doneCount;
  daily.summary = summary;
  daily.checkAll = checkAll;
  P.daily = daily;
})();
