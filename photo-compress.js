/* DON'T LIKE YOUR MOM v0.7.3 — size-targeted mobile photo compression.
   Actual content type is checked: some Safari releases return PNG for WebP requests. */
(() => {
 'use strict';
 const TARGET=300*1024, LIMIT=500*1024;
 async function encode(canvas,mime,quality){
   if(typeof canvas.toBlob==='function'){
     try {const result=await new Promise(ok=>canvas.toBlob(ok,mime,quality));
       if(result?.size>0 && result.type===mime)return result;
     } catch{}
   }
   try {
     const data=canvas.toDataURL(mime,quality);
     if(!data.startsWith('data:'+mime+';base64,'))return null;
     const binary=atob(data.slice(data.indexOf(',')+1));
     const out=new Uint8Array(binary.length);
     for(let i=0;i<binary.length;i++)out[i]=binary.charCodeAt(i);
     return new Blob([out],{type:mime});
   }catch{return null;}
 }
 function decodeImage(file){
   return new Promise((resolve,reject)=>{
     const src=URL.createObjectURL(file);
     const img=new Image();
     img.onload=()=>{URL.revokeObjectURL(src);resolve(img)};
     img.onerror=()=>{URL.revokeObjectURL(src);reject(new Error('照片無法解碼。若是 HEIC，請先在相簿轉成 JPG。'));};
     img.src=src;
   });
 }
 async function compress(file,{preserveMime=null}={}){
   if(!file || !file.type?.startsWith('image/'))throw new Error('請選擇圖片檔案。');
   if(file.size>8*1024*1024)throw new Error('原始照片不得超過 8 MB。');
   const image=await decodeImage(file);
   const originalMax=Math.max(image.naturalWidth,image.naturalHeight);
   if(!originalMax)throw new Error('照片沒有有效尺寸。');
   const canvas=document.createElement('canvas');const ctx=canvas.getContext('2d');
   if(!ctx)throw new Error('瀏覽器無法處理圖片。');
   const mimes=preserveMime?[preserveMime]:['image/webp','image/jpeg'];
   let best=null;
   // Try smaller dimensions AND lower quality. Only the compressed Blob is kept;
   // original camera EXIF metadata is not copied into a re-encoded canvas.
   for(const side of [1200,1080,960,840,720,600,480]){
     const scale=Math.min(1,side/originalMax);
     canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));
     canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
     ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);
     ctx.drawImage(image,0,0,canvas.width,canvas.height);
     for(const mime of mimes){
       if(mime!=='image/webp' && mime!=='image/jpeg')continue;
       for(const quality of [.80,.70,.60,.50,.40,.32]){
         const blob=await encode(canvas,mime,quality);
         if(!blob)break; // This browser does not support exporting this mime.
         if(blob.size<=LIMIT && (!best || blob.size<best.size))best=blob;
         if(blob.size<=TARGET)return blob;
       }
     }
   }
   if(best && best.size<=LIMIT)return best;
   if(preserveMime==='image/webp')throw new Error('此瀏覽器無法把這張舊 WebP 照片壓縮至 500 KB。請在電腦 Chrome 操作。');
   throw new Error('無法壓縮到 500 KB 以下，請使用其他照片。');
 }
 window.DLYMPhotoCompress={compress,TARGET,LIMIT};
})();
