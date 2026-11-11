import {fileURLToPath} from 'node:url';
process.chdir(fileURLToPath(new URL('..',import.meta.url)));
import fs from 'node:fs';
import path from 'node:path';
import {validateSuxiuFiles} from './validate-suxiu.mjs';
import {validateStitchFiles} from './validate-stitch.mjs';
import {validateXiaoliTopics,validateXiaoliSupport} from './validate-xiaoli-topics.mjs';
console.log('Validated Xiaoli topic catalogue:',validateXiaoliTopics());
console.log('Validated Xiaoli search hints and excerpts:',validateXiaoliSupport());
import {validateLearningPaths} from '../assets/learning-path-store.js';
const stitchReport=validateStitchFiles();
console.log(`Validated ${stitchReport.demos.length} stitch demos, ${stitchReport.videos} official source links and ${stitchReport.digitalTools} digital embroidery tool.`);
const learningPaths=validateLearningPaths(JSON.parse(fs.readFileSync('content/learning-paths.json','utf8')));
console.log(`Validated ${learningPaths.paths.length} learning paths with ${learningPaths.paths[0].steps.length} steps each.`);
const suxiuReport=validateSuxiuFiles();
console.log(`Validated ${suxiuReport.knowledgeCount} source-linked Su embroidery records.`);
const patterns=JSON.parse(fs.readFileSync('content/patterns.json','utf8').replace(/^\uFEFF/,''));
const products=JSON.parse(fs.readFileSync('content/products.json','utf8').replace(/^\uFEFF/,''));
const site=JSON.parse(fs.readFileSync('content/site.json','utf8').replace(/^\uFEFF/,''));
const cultural=JSON.parse(fs.readFileSync('content/cultural-knowledge.json','utf8'));
const sources=JSON.parse(fs.readFileSync('content/sources.json','utf8'));
if(new Set(cultural.map(k=>k.id)).size!==cultural.length||new Set(sources.map(s=>s.id)).size!==sources.length)throw Error('Duplicate cultural/source IDs');
for(const k of cultural){
 for(const field of ['id','canonicalName','aliases','category','verifiedMeanings','verifiedFacts','emotions','occasions','compatibleMotifs','incompatibleMotifs','compositionRules','paletteHints','period','region','suzhouSpecific','craft','sourceIds','evidenceLevel','reviewStatus'])if(!(field in k))throw Error('Missing cultural field '+field);
 if(k.reviewStatus==='approved'&&(!k.sourceIds.length||!k.verifiedFacts.length||k.sourceIds.some(id=>!sources.some(s=>s.id===id&&s.verified))||[...k.verifiedMeanings,...k.verifiedFacts].some(f=>!k.sourceIds.includes(f.sourceId))))throw Error('Approved fact lacks verified source: '+k.id);
}
const arTargets=JSON.parse(fs.readFileSync('assets/ar-assets/targets.json','utf8'));
for(const target of arTargets){
  const files=[target.image,...(target.layers||[]).map(l=>l.src)];
  for(const file of files)if(!/^ar-assets\/[\w./-]+$/.test(file)||file.includes('..')||!fs.existsSync('assets/'+file))throw Error('Invalid AR asset: '+file);
  const dimensions=(target.layers||[]).map(layer=>{const bytes=fs.readFileSync('assets/'+layer.src);if(bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('AR layer must be PNG');return [bytes.readUInt32BE(16),bytes.readUInt32BE(20)].join('x');});
  if(new Set(dimensions).size>1)throw Error('AR layers must share a canvas size');
}
for(const target of arTargets.slice(0,4)){
  if(target.layers?.length!==6)throw Error('Featured AR ornaments must have six independent image layers: '+target.id);
  if(new Set(target.layers.map(layer=>layer.src)).size!==6)throw Error('Featured AR layers must use six distinct assets: '+target.id);
  const depths=target.layers.map(layer=>layer.depth);
  if(depths[0]!==0||depths.some((depth,index)=>index>0&&depth-depths[index-1]<.1))throw Error('Featured AR layers need clear depth spacing: '+target.id);
  if(target.layers.some(layer=>layer.explodeOffset&&(Math.abs(layer.explodeOffset.x)>1e-6||Math.abs(layer.explodeOffset.y)>1e-6)))throw Error('Featured AR layers must remain on one shared central axis: '+target.id);
  if(target.presentation?.reliefDepth!==0)throw Error('Featured AR depth must come from separate layers, not fake side extrusion: '+target.id);
}
if(!fs.existsSync('assets/ar-assets/targets.mind'))throw Error('AR target database missing');
if(!site.name||!site.title||!site.intro)throw Error('site.json missing text');
if(new Set(patterns.map(p=>p.id)).size!==patterns.length)throw Error('Duplicate pattern IDs');
for(const p of patterns)for(const key of ['image','thumbnail'])if(!p[key].startsWith('assets/')||!fs.existsSync(p[key]))throw Error('Missing or invalid pattern asset: '+p[key]);
for(const p of products)for(const f of [p.image_path,p.thumbnail_path||p.image_path,...p.gallery,...p.variants.flatMap(v=>[v.photo,v.sticker].filter(Boolean))])if(f.includes('..')||!fs.existsSync('assets/'+f))throw Error('Missing product asset '+f);
import {execSync} from 'node:child_process';

function scanForbiddenKeywords(targetPath) {
  if (!fs.existsSync(targetPath)) return;
  const stat = fs.statSync(targetPath);
  if (stat.isDirectory()) {
    for (const file of fs.readdirSync(targetPath)) {
      scanForbiddenKeywords(path.join(targetPath, file));
    }
  } else if (/\.(ts|tsx|js|html|css)$/.test(targetPath)) {
    const content = fs.readFileSync(targetPath, 'utf8');
    if (/trycloudflare\.com|127\.0\.0\.1|fetch\(['"]\/api\//.test(content)) {
      throw Error('Local service dependency or forbidden API in ' + targetPath);
    }
  }
}

for (const entry of ['app.js', 'face.js', 'index.html', 'src', 'assets']) {
  scanForbiddenKeywords(entry);
}
console.log('Building React TypeScript SPA with Vite...');
execSync('npx vite build --outDir _site', {stdio:'inherit'});
for(const f of ['app.js','style.css','pages.css','face.html','face.js','design-guide.html','.nojekyll','404.html'])if(fs.existsSync(f))fs.copyFileSync(f,path.join('_site',f));
if (!process.env.VITE_ASSETS_BASE_URL && fs.existsSync('.env.production')) {
  const envContent = fs.readFileSync('.env.production', 'utf8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^VITE_ASSETS_BASE_URL=(.+)$/);
    if (match) process.env.VITE_ASSETS_BASE_URL = match[1].trim();
  }
}
const isLightDeploy = process.env.DEPLOY_LIGHT === 'true' || /^https?:\/\//.test(process.env.VITE_ASSETS_BASE_URL || '');
if (isLightDeploy) {
  console.log('Lightweight deployment mode: skipping bulk asset copying (served via external assets repository).');
} else {
  const voiceDirectory=path.resolve('assets/xiaoli-voice');
  for(const f of ['content','assets'])fs.cpSync(f,path.join('_site',f),{
    recursive:true,
    filter:source=>process.env.VITE_XIAOLI_VOICE==='true'||path.resolve(source)!==voiceDirectory
  });
}
console.log(`Validated ${patterns.length} patterns, ${products.length} showcase items; assembled static site.`);
