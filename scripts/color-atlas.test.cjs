const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=name=>JSON.parse(fs.readFileSync(path.join(root,name),'utf8'));
const sixHex=value=>Array.isArray(value)&&value.length===6&&value.every(x=>/^#[0-9A-F]{6}$/.test(x));
const design=read('content/color-atlas-design.json');
const museum=read('content/color-atlas-museum.json');
const world=read('content/color-atlas-world.json');
const audit=read('docs/color-atlas/world-source-audit.json');

test('Traditional color and Radix sources are preserved as attributed data',()=>{
 assert.equal(design.colors.filter(x=>x.source==='chinese-colors').length,161);
 assert.equal(design.colors.filter(x=>x.source==='radix-colors').length,372);
 assert.equal(design.colors.filter(x=>x.source==='brand').length,6);
 assert.equal(design.schemes.length,124);
 assert.ok(design.colors.every(x=>/^#[0-9A-F]{6}$/.test(x.hex)));
 assert.ok(new Set(design.colors.map(x=>x.hex)).size>=300);
 assert.ok(design.colors.every(x=>x.sourceUrl.startsWith('https://')));
});
test('Exactly 100 museum-derived six-color combinations use verifiable CC0 source artwork',()=>{
 assert.equal(museum.schemes.length,100);
 assert.equal(museum.colors.length,600);
 assert.ok(museum.schemes.every(x=>sixHex(x.colors)&&x.source==='museum-derivative'));
 assert.ok(museum.schemes.every(x=>x.artwork.license==='CC0'&&x.artwork.url===x.sourceUrl));
 assert.ok(museum.schemes.every(x=>x.artwork.imagePath.startsWith('assets/patterns/')&&fs.existsSync(path.join(root,x.artwork.imagePath))));
 assert.equal(new Set(museum.schemes.map(x=>x.artwork.workId)).size,100);
});
test('Total sourced color data exceeds 300 distinct HEX and 100 compositional palettes',()=>{
 const colors=[...design.colors,...museum.colors];
 const sources=new Set(colors.map(c=>c.source));
 assert.ok(sources.has('brand')&&sources.has('chinese-colors')&&sources.has('radix-colors')&&sources.has('museum-derivative'));
 assert.ok(new Set(colors.map(c=>c.hex)).size>=300);
 assert.ok(design.schemes.length+museum.schemes.length>=100);
});
test('Published color editor has identical numeric palette mapping and unchanged original four presets',async()=>{
 const engine=await import('../assets/engine.js');
 const presets=await import('../assets/palette-presets.js');
 const museumPresets=await import('../assets/museum-palette-presets.js');
 const worldPresets=await import('../assets/world-palette-presets.js');
 assert.equal(engine.palettes.length,4+design.schemes.length+museum.schemes.length+world.schemes.length);
 assert.equal(presets.additionalPalettes.length,design.schemes.length);
 assert.equal(museumPresets.museumPalettes.length,museum.schemes.length);
 assert.equal(worldPresets.worldPalettes.length,world.schemes.length);
 for(let i=0;i<design.schemes.length;i++){
  assert.deepEqual(engine.palettes[4+i].colors,design.schemes[i].colors);
 }
 for(let i=0;i<museum.schemes.length;i++){
  assert.deepEqual(engine.palettes[4+design.schemes.length+i].colors,museum.schemes[i].colors);
 }
 for(let i=0;i<world.schemes.length;i++){
  assert.deepEqual(engine.palettes[4+design.schemes.length+museum.schemes.length+i].colors,world.schemes[i].colors);
 }
 assert.equal(engine.palettes[0].name,'梨白 · 苔绿');
});
test('Motif drawing works for original, Radix-derived and museum-derived palette indices',async()=>{
 const {motifSVG,palettes}=await import('../assets/engine.js');
 for(const i of [0,4,4+design.schemes.length,palettes.length-1]){
  const svg=motifSVG(0,1,i);
  assert.match(svg,/^<svg[\s>]/);
  assert.match(svg,/<\/svg>$/);
 }
});


test('Worldwide art catalog is faithfully audited and historical provenance never fabricated',()=>{
 assert.equal(audit.totalCatalogRecords,1088);
 assert.equal(Object.values(audit.statuses).reduce((a,b)=>a+b,0),1088);
 assert.ok(world.stats.culturalSchemes>=80,world.stats);
 assert.ok(world.stats.originalStyleSchemes>=65,'Worldwide original style coverage should extend beyond the original Morandi group');
 assert.ok(world.stats.artistCount>=12,'Painter coverage must include at least 12 verified names');
 assert.ok(new Set(world.schemes.filter(x=>x.source==='artist-open-access').map(x=>x.country)).size>=5,'Artists must span at least five national/cultural contexts');
 assert.equal(world.stats.schemeCount,world.schemes.length);
 assert.equal(world.stats.colorEntries,world.colors.length);
 assert.equal(new Set(world.schemes.map(x=>x.id)).size,world.schemes.length);
 assert.ok(world.schemes.every(x=>x.colors.length===6&&x.colors.every(v=>/^#[0-9A-F]{6}$/.test(v))));
 const bySource=type=>world.schemes.filter(x=>x.source===type);
 const artists=bySource('artist-open-access');
 assert(artists.length>0);
 assert(artists.some(x=>x.artist==='Claude Monet'),'Need verified open Monet works');
 assert(artists.some(x=>x.artist==='Vincent van Gogh'),'Need verified open van Gogh works');
 assert(artists.every(x=>x.artwork.license==='CC0'||x.artwork.license==='Public Domain'));
 assert(artists.every(x=>fs.existsSync(path.join(root,x.artwork.imagePath))));
 assert(bySource('art-style-original').every(x=>!x.artwork&&x.license.includes('Original')));
 const coveredIds=new Set(museum.schemes.map(x=>String(x.artwork.workId)));
 assert(bySource('world-pattern').every(x=>!coveredIds.has(String(x.artwork.workId))),'Do not duplicate original 100 CMA works');
 assert(bySource('world-pattern').every(x=>fs.existsSync(path.join(root,x.artwork.imagePath))));
});

test('Cultural motif catalogue exposes only editorial—not historical—regional links to real verified painters and global styles',()=>{
 const regions=world.culturalDiscovery?.regions||[];
 assert.equal(regions.length,9,'Nine museum catalog cultural regions should remain distinct');
 const cultural=world.schemes.filter(x=>x.source==='world-pattern');
 const painters=world.schemes.filter(x=>x.source==='artist-open-access');
 const originals=world.schemes.filter(x=>x.source==='art-style-original');
 const knownArtists=new Set(painters.map(x=>x.artist));
 const knownStyles=new Set(originals.map(x=>x.id));
 assert.equal(regions.reduce((sum,r)=>sum+r.cultureCount,0),cultural.length);
 for(const r of regions){
  assert(r.artistNames.every(name=>knownArtists.has(name)));
  assert(r.styleIds.every(id=>knownStyles.has(id)));
  assert.match(r.notice,/不构成作品作者/);
 }
 for(const work of cultural){
  assert(Array.isArray(work.relatedArtistNames));
  assert(Array.isArray(work.relatedStyleIds));
  assert(work.relatedArtistNames.every(name=>knownArtists.has(name)));
  assert(work.relatedStyleIds.every(id=>knownStyles.has(id)));
  assert.match(work.crossLinkNote,/不是馆方/);
 }
 assert.equal(originals.length,69);
 assert(originals.filter(s=>s.referenceUrl).length>=45);
 assert(originals.every(s=>!s.artwork),'Editorial styles must not contain falsely attributed museum paintings');
});

test('Rebuild-safe official artist expansion cannot duplicate restored CMA paintings',()=>{
 const artists=world.schemes.filter(s=>s.source==='artist-open-access');
 const expanded=artists.filter(s=>s.id.startsWith('artist-cma-expanded-'));
 assert(artists.length>=74,'Painter count must survive reruns and temporary official API outages');
 assert(expanded.length>=64,'The enriched CMA archive must not disappear on second build');
 assert.equal(new Set(artists.map(s=>s.id)).size,artists.length);
 assert.equal(new Set(expanded.map(s=>s.artwork.workId)).size,expanded.length,
   'Each opened museum object must be counted once, even when offline fallback is active');
 assert(artists.every(s=>s.artwork?.license==='CC0'||s.artwork?.license==='Public Domain'),
   'Do not weaken museum source-image rights policy on rebuild');
 assert.equal(world.stats.artistSchemes,artists.length);
 assert.equal(world.stats.artistCount,new Set(artists.map(s=>s.artist)).size);
});
