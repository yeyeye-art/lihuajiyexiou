// Optional, non-commercial local listening package. Not uploaded with the repository.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
const url='https://github.com/k2-fsa/sherpa-onnx/releases/download/v2.0.1/sherpa-onnx-wasm-simd-2.0.1-matcha-icefall-zh-baker.tar.bz2';
const expected='ddae6475d95f84bb14fee9e43e0c7da8bc370bc1b908b6fc369ff75cfeab022a';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'xiaoli-voice-'));
const archive=process.argv[2]?path.resolve(process.argv[2]):path.join(temp,'voice.tar.bz2');
if(!fs.existsSync(archive)){
  console.log('Downloading 126 MB non-commercial Chinese voice package from the original release.');
  const response=await fetch(url);if(!response.ok)throw Error('Voice download failed');
  fs.writeFileSync(archive,Buffer.from(await response.arrayBuffer()));
}
if(createHash('sha256').update(fs.readFileSync(archive)).digest('hex')!==expected)throw Error('Voice archive checksum mismatch');
execFileSync('tar',['-xf',archive,'-C',temp]);
const folder=path.join(temp,'sherpa-onnx-wasm-simd-2.0.1-matcha-icefall-zh-baker');
const target=path.join(root,'assets/xiaoli-voice');fs.mkdirSync(target,{recursive:true});
for(const name of ['sherpa-onnx-tts.worker.js','sherpa-onnx-tts.js','sherpa-onnx-wasm-main-tts.js','sherpa-onnx-wasm-main-tts.wasm','sherpa-onnx-wasm-main-tts.data'])fs.copyFileSync(path.join(folder,name),path.join(target,name));
fs.writeFileSync(path.join(target,'PROVENANCE.txt'),`Research listening package only. DataBaker training data is non-commercial.\nModel card: https://huggingface.co/csukuangfj/matcha-icefall-zh-baker\nRuntime: https://github.com/k2-fsa/sherpa-onnx (Apache-2.0)\nSource: ${url}\nSHA256: ${expected}\n`);
const license=await fetch('https://raw.githubusercontent.com/k2-fsa/sherpa-onnx/v2.0.1/LICENSE');
if(!license.ok)throw Error('Runtime license unavailable');fs.writeFileSync(path.join(target,'LICENSE-sherpa-onnx'),await license.text());
console.log('Local voice ready. Build with VITE_XIAOLI_VOICE=true for private listening; do not publish the voice weights.');
