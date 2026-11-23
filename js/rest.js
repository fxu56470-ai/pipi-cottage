/* 发呆
   湖边那张椅子什么也不干，就是坐着看水。
   游戏里「等作物长好」本来只能睡觉，发呆给了另一种花时间的方式：
   花一格时间换回一点体力，顺便看几句只在这个时段才会出现的字。 */
(function () {
  const A = (P.actions = P.actions || {});
  const SEAT = { x: 1000, y: 606 };   // 左边那把椅子前面

  const LINES = {
    0: [
      '早上的湖面像一块还没擦干净的玻璃，雾在上面慢慢退。',
      '有只白鹭站在浅水里，站了很久，也没抓到鱼。它好像也不着急。',
      '风从背后过来，带着草的味道。你把下巴搁在膝盖上。'
    ],
    1: [
      '太阳把木栈道晒得发烫。水面亮得晃眼，得眯起来看。',
      '鱼在水下翻了个身，一圈圈的光散开，又合上。',
      '远处有人在割草，机器声嗡嗡的，听着听着就困了。'
    ],
    2: [
      '太阳掉到山那边去了，天变成橘子汽水的颜色。',
      '水鸟一群群往回飞。它们每天走同一条路，比人准时。',
      '湖面把晚霞揉碎了，一片一片地漂着。'
    ],
    3: [
      '夜里湖是黑的，只有月亮在水里晃。',
      '听见水声，但看不见水。这样反而更好听。',
      '星星比城里多得多。你数到二十七颗就忘了数到哪儿。'
    ]
  };

  // 触发过一次之后才会出现的、更安静的话
  const LATE = {
    0: '你开始分得清三种鸟叫了。有一种特别吵的，总在他干活的时候叫。',
    1: '你想起他说过，等这块地不用你操心的时候，就天天来这儿坐着。',
    2: '你把手放在旁边的空位上，木板还是热的。',
    3: '你有点想知道，他一个人在这儿坐着的时候，会想什么。'
  };

  let busy = false;

  function ensureDoze() {
    let node = document.getElementById('doze');
    if (node) return node;
    node = document.createElement('div');
    node.id = 'doze';
    node.className = 'doze';
    node.setAttribute('aria-hidden', 'true');
    node.innerHTML = '<i></i><i></i><i></i><i></i><i></i><i></i>';
    const stage = document.getElementById('stage');
    if (stage) stage.appendChild(node);
    return node;
  }

  function wait(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

  async function sit() {
    const s = P.state;
    const phase = s.phase;
    const now = ensureDoze();
    now.dataset.phase = String(phase);
    now.classList.add('show');
    P.world && P.world.setPose('sit');
    P.audio && P.audio.sfx('water');
    await wait(900);

    const pool = LINES[phase] || LINES[0];
    const picked = pool[(s.stats.rested || 0) % pool.length];
    const lines = [{ who: '旁白', text: picked }];

    if ((s.stats.rested || 0) >= 2 && (s.stats.rested || 0) % 3 === 2) {
      lines.push({ who: '旁白', text: LATE[phase] || LATE[0] });
    }

    // 他在旁边的时候，一起安静一会儿
    const heIsHere = P.npc && P.npc.here && P.npc.sceneFor && P.npc.sceneFor() === 'lake' && !P.npc.quiet;
    if (heIsHere && phase >= 2) {
      P.audio && P.audio.sfx('heart');
      lines.push({ who: '闷葫芦', text: '……你坐着的时候，呼吸声很轻。' });
      lines.push({ who: '旁白', text: '他也在旁边坐下了。两个人谁也没说话，湖面的光在动。' });
      if (!s.flags.quietTogether) {
        s.flags.quietTogether = true;
        s.hearts = (s.hearts || 0) + 1;
        P.ui && P.ui.toast('一起发呆了', 'ui-heart');
      }
    }

    await P.ui.say(lines, { mode: 'rest' });
    now.classList.remove('show');
    P.world && P.world.setPose('');

    // 发呆花掉一格时间，换回一点体力
    s.stats.rested = (s.stats.rested || 0) + 1;
    const before = s.energy;
    s.energy = Math.min(s.energyMax, s.energy + 2);
    P.spend(0, 1);
    if (s.energy > before) P.ui && P.ui.toast(`+${s.energy - before} 体力`, 'ui-drop');
    P.daily && P.daily.bump('rest');
    P.ui && P.ui.hud();
    P.ui && P.ui.task();
    P.save();
  }

  A.rest = function rest() {
    if (busy || (P.ui && P.ui.modalOpen())) return;
    P.ui && P.ui.finishTyping && P.ui.finishTyping();
    busy = true;

    const run = async () => {
      try { await sit(); } finally { busy = false; }
    };
    // 已经站在椅子边就坐下，否则先走过去（walkTo 是用回调通知到位的）
    const near = P.world.pos && Math.hypot(P.world.pos.x - SEAT.x, P.world.pos.y - SEAT.y) < 70;
    if (near) { run(); return; }
    const ok = P.world.walkTo(SEAT.x, SEAT.y, run);
    if (!ok) { busy = false; P.showHint && P.showHint('这边过不去，往栈道上再走两步'); }
  };

  P.rest = { sit, SEAT };
})();
