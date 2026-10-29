import {listFiles,mediaBlob} from "./media-store.js";
const encoder=new TextEncoder();
const enc=s=>encoder.encode(s);
const crcTable=new Uint32Array(256);
for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?(0xedb88320^(c>>>1)):(c>>>1);crcTable[n]=c>>>0}
function crc32(bytes){let c=0xffffffff;for(const b of bytes)c=crcTable[(c^b)&255]^(c>>>8);return(c^0xffffffff)>>>0}
function zip(files){
 const parts=[],central=[];let offset=0;
 const u16=(v,n)=>n.setUint16(0,v,true),u32=(v,n)=>n.setUint32(0,v>>>0,true);
 for(const [name,bytes] of files){
  const path=enc(name),crc=crc32(bytes),h=new Uint8Array(30+path.length),v=new DataView(h.buffer);
  v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x0800,true);v.setUint16(8,0,true);
  v.setUint32(14,crc,true);v.setUint32(18,bytes.length,true);v.setUint32(22,bytes.length,true);v.setUint16(26,path.length,true);h.set(path,30);
  const c=new Uint8Array(46+path.length),cv=new DataView(c.buffer);
  cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint16(8,0x0800,true);
  cv.setUint32(16,crc,true);cv.setUint32(20,bytes.length,true);cv.setUint32(24,bytes.length,true);
  cv.setUint16(28,path.length,true);cv.setUint32(42,offset,true);c.set(path,46);central.push(c);
  parts.push(h,bytes);offset+=h.length+bytes.length;
  if(offset>0xffffffff)throw Error("ZIP 최대 크기(4GB)를 초과했어.");
 }
 if(files.length>65535)throw Error("백업 파일 개수 제한을 초과했어.");
 const end=new Uint8Array(22),ev=new DataView(end.buffer);
 ev.setUint32(0,0x06054b50,true);ev.setUint16(8,files.length,true);ev.setUint16(10,files.length,true);
 const centralSize=central.reduce((n,b)=>n+b.length,0);ev.setUint32(12,centralSize,true);ev.setUint32(16,offset,true);
 return new Blob([...parts,...central,end],{type:"application/zip"});
}
const owners=entry=>entry.category==="characters"?"character:"+entry.id:entry.category==="fanworks"&&entry.kind==="comic"?"comic:"+entry.id:null;
function filename(name){return (name||"MYAPPS").replace(/[\\/:*?"<>|\x00-\x1f]/g,"_").slice(0,60)}
async function nativeSave(blob,name){
 const bridge=window.AndroidBackup;if(!bridge)throw Error("Android 백업 저장 기능을 찾지 못했어.");
 const result=bridge.begin();if(result!=="ok")throw Error(result);
 try{
  const buffer=new Uint8Array(await blob.arrayBuffer());
  const step=24*1024;
  for(let i=0;i<buffer.length;i+=step){
   const sub=buffer.subarray(i,i+step);let s="";for(let j=0;j<sub.length;j++)s+=String.fromCharCode(sub[j]);
   const status=bridge.append(btoa(s));if(status!=="ok")throw Error(status);
  }
  const status=bridge.finish(name);if(status!=="ok")throw Error(status);
 }catch(e){bridge.abort();throw e}
}
export async function exportBackup(data,projectId=null){
 const projects=projectId?data.projects.filter(p=>p.id===projectId):data.projects.slice();
 if(projectId&&!projects.length)throw Error("프로젝트를 찾을 수 없어.");
 const ids=new Set(projects.map(p=>p.id));
 const entries=data.entries.filter(e=>ids.has(e.projectId));
 const folders=(data.folders||[]).filter(f=>ids.has(f.projectId));
 const sources=new Set(projects.map(p=>"media:"+p.id));
 for(const e of entries){const owner=owners(e);if(owner)sources.add(owner)}
 const media=[],files=[];
 for(const owner of sources){
  const records=await listFiles(owner);
  for(const record of records){
   const path="media/"+record.id;
   if(media.some(m=>m.path===path))throw Error("첨부파일 ID 중복: "+record.id);
   let blob;
   if(record.nativeUrl){
    const response=await fetch(record.nativeUrl);
    if(!response.ok)throw Error("첨부파일을 읽지 못했어: "+record.name);
    blob=await response.blob();
   }else blob=mediaBlob(record);
   const bytes=new Uint8Array(await blob.arrayBuffer());
   media.push({path,record:{...record,bytes:undefined,blob:undefined,nativeUrl:undefined},size:bytes.length,crc32:crc32(bytes)});
   files.push([path,bytes]);
  }
 }
 const manifest={format:"MYAPPS-ZIP",formatVersion:1,createdAt:new Date().toISOString(),scope:projectId?"project":"all",projects:projects.map(p=>({id:p.id,name:p.name,type:p.type})),media:media.map(({path,record,size,crc32})=>({path,id:record.id,owner:record.owner,size,crc32}))};
 const dataFile={version:data.version,projects,entries,folders};
 const archive=zip([["manifest.json",enc(JSON.stringify(manifest))],["data.json",enc(JSON.stringify(dataFile))],["media/records.json",enc(JSON.stringify(media.map(({path,record})=>({path,...record}))))],...files]);
 const date=new Date().toISOString().slice(0,10);
 const name="MYAPPS-"+(projectId?filename(projects[0].name):"전체")+"-"+date+".zip";
 if(window.AndroidBackup)await nativeSave(archive,name);
 else{const url=URL.createObjectURL(archive),a=document.createElement("a");a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000)}
 return {projects:projects.length,attachments:media.length,name};
}
