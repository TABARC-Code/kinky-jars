const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');
const source = fs.readFileSync(require('node:path').join(__dirname, '../index.html'), 'utf8').split('<script>')[1].split('</script>')[0];

function boot(saved = {}, options = {}) {
  const elements = new Map(), urls = [], revoked = [], frames = [];
  let draws = 0;
  const context = new Proxy({}, { get: (_, key) => {
    if (key === 'fillText' && options.texts) return text => options.texts.push(text);
    if (key === 'measureText') return text => ({ width: String(text).length * 15 });
    if (key === 'createLinearGradient') return () => ({ addColorStop() {} });
    return () => {};
  }, set: () => true });
  function element() {
    const el = {
      children: [], classes: new Set(), classList: { toggle(name, on) { on ? this.owner.classes.add(name) : this.owner.classes.delete(name); } }, dataset: {}, style: { setProperty() {} }, hidden: false, disabled: false,
      value: '', textContent: '', listeners: {}, attrs: {}, nodes: {},
      setAttribute(k, v) { this.attrs[k] = String(v); }, removeAttribute(k) { delete this[k]; },
      appendChild(child) { this.children.push(child); },
      querySelector(key) { return this.nodes[key] ||= element(); },
      addEventListener(key, fn) { this.listeners[key] = fn; },
      getContext() { draws++; return context; },
      toBlob(fn) { fn(options.nullBlob ? null : new Blob(['png'])); },
      focus() { document.activeElement = this; },
      showModal() { this.open = true; },
      close() { this.open = false; this.listeners.close?.(); },
      getBoundingClientRect() { return { left: 0, right: 500, top: 0, bottom: 500 }; }
    };
    el.classList.owner = el;
    return el;
  }
  const document = {
    getElementById: id => { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); },
    createElement: element, documentElement: element(), activeElement: null,
    fonts: { load: () => Promise.resolve(), ready: options.fontReady || Promise.resolve() }
  };
  const data = new Map(Object.entries(saved));
  const sandbox = {
    document, localStorage: {
      getItem: key => data.get(key) ?? null,
      setItem: (key, value) => { if (options.blockStorage) throw Error('blocked'); data.set(key, value); },
      removeItem: key => { if (options.blockStorage) throw Error('blocked'); data.delete(key); }
    },
    requestAnimationFrame: fn => frames.push(fn), addEventListener() {}, scrollTo() {},
    confirm: () => true, matchMedia: () => ({ matches: false }),
    navigator: options.navigator || {}, Blob, File,
    URL: { createObjectURL: () => { const url = 'blob:' + urls.length; urls.push(url); return url; }, revokeObjectURL: url => revoked.push(url) }
  };
  vm.createContext(sandbox); vm.runInContext(source, sandbox);
  return { document, run: code => vm.runInContext(code, sandbox), elements, data, urls, revoked, frames, draws: () => draws };
}

test('invalid saved fields fall back safely and ratings stay within range', () => {
  const app = boot({ 'kinkjars-v1': JSON.stringify({ name: null, color: 123, answers: [6, -1, '5', true, 5] }) });
  assert.equal(app.run('state.name'), '');
  assert.equal(app.run('state.color'), '#e63946');
  assert.equal(app.run('Object.values(state.answers).filter(Boolean).length'), 1);
  assert.equal(app.run('state.answers.choked'), 5);
});

test('legacy answers migrate by frozen IDs, even after questions move', () => {
  const app = boot({ 'kinkjars-v1': JSON.stringify({ name: 'Matt', answers: [5, 2] }) });
  app.run('QUESTIONS.reverse(); state = cleanState({answers:[5,2]}); persist()');
  const saved = JSON.parse(app.data.get('kinkyjars-v2'));
  assert.equal(saved.answers.dom, 5);
  assert.equal(saved.answers.sub, 2);
  assert.equal(app.data.has('kinkjars-v1'), false);
});

test('malformed JSON and blocked writes leave a usable form with a message', () => {
  const app = boot({ 'kinkyjars-v2': '{oops' }, { blockStorage: true });
  assert.match(app.elements.get('status').textContent, /couldn't be read/);
  app.run('persist()');
  assert.match(app.elements.get('status').textContent, /couldn't save/);
});

test('all presets choose the stronger text contrast', () => {
  const app = boot();
  for (const colour of app.run('PRESETS')) {
    const contrast = app.run(`(() => {const l=luminance(hexToRgb("${colour}"));const f=luminance(hexToRgb(textColour(hexToRgb("${colour}"))));return (Math.max(l,f)+.05)/(Math.min(l,f)+.05);})()`);
    assert.ok(contrast >= 4.5, colour + ': ' + contrast);
  }
});

test('name changes redraw only the poster', () => {
  const app = boot(), before = app.draws();
  app.run('state.name="Matt"; render()');
  assert.equal(app.draws() - before, 1);
});

test('failed PNG encoding reports failure and re-enables both buttons', async () => {
  const app = boot({}, { nullBlob: true });
  await app.run('save()');
  assert.match(app.elements.get('status').textContent, /couldn't be prepared/);
  assert.equal(app.elements.get('save').disabled, false);
  assert.equal(app.elements.get('saveBar').disabled, false);
  assert.equal(app.urls.length, 0);
});

test('exports reject overlapping saves and release old URLs', async () => {
  const app = boot();
  await Promise.all([app.run('save()'), app.run('save()')]);
  assert.equal(app.urls.length, 1);
  assert.equal(app.elements.get('modal').open, true);
  app.elements.get('modal').close();
  await app.run('save()');
  assert.equal(app.urls.length, 2);
  assert.deepEqual(app.revoked, ['blob:0']);
});

test('sharing uses its own click and cancellation keeps the download available', async () => {
  let shares = 0;
  const app = boot({}, { navigator: {
    canShare: () => true,
    share: async () => { shares++; throw Object.assign(Error('cancelled'), { name: 'AbortError' }); }
  } });
  await app.run('save()');
  assert.equal(shares, 0);
  await app.elements.get('shareImage').onclick();
  assert.equal(shares, 1);
  assert.equal(app.elements.get('shareImage').disabled, false);
  assert.equal(app.elements.get('downloadImage').href, 'blob:0');
});

test('clear removes both storage generations without writing empty data back', () => {
  const app = boot({ 'kinkjars-v1': '{"answers":[5]}' });
  app.run('persist()');
  app.elements.get('reset').onclick();
  assert.equal(app.data.size, 0);
  assert.equal(app.run('Object.values(state.answers).some(Boolean)'), false);
});


test('export does not encode until fonts are ready', async () => {
  let resolveFonts;
  const fontReady = new Promise(resolve => { resolveFonts = resolve; });
  const app = boot({}, { fontReady });
  const saving = app.run('save()');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(app.urls.length, 0);
  assert.equal(app.elements.get('save').disabled, true);
  resolveFonts();
  await saving;
  assert.equal(app.urls.length, 1);
});

test('poster footer reports how many jars are filled', () => {
  const texts = [];
  const app = boot({}, { texts });
  app.run('state.answers.dom = 3; state.answers.sub = 5; drawPoster(document.createElement("canvas"), 1);');
  assert.ok(texts.includes('2 of 28 jars filled'), texts.join(' | '));
});

test('easy-read font preference applies, persists on its own key, and survives Clear', () => {
  const app = boot({ 'kinkjars-prefs': JSON.stringify({ easy: true }) });
  assert.ok(app.document.documentElement.classes.has('easy'));
  app.elements.get('easy').listeners.change({ target: { checked: false } });
  assert.ok(!app.document.documentElement.classes.has('easy'));
  assert.equal(JSON.parse(app.data.get('kinkjars-prefs')).easy, false);
  app.elements.get('easy').listeners.change({ target: { checked: true } });
  app.elements.get('reset').onclick();
  assert.equal(JSON.parse(app.data.get('kinkjars-prefs')).easy, true);
});

test('a corrupt preference falls back to the standard font', () => {
  const app = boot({ 'kinkjars-prefs': '{nope' });
  assert.ok(!app.document.documentElement.classes.has('easy'));
});

test('not-for-me is validated, exclusive with ratings, and shown on the poster', () => {
  const texts = [];
  const app = boot({ 'kinkyjars-v2': JSON.stringify({ answers: { dom: 3, sub: 0 }, no: { dom: true, sub: true, bogus: true, switch: 'yes' } }) }, { texts });
  // dom has a rating, so its flag is dropped; unknown IDs and non-true values are ignored
  assert.deepEqual(JSON.parse(app.run('JSON.stringify(state.no)')), { sub: true });
  app.run('state.answers.dom = 0; state.no.dom = true; drawPoster(document.createElement("canvas"), 1);');
  assert.ok(texts.includes('0 of 28 jars filled · 2 not for me'), texts.join(' | '));
});

test('rating a jar clears not-for-me, and not-for-me clears the rating', () => {
  const app = boot();
  const q = app.elements.get('questions').children[0];
  q.nodes['.nope'].onclick();
  assert.equal(app.run('state.no.dom'), true);
  q.nodes['.scale'].children[2].onclick();
  assert.equal(app.run('state.no.dom'), undefined);
  assert.equal(app.run('state.answers.dom'), 3);
  q.nodes['.nope'].onclick();
  assert.equal(app.run('state.answers.dom'), 0);
  assert.equal(app.run('state.no.dom'), true);
  q.nodes['.nope'].onclick();
  assert.equal(app.run('state.no.dom'), undefined);
});

test('clear removes not-for-me flags too', () => {
  const app = boot({ 'kinkyjars-v2': JSON.stringify({ no: { dom: true } }) });
  assert.equal(app.run('state.no.dom'), true);
  app.elements.get('reset').onclick();
  assert.deepEqual(JSON.parse(app.run('JSON.stringify(state.no)')), {});
});

test('age gate opens until confirmed, cannot be escaped, and remembers a yes', () => {
  const app = boot();
  const gate = app.elements.get('ageGate');
  assert.equal(gate.open, true);
  let prevented = false;
  gate.listeners.cancel({ preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  app.elements.get('ageYes').onclick();
  assert.equal(gate.open, false);
  assert.equal(app.data.get('kinkjars-18'), 'yes');
  assert.notEqual(boot({ 'kinkjars-18': 'yes' }).elements.get('ageGate')?.open, true);
});

test('age gate still works when storage is blocked', () => {
  const app = boot({}, { blockStorage: true });
  assert.equal(app.elements.get('ageGate').open, true);
  app.elements.get('ageYes').onclick();
  assert.equal(app.elements.get('ageGate').open, false);
});

test('palette ids are validated and an unknown one falls back to a single colour', () => {
  assert.equal(boot({ 'kinkyjars-v2': JSON.stringify({ palette: 'trans' }) }).run('state.palette'), 'trans');
  assert.equal(boot({ 'kinkyjars-v2': JSON.stringify({ palette: 'nope' }) }).run('state.palette'), null);
  assert.equal(boot({ 'kinkyjars-v2': JSON.stringify({ palette: 7 }) }).run('state.palette'), null);
});

test('every palette uses valid hex colours and a usable accent', () => {
  const app = boot();
  const palettes = JSON.parse(app.run('JSON.stringify(PALETTES)'));
  assert.ok(palettes.length >= 11);
  assert.equal(new Set(palettes.map(p => p.id)).size, palettes.length);
  for (const p of palettes) {
    assert.match(p.accent, /^#[0-9a-f]{6}$/);
    assert.ok(p.colours.length >= 2, p.id);
    for (const c of p.colours) assert.match(c, /^#[0-9a-f]{6}$/, p.id);
  }
});

test('jars cycle through the palette; a single colour still works', () => {
  const app = boot();
  app.run('setPalette("bi")');
  assert.equal(app.run('state.palette'), 'bi');
  assert.equal(app.run('state.color'), '#d60270');
  assert.deepEqual(JSON.parse(app.run('JSON.stringify([0, 1, 2, 3, 4].map(jarRgb))')), [[214, 2, 112], [155, 79, 150], [0, 56, 168], [214, 2, 112], [155, 79, 150]]);
  app.run('setColor("#112233")');
  assert.equal(app.run('state.palette'), null);
  assert.deepEqual(JSON.parse(app.run('JSON.stringify(jarRgb(5))')), [17, 34, 51]);
});

test('choosing the same palette again switches it off, and Clear keeps the palette', () => {
  const app = boot();
  const btn = app.elements.get('pride').children.find(b => b.dataset.id === 'pan');
  btn.onclick();
  assert.equal(app.run('state.palette'), 'pan');
  app.elements.get('reset').onclick();
  assert.equal(app.run('state.palette'), 'pan');
  btn.onclick();
  assert.equal(app.run('state.palette'), null);
});

test('the version constant matches the newest line of the history comment', () => {
  const head = fs.readFileSync(require('node:path').join(__dirname, '../index.html'), 'utf8').split('<script>')[1].split('*/')[0];
  const newest = head.match(/^\s+(\d+\.\d+\.\d+)\s/m)[1];
  assert.equal(boot().run('VERSION'), newest);
});

test('the poster small print switches to the easy-read face with the toggle', () => {
  const app = boot();
  app.elements.get('easy').listeners.change({ target: { checked: true } });
  assert.match(app.run('smallFont(600, 30)'), /Atkinson Hyperlegible/);
  app.elements.get('easy').listeners.change({ target: { checked: false } });
  assert.match(app.run('smallFont(600, 30)'), /^600 30px Oswald/);
});
