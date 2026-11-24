/* 两个人的几件小事：看电视、泡澡、看星星、一起睡、亲一下
   每个场景里有一个只有两个人的角落。一天一次，好感 +1 / +2，体力回一点。
   演法是「先动起来，再给插画」：走过去、坐下、靠过去、蒸汽和心跳都发生在画面里，
   插画只是这一段最后定住的一格。 */
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
    if (U.dist(P.world.pos, point) < 150) { run(); return; }
    P.world.walkTo(point.x, point.y, run);
  }

  function sheetWithArt(src, title, kicker, lines, footLabel) {
    return new Promise((resolve) => {
      let done = false;
      const finish = () => { if (done) return; done = true; resolve(); };
      P.ui.sheet({
        title,
        kicker,
        body: `<img class="moment-img" src="${src}" alt="">
          <div class="moment-lines">${lines.map((line) => `<p>${line}</p>`).join('')}</div>`,
        foot: [{
          label: footLabel || '嗯',
          run: () => { P.ui.closeSheet(); finish(); }
        }],
        // 点 × 或者点遮罩关掉也要继续往下走，不然会卡在 world.busy 里
        onClose: finish
      });
    });
  }

  function duo() { return P.duo; }

  /* 第一次做某件事，就在照片墙上留一格 */
  function record(key) {
    if (P.remember && P.remember(key)) {
      P.ui.toast('这一格，记在照片墙上了', 'ui-heart');
    }
  }

  /* -------------------------------------------------------- 一起看电视 --- */
  A.tv = function tv() {
    if (P.ui.modalOpen() || P.world.busy) return;
    approach({ x: 470, y: 800 }, async () => {
      const D = duo();
      if (!D.begin('tv')) return;
      P.audio && P.audio.sfx('page');
      // 他先坐进沙发，你踩上去挨着他坐，两个人都朝电视那边看
      D.npc({ x: 668, y: 574 }, 'seat', 'right');
      await D.glide({ x: 594, y: 574 }, 620);
      D.player(null, 'seat', 'right');
      D.cine({ x: 626, y: 500 }, 1.5);
      await D.wait(620);
      D.say('npc', '开始了。');
      await D.wait(1500);
      // 靠垫被立起来一半，你的头刚好能靠住
      D.lean('player', 'right-soft');
      D.lean('npc', 'left-soft');
      D.bits({ x: 420, y: 640 }, 'note', 2);
      await D.wait(1100);
      if (P.state.hearts >= 6) {
        D.bits({ x: 418, y: 610 }, 'heart', 2);
        D.say('npc', '困了就靠一会儿。');
      } else {
        D.say('player', '这个片子我好像看过。');
        D.say('npc', '嗯。上次你也这么说。');
      }
      await D.wait(1700);
      D.bits({ x: 420, y: 640 }, 'zzz', 2);
      await D.wait(900);

      const first = once('tvDay');
      const gain = reward('tvDay', 1, 2);
      P.daily && P.daily.bump('tv');
      record('tv');
      const lines = first
        ? [
          '电视里放着一部很老的片子，画面有点雪花。',
          '他把靠垫立起来一半，让你的头刚好能靠住。',
          '谁也没说话。片子里的人在吵架，你们在打瞌睡。'
        ]
        : [
          '片子还在放，剧情没怎么往前走。',
          '你靠过去的时候，他往旁边挪了一点，给你让出位置。'
        ];
      if (P.weather && P.weather.is('rain')) {
        lines.push('外面的雨敲在窗上，比电视里的声音还清楚。');
      }
      if (P.state.caught && P.state.caught.koi) {
        lines.push('他忽然说：你钓上来的那条锦鲤，我到现在还觉得不真实。');
      }
      await sheetWithArt('assets/moment-tv.webp', first ? '一起看电视' : '又是同一部片子', first ? 'TOGETHER' : 'AGAIN', lines, '看到这儿');
      D.end();
      if (gain.energy) P.showHint(`+${gain.energy} 体力`, 1800);
      P.ui.task();
    });
  };

  /* ---------------------------------------------------------- 一起泡澡 --- */
  A.bath = function bath() {
    if (P.ui.modalOpen() || P.world.busy) return;
    approach({ x: 470, y: 920 }, async () => {
      const D = duo();
      if (!D.begin('bath')) return;
      P.audio && P.audio.sfx('water');
      // 他已经在桶里了，你从边上下去，两个人并排坐着，只露头和肩
      D.npc({ x: 620, y: 692 }, '', 'up');
      await D.glide({ x: 470, y: 692 }, 760);
      D.player(null, '', 'up');
      // 桶的前壁盖上来，人就真的在桶里，不是坐在桶前面
      D.fg('tub', 'assets/bath-art.webp', { x: 292, y: 638, w: 660, h: 300 });
      D.cine({ x: 546, y: 580 }, 1.28);
      await D.wait(700);
      D.steam({ x: 470, y: 620 }, 5);
      D.steam({ x: 604, y: 620 }, 3);
      D.say('npc', '水正好。');
      await D.wait(1500);
      D.bits({ x: 546, y: 600 }, 'heart', 2);
      D.say('player', '烫……不过挺舒服的。');
      await D.wait(1400);
      D.steam({ x: 546, y: 600 }, 4);
      if (P.state.hearts >= 6) D.say('npc', '别泡太久，会晕。');
      await D.wait(1300);

      const first = once('bathDay');
      const gain = reward('bathDay', 1, 4);
      P.daily && P.daily.bump('bath');
      record('bath');
      const lines = first
        ? [
          '水很烫，下去的时候要一点一点来。',
          '他把毛巾叠成方块，放在你头上，说这样不容易头晕。',
          '蒸汽把窗子糊白了。两个人都不太想说话。'
        ]
        : [
          '水还是那么烫。你已经能一口气坐下去了。',
          '他往水里又添了一瓢，说泡透了再出来。'
        ];
      if (P.state.flags.rainCatch) {
        lines.push('院子里那只雨蛙又开始叫了。你俩同时往窗外看了一眼。');
      }
      await sheetWithArt('assets/moment-bath.webp', '一起泡澡', 'SOAK', lines, '泡够了');
      D.end();
      if (gain.energy) P.showHint(`+${gain.energy} 体力，身上轻了`, 2200);
      // 泡完了他还在小凳上滴水 —— 提一句，免得没人发现还能递毛巾
      if (S().flags.towelHintDay !== S().day) {
        S().flags.towelHintDay = S().day;
        setTimeout(() => {
          if (P.world.current === 'bath') P.ui.toast('他在小凳上坐着擦头发 · 点「递毛巾」', 'ui-heart');
        }, 1400);
      }
      P.ui.task();
    });
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
    approach({ x: 430, y: 930 }, async () => {
      const D = duo();
      if (!D.begin('stars')) return;
      const night = S().phase >= 2;
      // 他挨着你坐下，两个人都背对镜头，看前面那片天
      D.npc({ x: 244, y: 812 }, 'seat', 'up');
      await D.glide({ x: 150, y: 812 }, 700);
      D.player(null, 'seat', 'up');
      D.cine({ x: 198, y: 748 }, 1.42);
      if (night) shootingStars();
      await D.wait(900);
      if (night) {
        D.bits({ x: 198, y: 740 }, 'spark', 3);
        D.say('npc', '那颗最亮的是织女星。');
      } else {
        D.say('npc', '云在往东边走。');
      }
      await D.wait(1500);
      D.lean('npc', 'left-soft');
      await D.wait(900);

      const first = once('starDay');
      const gain = reward('starDay', 1, 2);
      P.daily && P.daily.bump('stars');
      record('stars');
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
      D.end();
      if (gain.energy) P.showHint(`+${gain.energy} 体力`, 1800);
      P.ui.task();
    });
  };

  /* ------------------------------------------------------- 睡前亲一下 --- */
  A.kiss = function kiss() {
    if (P.ui.modalOpen() || P.world.busy) return;
    approach({ x: 560, y: 700 }, async () => {
      const D = duo();
      if (!D.begin('sleep')) return;
      // 两个人都躺进被子里，被子盖到肩膀，只露头
      D.npc({ x: 396, y: 540 }, 'sleep', 'down');
      await D.glide({ x: 246, y: 540 }, 780);
      D.player(null, 'sleep', 'down');
      D.fg('quilt', 'assets/room-birthday-26-optimized.webp', { x: 88, y: 556, w: 430, h: 246 });
      D.cine({ x: 316, y: 512 }, 1.52);
      await D.wait(800);
      D.say('player', '晚安。');
      D.say('npc', '……嗯。');
      await D.wait(1500);
      // 他侧过来，两个人额头凑到一起
      D.npc({ x: 334, y: 540 }, 'sleep', 'down');
      D.lean('npc', 'left');
      D.lean('player', 'right');
      P.audio && P.audio.sfx('heart');
      await D.wait(900);
      D.bits({ x: 286, y: 520 }, 'spark', 4);
      D.bits({ x: 286, y: 530 }, 'heart', 3);
      await D.wait(1500);

      const first = once('kissDay');
      const gain = reward('kissDay', 2, 0);
      P.daily && P.daily.bump('kiss');
      record('kiss');
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
      if (gain.hearts) { P.showHint(`+${gain.hearts} 好感`, 1800); if (P.npc) P.npc.floatHearts(); }
      D.end();
      await P.sleep();
    });
  };

  /* ------------------------------------------------------- 一起睡觉 --- */
  A.sleepTogether = function sleepTogether() {
    if (P.ui.modalOpen() || P.world.busy) return;
    approach({ x: 560, y: 700 }, async () => {
      const D = duo();
      if (!D.begin('sleep')) return;
      const warm = (S().hearts || 0) >= 6;
      // 一、他先到床边站着，把台灯拧暗
      D.npc({ x: 468, y: 636 }, '', 'left');
      await D.glide({ x: 330, y: 640 }, 760);
      D.cine({ x: 316, y: 520 }, 1.34);
      await D.wait(700);
      D.say('npc', '……灯，我关了。');
      await D.wait(1300);
      // 二、两个人都钻进被子里（身体交给被子挡住，只露头）
      D.npc({ x: 396, y: 540 }, 'sleep', 'down');
      D.player(null, 'sleep', 'down');
      D.fg('quilt', 'assets/room-birthday-26-optimized.webp', { x: 88, y: 556, w: 430, h: 246 });
      D.cine({ x: 316, y: 512 }, 1.5);
      await D.wait(900);
      // 三、被子底下挤一挤，他往你这边挪
      D.npc({ x: 348, y: 540 }, 'sleep', 'down');
      D.lean('npc', 'left-soft');
      D.bits({ x: 300, y: 516 }, 'zzz', 2);
      await D.wait(1000);
      // 四、睡前那几句悄悄话，好感越高他话越多
      D.say('player', '晚安。');
      await D.wait(1200);
      if (warm) {
        D.say('npc', '……嗯。手给我。');
        D.bits({ x: 300, y: 534 }, 'heart', 2);
        await D.wait(1600);
      } else {
        D.say('npc', '被子里……有点挤。');
        await D.wait(1400);
      }
      D.bits({ x: 330, y: 512 }, 'zzz', 3);
      await D.wait(1100);

      const first = once('sleepDay');
      const gain = reward('sleepDay', 2, 0);
      P.daily && P.daily.bump('sleep');
      record('sleep');
      // 记一笔：昨晚是一起睡的，明早的起床信会提一句
      S().flags.sleptWithDay = S().day;
      const lines = first
        ? [
          '你往床里挪了挪，给他留出一半。',
          '他先是僵了一下，然后很小声地掀开被子，躺到你旁边。',
          '灯灭了。你们谁也没先开口，就听着彼此的呼吸。',
          '不知道过了多久，他的呼吸慢下来，人也睡着了。'
        ]
        : [
          '今晚也留了一半被子给他。',
          '他已经不推辞了，躺下的时候肩膀放松下来。'
        ];
      if (warm) lines.push('被子底下，他的手很轻地扣住了你的。');
      if (P.state.hearts >= 8) {
        lines.push('他翻了个身，小声说：明天也这样吧。');
      }
      await sheetWithArt('assets/moment-sleep.webp', first ? '一起睡吧' : '又是这一晚', first ? 'GOODNIGHT' : 'AGAIN', lines, '晚安');
      if (gain.hearts) { P.showHint(`+${gain.hearts} 好感`, 1800); if (P.npc) P.npc.floatHearts(); }
      D.end();
      await P.sleep();
    });
  };

  /* ------------------------------------------------------- 一起钓鱼 --- */
  // 湖边栈桥：两个人并排坐着，两根竿子伸到水面上。
  // 他的浮标先沉，然后你的也沉了——两个人都钓上来了。
  A.fishTogether = function fishTogether() {
    if (P.ui.modalOpen() || P.world.busy) return;
    approach({ x: 900, y: 792 }, async () => {
      const D = duo();
      if (!D.begin('fish')) return;
      const s = S();
      const night = s.phase >= 2;

      // 一、他已经坐在栈桥边上了，竿子斜斜地伸出去
      D.npc({ x: 1010, y: 780 }, 'seat', 'left');
      D.hold('npc', 'rod');
      await D.glide({ x: 872, y: 762 }, 780);
      D.player(null, 'seat', 'left');
      D.hold('player', 'rod');
      D.cine({ x: 940, y: 720 }, 1.34);
      await D.wait(420);

      // 二、两根线甩进水里
      const his = { x: 752, y: 816 };
      const hers = { x: 664, y: 800 };
      D.line({ x: 919, y: 714 }, his);
      D.line({ x: 732, y: 697 }, hers);
      const hisBob = D.bobber(his);
      const herBob = D.bobber(hers);
      P.audio && P.audio.sfx('cast');
      await D.wait(900);
      D.say('npc', night ? '……夜里它们靠边。别出声。' : '……别说话，看浮标。');
      await D.wait(1900);

      // 三、他的浮标沉了
      P.audio && P.audio.sfx('bite');
      P.vibrate && P.vibrate(18);
      if (hisBob) { hisBob.style.transition = 'top .16s ease-out'; hisBob.style.top = `${his.y + 14}px`; }
      D.mark(his, '!');
      D.lean('npc', 'left');
      await D.wait(280);
      D.leap(his, night ? 'fish-catfish' : 'fish-carp');
      P.audio && P.audio.sfx('plop');
      await D.wait(420);
      D.say('npc', '……有了。');
      if (hisBob) hisBob.style.top = `${his.y}px`;
      await D.wait(1500);

      // 四、你这边也沉了，而且更沉
      P.audio && P.audio.sfx('bite');
      if (herBob) { herBob.style.transition = 'top .16s ease-out'; herBob.style.top = `${hers.y + 16}px`; }
      D.mark(hers, '!');
      D.lean('player', 'right');
      await D.wait(300);
      D.leap(hers, night ? 'fish-koi' : 'fish-trout');
      P.audio && P.audio.sfx('plop');
      await D.wait(500);
      D.say('player', '我这条更大。');
      await D.wait(1400);
      D.say('npc', '……嗯。是。');
      if (herBob) herBob.style.top = `${hers.y}px`;

      // 五、竿子都收回来，两个人往对方那边靠
      D.hold('player', '');
      D.hold('npc', '');
      D.lean('npc', 'left-soft');
      D.lean('player', 'right-soft');
      D.bits({ x: 942, y: 722 }, 'heart', 2);
      await D.wait(1300);

      const first = once('fishDay');
      const gain = reward('fishDay', 2, 2);
      P.daily && P.daily.bump('fish');
      record('fish');
      const warm = (S().hearts || 0) >= 6;
      const lines = first
        ? [
          '栈桥的木板被晒了一天，坐上去还是温的。',
          '他把竿子往你那边挪了挪，让出一块平整的地方给你放脚。',
          '两根浮标并排立在水面上，风一吹，一起晃。',
          '他的先沉了，接着你的也沉了。两个人都没顾上说话，只顾着收线。'
        ]
        : [
          '又是并排坐着的半个下午，谁也没先站起来。',
          '他的浮标晃了一下，你的也跟着晃——像是商量好的。'
        ];
      if (night) lines.push('天黑之后水面变成一块镜子，把星星全收了进去。');
      if (warm) lines.push('收线的时候，他的手在你手背上停了一下，才拿开。');
      await P.ui.say(lines, { mode: 'rest', endLabel: '再坐一会儿' });
      D.end();
      if (gain.hearts) { P.showHint(`+${gain.hearts} 好感`, 1800); if (P.npc) P.npc.floatHearts(); }
      if (gain.energy) P.showHint(`+${gain.energy} 体力`, 1600);
      P.ui.task();
    });
  };

  /* ------------------------------------------------------- 递条毛巾 --- */
  // 泡完澡他站在桶边滴水，你把毛巾递过去，他擦完再塞回你手里。
  // 毛巾只以「拿在手上」的形式出现——像素小人太小，盖在头上会糊成一块白，
  // 湿发、擦干这些靠水珠 + 泡泡台词 + 蒸汽来说。
  A.towel = function towel() {
    if (P.ui.modalOpen() || P.world.busy) return;
    approach({ x: 760, y: 880 }, async () => {
      const D = duo();
      if (!D.begin('towel')) return;

      // 一、他站在桶边，头发还滴着水
      D.npc({ x: 720, y: 872 }, '', 'left');
      D.hold('npc', '');
      D.cine({ x: 790, y: 806 }, 1.3);
      await D.wait(500);
      D.drip({ x: 724, y: 726 }, 3);
      D.say('npc', '……我没事，你先擦。');
      await D.wait(1400);

      // 二、你拿着毛巾过去，递到他手上
      D.hold('player', 'towel');
      await D.glide({ x: 866, y: 890 }, 760);
      D.player(null, '', 'left');
      D.cine({ x: 800, y: 812 }, 1.34);
      await D.wait(600);
      D.say('player', '把水擦干。');
      D.lean('player', 'left-soft');
      await D.wait(900);
      D.hold('player', '');
      D.hold('npc', 'towel');
      D.lean('player', '');
      P.audio && P.audio.sfx('water');
      await D.wait(500);

      // 三、水珠甩得到处都是
      D.drip({ x: 712, y: 722 }, 3);
      D.drip({ x: 748, y: 728 }, 2);
      D.steam({ x: 780, y: 760 }, 3);
      D.say('npc', '……嗯。');
      await D.wait(1500);
      D.bits({ x: 800, y: 730 }, 'spark', 2);
      await D.wait(900);

      // 四、擦完又把毛巾塞回你手里
      D.hold('npc', '');
      D.hold('player', 'towel');
      D.say('npc', '……该你了。');
      P.audio && P.audio.sfx('heart');
      await D.wait(700);
      D.lean('player', 'right-soft');
      D.bits({ x: 806, y: 730 }, 'heart', 3);
      await D.wait(1200);

      const first = once('towelDay');
      const gain = reward('towelDay', 2, 3);
      record('towel');
      const warm = (S().hearts || 0) >= 6;
      const lines = first
        ? [
          '水汽还没散。他站在桶边，头发上的水一滴一滴落在木地板上。',
          '你把毛巾递过去，他愣了一下才接，擦得很慢，像在拖时间。',
          '擦完他把毛巾叠回原来的样子，塞回你手里。',
          '“……该你了。”说完就低头，不看你。'
        ]
        : [
          '还是那条毛巾，还是那句「把水擦干」。',
          '这次他擦得快多了，然后把毛巾叠好递回来，等你接手。'
        ];
      if (warm) lines.push('递毛巾的时候，他的手指在你手背上多停了一下。');
      await P.ui.say(lines, { mode: 'rest', endLabel: '擦头发' });
      // 他刚擦完头发，别演完又把他塞回木桶里
      D.stay();
      D.end();
      if (gain.hearts) { P.showHint(`+${gain.hearts} 好感`, 1800); if (P.npc) P.npc.floatHearts(); }
      if (gain.energy) { P.showHint(`+${gain.energy} 体力`, 1600); }
      P.ui.task();
    });
  };

  /* ------------------------------------------------------- 他的位置 --- */
  // 客厅、澡堂、楼顶是他自己也会待着的地方：一到那儿，他就在自己的位置上
  const SEATS = {
    tvroom: { spot: { x: 668, y: 574 }, pose: 'seat', face: 'right' },
    bath: { spot: { x: 620, y: 692 }, pose: '', face: 'up' },
    roof: { spot: { x: 244, y: 812 }, pose: 'seat', face: 'up' },
    // 湖边的栈桥：他自己下午本来就会来钓鱼，所以只在他「该在湖边」的时段坐过去，
    // 不然早上他从农场瞬移到湖边就说不通了
    lake: { spot: { x: 1010, y: 780 }, pose: 'seat', face: 'left', scheduled: true }
  };
  // 夜里的小屋：他坐在床沿等你，床那个热点也会改成「一起睡」
  const BEDSIDE = { spot: { x: 470, y: 664 }, pose: '', face: 'left' };

  P.moments = { onEnter };
  function onEnter(scene) {
    if (!P.npc || !P.npc.summon) return;
    const late = (P.state.phase || 0) >= 2;
    const close = (P.state.hearts || 0) >= 4;
    const bedLabel = document.querySelector('.spot[data-action="bed"] .spot-label');
    if (bedLabel) {
      const want = late ? '一起睡' : '睡觉';
      if (bedLabel.textContent !== want) bedLabel.textContent = want;
    }
    if (P.world && P.world.refreshActions) P.world.refreshActions();
    // 夜里回小屋：他就在床边，给一句提示，免得没人发现床能一起睡
    if (scene === 'cottage' && late && close && P.state.flags.bedHintDay !== P.state.day) {
      P.state.flags.bedHintDay = P.state.day;
      setTimeout(() => {
        if (P.ui && P.ui.toast) P.ui.toast('他先把灯拧暗了 · 点床，可以一起睡', 'ui-heart');
      }, 900);
    }
    const seat = SEATS[scene] || (scene === 'cottage' && late && close ? BEDSIDE : null);
    if (!seat) return;
    // scheduled 的场景要跟着他的日程走
    if (seat.scheduled && P.npc.sceneFor && P.npc.sceneFor(P.state.phase || 0) !== scene) return;
    if (!P.npc.summon(scene, seat.spot)) return;
    // 用 npc.seat 记住这个姿态：干活的计时器和踱步都不会把它冲掉
    P.npc.seat(seat.pose, seat.face, seat.hold || '');
  }
})();
