import{uid}from"./schema.js";
import{listFiles,putFiles,deleteFile,mediaBlob,videoDuration}from"./media-store.js";

const mediaOwner=id=>"media:"+id;
const comicOwner=id=>"comic:"+id;
const n=(tag,props={})=>{const element=document.createElement(tag);for(const[k,v]of Object.entries(props)){if(k==="text")element.textContent=v;else if(k==="class")element.className=v;else element.setAttribute(k,v)}return element};
function choose(accept,callback){const input=n("input",{type:"file",accept});input.multiple=true;input.hidden=true;document.body.append(input);input.addEventListener("change",()=>{const files=Array.from(input.files||[]);input.remove();if(files.length)callback(files)},{once:true});input.click()}
const kind=file=>file.type.startsWith("image/")?"image":file.type.startsWith("video/")?"video":"";
async function makeRecords(files,owner,group,type,orderStart){
 const records=[];
 for(let i=0;i<files.length;i++){
  const file=files[i];
  if(kind(file)!==type)throw Error("지원하지 않는 파일 형식: "+file.name);
  if(type==="video"){const seconds=await videoDuration(file);if(seconds>=10)throw Error("영상은 10초 미만만 등록할 수 있어: "+file.name)}
  // ArrayBuffer avoids File structured-clone incompatibilities in older Android WebViews.
  const bytes=await file.arrayBuffer();
  records.push({id:uid(),owner,group,name:file.name,type,mime:file.type,bytes,order:orderStart+i});
 }
 return records;
}
function banner(error){alert("파일 저장 실패: "+String(error?.message||error))}
function cover(record,className){const image=n("img",{class:className,alt:record.name});const url=URL.createObjectURL(mediaBlob(record));image.src=url;image.addEventListener("load",()=>URL.revokeObjectURL(url),{once:true});image.addEventListener("error",()=>URL.revokeObjectURL(url),{once:true});return image}
function groups(records){const batches=new Map();for(const r of records){const key=r.group||r.id;if(!batches.has(key))batches.set(key,[]);batches.get(key).push(r)}return Array.from(batches.values())}
function viewer(records,title){
 let index=0;
 const shade=n("div",{class:"gallery-shade"}),panel=n("section",{class:"gallery-panel"}),header=n("div",{class:"gallery-header"}),stage=n("div",{class:"gallery-stage"}),footer=n("div",{class:"gallery-footer"});
 const close=n("button",{type:"button",text:"닫기"}),before=n("button",{type:"button",text:"← 이전"}),after=n("button",{type:"button",text:"다음 →"}),counter=n("span");
 header.append(n("strong",{text:title}),close);footer.append(before,counter,after);panel.append(header,stage,footer);shade.append(panel);document.body.append(shade);
 let activeUrl="";
 function draw(){if(activeUrl){URL.revokeObjectURL(activeUrl);activeUrl=""}stage.replaceChildren();const record=records[index];activeUrl=URL.createObjectURL(mediaBlob(record));const el=n(record.type==="video"?"video":"img",{src:activeUrl});if(record.type==="video")el.controls=true;else el.alt=record.name;stage.append(el);counter.textContent=(index+1)+" / "+records.length;before.disabled=index===0;after.disabled=index===records.length-1}
 function dismiss(){if(activeUrl)URL.revokeObjectURL(activeUrl);shade.remove();document.removeEventListener("keydown",keys)}
 function keys(e){if(e.key==="Escape")dismiss();if(e.key==="ArrowLeft"&&index>0){index--;draw()}if(e.key==="ArrowRight"&&index<records.length-1){index++;draw()}}
 close.addEventListener("click",dismiss);shade.addEventListener("click",e=>{if(e.target===shade)dismiss()});before.addEventListener("click",()=>{index--;draw()});after.addEventListener("click",()=>{index++;draw()});document.addEventListener("keydown",keys);draw();
}
function batchCard(records,{container,title,onDelete,onMove}){
 const first=records[0],block=n("div",{class:"media-batch"}),open=n("button",{type:"button",class:"media-cover"});
 open.append(cover(first,"media-thumbnail"));open.append(n("span",{text:records.length>1?first.name+" 외 "+(records.length-1)+"장":first.name}));open.addEventListener("click",()=>viewer(records,title||first.name));block.append(open);
 if(onMove)for(const [caption,delta]of [["↑",-1],["↓",1]]){const b=n("button",{type:"button",text:caption});b.addEventListener("click",()=>onMove(records,delta));block.append(b)}
 const del=n("button",{type:"button",class:"danger",text:"묶음 삭제"});del.addEventListener("click",()=>onDelete(records));block.append(del);container.append(block);
}
export function renderMediaArea({area,projectId,btn,heading}){
 const owner=mediaOwner(projectId);let seq=0;
 async function view(){const stamp=++seq;area.replaceChildren();const bar=heading("이미지/영상");bar.append(btn("+ 이미지",()=>choose("image/*",files=>add(files,"image")),"primary"));bar.append(btn("+ 영상",()=>choose("video/*",files=>add(files,"video"))));area.append(bar,n("p",{class:"hint",text:"한 번에 선택한 이미지는 하나의 묶음으로 보여줘. 대표 이미지를 누르면 전체 보기 창이 열려."}));const placeholder=n("p",{class:"hint",text:"불러오는 중..."});area.append(placeholder);
 try{const all=await listFiles(owner);if(seq!==stamp)return;placeholder.remove();if(!all.length)area.append(n("p",{class:"empty",text:"등록된 이미지나 영상이 없어."}));
 for(const batch of groups(all)){if(batch[0].type==="image")batchCard(batch,{container:area,onDelete:remove,title:"이미지 보기"});else for(const record of batch){const block=n("div",{class:"media-batch"}),video=n("video",{controls:"controls"}),url=URL.createObjectURL(mediaBlob(record));video.src=url;video.addEventListener("emptied",()=>URL.revokeObjectURL(url),{once:true});block.append(video,n("p",{text:record.name}));const del=btn("삭제",()=>remove([record]),"danger");block.append(del);area.append(block)}}
 }catch(e){if(seq===stamp)placeholder.textContent="저장소 오류: "+e.message}}
 async function add(files,type){if(type==="image"&&files.length>10){alert("한 번에 이미지는 최대 10장이야.");return}try{const prior=await listFiles(owner);const order=prior.reduce((v,r)=>Math.max(v,r.order||0),0)+1;await putFiles(await makeRecords(files,owner,uid(),type,order));await view()}catch(e){banner(e)}}
 async function remove(records){if(!confirm(records.length>1?"이 이미지 묶음 전체를 삭제할까?":"이 파일을 삭제할까?"))return;try{for(const r of records)await deleteFile(r.id);await view()}catch(e){banner(e)}}
 view();
}
export function renderComicFiles({area,item,btn,heading,onBack}){
 const owner=comicOwner(item.id);let seq=0;
 async function view(){const stamp=++seq;area.replaceChildren();const bar=heading(item.title,onBack);bar.append(btn("+ 이미지 가져오기",()=>choose("image/*",add),"primary"));area.append(bar,n("p",{class:"hint",text:"이미지는 최대 30장, 같은 선택에서 가져온 이미지는 하나의 묶음으로 표시돼."}));
 if(item.source){const link=n("a",{href:item.source,target:"_blank",rel:"noopener noreferrer",text:"출처 링크"});const paragraph=n("p");paragraph.append(link);area.append(paragraph)}
 const loading=n("p",{class:"hint",text:"불러오는 중..."});area.append(loading);
 try{const all=await listFiles(owner);if(stamp!==seq)return;loading.remove();if(!all.length)area.append(n("p",{class:"empty",text:"등록된 이미지가 없어."}));for(const batch of groups(all))batchCard(batch,{container:area,title:item.title,onDelete:remove,onMove:move})}catch(e){if(stamp===seq)loading.textContent="저장소 오류: "+e.message}
 }
 async function add(files){try{const old=await listFiles(owner);if(files.length+old.length>30)throw Error("한 창작물은 최대 30장까지 등록할 수 있어.");const order=old.reduce((v,r)=>Math.max(v,r.order||0),0)+1;await putFiles(await makeRecords(files,owner,uid(),"image",order));await view()}catch(e){banner(e)}}
 async function remove(records){if(!confirm("이 이미지 묶음을 삭제할까?"))return;try{for(const record of records)await deleteFile(record.id);await view()}catch(e){banner(e)}}
 async function move(batch,delta){try{const all=await listFiles(owner),batches=groups(all),i=batches.findIndex(g=>g[0].id===batch[0].id),j=i+delta;if(j<0||j>=batches.length)return;[batches[i],batches[j]]=[batches[j],batches[i]];let order=0;for(const group of batches)for(const r of group)r.order=order++;await putFiles(all);await view()}catch(e){banner(e)}}
 view();
}
