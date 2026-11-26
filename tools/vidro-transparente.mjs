// Uso: node tools/vidro-transparente.mjs entrada.glb saida.glb "^(NomeDoVidro|Outro)$" 0.14
// Torna vidros transparentes: materiais cujo nome casa com a regex viram BLEND com alfa baixo (o Sketchfab guarda a opacidade fora do GLB)
import {NodeIO} from '@gltf-transform/core';import {ALL_EXTENSIONS} from '@gltf-transform/extensions';import {MeshoptDecoder,MeshoptEncoder} from 'meshoptimizer';await MeshoptDecoder.ready;await MeshoptEncoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder,'meshopt.encoder':MeshoptEncoder});
const [i,o,re,a]=process.argv.slice(2);const doc=await io.read(i);const R=new RegExp(re);
for(const m of doc.getRoot().listMaterials())if(R.test(m.getName())){const c=m.getBaseColorFactor();m.setAlphaMode('BLEND').setBaseColorFactor([c[0],c[1],c[2],+a]).setDoubleSided(true);console.log('vidro:',m.getName())}
await io.write(o,doc);
