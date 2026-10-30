import * as ort from 'onnxruntime-web';

export type UltraAiSession = ort.InferenceSession;

/**
 * Local ONNX enhancement contract:
 * - one RGB float32 input tensor, NCHW [1,3,H,W]
 * - input values normalized to [0,1]
 * - one RGB float32 output tensor, NCHW [1,3,OH,OW]
 * - output values in [0,1] (values outside are clamped)
 * The model file is selected by the user and stays in browser memory.
 */
export async function loadLocalEnhancementModel(file: File): Promise<UltraAiSession> {
  if (!file.name.toLowerCase().endsWith('.onnx')) throw new Error('Pilih file model .onnx.');
  const bytes = await file.arrayBuffer();
  const session = await ort.InferenceSession.create(bytes, {
    executionProviders: ['webgpu', 'wasm'],
    graphOptimizationLevel: 'all',
  });
  if (!session.inputNames.length || !session.outputNames.length) throw new Error('Model ONNX tidak memiliki input/output yang dapat digunakan.');
  return session;
}

export async function downloadRealEsrganModel(onProgress?: (percent:number)=>void): Promise<UltraAiSession> {
  // Pinned, public BSD-3-Clause Real-ESRGAN x4plus browser ONNX artifact.
  const url = 'https://huggingface.co/skillsafe-ai/realesrgan-x4plus/resolve/107475e49b7d46412cc966481efccc3500955801/model.onnx';
  const response = await fetch(url);
  if (!response.ok || !response.body) throw new Error(`Unduhan model gagal (${response.status}).`);
  const total = Number(response.headers.get('content-length')) || 0;
  const reader = response.body.getReader(); const chunks:Uint8Array[]=[]; let loaded=0;
  while(true){const {done,value}=await reader.read();if(done)break;if(value){chunks.push(value);loaded+=value.length;if(total)onProgress?.(Math.round(loaded/total*100));}}
  const bytes = new Uint8Array(loaded); let offset=0; for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  return ort.InferenceSession.create(bytes, {executionProviders:['webgpu','wasm'],graphOptimizationLevel:'all'});
}

export async function enhancePhotoWithLocalModel(blob: Blob, session: UltraAiSession, onProgress?: (done:number,total:number)=>void, scale=4): Promise<Blob> {
  const bitmap = await createImageBitmap(blob);
  const inputName = session.inputNames[0], outputName = session.outputNames[0];
  const source = document.createElement('canvas'); source.width=bitmap.width; source.height=bitmap.height;
  const sourceCtx=source.getContext('2d',{willReadFrequently:true}); if(!sourceCtx)throw new Error('Canvas 2D tidak tersedia.');
  sourceCtx.drawImage(bitmap,0,0); bitmap.close();
  // Tile inference limits peak RAM on phones; 8px overlap reduces visible tile seams.
  const tile=128, overlap=8;
  const out=document.createElement('canvas'); out.width=source.width*scale; out.height=source.height*scale;
  if(out.width>12000||out.height>12000||out.width*out.height>80_000_000)throw new Error('Hasil 4× terlalu besar untuk batas memori aman browser. Gunakan foto lebih kecil.');
  const outCtx=out.getContext('2d');if(!outCtx)throw new Error('Canvas output tidak tersedia.');
  const cols=Math.ceil(source.width/tile),rows=Math.ceil(source.height/tile),total=cols*rows;let done=0;
  for(let ty=0;ty<rows;ty++)for(let tx=0;tx<cols;tx++){
    const sx=tx*tile,sy=ty*tile,sw=Math.min(tile,source.width-sx),sh=Math.min(tile,source.height-sy);
    const pad=overlap,tw=sw+pad*2,th=sh+pad*2;
    const tileCanvas=document.createElement('canvas');tileCanvas.width=tw;tileCanvas.height=th;
    const tctx=tileCanvas.getContext('2d',{willReadFrequently:true})!;
    // Edge replication avoids dark borders on outermost tiles.
    tctx.drawImage(source,Math.max(0,sx-pad),Math.max(0,sy-pad),Math.min(source.width,sw+pad*2),Math.min(source.height,sh+pad*2),Math.max(0,pad-sx),Math.max(0,pad-sy),Math.min(source.width,sw+pad*2),Math.min(source.height,sh+pad*2));
    const pixels=tctx.getImageData(0,0,tw,th).data;const input=new Float32Array(3*tw*th);const plane=tw*th;
    for(let i=0,p=0;i<pixels.length;i+=4,p++){input[p]=pixels[i]/255;input[plane+p]=pixels[i+1]/255;input[2*plane+p]=pixels[i+2]/255;}
    const tensor=new ort.Tensor('float32',input,[1,3,th,tw]);
    const result=await session.run({[inputName]:tensor});const output=result[outputName] as ort.Tensor;
    if(!output||output.type!=='float32'||output.dims.length!==4||output.dims[1]!==3)throw new Error('Output model harus float32 RGB NCHW.');
    const oh=output.dims[2],ow=output.dims[3],data=output.data as Float32Array;
    if(ow!==tw*scale||oh!==th*scale)throw new Error('Model yang dipilih bukan model super-resolution 4× yang kompatibel.');
    const image=new ImageData(ow,oh);const op=ow*oh;
    for(let p=0;p<op;p++){image.data[p*4]=Math.round(Math.max(0,Math.min(1,data[p]))*255);image.data[p*4+1]=Math.round(Math.max(0,Math.min(1,data[op+p]))*255);image.data[p*4+2]=Math.round(Math.max(0,Math.min(1,data[2*op+p]))*255);image.data[p*4+3]=255;}
    const tileOut=document.createElement('canvas');tileOut.width=ow;tileOut.height=oh;tileOut.getContext('2d')!.putImageData(image,0,0);
    const crop=overlap*scale;outCtx.drawImage(tileOut,crop,crop,sw*scale,sh*scale,sx*scale,sy*scale,sw*scale,sh*scale);
    done++;onProgress?.(done,total);
  }
  return new Promise((resolve,reject)=>out.toBlob(b=>b?resolve(b):reject(new Error('Gagal membuat file hasil AI.')),'image/png'));
}
