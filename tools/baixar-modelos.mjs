// Baixa de uma vez todos os caças que o FCS usa, pela API oficial de download do Sketchfab.
// Precisa de Node 18 ou mais novo e do SEU token pessoal do Sketchfab:
//   1) entre no Sketchfab → Settings → Password & API → copie o "API token";
//   2) na pasta do projeto:  node tools/baixar-modelos.mjs SEU_TOKEN
//      (ou defina a variável SKETCHFAB_TOKEN e rode só: node tools/baixar-modelos.mjs)
// Os arquivos vão para a pasta models-raw/ (fora do Git). Nunca mande o token no chat nem coloque no repositório.
import fs from 'node:fs';
import path from 'node:path';

const MODELOS = [
  // leves
  ['f15e', 'fff7d75490474e9b964d90cc031c8d01', 'F-15E Strike Eagle (bohmerang)'],
  ['rafale', '0abf2465adb04bc8bc638688fa54ce21', 'Rafale M (bohmerang)'],
  ['su57', '31127bc63bc048debb694aa88bbaafae', 'Su-57 Felon (bohmerang)'],
  ['gripen', '03d4f4f0f7e94f469299ba7db4c707c4', 'JAS 39 Gripen (bohmerang)'],
  ['su35', '3213a404e5cb4fb68f778b9acae5109c', 'Su-35 (bohmerang)'],
  ['su34', '2e81f16e6769441da3b5bc50237473ce', 'Su-34 (bohmerang)'],
  ['f117', '757581776f56449c939cb0a72683dce2', 'F-117 Nighthawk (andertan)'],
  // inimigos novos
  ['su27p', '4b73e72471b440be949b5cbc3ca36184', 'Su-27P Flanker-B (Rhine_Lab_Muelsyse)'],
  ['j11', 'f3b0a285198a4523b96b9ac372e18865', 'Shenyang J-11 (Rhine_Lab_Muelsyse)'],
  // pesados (o Claude reduz para o jogo)
  ['a10', '254f519c80b64416b79dab6d67dfcc31', 'A-10C com GBU-39 (Jeyhun1985)'],
  ['su30', 'da768c092b0f49b6b8bcb9e917e1e6a0', 'Su-30MKK com Kh-59M (Jeyhun1985)'],
  ['f22', '58a1c6d98c604750a2b1d4abcb7889b2', 'F-22 Raptor (ALI1388)'],
  ['su25', 'e1b6ee3af1d94ed19952925e64684335', 'Su-25 (Alexios_Apokaukos)'],
  // opcional: F-16 com licença CC BY
  ['f16ef', 'd54c72e055a647ad9173e01548e50db3', 'F-16E/F (andertan)'],
];

const token = process.argv[2] || process.env.SKETCHFAB_TOKEN;
if (!token) { console.error('Faltou o token. Uso: node tools/baixar-modelos.mjs SEU_TOKEN'); process.exit(1); }
const pasta = path.resolve('models-raw');
fs.mkdirSync(pasta, { recursive: true });

let ok = 0, falhas = [];
for (const [id, uid, nome] of MODELOS) {
  const existe = fs.readdirSync(pasta).find((f) => f.startsWith(id + '.'));
  if (existe) { console.log('✓ já baixado:', existe); ok++; continue; }
  process.stdout.write('↓ ' + nome + ' … ');
  try {
    const r = await fetch('https://api.sketchfab.com/v3/models/' + uid + '/download', { headers: { Authorization: 'Token ' + token } });
    if (r.status === 401) throw new Error('token inválido (confira em Settings → Password & API)');
    if (r.status === 403) throw new Error('o autor não liberou download deste modelo');
    if (r.status === 429) throw new Error('muitas requisições, espere alguns minutos e rode de novo');
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json();
    const fmt = j.glb ? 'glb' : j.gltf ? 'gltf' : null;
    if (!fmt) throw new Error('nenhum formato disponível');
    const arq = await fetch(j[fmt].url);
    if (!arq.ok) throw new Error('download HTTP ' + arq.status);
    const buf = Buffer.from(await arq.arrayBuffer());
    const nomeArq = id + (fmt === 'glb' ? '.glb' : '.zip');// glTF vem zipado (scene.gltf + texturas)
    fs.writeFileSync(path.join(pasta, nomeArq), buf);
    console.log('ok (' + (buf.length / 1048576).toFixed(1) + ' MB) → models-raw/' + nomeArq);
    ok++;
  } catch (e) { console.log('FALHOU: ' + e.message); falhas.push(nome); }
  await new Promise((res) => setTimeout(res, 1500));// educado com a API
}
console.log('\n' + ok + ' de ' + MODELOS.length + ' modelos na pasta models-raw/.');
if (falhas.length) console.log('Faltaram: ' + falhas.join(', ') + '. Pode rodar de novo: o que já baixou é pulado.');
console.log('Próximo passo: GitHub → seu repositório → Releases → "Draft a new release", tag "modelos-brutos",\n' +
  'arraste os arquivos da pasta models-raw/ e publique. O Claude busca de lá, comprime e coloca no jogo.');
