/* 两个人的几件小事：看电视、泡澡、看星星
   每个场景里有一个只有两个人的角落。一天一次，好感 +1，体力回一点。 */
(function () {
  const P = window.P;
  const A = (P.actions = P.actions || {});
  const S = () => P.state;
  const U = P.util;

  /* ------------------------------------------------------------ 看看 --- */
  // 场景里那些不推进剧情的小东西：点一下，说一句话
  A.look = function look(button) {
    const text = button && button.dataset.text;
    if (!text) return;
    if (P.ui.modalOpen()) return;
    P.showHint(text, 3200);
  };

  /* ------------------------------------------------------------ 通用 --- */
  function once(key) {
    return S().flags[key] !== S().day;
  }

  function mark(key) {
    S().flags[key] = S().day;
  }

  // 一天里第一次做，才给好感
  function reward(key, hearts = 1, energy = 2) {
    const s = S();
    const first = once(key);
    let gained = 0;
    if (first) {
      mark(key);
      gained = Math.min(hearts, 10 - (s.hearts || 0));
      s.hearts = Math.min(10, (s.hearts || 0) + hearts);
    }
    const before = s.energy;
    s.energy = Math.min(s.energyMax, s.energy + energy);
    P.save();
    P.ui.hud();
    return { first, hearts: gained, energy: s.energy - before };
  }

  function approach(point, run) {
    if (U.dist(P.world.pos, point) < 120) { run(); return; }
    P.world.walkTo(point.x, point.y, run);
  }

  function sheetWithArt(src, title, kicker, lines, footLabel) {
    return new Promise((resolve) => {
      P.ui.sheet({
        title,
        kicker,
        body: `<img class="moment-img" src="${src}" alt="">
          <div class="moment-lines">${lines.map((line) => `<p>${line}</p>`).join('')}</div>`,
        foot: [{
          label: footLabel || '嗯',
          run: () => { P.ui.closeSheet(); resolve(); }
        }]
      });
    });
  }

  /* -------------------------------------------------------- 一起看电视 --- */
  A.tv = function tv() {
    if (P.ui.modalOpen() || P.world.busy) return;
    const spot = { x: 720, y: 856 };
    const run = async () => {
      P.world.look(700, 500);
      P.audio && P.audio.sfx('page');
      // 你在他旁边坐下，两个人并排，一起看那台旧电视
      P.world.setPose('sit');
      if (P.npc && P.npc.el && P.npc.here) {
        const el = P.npc.el;
        el.dataset.pose = 'sit';
        el.style.transition = 'left .55s ease';
        el.style.left = '600px';
        P.npc.shadow.style.left = '600px';
        setTimeout(() => { if (el) { el.style.transition = ''; } }, 580);
      }
      const first = once('tvDay');
      const gain = reward('tvDay', 1, 2);
      P.daily && P.daily.bump('tv');
      const lines = first
        ? [
          '你在他旁边坐下，沙发陷下去一小块。',
          '他把靠垫立起来一半，让你的头刚好能靠住。',
          '电视里放着很老的片子，画面有点雪花。',
          '谁也没说话。片子里的人在吵架，你们在打瞌睡。'
        ]
        : [
          '你坐过去，他往旁边挪了一点，给你让出位置。',
          '片子还在放，剧情没怎么往前走。'
        ];
      if (P.weather && P.weather.is('rain')) {
        lines.push('外面的雨敲在窗上，比电视里的声音还清楚。');
      }
      if (P.state.caught && P.state.caught.koi) {
        lines.push('他忽然说：你钓上来的那条锦鲤，我到现在还觉得不真实。');
      }
      await sheetWithArt('assets/moment-tv.webp', first ? '一起看电视' : '又是同一部片子', first ? 'TOGETHER' : 'AGAIN', lines, '看到这儿');
      P.world.setPose('');
      if (gain.energy) P.showHint(`+${gain.energy} 体力`, 1800);
      P.ui.task();
    };
    approach(spot, run);
  };

  /* ---------------------------------------------------------- 一起泡澡 --- */
  A.bath = function bath() {
    if (P.ui.modalOpen() || P.world.busy) return;
    const spot = { x: 860, y: 950 };
    const run = async () => {
      P.world.look(440, 600);
      P.audio && P.audio.sfx('water');
      // 你坐进木桶边，他也并排坐下，两个人一起泡
      P.world.setPose('sit');
      if (P.npc && P.npc.el && P.npc.here) {
        const el = P.npc.el;
        el.dataset.pose = 'sit';
        el.style.transition = 'left .55s ease';
        el.style.left = '980px';
        P.npc.shadow.style.left = '980px';
        setTimeout(() => { if (el) { el.style.transition = ''; } }, 580);
      }
      const first = once('bathDay');
      const gain = reward('bathDay', 1, 4);
      P.daily && P.daily.bump('bath');
      const lines = first
        ? [
          '你坐进木桶，热水慢慢没过肩膀。',
          '他也在旁边坐下，把毛巾叠成方块，放在你头上，说这样不容易头晕。',
          '水很烫，下去的时候要一点一点来。',
          '蒸汽把窗子糊白了。两个人都不太想说话。'
        ]
        : [
          '你坐进去，他也并排坐下。水还是那么烫，你已经能一口气坐到底了。',
          '他往水里又添了一瓢，说泡透了再出来。'
        ];
      if (P.state.flags.rainCatch) {
        lines.push('院子里那只雨蛙又开始叫了。你俩同时往窗外看了一眼。');
      }
      await sheetWithArt('assets/moment-bath.webp', '一起泡澡', 'SOAK', lines, '泡够了');
      P.world.setPose('');
      if (gain.energy) P.showHint(`+${gain.energy} 体力，身上轻了`, 2200);
      P.ui.task();
    };
    approach(spot, run);
  };

  /* -------------------------------------------------------- 坐下看星星 --- */
  function shootingStars() {
    const scene = document.querySelector('.scene[data-scene="roof"]');
    if (!scene) return;
    for (let i = 0; i < 3; i += 1) {
      const star = document.createElement('i');
      star.className = 'shooting-star';
      star.style.cssText = `left:${U.rand(420, 1240)}px;top:${U.rand(80, 340)}px;animation-delay:${i * 0.9}s`;
      scene.appendChild(star);
      setTimeout(() => star.remove(), 4200 + i * 900);
    }
  }

  A.stars = function stars() {
    if (P.ui.modalOpen() || P.world.busy) return;
    const spot = { x: 330, y: 900 };
    const run = async () => {
      const night = S().phase >= 2;
      P.world.look(900, 200);
      P.world.setPose('sit');
      if (night) shootingStars();
      const first = once('starDay');
      const gain = reward('starDay', 1, 2);
      P.daily && P.daily.bump('stars');
      P.audio && P.audio.sfx('water');
      const lines = [];
      if (night) {
        lines.push({ who: '旁白', text: '你在毯子上坐下，背靠着栏杆。木台还留着白天的温度。' });
        if (first) {
          lines.push({ who: '闷葫芦', text: '上面那条白白的是银河。城里看不见。' });
          lines.push({ who: '旁白', text: '他抬手比了一下，还没比完，一颗星星就划过去了。' });
          lines.push({ who: '闷葫芦', text: '……刚才那个，许愿了吗。' });
        } else {
          lines.push({ who: '闷葫芦', text: '今晚的星星比昨天多。你数到几了。' });
          lines.push({ who: '旁白', text: '你数到十七，他数到二十一。谁也没数完。' });
        }
        if (P.state.caught && P.state.caught.moon) {
          lines.push({ who: '闷葫芦', text: '你钓上来的那条月光鱼，现在大概也在水里看天。' });
        }
      } else {
        // 白天：看不见星星，看的是云和远山
        lines.push({ who: '旁白', text: '你在毯子上坐下，风从湖那边吹过来，很轻。' });
        if (first) {
          lines.push({ who: '闷葫芦', text: '白天天上没有星星，只有云。……不过也挺好看的。' });
          lines.push({ who: '旁白', text: '你俩并排坐着，谁也没说话，就看云慢慢挪过去。' });
        } else {
          lines.push({ who: '闷葫芦', text: '那朵云像条鱼。你钓过的那种，胖的。' });
          lines.push({ who: '旁白', text: '你顺着他的手指看过去，云已经散了。' });
        }
      }
      await P.ui.say(lines, { mode: 'rest', endLabel: '再坐一会儿' });
      P.world.setPose('');
      if (gain.energy) P.showHint(`+${gain.energy} 体力`, 1800);
      P.ui.task();
    };
    approach(spot, run);
  };

  /* ------------------------------------------------------- 睡前亲一下 --- */
  // 好感够了，睡前可以轻轻亲一下额头，然后一起睡
  A.kiss = function kiss() {
    if (P.ui.modalOpen() || P.world.busy) return;
    const spot = { x: 560, y: 700 };
    const run = async () => {
      if (P.npc && P.npc.summon) {
        P.npc.summon('cottage', { x: 470, y: 820 });
        const el = P.npc.el;
        if (el) { el.dataset.pose = 'sit'; el.dataset.hold = ''; }
      }
      P.world.look(340, 560);
      P.world.setPose('sleep');
      P.audio && P.audio.sfx('heart');
      if (P.npc) P.npc.floatHearts();
      const first = once('kissDay');
      const gain = reward('kissDay', 2, 0);
      P.daily && P.daily.bump('kiss');
      const lines = first
        ? [
          '你凑近一点，在他额头上轻轻落下一个吻。',
          '他整个人僵住了，耳朵尖慢慢红起来。',
          '过了好一会儿，他才很小声地说：……再来一下。'
        ]
        : [
          '你靠过去，这次他先闭上了眼睛。',
          '额头相抵的时候，两个人都没说话。'
        ];
      if (P.state.hearts >= 8) {
        lines.push('他把你往怀里带了带，下巴抵在你发顶。');
      }
      await sheetWithArt('assets/moment-kiss.webp', first ? '轻轻亲一下' : '又是这个吻', first ? 'A KISS' : 'AGAIN', lines, '晚安');
      P.world.setPose('');
      if (gain.hearts) { P.showHint(`+${gain.hearts} 好感`, 1800); if (P.npc) P.npc.floatHearts(); }
      await P.sleep();
    };
    approach(spot, run);
  };

  /* ------------------------------------------------------- 一起睡觉 --- */
  // 傍晚/夜里睡觉，可以拉上他一起
  A.sleepTogether = function sleepTogether() {
    if (P.ui.modalOpen() || P.world.busy) return;
    const spot = { x: 560, y: 700 };
    const run = async () => {
      // 他坐到你床边来，你躺下
      if (P.npc && P.npc.summon) {
        P.npc.summon('cottage', { x: 470, y: 820 });
        const el = P.npc.el;
        if (el) { el.dataset.pose = 'sit'; el.dataset.hold = ''; }
      }
      P.world.look(340, 560);
      P.world.setPose('sleep');
      P.audio && P.audio.sfx('page');
      const first = once('sleepDay');
      const gain = reward('sleepDay', 2, 0);
      P.daily && P.daily.bump('sleep');
      const lines = first
        ? [
          '你往床里挪了挪，给他留出一半。',
          '他先是僵了一下，然后很小声地掀开被子，躺到你旁边。',
          '灯还亮着。你们谁也没先开口，就听着彼此的呼吸。',
          '不知道过了多久，他的呼吸慢下来，人也睡着了。'
        ]
        : [
          '今晚也留了一半被子给他。',
          '他已经不推辞了，躺下的时候肩膀放松下来。'
        ];
      if (P.state.hearts >= 8) {
        lines.push('他翻了个身，小声说：明天也这样吧。');
      }
      await sheetWithArt('assets/moment-sleep.webp', first ? '一起睡吧' : '又是这一晚', first ? 'GOODNIGHT' : 'AGAIN', lines, '晚安');
      P.world.setPose('');
      if (gain.hearts) { P.showHint(`+${gain.hearts} 好感`, 1800); if (P.npc) P.npc.floatHearts(); }
      // 一起睡完，天也亮了
      await P.sleep();
    };
    approach(spot, run);
  };

  /* ------------------------------------------------------- 他的位置 --- */
  // 客厅、澡堂、楼顶是他自己也会上去的地方：一到那儿，他就在附近
  P.moments = { onEnter };
  function onEnter(scene) {
    if (!P.npc || !P.npc.summon) return;
    // 楼顶：他也会上去，站在栏杆边（白天黑夜都行）
    if (scene === 'roof') {
      const spot = { x: 1082, y: 918 };
      if (!P.npc.summon(scene, spot)) return;
      setTimeout(() => {
        const el = P.npc && P.npc.el;
        if (!el || P.npc.forced !== 'roof') return;
        el.dataset.pose = 'sit';
        el.dataset.hold = '';
      }, 420);
      return;
    }
    // 客厅：他先一步坐在沙发上等你（两个人一起看电视的地方）
    if (scene === 'tvroom') {
      const spot = { x: 560, y: 836 };
      if (!P.npc.summon(scene, spot)) return;
      setTimeout(() => {
        const el = P.npc && P.npc.el;
        if (!el || P.npc.forced !== 'tvroom') return;
        el.dataset.pose = 'sit';
        el.dataset.hold = '';
      }, 420);
      return;
    }
    // 澡堂：他站在木桶边上，等水热
    if (scene === 'bath') {
      const spot = { x: 1050, y: 940 };
      if (!P.npc.summon(scene, spot)) return;
      setTimeout(() => {
        const el = P.npc && P.npc.el;
        if (!el || P.npc.forced !== 'bath') return;
        el.dataset.hold = '';
      }, 420);
    }
  }
})();
