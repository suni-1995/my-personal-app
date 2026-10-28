import{renderMediaArea,renderComicFiles}from"./media.js?v=suni-inspired-1";
import{deleteOwner,listFiles,putFiles,deleteFile}from"./media-store.js?v=comic-editor-1";
import{uid}from"./schema.js";
export function renderPhaseD({area,data,projectId,category,el,btn,heading,modal,persist}){
 if(category==="media"){renderMediaArea({area,projectId,btn,heading});return}
 let query="",type="",sort="latest";
 const records=()=>data.entries.filter(e=>e&&e.projectId===projectId&&e.category==="fanworks");
 function view(){area.replaceChildren();const bar=heading("창작물");bar.append(btn("+ 새 항목",pick,"primary"));area.append(bar);
 const controls=el("div",{class:"sun-tools"}),search=el("input",{placeholder:"제목 / 태그 / 내용 검색"}),kind=el("select"),order=el("select");
 const options=(select,pairs,value,fn)=>{for(const[v,t]of pairs)select.append(el("option",{value:v,text:t}));select.value=value;select.addEventListener("change",()=>fn(select.value))};
 search.value=query;search.addEventListener("input",()=>{query=search.value;list()});
 options(kind,[["","전체 유형"],["novel","글"],["comic","이미지"]],type,v=>{type=v;list()});
 options(order,[["latest","최신순"],["oldest","오래된 순"],["name","이름순"]],sort,v=>{sort=v;list()});controls.append(search,kind,order);area.append(controls);
 const count=el("p",{class:"hint"}),host=el("div",{class:"items"});area.append(count,host);
 function list(){host.replaceChildren();let xs=records().filter(e=>(!type||e.kind===type)&&[e.title,e.tags,e.body,e.note,e.episode].join(" ").toLowerCase().includes(query.toLowerCase()));xs.sort((a,b)=>sort==="name"?a.title.localeCompare(b.title,"ko"):sort==="latest"?(b.updatedAt||0)-(a.updatedAt||0):(a.updatedAt||0)-(b.updatedAt||0));count.textContent="창작물 "+xs.length+"개";if(!xs.length)host.append(el("p",{class:"empty",text:"등록된 창작물이 없어."}));for(const item of xs){const row=el("div",{class:"sun-work-card"}),body=el("div",{class:"sun-work-body"});body.append(el("strong",{text:(item.kind==="comic"?"🖼️ ":"📝 ")+item.title}),el("p",{class:"hint",text:[item.episode,item.status,item.tags].filter(Boolean).join(" · ")}));if(item.kind==="novel"&&item.body)body.append(el("p",{class:"sun-snippet",text:item.body.slice(0,110)}));row.append(body,btn("열기",()=>detail(item)),btn("편집",()=>edit(item)),btn("삭제",()=>remove(item),"danger"));host.append(row)}}
 list()}
 function pick(){const shade=el("div",{class:"modal-shade"}),box=el("div",{class:"modal"});box.append(el("h2",{text:"창작물 유형 선택"}),btn("📝 글",()=>{shade.remove();edit(null,"novel")},"primary"),btn("🖼️ 이미지",()=>{shade.remove();edit(null,"comic")},"primary"),btn("취소",()=>shade.remove()));shade.append(box);document.querySelector("#app").append(shade)}
 function edit(item,selected){if((item?.kind||selected)==="comic"){editComic(item);return}const kind=item?.kind||selected||"novel",fields=[{key:"title",label:"제목",required:true,value:item?.title||""},{key:"tags",label:"태그",value:item?.tags||""}];if(kind==="novel")fields.push({key:"episode",label:"회차 / 부제",value:item?.episode||""},{key:"status",label:"진행 상태",options:[["초안","초안"],["번역중","번역중"],["완성","완성"],["보류","보류"]],value:item?.status||"초안"},{key:"body",label:"본문",multiline:true,value:item?.body||""});else fields.push({key:"note",label:"메모 / 번역 설명",multiline:true,value:item?.note||item?.body||""});fields.push({key:"source",label:"출처 링크 (선택)",value:item?.source||""});modal(item?"창작물 편집":kind==="novel"?"창작물 · 글":"창작물 · 이미지",fields,v=>{if(!v.title)return false;if(v.source){try{if(!["https:","http:"].includes(new URL(v.source).protocol))throw Error()}catch{alert("올바른 http(s) 링크를 입력해 줘.");return false}}const previous=item?{...item}:null;const fresh=item||{id:uid(),projectId,category:"fanworks",kind,createdAt:Date.now()};Object.assign(fresh,v,{updatedAt:Date.now()});if(!item)data.entries.push(fresh);if(!persist()){if(item)Object.assign(item,previous);else data.entries.pop();return false}view()})}
 function editComic(item){
  const shade=el("div",{class:"modal-shade"}),form=el("form",{class:"modal"}),owner="comic:"+(item?.id||"");
  form.append(el("h2",{text:item?"창작물 · 이미지 편집":"창작물 · 이미지"}));
  const field=(label,multiline,value)=>{
    const wrapper=el("label",{text:label}),input=el(multiline?"textarea":"input");
    if(!multiline)input.type="text";
    input.value=value||"";wrapper.append(input);form.append(wrapper);return input;
  };
  const title=field("제목",false,item?.title),tags=field("태그",false,item?.tags),note=field("메모 / 번역 설명",true,item?.note||item?.body),source=field("출처 링크 (선택)",false,item?.source);
  const pickerLabel=el("label",{text:"이미지 추가 (최대 30장)"});
  const picker=el("input",{type:"file",accept:"image/*"});picker.multiple=true;
  pickerLabel.append(picker);form.append(pickerLabel);
  const status=el("p",{class:"hint",text:"이미지를 선택해 줘."}),preview=el("div",{class:"sun-image-selection"});
  form.append(status,preview);
  let existingCount=0,selectedFiles=[],savedFiles=[];
  if(item)listFiles(owner).then(files=>{existingCount=files.length;status.textContent="기존 이미지 "+existingCount+"장 · 추가 선택 0장"}).catch(e=>{status.textContent="기존 이미지 확인 오류: "+e.message});
  picker.addEventListener("change",()=>{
    selectedFiles=Array.from(picker.files||[]);
    preview.replaceChildren();
    status.textContent="기존 "+existingCount+"장 + 선택 "+selectedFiles.length+"장 / 30장";
    for(const file of selectedFiles)preview.append(el("p",{class:"hint",text:"🖼️ "+file.name}));
  });
  const footer=el("footer"),cancel=el("button",{type:"button",text:"취소"}),save=el("button",{type:"submit",class:"primary",text:"저장"}),error=el("p",{class:"hint"});
  cancel.addEventListener("click",()=>shade.remove());footer.append(cancel,save);form.append(error,footer);
  form.addEventListener("submit",async event=>{
    event.preventDefault();
    const name=title.value.trim(),link=source.value.trim();
    if(!name){error.textContent="제목을 입력해 줘.";title.focus();return}
    if(link){try{if(!["http:","https:"].includes(new URL(link).protocol))throw Error()}catch{error.textContent="올바른 http(s) 출처 링크를 입력해 줘.";return}}
    if(selectedFiles.some(f=>!f.type.startsWith("image/"))){error.textContent="이미지 파일만 등록할 수 있어.";return}
    if(existingCount+selectedFiles.length>30){error.textContent="이미지는 최대 30장이야.";return}
    save.disabled=true;error.textContent="이미지를 저장하는 중...";
    const newItem=!item,fresh=item||{id:uid(),projectId,category:"fanworks",kind:"comic",createdAt:Date.now()},previous=item?{...item}:null;
    try{
      const current=await listFiles("comic:"+fresh.id);
      if(current.length+selectedFiles.length>30)throw Error("이미지는 최대 30장이야.");
      const order=current.reduce((max,r)=>Math.max(max,r.order||0),0)+1;
      const group=uid(),records=[];
      for(let i=0;i<selectedFiles.length;i++){
        const file=selectedFiles[i];
        const bytes=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error||Error("파일을 읽을 수 없어."));reader.readAsArrayBuffer(file)});
        records.push({id:uid(),owner:"comic:"+fresh.id,group,name:file.name,type:"image",mime:file.type,bytes,order:order+i,createdAt:Date.now()});
      }
      if(records.length){await putFiles(records);savedFiles=records}
      Object.assign(fresh,{title:name,tags:tags.value.trim(),note:note.value.trim(),source:link,kind:"comic",updatedAt:Date.now()});
      if(newItem)data.entries.push(fresh);
      if(!persist())throw Error("창작물 정보 저장에 실패했어.");
      shade.remove();view();
    }catch(e){
      if(newItem)data.entries=data.entries.filter(x=>x.id!==fresh.id);
      else if(previous)Object.assign(item,previous);
      for(const record of savedFiles)try{await deleteFile(record.id)}catch(cleanupError){console.warn("첨부 이미지 정리 실패",cleanupError)}
      savedFiles=[];error.textContent="저장 실패: "+e.message;save.disabled=false;
    }
  });
  shade.append(form);document.querySelector("#app").append(shade);title.focus();
 }
 function detail(item){area.replaceChildren();if(item.kind==="comic"){renderComicFiles({area,item,btn,heading,onBack:view});return}const bar=heading(item.title,view);bar.append(btn("편집",()=>edit(item)));area.append(bar,el("p",{class:"hint",text:[item.episode,item.status,item.tags].filter(Boolean).join(" · ")}),el("p",{class:"detail-text",text:item.body||"내용 없음"}));if(item.source)area.append(el("a",{href:item.source,target:"_blank",rel:"noopener noreferrer",text:"출처 링크"}))}
 function remove(item){if(!confirm("창작물을 삭제할까?"))return;const before=data.entries;data.entries=before.filter(e=>e.id!==item.id);if(!persist()){data.entries=before;return}if(item.kind==="comic")deleteOwner("comic:"+item.id).catch(console.warn);view()}
 view()
}
