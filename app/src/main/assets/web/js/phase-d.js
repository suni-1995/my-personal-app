import {uid} from "./schema.js";

export function renderPhaseD({area,data,projectId,category,el,btn,heading,modal,persist}) {
  const fan=category==="fanworks";
  const items=()=>data.entries.filter(e=>e&&e.projectId===projectId&&e.category===category);
  const view=()=>{
    area.replaceChildren();
    const bar=heading(fan?"창작물":"이미지/영상");
    if(fan)bar.append(btn("+ 창작물",()=>edit(),"primary"));
    area.append(bar);
    if(!fan){
      area.append(el("p",{class:"hint",text:"고급 프로젝트의 이미지·영상 보관 공간이야. 이미지 등록과 영상 길이 검증 등 실제 파일 기능은 2차 개발에서 구현할 예정이야."}));
      return;
    }
    const records=items().sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
    if(!records.length)area.append(el("p",{class:"empty",text:"아직 보관한 창작물이 없어."}));
    for(const item of records){
      const row=el("div",{class:"item"});
      row.append(btn((item.kind==="comic"?"이미지(만화) · ":"글(소설) · ")+item.title,()=>detail(item),"name"));
      row.append(btn("편집",()=>edit(item)));
      row.append(btn("삭제",()=>remove(item),"danger"));
      area.append(row);
    }
  };
  function edit(item){
    const fields=[
      {key:"title",label:"제목",required:true,value:item?.title||""},
      {key:"kind",label:"유형",options:[["novel","글(소설)"],["comic","이미지(만화)"]],value:item?.kind||"novel"},
      {key:"source",label:"출처 링크 (선택)",value:item?.source||""},
      {key:"body",label:"글 내용 / 이미지 자료 메모",multiline:true,value:item?.body||""}
    ];
    modal(item?"창작물 편집":"창작물 생성",fields,v=>{
      if(!v.title||!["novel","comic"].includes(v.kind))return false;
      if(v.source){try{const url=new URL(v.source);if(!["https:","http:"].includes(url.protocol))throw Error("protocol")}catch{alert("출처 링크는 http 또는 https 주소만 입력해 줘.");return false}}
      const prev=item?{...item}:null;
      if(item)Object.assign(item,v,{updatedAt:Date.now()});
      else data.entries.push({id:uid(),projectId,category,...v,updatedAt:Date.now()});
      if(!persist()){
        if(item)Object.assign(item,prev);else data.entries.pop();
        return false;
      }
      view();
    });
  }
  function remove(item){
    if(!confirm("이 창작물을 삭제할까?"))return;
    const old=data.entries;
    data.entries=old.filter(x=>x.id!==item.id);
    if(!persist()){data.entries=old;return}
    view();
  }
  function detail(item){
    area.replaceChildren();
    const bar=heading(item.title,view);
    bar.append(btn("편집",()=>edit(item)));
    area.append(bar);
    area.append(el("p",{class:"hint",text:item.kind==="comic"?"이미지(만화) · 이미지 파일 등록과 순서 열람은 2차 개발 범위야.":"글(소설)"}));
    area.append(el("p",{class:"detail-text",text:item.body||"내용 없음"}));
    if(item.source){
      const link=el("a",{href:item.source,target:"_blank",rel:"noopener noreferrer",text:"출처 링크"});
      const source=el("p");source.append(link);area.append(source);
    }
  }
  view();
}
