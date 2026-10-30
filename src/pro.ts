import type {MediaItem} from './db';

const readAsDataURL=(blob:Blob)=>new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=()=>reject(r.error);r.readAsDataURL(blob);});
const fromDataURL=(url:string)=>{const [head,data]=url.split(',');const mime=/data:([^;]+)/.exec(head||'')?.[1]||'application/octet-stream';const raw=atob(data||'');const bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);return new Blob([bytes],{type:mime});};
export async function exportLibraryBackup(items:MediaItem[]){
 const payload={format:'ULTRA_BACKUP',version:1,createdAt:new Date().toISOString(),items:await Promise.all(items.map(async item=>({...item,blob:await readAsDataURL(item.blob)})))};
 return new Blob([JSON.stringify(payload)],{type:'application/json'});
}
export async function restoreLibraryBackup(file:File):Promise<MediaItem[]>{
 const raw=JSON.parse(await file.text());if(raw?.format!=='ULTRA_BACKUP'||raw?.version!==1||!Array.isArray(raw.items))throw new Error('File bukan backup ULTRA yang didukung.');
 return raw.items.map((x:any)=>{if(!x.id||!['photo','video'].includes(x.kind)||typeof x.blob!=='string'||!x.blob.startsWith('data:'))throw new Error('Data backup tidak valid.');return {...x,blob:fromDataURL(x.blob)} as MediaItem;});
}
export async function processPhoto(blob:Blob,opts:{denoise:boolean;deblur:boolean;depthMap?:Blob|null;depthStrength:number}){
 const bmp=await createImageBitmap(blob);const maxPixels=1_800_000;const scale=Math.min(1,Math.sqrt(maxPixels/(bmp.width*bmp.height)));const w=Math.max(1,Math.round(bmp.width*scale)),h=Math.max(1,Math.round(bmp.height*scale));
 const base=document.createElement('canvas');base.width=w;base.height=h;const ctx=base.getContext('2d',{willReadFrequently:true})!;ctx.drawImage(bmp,0,0,w,h);bmp.close();
 let image=ctx.getImageData(0,0,w,h);const src=new Uint8ClampedArray(image.data);const idx=(x:number,y:number,c:number)=>(y*w+x)*4+c;
 if(opts.denoise){for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++)for(let c=0;c<3;c++){const a:number[]=[];for(let yy=-1;yy<=1;yy++)for(let xx=-1;xx<=1;xx++)a.push(src[idx(x+xx,y+yy,c)]);a.sort((m,n)=>m-n);image.data[idx(x,y,c)]=a[4];}}
 if(opts.deblur){const denoised=new Uint8ClampedArray(image.data);for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++)for(let c=0;c<3;c++){const center=denoised[idx(x,y,c)],blur=(denoised[idx(x-1,y,c)]+denoised[idx(x+1,y,c)]+denoised[idx(x,y-1,c)]+denoised[idx(x,y+1,c)])/4;image.data[idx(x,y,c)]=Math.max(0,Math.min(255,center+(center-blur)*0.8));}}
 ctx.putImageData(image,0,0);
 if(opts.depthMap){const mask=await createImageBitmap(opts.depthMap);const mc=document.createElement('canvas');mc.width=w;mc.height=h;const mctx=mc.getContext('2d',{willReadFrequently:true})!;mctx.drawImage(mask,0,0,w,h);mask.close();const md=mctx.getImageData(0,0,w,h).data;const blurred=document.createElement('canvas');blurred.width=w;blurred.height=h;const bctx=blurred.getContext('2d')!;bctx.filter=`blur(${Math.max(1,opts.depthStrength)}px)`;bctx.drawImage(base,0,0);bctx.filter='none';const bd=bctx.getImageData(0,0,w,h),orig=ctx.getImageData(0,0,w,h);for(let p=0;p<w*h;p++){const a=(md[p*4]/255)*Math.min(1,opts.depthStrength/18);for(let c=0;c<3;c++)orig.data[p*4+c]=orig.data[p*4+c]*(1-a)+bd.data[p*4+c]*a;}ctx.putImageData(orig,0,0);}
 return new Promise<Blob>((resolve,reject)=>base.toBlob(b=>b?resolve(b):reject(new Error('Gagal memproses foto.')),'image/jpeg',.94));
}

export class OpticalFlowTracker {
 private canvas=document.createElement('canvas');private ctx=this.canvas.getContext('2d',{willReadFrequently:true})!;private previous:Uint8ClampedArray|null=null;
 constructor(){this.canvas.width=96;this.canvas.height=54;}
 estimate(video:HTMLVideoElement){this.ctx.drawImage(video,0,0,96,54);const now=this.ctx.getImageData(0,0,96,54).data;if(!this.previous){this.previous=new Uint8ClampedArray(now);return {dx:0,dy:0,confidence:0};}let best=Infinity,bx=0,by=0,second=Infinity;const prev=this.previous;
  for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){let sum=0,n=0;for(let y=5;y<49;y+=3)for(let x=5;x<91;x+=3){const a=(y*96+x)*4,b=((y+dy)*96+x+dx)*4;const p=(prev[a]*.299+prev[a+1]*.587+prev[a+2]*.114),q=(now[b]*.299+now[b+1]*.587+now[b+2]*.114);sum+=Math.abs(p-q);n++;}const score=sum/n;if(score<best){second=best;best=score;bx=dx;by=dy;}else if(score<second)second=score;}
  this.previous=new Uint8ClampedArray(now);return {dx:bx,dy:by,confidence:second>0?Math.max(0,Math.min(1,(second-best)/second)):0};
 }
}
