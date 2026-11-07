const fs=require('node:fs');
function photoData(file){
 const stat=fs.statSync(file);if(!stat.isFile()||stat.size>20*1024*1024)throw Error('请选择 20 MB 以内的 PNG、JPEG 或 WebP 照片');
 const data=fs.readFileSync(file);
 const mime=data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'image/png':data[0]===255&&data[1]===216&&data[2]===255?'image/jpeg':data.toString('ascii',0,4)==='RIFF'&&data.toString('ascii',8,12)==='WEBP'?'image/webp':null;
 if(!mime)throw Error('照片格式不受支持，请选择 PNG、JPEG 或 WebP 文件');
 return {bytes:data,mime,data:'data:'+mime+';base64,'+data.toString('base64')};
}
function photoPosition(value){if(!Number.isFinite(value)||value<0||value>100)throw Error('照片位置必须在 0–100 之间');return Math.round(value)}
module.exports={photoData,photoPosition};
