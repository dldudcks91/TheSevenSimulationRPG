(function (root) {
  'use strict';
  const D = root.DustlineData, E = root.DustlineEngine;
  const palettes = {
    plains: ['#f8e1bc', '#edc297', '#a9aa8a', '#b9ae84', '#b59162', '#857451'],
    canyon: ['#f9dec0', '#edbe9d', '#c7a285', '#c39674', '#bd7e59', '#865b45'],
    forest: ['#e8e5cf', '#d6d6b7', '#a5b5a0', '#839a85', '#627f72', '#465f58'],
    river: ['#e2ece0', '#d2d9b5', '#a1b2a4', '#8aada9', '#718f80', '#426760'],
    town: ['#f4e5cb', '#ecd3af', '#b7b9a6', '#c4b593', '#a39a7e', '#69746a']
  };
  class Scene {
    constructor(canvas, state, settings) {
      this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.state = state; this.settings = settings; this.time = 0; this.distance = 0;
      this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(canvas); this.resize();
    }
    resize() { const b = this.canvas.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1); this.w = b.width; this.h = b.height; this.canvas.width = Math.round(b.width * dpr); this.canvas.height = Math.round(b.height * dpr); this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    polygon(points, fill) { const c = this.ctx; c.beginPath(); points.forEach((p, i) => i ? c.lineTo(...p) : c.moveTo(...p)); c.closePath(); c.fillStyle = fill; c.fill(); }
    line(points, color, width = 2) { const c = this.ctx; c.beginPath(); points.forEach((p, i) => i ? c.lineTo(...p) : c.moveTo(...p)); c.strokeStyle = color; c.lineWidth = width; c.stroke(); }
    rect(x, y, w, h, color, radius = 0, stroke) { const c = this.ctx; c.beginPath(); c.roundRect(x, y, w, h, radius); c.fillStyle = color; c.fill(); if (stroke) { c.strokeStyle = stroke; c.lineWidth = 2; c.stroke(); } }
    circle(x, y, r, color) { const c = this.ctx; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = color; c.fill(); }
    tree(x, y, size, color, pine) { this.rect(x - 2, y - size * .5, 4, size * .5, color); if (pine) { this.polygon([[x, y - size], [x - size * .28, y - size * .3], [x + size * .28, y - size * .3]], color); this.polygon([[x, y - size * .8], [x - size * .35, y - size * .12], [x + size * .35, y - size * .12]], color); } else { this.circle(x, y - size * .68, size * .29, color); this.circle(x - size * .18, y - size * .53, size * .22, color); this.circle(x + size * .17, y - size * .55, size * .2, color); } }
    cactus(x, y, size, color) { const c = this.ctx; c.strokeStyle = color; c.lineWidth = size * .12; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - size); c.moveTo(x, y - size * .48); c.lineTo(x - size * .3, y - size * .48); c.lineTo(x - size * .3, y - size * .75); c.moveTo(x, y - size * .33); c.lineTo(x + size * .28, y - size * .33); c.lineTo(x + size * .28, y - size * .62); c.stroke(); }
    person(x, y, color, walk) { const c = this.ctx; this.circle(x, y - 17, 3.3, '#d7ae87'); this.rect(x - 3.3, y - 14, 6.6, 8, color, 1); const k = Math.sin(walk) * 2; this.line([[x - 1.5, y - 6], [x - 2 - k, y]], '#34434a', 2.4); this.line([[x + 1.5, y - 6], [x + 2 + k, y]], '#34434a', 2.4); }
    drawCar(x, y, car, width, moving, cargo) {
      const c = this.ctx, d = D.cars[car.type], w = width, body = 33, lev = car.level || 1;
      c.save(); c.translate(x, y + (moving ? Math.sin(this.time * 5 + x) * .65 : 0));
      this.rect(0, -8, w, 5, '#34434a', 1); this.rect(7, -body - 8, w - 14, body, d.color, 3, '#34434a');
      for (let l = 1; l < lev; l++) this.rect(7, -body - 8 - l * 23, w - 14, 24, d.color, 2, '#34434a');
      const top = -body - 8 - (lev - 1) * 23;
      this.rect(3, top - 4, w - 6, 5, '#3b4547', 2);
      for (let l = 0; l < lev; l++) { const yy = -body - 2 - l * 23; for (let j = 0; j < 3; j++) { this.rect(14 + j * (w - 35) / 3, yy, (w - 39) / 3, 12, '#eddcaa', 2, '#445050'); if (car.occupied > j && moving) this.circle(19 + j * (w - 35) / 3, yy + 6, 2, '#726154'); } }
      this.line([[10, -18], [w - 10, -18]], '#34434a55', 1);
      if (['freight', 'cold', 'workshop'].includes(car.type)) { for (let i = 0; i < Math.min(4, cargo); i++) { this.rect(13 + i * 14, top - 16, 12, 12, car.type === 'cold' ? '#d6e4d6' : '#caac78', 1, '#5d5e4a'); this.line([[18 + i * 14, top - 16], [18 + i * 14, top - 4]], '#797354', 1); } }
      if (car.type === 'guard') { c.fillStyle = '#ecd08c'; c.font = '18px Georgia'; c.fillText('★', w / 2 - 8, -15); }
      if (car.type === 'diner') { this.rect(w / 2 - 8, -27, 16, 10, '#e8cc8d', 2); c.fillStyle = '#5c6157'; c.font = '8px Georgia'; c.fillText('DINER', w / 2 - 12, -12); }
      for (const wheelX of [20, w - 20]) { this.circle(wheelX, 0, 7.5, '#34434a'); this.circle(wheelX, 0, 3, '#bcb393'); if (moving) { const a = this.time * 5; this.line([[wheelX + Math.cos(a) * 5, Math.sin(a) * 5], [wheelX - Math.cos(a) * 5, -Math.sin(a) * 5]], '#bcb393', 1.4); } }
      c.restore();
    }
    drawEngine(x, y, moving, width) {
      const c = this.ctx; c.save(); c.translate(x, y + (moving ? Math.sin(this.time * 5) * .5 : 0));
      this.rect(7, -50, 32, 42, '#526d70', 3, '#2f4146'); this.rect(3, -54, 40, 5, '#30454a', 2); this.rect(13, -45, 19, 17, '#efdcab', 2, '#30454a');
      this.rect(40, -35, width - 47, 26, '#527477', 6, '#2f4146'); this.rect(width - 32, -57, 12, 26, '#354b50', 2); this.rect(width - 35, -61, 18, 5, '#30454a', 2);
      this.rect(36, -8, width - 25, 5, '#2f4146', 1); this.polygon([[width - 6, -20], [width + 13, 1], [width - 8, 1]], '#394e50');
      this.circle(width - 8, -32, 4, '#efd494'); this.line([[50, -29], [width - 41, -29]], '#e0bd82', 2);
      for (const wx of [23, 54, width - 24]) { this.circle(wx, 0, wx === 23 ? 8 : 11, '#34484d'); this.circle(wx, 0, 3, '#ccbc96'); const a = moving ? this.time * 5 : 0; this.line([[wx + Math.cos(a) * 7, Math.sin(a) * 7], [wx - Math.cos(a) * 7, -Math.sin(a) * 7]], '#d3c5a5', 1.5); }
      this.line([[49, 0], [width - 18, 0]], '#d3c5a5', 3);
      if (this.settings().particles) for (let i = 0; i < 7; i++) { const life = (this.time * .42 + i / 7) % 1; c.globalAlpha = (1 - life) * .45; this.circle(width - 26 - life * (moving ? 120 : 28), -64 - life * 45, 4 + life * 17, '#fff7df'); } c.globalAlpha = 1;
      c.restore();
    }
    draw(dt) {
      const s = this.state(), settings = this.settings(), moving = s && s.phase === 'travel' && !s.paused && !s.result;
      this.time += settings.reducedMotion ? 0 : dt; if (moving && !settings.reducedMotion) this.distance += dt * 28 * Math.min(2.5, s.speed);
      const w = this.w, h = this.h, c = this.ctx; if (!w || !h) return;
      const e = s && s.segment ? D.edges.find(e => e.id === s.segment.edgeId) : null;
      const biome = e ? e.biome : s ? E.station(s.node).biome : 'plains', p = palettes[biome], rail = h * .77;
      const sky = c.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, p[0]); sky.addColorStop(1, p[1]); c.fillStyle = sky; c.fillRect(0, 0, w, h);
      this.circle(w * .72, h * .29, h * .105, '#fff2ce'); c.globalAlpha = .16; this.circle(w * .72, h * .29, h * .15, '#fff6d6'); c.globalAlpha = 1;
      for (let l = 0; l < 3; l++) { const baseline = h * (.49 + l * .09), amplitude = h * (.1 + l * .015); const points = [[-10, h]];
        for (let i = -1; i <= 20; i++) { const xx = i * w / 18, shift = this.distance * (.04 + l * .06); const yy = baseline + Math.sin((xx + shift) / 130 + l * 2) * amplitude + Math.sin((xx + shift) / 59) * amplitude * .35; points.push([xx, yy]); }
        points.push([w + 20, h]); this.polygon(points, p[2 + l]); }
      if (biome === 'canyon') for (let i = -1; i < 7; i++) { const x = ((i * 220 - this.distance * .19) % (w + 350) + w + 350) % (w + 350) - 150, y = h * .62;
        this.polygon([[x, y], [x + 14, y - 85], [x + 32, y - 87], [x + 36, y - 121], [x + 111, y - 119], [x + 124, y - 82], [x + 141, y - 76], [x + 165, y]], p[3]); this.line([[x + 25, y - 60], [x + 136, y - 60]], p[4], 2); }
      for (let i = 0; i < 20; i++) { const span = w + 250, x = ((i * 143 - this.distance * .35) % span + span) % span - 125, y = rail - 20 + Math.sin(i * 4.1) * 8;
        if (biome === 'forest') this.tree(x, y, 50 + (i % 4) * 12, p[5], true); else if (biome === 'canyon' || biome === 'plains') { if (i % 3 === 0) this.cactus(x, y, 29 + i % 4 * 4, p[5]); } else if (i % 3 === 0) this.tree(x, y, 42, p[5], false); }
      if (biome === 'river') { c.fillStyle = '#88b2af'; c.fillRect(0, rail + 20, w, h - rail); for (let i = 0; i < 10; i++) this.line([[i * 170 - this.distance % 70, rail + 43 + i % 3 * 18], [i * 170 + 65 - this.distance % 70, rail + 43 + i % 3 * 18]], '#c4d5b9', 2); }
      else { c.fillStyle = p[5]; c.fillRect(0, rail + 18, w, h - rail); c.fillStyle = '#dec6a0'; c.fillRect(0, rail + 18, w, 10); }
      if (s && s.phase === 'station') {
        const bx = w * .12, by = rail; this.rect(bx, by - 113, 145, 87, '#dbbe90', 2, '#68716a'); this.polygon([[bx - 10, by - 113], [bx + 73, by - 150], [bx + 155, by - 113]], '#718474');
        this.rect(bx + 55, by - 70, 30, 44, '#68716a', 1); this.rect(bx + 12, by - 81, 24, 30, '#f0dcae', 1, '#68716a'); this.rect(bx + 105, by - 81, 24, 30, '#f0dcae', 1, '#68716a');
        this.rect(bx + 10, by - 110, 125, 22, '#f5e6c5', 2); c.fillStyle = '#465854'; c.font = '600 12px "Malgun Gothic", sans-serif'; c.textAlign = 'center'; c.fillText(E.station(s.node).name, bx + 72, by - 95); c.textAlign = 'left';
        this.rect(bx - 18, by - 24, 184, 8, '#807c68', 2); this.person(bx + 155, by - 24, '#a86c50', 0); this.person(bx - 12, by - 24, '#53797b', 0);
      }
      this.rect(0, rail + 9, w, 5, '#4b5653'); this.line([[0, rail + 8], [w, rail + 8]], '#d2c7a3', 2);
      for (let i = -1; i < w / 25 + 1; i++) this.rect(i * 25 - (this.distance * .85 % 25), rail + 14, 16, 4, '#515a53', 1);
      const list = s ? s.cars : [{ type: 'freight', level: 1 }, { type: 'guard', level: 1 }, { type: 'diner', level: 1 }, { type: 'mail', level: 1 }];
      const unit = Math.min(107, (w * .72 - 110) / Math.max(3, list.length)); const total = list.length * (unit + 4) + 115, start = Math.max(28, w * .59 - total / 2), yy = rail + 1;
      list.forEach((car, i) => this.drawCar(start + i * (unit + 4), yy, car, unit, moving, s ? E.sumCargo(s) / Math.max(1, list.filter(c => D.cars[c.type].capacity).length) : 3));
      this.drawEngine(start + list.length * (unit + 4), yy, moving, 110);
      if (moving && s) { const n = Math.min(12, E.metrics(s).passengers); for (let i = 0; i < n; i++) { const phase = (this.time * .18 + i / n) % 1, xx = start + phase * (total - 105); this.person(xx, yy - 44 - ((list[Math.min(list.length - 1, Math.floor(phase * list.length))].level || 1) - 1) * 23, i % 2 ? '#be9a65' : '#53797b', this.time * 8 + i); } }
      c.fillStyle = '#f4e7c9aa'; c.fillRect(0, h - 1, w, 1);
      if (!settings.reducedMotion) for (let i = 0; i < 6; i++) { const xx = ((i * 273 - this.distance * 1.1) % (w + 300) + w + 300) % (w + 300) - 150; this.line([[xx, h - 15], [xx + 18, h - 20], [xx + 31, h - 16]], biome === 'forest' ? '#b4b596' : '#d2b28b', 2); }
    }
    destroy() { this.observer.disconnect(); }
  }
  root.DustlineScene = Scene;
})(globalThis);
