/* 环境粒子
   每个时段飘的东西不一样：早晨是雾里的水汽，午后是花粉和蒲公英，
   傍晚是小飞虫，夜里是萤火虫。纯 DOM + CSS 动画，不占 canvas。 */
(function () {
  const SPEC = {
    0: { count: 18, cls: 'mote', dur: [14, 24], size: [5, 10], color: '#fff8e6' },
    1: { count: 16, cls: 'pollen', dur: [16, 26], size: [6, 12], color: '#ffeaa4' },
    2: { count: 14, cls: 'gnat', dur: [9, 16], size: [4, 7], color: '#f7d9b0' },
    3: { count: 20, cls: 'firefly', dur: [7, 13], size: [9, 16], color: '#e2ffab' }
  };

  let host = null;
  let current = -1;

  function ensure() {
    if (host) return host;
    host = document.getElementById('ambient');
    if (!host) {
      host = document.createElement('div');
      host.id = 'ambient';
      host.className = 'ambient';
      host.setAttribute('aria-hidden', 'true');
      (document.getElementById('stage') || document.body).appendChild(host);
    }
    return host;
  }

  function build(phase) {
    const spec = SPEC[phase] || SPEC[0];
    const box = ensure();
    box.dataset.kind = spec.cls;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < spec.count; i += 1) {
      const dot = document.createElement('i');
      const size = spec.size[0] + Math.random() * (spec.size[1] - spec.size[0]);
      dot.style.left = `${Math.random() * 100}%`;
      dot.style.top = `${6 + Math.random() * 80}%`;
      dot.style.width = `${size.toFixed(1)}px`;
      dot.style.height = `${size.toFixed(1)}px`;
      dot.style.setProperty('--c', spec.color);
      dot.style.setProperty('--dur', `${(spec.dur[0] + Math.random() * (spec.dur[1] - spec.dur[0])).toFixed(1)}s`);
      dot.style.setProperty('--delay', `${(-Math.random() * 12).toFixed(1)}s`);
      dot.style.setProperty('--dx', `${(Math.random() * 90 - 45).toFixed(0)}px`);
      dot.style.setProperty('--dy', `${(-60 - Math.random() * 120).toFixed(0)}px`);
      dot.style.setProperty('--o', (0.45 + Math.random() * 0.5).toFixed(2));
      frag.appendChild(dot);
    }
    box.replaceChildren(frag);
  }

  P.ambient = {
    refresh() {
      const phase = P.state ? P.state.phase : 0;
      if (phase === current) return;
      current = phase;
      build(phase);
    }
  };

  // applyPhase 里会重新调用；这里先挂一层，避免 core 依赖 ambient
  const base = P.applyPhase;
  P.applyPhase = function applyPhase() {
    if (base) base();
    P.ambient.refresh();
  };

  document.addEventListener('DOMContentLoaded', () => P.ambient.refresh());
  if (document.readyState !== 'loading') {
    setTimeout(() => P.ambient.refresh(), 0);
  }
})();
