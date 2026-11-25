// Uso: node tools/encolher-modelo.mjs entrada.glb saida.glb [texMax=2048] [ratio] [erro]  (depois: npx gltfpack ... -c -noq -kn -km -ke -si 0.12)
// Depende de: npm i @gltf-transform/core @gltf-transform/extensions @gltf-transform/functions meshoptimizer sharp
// Encolhe texturas (máx 2048, JPEG; PNG só onde precisa de transparência) e simplifica malhas pesadas.
import {NodeIO} from '@gltf-transform/core';import {ALL_EXTENSIONS} from '@gltf-transform/extensions';import {MeshoptDecoder,MeshoptSimplifier} from 'meshoptimizer';
import {textureCompress,prune,dedup,weld,simplify} from '@gltf-transform/functions';import sharp from 'sharp';
await MeshoptDecoder.ready;await MeshoptSimplifier.ready;const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
const [inp,out,maxTex,ratio,err]=process.argv.slice(2);const doc=await io.read(inp);const r=doc.getRoot();
const alphaTex=new Set();for(const m of r.listMaterials())if(m.getAlphaMode()!=='OPAQUE'){const t=m.getBaseColorTexture();if(t)alphaTex.add(t)}
const opaque=r.listTextures().filter(t=>!alphaTex.has(t)&&t.getMimeType()!=='image/jpeg'||true).map(t=>t);
await doc.transform(dedup(),prune());
if(ratio&&+ratio<1)await doc.transform(weld({tolerance:.0001}),simplify({simplifier:MeshoptSimplifier,ratio:+ratio,error:+(err||.002)}));
const S=+(maxTex||2048);
await doc.transform(textureCompress({encoder:sharp,targetFormat:'jpeg',resize:[S,S],quality:82}),textureCompress({encoder:sharp,resize:[Math.min(S,1024),Math.min(S,1024)]}));
await io.write(out,doc);
let tris=0;for(const m of r.listMeshes())for(const p of m.listPrimitives()){const i=p.getIndices();tris+=(i?i.getCount():p.getAttribute('POSITION').getCount())/3}
console.log(out.split('/').pop(),'tris',Math.round(tris));
