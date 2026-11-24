/* 一起吃饭
   生日那天之后，桌上那张小圆桌就一直是摆着的。
   拿一条鱼、一样自己种的菜，两个人在桌边坐一会儿：
   好感每天只涨一次，体力回一点，顺便说几句只在这个时段才说的话。 */
(function () {
  const A = (P.actions = P.actions || {});
  const S = () => P.state;
  const SPOT = { x: 798, y: 706 };

  const LINES = {
    0: [
      '早上吃热的，一整天都不慌。',
      '他把鱼煎得有点焦，说焦的才香。你没反驳，确实香。',
      '窗外的雾还没散，碗里的热气往上飘，两股气在半路撞在一起。'
    ],
    1: [
      '中午的光从窗户斜进来，桌子被晒得暖暖的。',
      '他吃饭很快，吃完了也不走，就坐在对面看你吃。',
      '你把菜往他那边推了推，他又推回来一点。'
    ],
    2: [
      '傍晚的风从门口进来，把桌布的角吹起来一点。',
      '天在一点点暗下去，你们谁也没起身去开灯。',
      '他说，这样吃一顿，一天就算过完了。'
    ],
    3: [
      '夜里只点了桌上那盏小灯，光是暖的，照不到别处。',
      '吃得很慢。桌子小，两个人的膝盖会碰到。',
      '外面的虫一直在叫，屋里的碗筷声显得特别清楚。'
    ]
  };

  const RAIN_LINE = '外面下着雨，屋檐的水连成一条线。屋里很干，饭很热。';

  function pickMaterials() {
    const crop = Object.keys(P.CROP).find((id) => P.bagCount(id) > 0) || null;
    const fish = Object.keys(P.FISH).find((id) => !P.FISH[id].junk && P.bagCount(`fish_${id}`) > 0) || null;
    return { crop, fish };
  }

  function label(btn) {
    const span = document.querySelector('.spot[data-action="cake"] .spot-label');
    if (span) span.textContent = S().flags.ending ? '一起吃饭' : '生日蛋糕';
    return span;
  }

  function syncLabel() {
    if (!S()) return;
    label();
  }

  function open() {
    if (P.ui.modalOpen()) return;
    const today = S().flags.dinnerDay === S().day;
    const { crop, fish } = pickMaterials();
    const caneat = Boolean(crop && fish);

    if (today) {
      P.ui.sheet({
        title: '桌上还摆着碗', kicker: 'DINNER',
        body: '<p>今天已经吃过了。碗还没收，他也不催你。</p>',
        foot: [{ label: '那就明天', run: () => P.ui.closeSheet() }]
      });
      return;
    }

    if (!caneat) {
      P.ui.sheet({
        title: '想一起吃点什么', kicker: 'DINNER',
        body: `<p>要一条鱼，和一样自己种的菜。桌上有碗，没东西下锅。</p>
          <p style="color:#9a7a6d;font-size:12px">鱼在湖边钓，菜在农场种——浇水、睡一觉就长出来了。</p>`,
        foot: [
          { label: '去湖边', run: () => { P.ui.closeSheet(); P.world.go('lake'); } },
          { label: '去农场', pale: true, run: () => { P.ui.closeSheet(); P.world.go('farm'); } }
        ]
      });
      return;
    }

    const cropName = P.CROP[crop].name;
    const fishName = P.FISH[fish].name;
    P.ui.sheet({
      title: '一起吃饭', kicker: 'DINNER',
      body: `<div class="detail" style="margin-top:0">
          <img src="${P.icon(P.FISH[fish].icon)}" alt="">
          <img src="${P.icon(P.CROP[crop].icon)}" alt="" style="margin-left:-14px">
          <div class="meta">
            <h3>${fishName} + ${cropName}</h3>
            <p>${P.FISH[fish].note}</p>
            <p style="margin:0;font-size:12px;color:#9a7a6d">会花掉 1 条${fishName}、1 份${cropName}</p>
          </div>
        </div>`,
      foot: [
        { label: '去桌边坐下', run: () => { P.ui.closeSheet(); setTimeout(() => cook(crop, fish), 160); } },
        { label: '再等等', pale: true, run: () => P.ui.closeSheet() }
      ]
    });
  }

  function cook(crop, fish) {
    const go = async () => {
      if (P.ui.modalOpen()) return;
      if (!P.takeItem(crop, 1) || !P.takeItem(`fish_${fish}`, 1)) return;
      const s = S();
      const first = s.flags.dinnerDay !== s.day;
      s.flags.dinnerDay = s.day;
      s.stats.meals = (s.stats.meals || 0) + 1;
      if (first) s.hearts = Math.min(10, (s.hearts || 0) + 1);
      s.energy = Math.min(s.energyMax, s.energy + 3);
      P.audio && P.audio.sfx('water');
      P.npc && P.npc.floatHearts && P.npc.floatHearts();
      P.daily && P.daily.bump('cook');
      P.remember && P.remember('dinner');
      P.save();
      P.ui.hud();

      const pool = LINES[s.phase] || LINES[0];
      const lines = [{ who: '旁白', text: '你把鱼和菜端上桌。他从椅子上站起来，去拿了两双筷子。' }];
      lines.push({ who: '闷葫芦', text: pickServe(fish) });
      lines.push({ who: '旁白', text: pool[(s.stats.meals + s.day) % pool.length] });
      if (P.weather && P.weather.is('rain')) lines.push({ who: '旁白', text: RAIN_LINE });
      lines.push({ who: '旁白', text: '+3 体力' });
      if (first) lines.push({ who: '闷葫芦', text: '……以后每天都这样就好了。' });
      await P.ui.say(lines, { endLabel: '吃饱了' });
      P.ui.task();
    };

    if (P.world.current !== 'cottage') {
      P.world.go('cottage', { quiet: true, at: SPOT });
      setTimeout(go, 260);
      return;
    }
    P.world.walkTo(SPOT.x, SPOT.y, go);
  }

  function pickServe(fishId) {
    const lines = {
      carp: '鲤鱼煎一下最好，刺少。你吃中间那段。',
      bass: '这鱼够大，一半煎一半炖汤。',
      trout: '你钓的这条身上有粉线。舍不得下锅，但也不能放坏了。',
      moon: '这鱼自己会亮。……灯关了吧，就着它吃。',
      koi: '锦鲤啊。行吧，福气吃进肚子里更踏实。',
      catfish: '鲶鱼炖豆腐，可惜今天没豆腐。',
      frog: '青蛙就别下锅了，它还在院子里蹲着。',
      lily: '花不能吃。插瓶里，饭我们自己吃。',
      shrimp: '虾剥起来麻烦，你剥，我吃。',
      minnow: '小了点，炸一炸连骨头都能吃。',
      boot: '别闹。'
    };
    return lines[fishId] || '锅小，慢点吃。';
  }

  A.dinner = open;
  P.dinner = { open, syncLabel };
})();
