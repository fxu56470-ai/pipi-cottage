/* 天气
   晴天、阴天、下雨。雨天不用浇水——这是这块地唯一会替你干活的天气。
   每天的天气在睡觉时掷一次，第 1、2 天固定晴，先把人哄熟了再说。 */
(function () {
  const KINDS = {
    sun: { name: '晴', mark: '☀', note: '天很干净，云薄得能看见后面的蓝。' },
    cloud: { name: '阴', mark: '☁', note: '云压得低，风里有股水味。' },
    rain: { name: '雨', mark: '☂', note: '下了一整夜，土是软的，地不用浇了。' }
  };

  function rollWeather(prev, day) {
    if (day <= 2) return 'sun';
    const r = Math.random();
    if (prev === 'rain') return r < 0.72 ? 'sun' : 'cloud';
    if (prev === 'cloud') return r < 0.42 ? 'sun' : r < 0.74 ? 'cloud' : 'rain';
    return r < 0.6 ? 'sun' : r < 0.87 ? 'cloud' : 'rain';
  }

  function layer() {
    let node = document.getElementById('rain');
    if (node) return node;
    node = document.createElement('div');
    node.id = 'rain';
    node.className = 'rain';
    node.setAttribute('aria-hidden', 'true');
    const stage = document.getElementById('stage');
    if (stage) stage.appendChild(node);
    return node;
  }

  /* 下不下雨、在哪能看见雨，是两件事：
     雨丝只在露天的地方（农场、湖边、楼顶）出现，
     屋里只在窗户那一片留一层水痕。 */
  const OUTDOOR = ['farm', 'lake', 'roof'];
  const WINDOWS = {
    cottage: { left: 306, top: 106, width: 346, height: 188 },
    tvroom: { left: 528, top: 142, width: 300, height: 208 },
    bath: { left: 1256, top: 160, width: 172, height: 300 }
  };

  function windowRain(sceneKey) {
    const box = WINDOWS[sceneKey];
    if (!box) return null;
    const scene = document.querySelector(`.scene[data-scene="${sceneKey}"]`);
    if (!scene) return null;
    let node = scene.querySelector('.rain-win');
    if (!node) {
      node = document.createElement('i');
      node.className = 'rain-win';
      node.setAttribute('aria-hidden', 'true');
      node.style.left = `${box.left}px`;
      node.style.top = `${box.top}px`;
      node.style.width = `${box.width}px`;
      node.style.height = `${box.height}px`;
      scene.appendChild(node);
    }
    return node;
  }

  let lastKind = '';
  P.WEATHER = KINDS;

  P.weather = {
    get() { return (P.state && P.state.weather) || 'sun'; },
    info() { return KINDS[this.get()] || KINDS.sun; },
    is(kind) { return this.get() === kind; },
    /* 照着“现在在哪”决定雨画在哪儿 */
    syncRain() {
      const kind = this.get();
      const sceneKey = (P.world && P.world.current) || 'cottage';
      const outdoor = OUTDOOR.includes(sceneKey);
      const rain = layer();
      if (rain) rain.classList.toggle('on', kind === 'rain' && outdoor);
      Object.keys(WINDOWS).forEach((key) => {
        const node = windowRain(key);
        if (node) node.classList.toggle('on', kind === 'rain' && key === sceneKey);
      });
      P.audio && P.audio.indoor && P.audio.indoor(!outdoor);
    },
    roll(prevDay) {
      const s = P.state;
      s.weather = rollWeather(s.weather, s.day);
      return s.weather;
    },
    apply() {
      const kind = this.get();
      const changed = kind !== lastKind;
      lastKind = kind;
      const stage = document.getElementById('stage');
      if (stage) stage.dataset.weather = kind;
      const mark = document.getElementById('weatherMark');
      if (mark) {
        const info = KINDS[kind] || KINDS.sun;
        mark.textContent = info.mark;
        mark.title = info.name;
        mark.hidden = kind === 'sun';
      }
      this.syncRain();
      P.audio && P.audio.rain && P.audio.rain(kind === 'rain');
      // 天变了，他会换个地方待着（下雨就不站在露天的地里了）
      if (changed && P.npc && P.npc.enter && P.world) {
        setTimeout(() => { if (P.npc && P.world) P.npc.enter(P.world.current); }, 700);
      }
    },
    // 雨天：睡觉时把地都算浇过
    waterAll() {
      if (!this.is('rain')) return 0;
      let n = 0;
      P.state.plots.forEach((plot) => {
        if (plot.seed && !plot.watered) { plot.watered = true; n += 1; }
      });
      return n;
    }
  };
})();
