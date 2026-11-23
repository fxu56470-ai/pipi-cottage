/* 屁屁小屋 · 启动：读档、初始化各模块、开场白 */
(function () {
  const P = window.P;

  function boot() {
    const params = new URLSearchParams(location.search);
    let fromFoyer = false;
    try { fromFoyer = sessionStorage.getItem('pipi-from-foyer') === '1'; } catch (_) {}
    if (params.get('fresh') === '1') P.wipe();
    const saved = P.load();
    const fresh = !saved;
    P.state = saved || P.newState();
    if (fromFoyer) {
      P.state.flags.intro = true;
      P.save();
      try { sessionStorage.removeItem('pipi-from-foyer'); } catch (_) {}
    }

    P.ui.init();
    P.world.init();
    P.farm.init();
    P.fishingInit && P.fishingInit();
    P.npc.init();
    P.story.init();
    P.world.enterFromState();
    P.npc.place(P.world.current);
    P.applyPhase();
    P.ui.hud();
    P.farm.paint();
    P.ui.task();

    if (fresh && !fromFoyer) setTimeout(intro, 420);

    document.addEventListener('pointerdown', () => P.audio.start(), { once: true });
    window.addEventListener('pagehide', () => P.save());
    document.addEventListener('visibilitychange', () => { if (document.hidden) P.save(); });
  }

  async function intro() {
    await P.ui.say([
      { who: '旁白', text: '昨天他说要给你一个世界。今天早上，木头的味道还没散干净，窗外的天刚亮。' },
      { who: '旁白', text: '床边有人坐了一会儿才站起来，好像怕吵醒你。' },
      { who: '闷葫芦', text: '醒了？' },
      { who: '闷葫芦', text: '外面给你留了块地，是这整个农场里最大的一块。我量过。' },
      { who: '闷葫芦', text: '从门口出去就能看到。……我先去把水桶提过来。' }
    ], { endLabel: '出门看看' });
    P.showHint('点地面走动，右下角可以出门', 4200);
    P.story.target();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
