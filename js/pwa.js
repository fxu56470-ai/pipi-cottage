/* 装到桌面
   把 world.html 变成可以离线打开的「应用」：
   1. 注册 service worker（http/https 下才有效，file:// 直接跳过）
   2. Chrome / Edge 支持安装时，右下角冒一个「装到桌面」的小按钮
   3. 已经装在桌面里运行（standalone）就什么都不显示 */
(function () {
  if (!('serviceWorker' in navigator)) return;
  if (!/^https?:$/.test(location.protocol)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });

  const standalone = window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
  if (standalone) return;
  // 桌面上浏览器菜单里就能装，不用再占一块屏幕
  const touch = window.matchMedia('(pointer: coarse)').matches;
  if (!touch) return;

  let prompt = null;
  const style = document.createElement('style');
  style.textContent = `
    .pwa-install {
      position: fixed; right: 14px; bottom: 14px; z-index: 400;
      display: inline-flex; align-items: center; gap: 8px;
      padding: 10px 16px 10px 13px; border: 1px solid #8a6a78; border-radius: 999px;
      background: linear-gradient(#3a2c38, #2b2029); color: #ffeed8; font-weight: 800;
      font-size: 13px; cursor: pointer; box-shadow: 0 8px 22px #120c1399;
      font-family: inherit; opacity: 0; transform: translateY(10px);
      transition: opacity .3s, transform .3s;
    }
    .pwa-install.show { opacity: 1; transform: none; }
    .pwa-install i { font-style: normal; font-size: 15px; }
    .pwa-install[hidden] { display: none; }
    /* 手机上底部有任务条和方向键，抬到右上角别压住 */
    @media (max-width: 760px), (max-height: 560px) {
      .pwa-install { bottom: auto; top: 64px; right: 10px; left: auto; padding: 8px 13px 8px 11px; font-size: 12px; }
    }
  `;
  document.head.appendChild(style);

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'pwa-install';
  button.hidden = true;
  button.innerHTML = '<i>⤓</i> 装到桌面';
  button.addEventListener('click', async () => {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') button.remove();
    prompt = null;
  });
  document.body.appendChild(button);

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    prompt = event;
    button.hidden = false;
    requestAnimationFrame(() => button.classList.add('show'));
    // 玩家一直没点就当没提过，别一直挂着
    setTimeout(() => button.classList.remove('show'), 12000);
  });

  window.addEventListener('appinstalled', () => button.remove());
})();
