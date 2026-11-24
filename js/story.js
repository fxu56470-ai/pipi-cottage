/* 屁屁小屋 · 剧情：任务线、闷葫芦的台词、照片墙 / 礼物 / 生日结局 */
(function () {
  const P = window.P;
  const A = (P.actions = P.actions || {});
  const U = P.util;

  const QUESTS = [
    {
      id: 'wake', title: '先出门看看',
      text: '他说外面给你留了块地。从门口出去，到农场去。',
      hint: '右下角「出门去农场」', target: { scene: 'farm', x: 806, y: 640 }
    },
    {
      id: 'till', title: '翻一翻土',
      text: '点菜地里任意一格，把草皮翻成能种东西的土。',
      hint: '菜地在栅栏里面', target: { scene: 'farm', x: 806, y: 620 }
    },
    {
      id: 'plant', title: '种下第一颗种子',
      text: '背包里有他留的小麦种子。翻好的土再点一次，就能种下去。',
      hint: '点已经翻过的地', target: { scene: 'farm', x: 806, y: 620 }
    },
    {
      id: 'water', title: '给它浇水',
      text: '种下去的地再点一次就是浇水。浇过水，睡一觉它才会长。',
      hint: '水是免费的，随便浇', target: { scene: 'farm', x: 806, y: 620 }
    },
    {
      id: 'sleep', title: '睡一觉，等它长大',
      text: '回小屋，点床睡一觉。第二天早上小麦就高了一截。',
      hint: '睡觉会把体力回满', target: { scene: 'cottage', x: 560, y: 700 }
    },
    {
      id: 'fish', title: '去湖边钓一条鱼',
      text: '湖边有木栈道。点水面抛竿，等浮标往下沉的那一下，再点一次。',
      hint: '浮标动了才点，早了会吓跑', target: { scene: 'lake', x: 660, y: 700 }
    },
    {
      id: 'give', title: '把鱼拿给他',
      text: '他这会儿多半在湖边。点他可以说话；背包里点鱼，还能送给他。',
      hint: '背包 → 鱼 → 送给他', target: null
    },
    {
      id: 'cake', title: '凑齐蛋糕的材料',
      text: '他说要给你做个蛋糕：小麦 2 份、草莓 2 份。种下去，浇水，等几天。',
      hint: '他给的草莓种子在背包里', target: { scene: 'farm', x: 806, y: 620 }
    },
    {
      id: 'night', title: '天黑了，回小屋',
      text: '材料齐了。回小屋，蛋糕在等你。',
      hint: '点屋里的生日蛋糕', target: { scene: 'cottage', x: 800, y: 580 }
    },
    {
      id: 'done', title: '日子还长',
      text: '小屋还在，地也还在。想种就种，想钓就钓。',
      hint: '', target: null
    }
  ];

  const story = {
    order: QUESTS.map((q) => q.id)
  };
  P.story = story;

  const S = () => P.state;

  story.index = function index() {
    const at = story.order.indexOf(S().quest);
    return at < 0 ? 0 : at;
  };

  story.current = function current() {
    const at = story.index();
    const q = QUESTS[at];
    return { ...q, index: at, done: q.id === 'done' };
  };

  story.list = function list() {
    const at = story.index();
    return QUESTS.map((q, i) => ({
      title: q.title,
      text: q.text,
      done: i < at || q.id === 'done',
      current: i === at
    }));
  };

  story.set = function set(id) {
    if (!story.order.includes(id)) return;
    if (S().quest === id) return;
    S().quest = id;
    P.save();
    P.ui.task();
    P.ui.hud();
    P.story.target();
    P.npc && P.npc.here && P.npc.paint();
    // 完成一步的小提示
    const doneIndex = story.order.indexOf(id);
    if (doneIndex > 0) {
      const prev = QUESTS[doneIndex - 1];
      P.ui.toast(`「${prev.title}」完成`, 'ui-star');
      P.audio && P.audio.sfx('page');
    }
  };

  // 目标在别的场景时，箭头指到出口上
  const ROUTE = {
    cottage: {
      farm: { x: 780, y: 880 },
      tvroom: { x: 1010, y: 952 }
    },
    farm: { cottage: { x: 250, y: 470 }, lake: { x: 1256, y: 620 } },
    lake: { farm: { x: 470, y: 430 } },
    tvroom: { cottage: { x: 80, y: 862 }, bath: { x: 1216, y: 668 } },
    bath: { tvroom: { x: 80, y: 880 }, roof: { x: 1216, y: 700 } },
    roof: { bath: { x: 80, y: 900 } }
  };

  story.target = function target() {
    const q = QUESTS[story.index()];
    if (!q || !q.target) { P.world.pointAt(null); return; }
    if (q.target.scene === P.world.current) {
      P.world.pointAt({ scene: q.target.scene, x: q.target.x, y: q.target.y - 90 });
      return;
    }
    P.world.pointAt(null);
    document.querySelectorAll('.exit').forEach((node) => node.classList.remove('pulse'));
    const exit = ROUTE[P.world.current] && ROUTE[P.world.current][q.target.scene];
    if (exit) {
      document.querySelectorAll(`.exit[data-exit="${q.target.scene}"]`).forEach((node) => node.classList.add('pulse'));
    }
  };

  function hasFish() {
    return Object.keys(FISH_IDS).some((id) => P.bagCount(`fish_${id}`) > 0);
  }
  const FISH_IDS = P.FISH;

  function materials() {
    return {
      wheat: P.bagCount('wheat'),
      strawberry: P.bagCount('strawberry'),
      ready: P.bagCount('wheat') >= 2 && P.bagCount('strawberry') >= 2
    };
  }

  /* ------------------------------------------------------------ 推进 --- */
  // 事件推进：允许「跳步」——玩家提前做了后面的事也算数
  const AT = (id) => story.order.indexOf(id);

  story.check = function check(event) {
    const id = QUESTS[story.index()].id;
    const at = AT(id);
    const did = (step, next) => {
      if (at <= AT(step)) story.set(next);
    };
    if (event === 'till') did('till', 'plant');
    else if (event === 'plant') did('plant', 'water');
    else if (event === 'water') did('water', 'sleep');
    else if (event === 'sleep') did('sleep', 'fish');
    else if (event === 'fish') did('fish', 'give');
    else if (event === 'gift') did('give', 'cake');
    if (QUESTS[story.index()].id === 'cake' && materials().ready) {
      story.set('night');
      P.ui.toast('材料齐了，回小屋吧', 'wish-cake');
    }
    story.target();
  };

  story.onScene = function onScene(scene) {
    if (S().quest === 'wake' && scene === 'farm') story.set('till');
    story.target();
  };

  story.onMorning = function onMorning() {
    const q = QUESTS[story.index()];
    if (q.id === 'cake' && materials().ready) story.set('night');
    P.ui.task();
    P.story.target();
  };

  story.npcCue = function npcCue() {
    const flags = S().flags;
    if (!flags.metBoy) return '!';
    if (S().quest === 'give' && hasFish()) return '!';
    if (flags.lastTalk !== `${S().day}-${S().phase}`) return '?';
    return '';
  };

  /* ------------------------------------------------------------ 说话 --- */
  const PHASE_TALK = {
    0: [
      '早。土我昨天傍晚翻过一点，剩下的你自己来，别累着。',
      '早上风凉，穿件外套。……算了，你肯定不穿。',
      '向日葵今天开得比昨天大。你站过去比一下？',
      '昨晚听见你翻身，床板响。——我没别的意思。',
      '我烧了水。壶在灶上，还热着。',
      '篱笆那边有只野猫，天天来。你别喂它，喂一次它就赖着不走了。',
      '雾散得慢，今天应该下不了雨。',
      '你头发翘起来了。……这边。算了，就这样吧。'
    ],
    1: [
      '中午太阳有点毒，你要是去湖边，记得躲在柳树底下。',
      '我刚才在数，玉米叶子上的虫有十七只。……你别笑，我认真的。',
      '饿不饿？锅里还有半碗粥，凉了也能吃。',
      '别一直弯着腰。直起来歇一下。',
      '这阵风好。要是每天都这样就好了。',
      '我小时候以为云是长在山上的，长大才知道不是。',
      '你手上是不是磨破了？……给我看看。',
      '草帽挂在门后，你戴吧。我晒惯了。'
    ],
    2: [
      '这个点鱼最好钓。你看水面，起小圈的地方底下就有鱼。',
      '我以前一个人能在这儿坐一下午。现在有点想你快点过来。',
      '风把云吹得像棉花糖。你肯定会说想吃。',
      '太阳一落蚊子就出来了。回去吧，别贪这一点光。',
      '我今天把水缸挑满了，够你用两天。',
      '你站那边别动。光打在你身上，好看。',
      '湖对面那户人家亮灯了。他家的狗一天叫三回。',
      '明天要不要一起去镇上？……不去也行。'
    ],
    3: [
      '灯我给你留着了。屋里暖，别在外面吹风。',
      '今天也辛苦了。地里的活明天再做也来得及。',
      '……晚安。别玩太晚。',
      '你困了就先去睡，我把灯吹了。',
      '夜里湖上有雾。别一个人去。',
      '我睡不着的时候会数星星。数到二十就想别的了。',
      '明天想吃什么？……我学着做。',
      '有点冷了。你过来一点。'
    ]
  };

  const HEART_EXTRA = {
    3: '说起来，你今天对我笑了三次。我数着呢。',
    6: '那个……其实我每天都在等你出门。',
    9: '我这个人嘴笨，说不来好听的。但这个小屋，是照着你喜欢的样子做的。'
  };

  story.talk = async function talk() {
    const flags = S().flags;
    const q = QUESTS[story.index()];
    const phase = S().phase;
    const lines = [];
    let who = '闷葫芦';
    P.daily && P.daily.bump('talk');

    if (!flags.metBoy) {
      flags.metBoy = true;
      lines.push(
        { who, text: '醒了？屋子小是小了点，但床是软的。' },
        { who, text: '外面那块地，是这整个农场里最大的一块。我量过了，比我的大两圈。' },
        { who, text: '你种什么都行。种死了也没事，我再翻一遍土。' },
        { who, text: '饿了就回来，我做饭。……虽然只会那几样。' }
      );
    } else if (q.id === 'give' && hasFish()) {
      lines.push(
        { who, text: '钓到了？让我看看。' },
        { who, text: '……不错啊，这条够肥。' },
        {
          who, text: '这样吧，我拿它做个蛋糕，缺的东西你自己种。',
          choices: [
            {
              label: '把鱼给他',
              run: async () => {
                const pickId = Object.keys(FISH_IDS).find((id) => P.bagCount(`fish_${id}`) > 0);
                if (pickId) P.takeItem(`fish_${pickId}`, 1);
                S().hearts = Math.min(10, S().hearts + 1);
                P.addItem('seed_strawberry', 2);
                P.audio && P.audio.sfx('heart');
                P.npc.floatHearts();
                P.story.check('gift');
                P.save();
                await P.ui.say([
                  { who: '闷葫芦', text: '喏，草莓种子。我去年留的，发芽率一般，多种两颗。' },
                  { who: '闷葫芦', text: '小麦你已经在种了。等你凑齐，我就把蛋糕做出来。' }
                ], { endLabel: '好' });
              }
            },
            {
              label: '先自己留着',
              say: [{ who: '闷葫芦', text: '行，那你留着。反正我等着。' }]
            }
          ]
        }
      );
    } else if (q.id === 'cake') {
      const m = materials();
      lines.push({
        who, text: `蛋糕要小麦 2 份、草莓 2 份。你现在有 ${m.wheat} 份小麦、${m.strawberry} 份草莓。`
      }, {
        who, text: m.ready ? '够了。回去把蛋糕点上蜡烛，我先去洗个手。' : '不急。地里的东西自己会长，你只要记得浇水。'
      });
    } else if (q.id === 'night') {
      lines.push({ who, text: '材料都齐了。回屋吧，蛋糕我已经放桌上了。' });
    } else if (q.id === 'done') {
      lines.push({ who, text: P.util.pick([
        '今天想干嘛？种地、钓鱼，还是就坐着发呆。',
        '地里的活我帮你看过了，没问题。',
        '你要是无聊，我可以陪你去湖边坐一会儿。'
      ]) });
    } else {
      const pool = PHASE_TALK[phase] || PHASE_TALK[0];
      const seenKey = `talk${phase}`;
      const seen = flags[seenKey] || [];
      let rest = pool.filter((_, i) => !seen.includes(i));
      if (!rest.length) { flags[seenKey] = []; rest = pool.slice(); }
      const pickIdx = pool.indexOf(P.util.pick(rest));
      flags[seenKey] = (flags[seenKey] || []).concat(pickIdx);
      lines.push({ who, text: pool[pickIdx] });
    }

    const hearts = S().hearts;
    const extra = Object.keys(HEART_EXTRA).map(Number).filter((h) => h <= hearts).pop();
    if (extra && flags[`saidHeart${extra}`] !== true) {
      flags[`saidHeart${extra}`] = true;
      lines.push({ who, text: HEART_EXTRA[extra] });
    }

    const choices = [
      { label: '陪他站一会儿', say: [{ who: '旁白', text: '你们谁都没说话。风从栅栏那边过来，带着一点草的味道。' }] },
      { label: '先走了', say: [{ who, text: '去吧。有事喊我。' }] }
    ];
    // 他在农场的时候，可以让他帮着弄一块地（一天一次）
    const heIsFarming = P.npc && P.npc.sceneFor && P.npc.sceneFor() === 'farm';
    if (heIsFarming && P.farm && P.farm.canHelp && P.farm.canHelp()) {
      choices.unshift({
        label: '让他搭把手',
        run: async () => {
          const line = P.farm.help();
          P.audio && P.audio.sfx('dig');
          P.ui.hud();
          await P.ui.say([{ who, text: line }], { endLabel: '谢了' });
        }
      });
    }
    lines.push({ who, text: '……', choices });

    flags.lastTalk = `${S().day}-${S().phase}`;
    P.save();
    await P.ui.say(lines, { endLabel: '嗯' });
    P.npc.paint();
  };

  story.giftLines = function giftLines(item) {
    const hearts = S().hearts;
    // 工作台上做的东西：他会先问「你做的？」
    if (item.hand === 'cheese') {
      return [
        { who: '闷葫芦', text: '你做的？' },
        { who: '旁白', text: '他捏了捏边角，又凑近闻了一下。' },
        { who: '闷葫芦', text: '……有奶味，还有一点点锅气。' },
        { who: '闷葫芦', text: hearts >= 6 ? '明天早上切两片，一人一片。' : '我留着慢慢吃。' }
      ];
    }
    if (item.hand === 'jam') {
      return [
        { who: '闷葫芦', text: '这个颜色……熬了很久吧。' },
        { who: '旁白', text: '他把瓶子举到窗边，里面的红透过来，落在手背上。' },
        { who: '闷葫芦', text: '草莓是你种的。' },
        { who: '闷葫芦', text: '那这瓶得省着吃。' }
      ];
    }
    // 旧货摊淘来的三样东西，他会认真看一会儿
    if (item.trinket === 'key') {
      return [
        { who: '闷葫芦', text: '钥匙？' },
        { who: '旁白', text: '他翻过来看了一圈，指甲刮了刮齿。' },
        { who: '闷葫芦', text: '这种齿是老锁。我家那个抽屉也是这种，一直打不开。' },
        { who: '闷葫芦', text: '……先留着吧。说不定哪天就对上了。' }
      ];
    }
    if (item.trinket === 'marble') {
      return [
        { who: '闷葫芦', text: '弹珠。' },
        { who: '旁白', text: '他举起来对着光看，里面的红线晃了一下。' },
        { who: '闷葫芦', text: '小时候我有过一颗，输给别人了。' },
        { who: '闷葫芦', text: hearts >= 6 ? '这颗你别输啊。' : '这颗我收着。' }
      ];
    }
    if (item.trinket === 'postcard') {
      return [
        { who: '闷葫芦', text: '字都化开了。' },
        { who: '旁白', text: '他念了两遍那两个字，没念出声。' },
        { who: '闷葫芦', text: '……「等我」。' },
        { who: '闷葫芦', text: '写这个的人，最后回来了吗。' }
      ];
    }
    if (item.fish === 'frog') {
      return [
        { who: '闷葫芦', text: '……这是青蛙。' },
        { who: '闷葫芦', text: '你从湖里钓上来的？' },
        { who: '闷葫芦', text: '放了吧。它蹲在那儿看我们半天了。' }
      ];
    }
    if (item.fish === 'lily') {
      return [
        { who: '闷葫芦', text: '花？给我的？' },
        { who: '闷葫芦', text: '我找个瓶子插起来。放你那边，还是我这边。' },
        { who: '闷葫芦', text: '……放中间吧。' }
      ];
    }
    if (item.kind === 'fish') {
      return [
        { who: '闷葫芦', text: `这条${item.name}……你是特意留给我的吧。` },
        { who: '闷葫芦', text: '我收下了。晚上给你煎一下。' }
      ];
    }
    if (item.kind === 'crop') {
      return [
        { who: '闷葫芦', text: `${item.name}？长得不错啊，比我种的好。` },
        { who: '闷葫芦', text: hearts >= 6 ? '……你种的东西，我舍不得吃。' : '谢谢。我拿去做点什么。' }
      ];
    }
    return [{ who: '闷葫芦', text: '这个我收下了。' }];
  };

  /* -------------------------------------------------------- 照片墙 --- */
  const PHOTOS = [
    { caption: '第一次一起出门', note: '那天你走到一半说脚疼，最后是我背你回来的。' },
    { caption: '你拍的我', note: '双下巴。你说是角度问题，我觉得是事实。' },
    { caption: '干拌面', note: '醋加多了，你酸得直皱眉，还是要吃完。' },
    { caption: '丸子头', note: '中午十二点，顶着这个发型出门，理直气壮。' },
    { caption: '长沙', note: '你笑我闷葫芦，笑了整整一条街。' },
    { caption: '傍晚', note: '什么都没做，就站在这儿看天。' },
    { caption: '生日', note: '这张是去年的。今年想拍一张新的。' }
  ];

  A.gallery = function gallery() {
    const body = `<p>这些是我们一起拍过的照片。点一张可以放大。</p>
      <div class="photo-grid" style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin:14px 0 4px">
        ${PHOTOS.map((photo, i) => `<button class="slot" type="button" data-photo="${i}" style="padding:6px 6px 4px">
          <img src="assets/photo-${i + 1}-thumb.png" alt="" style="width:100%;height:auto;image-rendering:pixelated;border-radius:4px">
          <b style="font-size:10px">${photo.caption}</b></button>`).join('')}
      </div>
      <div id="photoShow" hidden style="margin-top:12px;padding:12px;border-radius:12px;background:#f9e2dc"></div>`;
    P.ui.sheet({
      title: '我们的照片墙', kicker: 'PHOTOS', body,
      foot: [{ label: '两个人那些时候', run: () => { P.ui.closeSheet(); setTimeout(() => P.ui.memories(), 140); } }],
      onMount: (node) => {
        const show = node.querySelector('#photoShow');
        node.querySelectorAll('[data-photo]').forEach((button) => {
          button.addEventListener('click', () => {
            const i = Number(button.dataset.photo);
            const photo = PHOTOS[i];
            show.hidden = false;
            show.innerHTML = `<div style="width:min(260px,100%);margin:0 auto;padding:9px 9px 0;background:#fffaf0;border:1px solid #e6d2ba;transform:rotate(-1.2deg);box-shadow:0 6px 16px #735d5544">
                <img src="assets/photo-${i + 1}-large.png" alt="" style="display:block;width:100%;image-rendering:pixelated">
                <span style="display:block;text-align:center;font-size:11px;color:#a99180;padding:6px 0 5px">${photo.caption}</span>
              </div>
              <p style="margin:10px 0 0;font-size:12px;color:#7c5c63;text-align:center">${photo.note}</p>`;
            P.audio && P.audio.sfx('page');
            show.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          });
        });
      }
    });
  };

  /* ---------------------------------------------------------- 礼物 --- */
  const GIFTS = [
    { slug: 'foundation', name: 'NARS 粉底液 L1.5 YULONG', note: '不偏黄、不偏粉，刚刚好的中性一白——刚好配刚刚好的你。' },
    { slug: 'socks', name: '软乎乎的条纹袜', note: '冬天最暖的一双，穿上它窝在沙发上打盹刚刚好。' },
    { slug: 'cookie', name: '迪拜软曲奇', note: '厚厚一块巧克力软曲奇，掰开是开心果奶油和脆脆的卡达伊夫酥——今年最火的那一口。' },
    { slug: 'voucher', name: '墨镜券', note: '陪你一起去挑一副，戴上就是整条街最酷的屁屁。' }
  ];
  const ORDINALS = ['第一份', '第二份', '第三份', '第四份'];

  A.gifts = function gifts() {
    const body = `<p>他说礼物放在这里了，让你自己拆。</p>
      <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:16px 0 6px">
        ${GIFTS.map((gift, i) => `<button class="slot" type="button" data-gift="${i}" style="padding:9px 3px 6px">
          <img src="assets/gift-box-${i + 1}.png" alt="" style="width:56px;height:56px">
          <b style="font-size:10px">${ORDINALS[i]}</b></button>`).join('')}
      </div>
      <div id="giftShow" hidden style="margin-top:12px;padding:14px;border-radius:12px;background:#f9e2dc"></div>`;
    P.ui.sheet({
      title: '拆一份小礼物', kicker: 'GIFTS', body,
      onMount: (node) => {
        const show = node.querySelector('#giftShow');
        node.querySelectorAll('[data-gift]').forEach((button) => {
          button.addEventListener('click', () => {
            const i = Number(button.dataset.gift);
            const gift = GIFTS[i];
            S().flags.gifts[gift.slug] = true;
            P.save();
            button.style.borderColor = '#a56d82';
            const img = button.querySelector('img');
            img.style.animation = 'gift-shake .5s ease-in-out';
            setTimeout(() => { img.style.animation = ''; }, 520);
            show.hidden = false;
            show.innerHTML = `<div style="display:grid;place-items:center;width:min(200px,60%);aspect-ratio:1;margin:0 auto 12px;border-radius:16px;background:radial-gradient(circle at 50% 38%,#fdf5e6,#eed6b6);border:2px solid #dcbf99">
                <img src="assets/gift-${gift.slug}.png" alt="" style="width:76%;image-rendering:pixelated">
              </div>
              <strong style="display:block;font-size:15px;color:#5f414a;margin-bottom:6px;text-align:center">${gift.name}</strong>
              <p style="margin:0;font-size:13px;line-height:1.7;color:#7c5c63;text-align:center">${gift.note}</p>`;
            P.audio && P.audio.sfx('harvest');
            show.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          });
        });
      }
    });
  };

  A.shelf = function shelf() {
    P.ui.sheet({
      title: '书架', kicker: 'BOOKS', body: `
        <p>书架上有几本他看过的书，被翻得卷了边。</p>
        <div class="qlist">
          <div class="qitem"><span class="mark">1</span><div><strong>《怎样种好一块地》</strong><br>第三页夹着一张便签：「屁屁的地，要先晒三天土。」</div></div>
          <div class="qitem"><span class="mark">2</span><div><strong>《钓鱼入门》</strong><br>书脊用胶带粘过。第 42 页折了角：「浮标沉下去才提竿。」</div></div>
          <div class="qitem"><span class="mark">3</span><div><strong>一本没有名字的笔记本</strong><br>大半是空的，只写了一行：「今天她笑了。」</div></div>
        </div>`
    });
  };

  /* ---------------------------------------------------------- 蛋糕 --- */
  A.cake = function cake() {
    if (!S().flags.ending) {
      const m = materials();
      if (!m.ready) {
        P.ui.sheet({
          title: '生日蛋糕', kicker: 'CAKE', body: `
            <p>蛋糕上还差一点东西。他说要 <b>小麦 2 份、草莓 2 份</b>。</p>
            <p>你现在有 <b>${m.wheat}</b> 份小麦、<b>${m.strawberry}</b> 份草莓。</p>
            <p style="color:#9a7a6d;font-size:12px">种下去、浇水、睡一觉，它就会长。</p>`,
          foot: [
            { label: '去种地', run: () => { P.ui.closeSheet(); P.world.go('farm'); } },
            { label: '再等等', pale: true, run: () => P.ui.closeSheet() }
          ]
        });
        return;
      }
      finale();
      return;
    }
    if (P.dinner && P.dinner.open) { P.dinner.open(); return; }
    P.ui.sheet({
      title: '生日蛋糕', kicker: 'ALREADY', body: '<p>蜡烛已经吹过了。桌上还剩半块，谁都没舍得吃完。</p>',
      foot: [{ label: '好呀', run: () => P.ui.closeSheet() }]
    });
  };

  /* ---------------------------------------------------------- 结局 --- */
  async function finale() {
    const s = S();
    P.world.busy = true;
    P.npc.quiet = true;
    P.world.pointAt(null);
    const fade = document.getElementById('fade');
    fade.classList.add('on');
    await new Promise((r) => setTimeout(r, 750));
    s.phase = 3;
    s.phaseStep = 0;
    P.takeItem('wheat', 2);
    P.takeItem('strawberry', 2);
    P.save();
    P.applyPhase();
    P.ui.hud();
    fade.classList.remove('on');
    await new Promise((r) => setTimeout(r, 500));

    // 让他站到蛋糕对面
    const cakeScene = document.querySelector('.scene[data-scene="cottage"]');
    if (P.npc.el) {
      P.npc.el.remove();
      P.npc.shadow.remove();
      cakeScene.appendChild(P.npc.shadow);
      cakeScene.appendChild(P.npc.el);
      P.npc.el.style.left = '980px';
      P.npc.el.style.top = '640px';
      P.npc.shadow.style.left = '980px';
      P.npc.shadow.style.top = '640px';
      P.npc.el.style.setProperty('--row', 2);
      P.npc.el.style.zIndex = '660';
      P.npc.shadow.style.zIndex = '659';
      P.npc.el.style.setProperty('--depth', '0.94');
      P.npc.here = true;
      P.npc.home = { x: 980, y: 640 };
      const bubble = P.npc.el.querySelector('.npc-bubble');
      if (bubble) bubble.hidden = true;
    }

    P.audio && P.audio.start();
    // 好感越高，他越敢把话说完
    const hearts = s.hearts || 0;
    const script = [
      { who: '旁白', text: '屋里没开大灯。蛋糕放在桌上，蜡烛还没点。' },
      { who: '闷葫芦', text: '……坐吧。' },
      { who: '闷葫芦', text: '这块地你种得比我好。我本来准备了一堆话，真到这时候又说不出来了。' }
    ];
    if (hearts >= 5) {
      script.push({ who: '闷葫芦', text: '你第一天来的时候，我在窗户后头看了很久。我怕你不喜欢这儿。' });
      script.push({ who: '旁白', text: '他停了一下，手指在桌沿上敲了两下，又停住。' });
    }
    script.push({ who: '闷葫芦', text: '我就想说，这个屋子、这块地、这片湖，都是给你的。' });
    if (hearts >= 8) {
      script.push({ who: '闷葫芦', text: '我这辈子要是只做好一件事，我想就是把这儿收拾利索，等你回来。' });
    }
    script.push({ who: '闷葫芦', text: '以后你想种什么就种什么，想钓多久就钓多久。我都在。' });
    script.push({ who: '闷葫芦', text: '生日这天，许个愿吧。' });
    await P.ui.say(script, { endLabel: '嗯' });

    await lightCandles();
    await P.ui.say([
      { who: '闷葫芦', text: '蜡烛我插好了。你吹吧，我数三下。' }
    ], { endLabel: '吹蜡烛' });

    await blowOut();
    s.flags.candles = true;
    s.flags.ending = true;
    s.quest = 'done';
    P.dinner && P.dinner.syncLabel && P.dinner.syncLabel();
    P.save();
    P.ui.task();
    P.world.pointAt(null);

    openWish();
  }

  function flames() {
    return [document.getElementById('flameLeft'), document.getElementById('flameRight')];
  }

  async function lightCandles() {
    flames().forEach((flame, i) => {
      if (!flame) return;
      flame.hidden = false;
      flame.style.transition = 'opacity .4s';
      setTimeout(() => {
        flame.classList.add('lit');
        P.audio && P.audio.tone(880 + i * 60, 0.2, 0.03);
      }, 160 + i * 260);
    });
    await new Promise((r) => setTimeout(r, 900));
  }

  async function blowOut() {
    const stage = document.getElementById('stage');
    stage.classList.add('blowing');
    P.audio && P.audio.noise(0.7, 0.08, 1000, 260);
    for (const flame of flames()) {
      if (!flame) continue;
      setTimeout(() => {
        flame.classList.remove('lit');
        flame.classList.add('out');
        smoke(flame);
        P.audio && P.audio.noise(0.16, 0.05, 620, 240);
      }, 420 + Math.random() * 260);
    }
    await new Promise((r) => setTimeout(r, 1400));
    stage.classList.remove('blowing');
  }

  function smoke(flame) {
    const scene = document.querySelector('.scene[data-scene="cottage"]');
    const left = parseFloat(flame.style.left) || 0;
    const top = parseFloat(flame.style.top) || 0;
    for (let i = 0; i < 4; i += 1) {
      const puff = document.createElement('div');
      puff.className = 'candle-smoke';
      puff.style.left = `${left}px`;
      puff.style.top = `${top}px`;
      puff.style.setProperty('--drift', `${(Math.random() - 0.5) * 40}px`);
      puff.style.animationDelay = `${i * 130}ms`;
      scene.appendChild(puff);
      setTimeout(() => puff.remove(), 2400);
    }
  }

  function openWish() {
    const overlay = document.getElementById('wishOverlay');
    document.getElementById('wishKicker').textContent = '26 岁啦';
    document.getElementById('wishTitle').textContent = '愿望也一起许好了';
    document.getElementById('wishNote').textContent = '蜡烛替你把愿望带走了。接下来的日子，慢慢等它实现。';
    const button = document.getElementById('wishButton');
    button.textContent = '看看他写了什么';
    overlay.hidden = false;
    P.audio && P.audio.tone(784, 0.3, 0.04);
    button.onclick = () => {
      overlay.hidden = true;
      P.audio && P.audio.sfx('click');
      epilogue();
    };
  }

  function epilogue() {
    P.world.busy = false;
    P.npc.quiet = false;
    P.ui.sheet({
      title: '屁屁小屋', kicker: 'END OF DAY 1', body: `
        <p>他说，这个世界没有工作的烦恼，没有未来的焦虑。</p>
        <p>你可以在这里种地、钓鱼、发呆，或者继续给他拍那些只有他懂的照片。</p>
        <p>——今天是你生日。去随便逛逛吧，他在阳光下，找到了你。</p>
        <p>${(S().hearts || 0) >= 8
          ? '他今天话比平时多。走的时候还站在门口，看你拐过栅栏才回屋。'
          : (S().hearts || 0) >= 5
            ? '他还是不太会说话。但灯一直亮着，等你回去。'
            : '他把蜡烛吹灭的灰扫干净了，没说什么。'}</p>
        <div style="margin-top:16px;padding:12px;border-radius:12px;background:#f9e2dc;font-size:12px;color:#7c5c63;line-height:1.8">
          第 ${S().day} 天 · 好感 ${S().hearts} / 10<br>
          收成 ${S().stats.harvested} 次 · 钓鱼 ${S().stats.fished} 次
        </div>`,
      foot: [
        { label: '继续在这里生活', run: () => { P.ui.closeSheet(); P.showHint('小屋随时给你留着灯', 3000); } },
        { label: '再看看照片', pale: true, run: () => { P.ui.closeSheet(); A.gallery(); } }
      ]
    });
    P.npc.place(P.world.current);
  }

  story.init = function init() {
    P.ui.task();
    story.target();
    P.dinner && P.dinner.syncLabel && P.dinner.syncLabel();
  };
})();
