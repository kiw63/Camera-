import { readdir, mkdir, copyFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const source = resolve('node_modules/onnxruntime-web/dist');
const destination = resolve('public/ort');
await mkdir(destination, { recursive: true });
let names;
try {
  names = await readdir(source);
} catch (error) {
  console.error('ONNX Runtime Web dist folder was not found after install:', error);
  process.exit(1);
}
const runtimeFiles = names.filter((name) => /^ort-wasm.*\.(?:wasm|mjs|js)$/.test(name));
if (runtimeFiles.length === 0) {
  throw new Error(`No ONNX Runtime WASM files found in ${source}. Check the installed onnxruntime-web package.`);
}
for (const name of runtimeFiles) await copyFile(join(source, name), join(destination, name));
console.log(`Copied ${runtimeFiles.length} ONNX Runtime assets to public/ort.`);
