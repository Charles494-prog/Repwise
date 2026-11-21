// Minimal CDP harness: serves www/ and drives headless Chromium (Brave/Chrome) at 390x844.
// No dependencies — uses Node's built-in http, child_process and WebSocket.
const http = require('node:http'), fs = require('node:fs'), path = require('node:path'), { spawn } = require('node:child_process'), os = require('node:os');
const ROOT = path.join(__dirname, '..', '..', 'www');
const BROWSERS = [process.env.CHROME, '/usr/bin/brave-browser', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].filter(Boolean);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };

function serve() {
  return new Promise(res => {
    const srv = http.createServer((req, r) => {
      const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]) === '/' ? 'index.html' : decodeURIComponent(req.url.split('?')[0]));
      if (!f.startsWith(ROOT) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
      r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
    }).listen(0, '127.0.0.1', () => res(srv));
  });
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

class Page {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map(); this.errors = []; this.logs = [];
    ws.onmessage = m => { const d = JSON.parse(m.data);
      if (d.id && this.pending.has(d.id)) { const { res, rej } = this.pending.get(d.id); this.pending.delete(d.id); d.error ? rej(new Error(d.error.message)) : res(d.result); }
      else if (d.method === 'Runtime.exceptionThrown') this.errors.push(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text);
      else if (d.method === 'Runtime.consoleAPICalled') { const t = d.params.args.map(a => a.value ?? a.description).join(' '); this.logs.push(`[${d.params.type}] ${t}`); if (d.params.type === 'error') this.errors.push(t); } }; }
  send(method, params = {}) { const id = ++this.id; this.ws.send(JSON.stringify({ id, method, params })); return new Promise((res, rej) => this.pending.set(id, { res, rej })); }
  async eval(expr) { const r = await this.send('Runtime.evaluate', { expression: `(async()=>{${expr}})()`, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error('eval: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text)); return r.result.value; }
  // Load the app with optional initial state (object or raw string), fake clock (ISO/ms) and timezone.
  async open({ state, raw, clock, tz, autoDialogs = true, inject } = {}) {
    const pre = [];
    if (inject) pre.push(inject);
    if (autoDialogs) pre.push(`window.confirm=()=>true;window.alert=()=>{};window.prompt=()=>null;`);
    if (raw !== undefined || state !== undefined) pre.push(`if(!sessionStorage.__seeded){localStorage.clear();${raw !== undefined ? `localStorage.setItem('gq',${JSON.stringify(raw)});` : `localStorage.setItem('gq',${JSON.stringify(JSON.stringify(state))});`}sessionStorage.__seeded=1}`);
    else pre.push(`if(!sessionStorage.__seeded){localStorage.clear();sessionStorage.__seeded=1}`);
    if (clock !== undefined) pre.push(`(()=>{const off=${new Date(clock).getTime()}-Date.now();const R=Date;class D extends R{constructor(...a){a.length?super(...a):super(R.now()+off)}static now(){return R.now()+off}};window.Date=D;window.__clockOff=off})();`);
    if (this._script) await this.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: this._script });
    this._script = (await this.send('Page.addScriptToEvaluateOnNewDocument', { source: pre.join('\n') })).identifier;
    await this.send('Emulation.setTimezoneOverride', { timezoneId: tz || '' }).catch(() => {});
    await this.send('Runtime.evaluate', { expression: 'sessionStorage.clear()' }).catch(() => {});
    this.errors = [];
    await this.send('Page.navigate', { url: this.base + '/index.html' }); await sleep(600); await this.ready();
  }
  async reload() { await this.send('Page.reload'); await sleep(600); await this.ready(); }
  // Wait until every app script has run (a fixed delay was flaky as the app grew).
  async ready() { for (let i = 0; i < 50; i++) { const r = await this.send('Runtime.evaluate', { expression: "typeof V!=='undefined'&&!!V.train&&typeof afSearch==='function'&&typeof startActivity==='function'", returnByValue: true }).catch(() => null); if (r?.result?.value) break; await sleep(100); } await sleep(150); }
  async shot(file) { const r = await this.send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(file, Buffer.from(r.data, 'base64')); }
}

async function launch() {
  const srv = await serve(), port = 9400 + Math.floor(Math.random() * 400), dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rw-e2e-'));
  const bin = BROWSERS.find(b => fs.existsSync(b)); if (!bin) throw new Error('No Chromium-based browser found; set CHROME=/path/to/chrome');
  const proc = spawn(bin, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${dir}`, '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--window-size=390,844', 'about:blank'], { stdio: 'ignore' });
  let ver; for (let i = 0; i < 50 && !ver; i++) { await sleep(150); ver = await fetch(`http://127.0.0.1:${port}/json/list`).then(r => r.json()).catch(() => null); }
  const t = ver.find(x => x.type === 'page');
  const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
  const page = new Page(ws); page.base = `http://127.0.0.1:${srv.address().port}`;
  await page.send('Runtime.enable'); await page.send('Page.enable');
  await page.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  page.close = async () => { try { try { ws.close(); } catch (e) {} if (process.platform === 'win32') { try { require('node:child_process').execSync(`taskkill /pid ${proc.pid} /T /F`, { stdio: 'ignore' }); } catch (e) {} } else proc.kill('SIGKILL'); srv.close(); fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {} };
  return page;
}

// A fully onboarded profile so tests can start inside the app.
function baseState(over = {}) {
  const now = Date.now();
  return Object.assign({ profile: { name: 'Tester', goal: 'cut', sex: 'm', age: 30, height: 180, weight: 90, build: 'average', activity: 1.375, deficit: 500, setTs: now - 864e5 * 3 },
    weights: [[now - 864e5 * 3, 90]], goals: { weight: { target: 85, start: 90, down: true, set: now - 864e5 * 3, done: null } }, startDate: null, quests: {} }, over);
}
module.exports = { launch, baseState, sleep };
