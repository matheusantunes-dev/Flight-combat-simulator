// Testa a "tela remota": uma aba faz de PC (desenha e transmite), outra faz de celular (só mostra e manda o giroscópio).
// Sinalização por BroadcastChannel (?rede=local); o vídeo vai por WebRTC de verdade entre as duas abas.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const URL0 = (process.env.FCS_URL || 'http://localhost:8080/index.html').split('?')[0];
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
if (process.env.LIBS) {
  const lib = (f) => readFileSync(process.env.LIBS + '/' + f, 'utf8');
  await ctx.route(/three\.min\.js|GLTFLoader\.js|meshopt_decoder\.mjs|fonts\.g|esm\.run\/qrcode/, (r) => {
    const u = r.request().url();
    const f = u.includes('three.min') ? 'three.min.js' : u.includes('GLTFLoader') ? 'GLTFLoader.js' : u.includes('meshopt') ? 'meshopt_decoder.mjs' : null;
    return f ? r.fulfill({ body: lib(f), contentType: 'application/javascript', headers: { 'Access-Control-Allow-Origin': '*' } }) : r.fulfill({ status: 404, body: '' });
  });
}
const errs = [];
const pc = await ctx.newPage(); pc.on('pageerror', (e) => errs.push('pc: ' + e));
await pc.goto(URL0 + '?rede=local');
await pc.waitForFunction(() => window.__tomcat && !document.querySelector('#go').disabled, null, { timeout: 120000 });
await pc.click('.tabs button[data-tab=opts]'); await pc.click('#ctlOpen'); await pc.waitForTimeout(200);
await pc.click('#rsStart');
await pc.waitForFunction(() => document.querySelector('#rsCode').textContent.length >= 4, null, { timeout: 20000 });
const code = await pc.textContent('#rsCode');
const link = await pc.textContent('#rsLink');
const ok = { linkTemCodigo: link.includes('tela=' + code) };

const cel = await ctx.newPage(); cel.on('pageerror', (e) => errs.push('cel: ' + e));
await cel.setViewportSize({ width: 800, height: 400 });
await cel.goto(URL0 + '?tela=' + code + '&rede=local');
await cel.waitForSelector('#rsvVR', { state: 'visible', timeout: 120000 });
ok.celularNaoDesenha = await cel.evaluate(() => getComputedStyle(document.querySelector('#gl')).display === 'none');
await cel.click('#rsvVR');
await pc.waitForFunction(() => __tomcat.RS.active, null, { timeout: 30000 });
ok.pcTransmitindo = true;
ok.pcNoTamanhoDoCelular = await pc.evaluate(() => { const r = __tomcat.RS; return r.comp.width === r.view.w && r.vr === true; });
await cel.waitForFunction(() => { const v = document.querySelector('#rsvVid'); return v.videoWidth > 0 && v.srcObject && v.srcObject.getAudioTracks().length >= 0; }, null, { timeout: 30000 });
ok.videoChegou = true;
ok.temSom = await cel.evaluate(() => document.querySelector('#rsvVid').srcObject.getAudioTracks().length > 0);
// celular vira a cabeça (giroscópio) → o PC recebe a pose
await cel.evaluate(async () => {
  const fire = (a, b, g) => window.dispatchEvent(Object.assign(new Event('deviceorientation'), { alpha: a, beta: b, gamma: g }));
  for (let i = 0; i < 10; i++) { fire(0, 0, 90); await new Promise((r) => setTimeout(r, 30)); }
  for (let i = 0; i < 20; i++) { fire(40, 0, 90); await new Promise((r) => setTimeout(r, 30)); }
});
await pc.waitForTimeout(500);
ok.poseChegouNoPC = await pc.evaluate(() => Math.abs(__tomcat.VR.rel.w) < 0.995);
await cel.waitForTimeout(800);
ok.imagemNosDoisOlhos = await cel.evaluate(() => { const c = document.querySelector('#rsvCv'), x = c.getContext('2d'); const px = (u, v) => [...x.getImageData(Math.floor(c.width * u), Math.floor(c.height * v), 1, 1).data].slice(0, 3).reduce((a, b) => a + b); return px(0.25, 0.3) > 30 && px(0.75, 0.3) > 30; });
ok.semAvisoDeTravado = await cel.evaluate(() => !/parou/.test(document.querySelector('#rsvMsg').textContent));
// PC parar → o celular percebe
await pc.click('#rsStart');
ok.pcParou = await pc.evaluate(() => !__tomcat.RS.active && __tomcat.RS.role === null);
ok.voltouTelaNormal = await pc.evaluate(() => !__tomcat.VR.on);
ok.semErros = errs.length === 0;
console.log(JSON.stringify(ok), errs.slice(0, 5));
await b.close();
if (Object.values(ok).every(Boolean)) console.log('OK: tela remota passou'); else { console.log('FALHOU'); process.exit(1); }
