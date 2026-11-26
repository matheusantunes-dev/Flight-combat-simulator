// Sons dos motores: cada tipo tem a assinatura física certa (turboélice do A-29 = passagem das 5 pás a ~167 Hz,
// jato = tom do fan subindo com o N1, pistão = pulsos de ignição), e o jogador troca o tipo e carrega a própria gravação.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const URL0 = (process.env.FCS_URL || 'http://localhost:8080/index.html').split('?')[0];
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
if (process.env.LIBS) {
  const lib = (f) => readFileSync(process.env.LIBS + '/' + f, 'utf8');
  await ctx.route(/three\.min\.js|GLTFLoader\.js|meshopt_decoder\.mjs|fonts\.g|esm\.run/, (r) => {
    const u = r.request().url();
    const f = u.includes('three.min') ? 'three.min.js' : u.includes('GLTFLoader') ? 'GLTFLoader.js' : u.includes('meshopt') ? 'meshopt_decoder.mjs' : null;
    return f ? r.fulfill({ body: lib(f), contentType: 'application/javascript', headers: { 'Access-Control-Allow-Origin': '*' } }) : r.fulfill({ status: 404, body: '' });
  });
}
const p = await ctx.newPage();
const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
await p.goto(URL0);
await p.waitForFunction(() => window.__tomcat && !document.querySelector('#go').disabled, null, { timeout: 120000 });
// (camada sintetizada) pico de frequência entre 60 Hz e 4 kHz num trecho do som renderizado (acima disso fica o assobio do núcleo)
const peak = (id, type, a, z) => p.evaluate(async ([id, type, a, z]) => {
  const o = await __tomcat.sndRender(id, type, 9, true); const x = o.data.slice(Math.floor(a * o.sr), Math.floor(z * o.sr)); const N = 8192, best = [0, 0];
  for (let f = 60; f < 4000; f += 1) { let re = 0, im = 0; for (let i = 0; i < N; i++) { const w = .5 - .5 * Math.cos(2 * Math.PI * i / N), ph = 2 * Math.PI * f * i / o.sr; re += x[i] * w * Math.cos(ph); im += x[i] * w * Math.sin(ph); } const m = re * re + im * im; if (m > best[1]) best.splice(0, 2, f, m); }
  return { type: o.type, f: best[0] };
}, [id, type, a, z]);
const ok = {};
const tp = await peak('a29', null, 5.0, 5.3); ok.turboeliceDoA29 = tp.type === 'turboprop' && Math.abs(tp.f - 167) < 6;
const jl = await peak('f16', null, .5, .8), jm = await peak('f16', null, 5.0, 5.3); ok.jatoTomDoFanSobe = jl.type === 'jet' && jm.f > jl.f * 2.5;
const ps = await peak('a29', 'piston', 5.0, 5.3); ok.pistaoComHeliceDePas = ps.type === 'piston' && ps.f > 60 && ps.f < 260;
// gravações reais carregadas para os três tipos, e cada jato com a sua "voz" (o TF30 do F-14 não soa como o F110 do F-16)
const real = await p.evaluate(async () => { const t = __tomcat, cen = async (id, type) => { const o = await t.sndRender(id, type); const x = o.data.slice(5 * o.sr, 5 * o.sr + 8192); let a = 0, b = 0; for (let f = 100; f < 6000; f += 50) { let re = 0, im = 0; for (let i = 0; i < 8192; i++) { const ph = 2 * Math.PI * f * i / o.sr; re += x[i] * Math.cos(ph); im += x[i] * Math.sin(ph); } const m = Math.hypot(re, im); a += m * f; b += m; } return { real: o.real, c: a / b }; };
  return { f14: await cen('f14'), f16: await cen('f16'), a29: await cen('a29'), pist: await cen('a29', 'piston') }; });
ok.gravacoesReais = real.f14.real && real.a29.real && real.pist.real;
ok.cadaJatoSoaDiferente = Math.abs(real.f14.c - real.f16.c) > 25;
// gravação do jogador (um tom de 220 Hz gerado aqui, como se fosse um .wav do aparelho)
const sr = 22050, n = sr, wav = Buffer.alloc(44 + n * 2);
wav.write('RIFF', 0); wav.writeUInt32LE(36 + n * 2, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(sr, 24); wav.writeUInt32LE(sr * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(n * 2, 40);
for (let i = 0; i < n; i++) wav.writeInt16LE(Math.round(Math.sin(2 * Math.PI * 220 * i / sr) * 12000), 44 + i * 2);
await p.evaluate(() => { __tomcat.S.ac = 'a29'; });
await p.click('#sndOpen'); ok.abreJanela = await p.isVisible('#snd') && /Super Tucano/.test(await p.textContent('#sndAc')) && /turboélice/.test(await p.textContent('#sndMsg'));
await p.setInputFiles('#sndFileM', { name: 'motor.wav', mimeType: 'audio/wav', buffer: wav });
await p.click('#sndSaveB'); await p.waitForFunction(() => /Salvo|⚠️/.test(document.getElementById('sndMsg').textContent), null, { timeout: 30000 });
ok.salvaGravacao = await p.evaluate(() => /gravação própria/.test(document.getElementById('sndMsg').textContent) && __tomcat.SNDC.a29.motor === true);
await p.click('#sndPlay'); await p.waitForTimeout(1500);
ok.tocaAGravacao = await p.evaluate(() => !!(__tomcat.ENGV.v && __tomcat.SPV.on));
await p.click('#sndPlay');
await p.selectOption('#sndType', 'piston'); await p.waitForTimeout(300);
ok.trocaTipo = await p.evaluate(() => __tomcat.engProfile('a29').type === 'piston');
await p.reload(); await p.waitForFunction(() => window.__tomcat && !document.querySelector('#go').disabled, null, { timeout: 120000 });
ok.ficaSalvo = await p.evaluate(() => __tomcat.SNDC.a29 && __tomcat.SNDC.a29.motor === true && __tomcat.engProfile('a29').type === 'piston');
await p.evaluate(() => { __tomcat.S.ac = 'a29'; }); await p.click('#sndOpen'); await p.click('#sndClear');
ok.voltaAoOriginal = await p.waitForFunction(() => !__tomcat.SNDC.a29 && __tomcat.engProfile('a29').type === 'turboprop', null, { timeout: 10000 }).then(() => true, () => false);
ok.semErros = errs.length === 0;
console.log(JSON.stringify(ok), { tp, jl, jm, ps, real }, errs.slice(0, 3)); await b.close();
if (Object.values(ok).every(Boolean)) console.log('OK: sons passaram'); else { console.log('FALHOU'); process.exit(1); }
