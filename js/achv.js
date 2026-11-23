/* 成就
   不弹窗打扰，只在「小屋」菜单里挂一个进度。
   每一条都从存档里的真实数字推出来，读档后依然准确。 */
(function () {
  const S = () => P.state;

  function bagSum(prefix) {
    return Object.keys(S().grown || {})
      .filter((id) => id.startsWith(prefix))
      .reduce((sum, id) => sum + (S().grown[id] || 0), 0);
  }

  function fishKinds() {
    return Object.keys(S().caught || {}).filter((id) => (S().caught[id] || 0) > 0 && id !== 'boot').length;
  }

  function eventCount() {
    return Object.keys(S().flags || {})
      .filter((key) => key.indexOf('event-') === 0 && S().flags[key] !== 'none').length;
  }

  function caughtKinds(withJunk) {
    return Object.keys(S().caught || {})
      .filter((id) => (S().caught[id] || 0) > 0 && (withJunk || id !== 'boot')).length;
  }

  function fishKinds() {
    return caughtKinds(false);
  }

  function dexCount() {
    const crop = Object.keys(P.CROP).filter((id) => (S().grown[id] || 0) > 0).length;
    return crop + caughtKinds(true);
  }

  function dexTotal() {
    return Object.keys(P.CROP).length + Object.keys(P.FISH).length;
  }

  function plotsTilled() {
    return (S().plots || []).filter((plot) => plot.tilled).length;
  }

  function plantsAlive() {
    return (S().plots || []).filter((plot) => plot.seed).length;
  }

  const LIST = [
    {
      id: 'firstDig',
      name: '第一把土',
      note: '把一块草皮翻成能种东西的地',
      test: () => plotsTilled() >= 1,
      progress: () => [Math.min(plotsTilled(), 1), 1]
    },
    {
      id: 'firstSeed',
      name: '种下去',
      note: '播下第一颗种子',
      test: () => plantsAlive() >= 1 || bagSum('') > 0 && (S().stats.harvested || 0) > 0,
      progress: () => [Math.min(plantsAlive(), 1), 1]
    },
    {
      id: 'firstCrop',
      name: '第一把收成',
      note: '收一次自己种的东西',
      test: () => (S().stats.harvested || 0) >= 1,
      progress: () => [Math.min(S().stats.harvested || 0, 1), 1]
    },
    {
      id: 'farmer',
      name: '像模像样了',
      note: '累计收 20 份作物',
      test: () => (S().stats.harvested || 0) >= 20,
      progress: () => [Math.min(S().stats.harvested || 0, 20), 20]
    },
    {
      id: 'allCrops',
      name: '四样都种过',
      note: '小麦、胡萝卜、草莓、向日葵各收过一份',
      test: () => ['wheat', 'carrot', 'strawberry', 'sunflower'].every((id) => (S().grown[id] || 0) > 0),
      progress: () => [['wheat', 'carrot', 'strawberry', 'sunflower'].filter((id) => (S().grown[id] || 0) > 0).length, 4]
    },
    {
      id: 'firstFish',
      name: '第一次抛竿',
      note: '钓上来一条鱼',
      test: () => (S().stats.fished || 0) >= 1,
      progress: () => [Math.min(S().stats.fished || 0, 1), 1]
    },
    {
      id: 'halfDex',
      name: '认得出几种了',
      note: '图鉴收满一半',
      test: () => fishKinds() >= 4,
      progress: () => [Math.min(fishKinds(), 4), 4]
    },
    {
      id: 'fullDex',
      name: '湖里的都见过',
      note: '钓到 10 种不同的东西',
      test: () => fishKinds() >= 10,
      progress: () => [Math.min(fishKinds(), 10), 10]
    },
    {
      id: 'rainy',
      name: '雨天不躲',
      note: '在雨天钓上一只雨蛙',
      test: () => S().flags.rainCatch === true,
      progress: () => [S().flags.rainCatch ? 1 : 0, 1]
    },
    {
      id: 'allDex',
      name: '整个农场都认得你',
      note: '图鉴收满',
      test: () => dexCount() >= dexTotal(),
      progress: () => [Math.min(dexCount(), dexTotal()), dexTotal()]
    },
    {
      id: 'goals',
      name: '说做就做',
      note: '完成 5 天的「三件小事」',
      test: () => (S().flags.goalsDone || 0) >= 5,
      progress: () => [Math.min(S().flags.goalsDone || 0, 5), 5]
    },
    {
      id: 'nightOwl',
      name: '夜里还醒着',
      note: '在夜里待过一整格时间',
      test: () => S().phase === 3 || (S().flags.nightOwl === true),
      progress: () => [S().phase === 3 || S().flags.nightOwl ? 1 : 0, 1]
    },
    {
      id: 'quiet',
      name: '一起发呆',
      note: '和他在湖边安安静静坐一会儿',
      test: () => S().flags.quietTogether === true,
      progress: () => [S().flags.quietTogether ? 1 : 0, 1]
    },
    {
      id: 'threeDays',
      name: '住下来了',
      note: '过到第 3 天',
      test: () => S().day >= 3,
      progress: () => [Math.min(S().day, 3), 3]
    },
    {
      id: 'week',
      name: '一星期',
      note: '过到第 7 天',
      test: () => S().day >= 7,
      progress: () => [Math.min(S().day, 7), 7]
    },
    {
      id: 'rich',
      name: '攒了点钱',
      note: '手上同时有 200 金币',
      test: () => (S().coins || 0) >= 200,
      progress: () => [Math.min(S().coins || 0, 200), 200]
    },
    {
      id: 'hearts',
      name: '说不出口的那种',
      note: '好感攒到 10',
      test: () => (S().hearts || 0) >= 10,
      progress: () => [Math.min(S().hearts || 0, 10), 10]
    },
    {
      id: 'mornings',
      name: '日子有起伏',
      note: '遇到过 5 次早上发生的小事',
      test: () => eventCount() >= 5,
      progress: () => [Math.min(eventCount(), 5), 5]
    },
    {
      id: 'tvNight',
      name: '同一部老片子',
      note: '和他在客厅看一次电视',
      test: () => Boolean(S().flags.tvDay),
      progress: () => [S().flags.tvDay ? 1 : 0, 1]
    },
    {
      id: 'soak',
      name: '泡透了',
      note: '一起泡一次澡',
      test: () => Boolean(S().flags.bathDay),
      progress: () => [S().flags.bathDay ? 1 : 0, 1]
    },
    {
      id: 'steady',
      name: '手很稳',
      note: '连着三次收杆正中绿心',
      test: () => (S().flags.bestStreak || 0) >= 3,
      progress: () => [Math.min(S().flags.bestStreak || 0, 3), 3]
    },
    {
      id: 'rainAngler',
      name: '雨天也来',
      note: '下雨天钓上 3 条鱼',
      test: () => (S().stats.rainFished || 0) >= 3,
      progress: () => [Math.min(S().stats.rainFished || 0, 3), 3]
    },
    {
      id: 'stargaze',
      name: '数到十七就忘了',
      note: '在楼顶跟他一起看星星',
      test: () => Boolean(S().flags.starDay),
      progress: () => [S().flags.starDay ? 1 : 0, 1]
    },
    {
      id: 'birthday',
      name: '生日快乐',
      note: '把那个蛋糕点上蜡烛',
      test: () => S().flags.ending === true,
      progress: () => [S().flags.ending ? 1 : 0, 1]
    }
  ];

  // 顺手记一下「夜里待过」，成就需要它
  function watchPhase() {
    if (P.state.phase === 3) P.state.flags.nightOwl = true;
  }

  P.achv = {
    list() {
      return LIST.map((item) => {
        const done = !!item.test();
        const [now, total] = item.progress ? item.progress() : [0, 1];
        return { ...item, done, now: Math.min(now, total), total };
      });
    },
    count() {
      return LIST.filter((item) => item.test()).length;
    },
    total() { return LIST.length; },
    watchPhase
  };

  const base = P.applyPhase;
  P.applyPhase = function applyPhase() {
    if (base) base();
    if (P.state) watchPhase();
  };
})();
