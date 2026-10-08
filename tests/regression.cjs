const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');
const source = fs.readFileSync(require('node:path').join(__dirname, '../index.html'), 'utf8').split('<script>')[1].split('</script>')[0];

function boot(saved = {}, options = {}) {
  const elements = new Map(), urls = [], revoked = [], frames = [];
  let draws = 0;
  const context = new Proxy({}, { get: (_, key) => {
    if (key === 'measureText') return text => ({ width: String(text).length * 15 });
    if (key === 'createLinearGradient') return () => ({ addColorStop() {} });
    return () => {};
  }, set: () => true });
  function element() {
    return {
      children: [], dataset: {}, style: { setProperty() {} }, hidden: false, disabled: false,
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
  return { run: code => vm.runInContext(code, sandbox), elements, data, urls, revoked, frames, draws: () => draws };
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
