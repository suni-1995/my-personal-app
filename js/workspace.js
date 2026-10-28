import {SETTINGS_GROUPS,uid} from "./schema.js";

export function renderWorkspace({area,data,projectId,category,el,btn,heading,modal,persist,render}) {
  if(!Array.isArray(data.folders)) data.folders=[];
  const settings=category==="settings";
  const groups=settings?SETTINGS_GROUPS:["캐릭터"];
  let activeGroup=groups[0],activeFolder="";
  const view=()=>{
    area.replaceChildren();
    const bar=heading(settings?"설정":"캐릭터");
    bar.append(btn("+ 폴더",()=>folderEditor()));
    bar.append(btn(settings?"+ 설정 문서":"+ 캐릭터",()=>entryEditor(), "primary"));
    area.append(bar);
    if(settings){
      const tabs=el("div",{class:"tabs"});
      for(const g of groups) tabs.append(btn(g,()=>{activeGroup=g;activeFolder="";view()},"nav"+(g===activeGroup?" active":"")));
      area.append(tabs);
    }
    const folders=data.folders.filter(f=>f.projectId===projectId&&f.category===category&&f.group===activeGroup);
    const folderBar=el("div",{class:"folderbar"});
    folderBar.append(btn("전체",()=>{activeFolder="";view()},activeFolder===""?"active":""));
    for(const f of folders){
      const actions=el("div",{class:"folder-chip"});
      actions.append(btn("📁 "+f.name,()=>{activeFolder=f.id;view()},activeFolder===f.id?"active":""));
      actions.append(btn("⋯",()=>folderActions(f),"subtle"));
      folderBar.append(actions);
    }
    area.append(folderBar);
    const entries=data.entries.filter(e=>e.projectId===projectId&&e.category===category&&(!settings||(e.group||"세계관")===activeGroup)&&(!activeFolder||e.folderId===activeFolder)).sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
    if(!entries.length)area.append(el("p",{class:"empty",text:"이 위치에 등록된 항목이 없어."}));
    for(const entry of entries){
      const row=el("div",{class:"item"});
      row.append(btn((settings?"📄 ":"👤 ")+(entry.title||"제목 없음"),()=>settings?entryEditor(entry):characterDetail(entry),"name"));
      row.append(btn("편집",()=>entryEditor(entry)));
      row.append(btn("삭제",()=>{if(!confirm("이 항목을 삭제할까?"))return;const old=data.entries;data.entries=old.filter(x=>x.id!==entry.id);if(!persist()){data.entries=old;return}view()},"danger"));
      area.append(row);
    }
  };
  const folderEditor=f=>modal(f?"폴더 이름 변경":"새 폴더",[{key:"name",label:"폴더 이름",value:f?.name||"",required:true}],v=>{
    if(f){const previous=f.name;f.name=v.name;if(!persist()){f.name=previous;return false}}
    else{const folder={id:uid(),projectId,category,group:activeGroup,name:v.name};data.folders.push(folder);if(!persist()){data.folders.pop();return false}}
    view();
  });
  function folderActions(folder){
    const shade=el("div",{class:"modal-shade"}),panel=el("div",{class:"modal"});
    panel.append(el("h2",{text:folder.name}));
    panel.append(btn("이름 변경",()=>{shade.remove();folderEditor(folder)}));
    panel.append(btn("폴더 삭제",()=>{
      if(!confirm("폴더만 삭제하고 안에 있던 항목은 전체 목록에 남길까?"))return;
      const oldFolders=data.folders,changed=data.entries.filter(e=>e.projectId===projectId&&e.category===category&&e.folderId===folder.id);
      const oldIds=changed.map(e=>e.folderId);
      changed.forEach(e=>e.folderId="");
      data.folders=oldFolders.filter(f=>f.id!==folder.id);
      if(!persist()){data.folders=oldFolders;changed.forEach((e,i)=>e.folderId=oldIds[i]);return}
      activeFolder="";shade.remove();view();
    },"danger"));
    panel.append(btn("닫기",()=>shade.remove()));shade.append(panel);shade.addEventListener("click",e=>{if(e.target===shade)shade.remove()});document.querySelector("#app").append(shade);
  }
  function entryEditor(entry){
    const options=[["","폴더 없음"],...data.folders.filter(f=>f.projectId===projectId&&f.category===category&&f.group===(entry?.group||activeGroup)).map(f=>[f.id,f.name])];
    const fields=[{key:"title",label:settings?"문서 제목":"이름",value:entry?.title||"",required:true}];
    if(!settings)fields.push({key:"age",label:"나이",value:entry?.age||""},{key:"gender",label:"성별",value:entry?.gender||""},{key:"baseSetting",label:"기본 설정",multiline:true,value:entry?.baseSetting||""},{key:"image",label:"이미지 주소 (선택)",value:entry?.image||""});
    fields.push({key:"folderId",label:"보관 폴더",options,value:entry?.folderId||""},{key:"body",label:settings?"문서 내용":"설명",multiline:true,value:entry?.body||""});
    modal(entry?"항목 편집":settings?"설정 문서 생성":"캐릭터 생성",fields,v=>{
      if(entry){
        const snapshot={...entry};
        Object.assign(entry,v,{updatedAt:Date.now()});
        if(!persist()){Object.keys(entry).forEach(k=>delete entry[k]);Object.assign(entry,snapshot);return false}
      }else{
        const fresh={id:uid(),projectId,category,group:activeGroup,...v,updatedAt:Date.now()};
        data.entries.push(fresh);
        if(!persist()){data.entries.pop();return false}
      }
      view();
    });
  }
  function characterDetail(entry){
    area.replaceChildren();
    const bar=heading(entry.title,view);
    bar.append(btn("기본 정보 수정",()=>entryEditor(entry)));
    area.append(bar);
    const info=el("div",{class:"detail-info"});
    info.append(el("p",{text:"나이: "+(entry.age||"미입력")+" · 성별: "+(entry.gender||"미입력")}));
    if(entry.baseSetting)info.append(el("p",{text:"기본 설정: "+entry.baseSetting}));
    if(entry.image){
      const image=el("img",{src:entry.image,alt:entry.title,class:"character-image",loading:"lazy"});
      image.addEventListener("error",()=>{image.remove();info.append(el("p",{class:"hint",text:"이미지 주소를 확인해 줘."}))});
      info.append(image);
    }
    area.append(info);
    const tabs=["설명","인물 관계","연결 문서","이미지","캐릭터송","타임라인"];
    const nav=el("div",{class:"tabs"}),content=el("section",{class:"detail-content"});
    for(const name of tabs)nav.append(btn(name,()=>{
      for(const child of nav.children)child.classList.toggle("active",child.textContent===name);
      content.replaceChildren();
      if(name==="설명")content.append(el("p",{class:"detail-text",text:entry.body||"설명이 아직 없어."}));
      else if(name==="이미지"&&entry.image)content.append(el("img",{src:entry.image,alt:entry.title,class:"character-image"}));
      else content.append(el("p",{class:"hint",text:name+" 세부 기능은 추후 개발 단계에서 구현할 예정이야."}));
    },"nav"+(name==="설명"?" active":"")));
    area.append(nav,content);
    nav.firstChild.click();
  }
  view();
}
