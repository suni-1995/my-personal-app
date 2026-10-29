import {uid} from "./schema.js";
import {renderRelationshipGraph} from "./relationship-graph.js";

// 한 관계를 두 캐릭터가 공유한다. 기존 캐릭터 항목은 변경하지 않는다.
export function renderCharacterRelations({content,data,projectId,entry,el,btn,modal,persist}) {
  if(!Array.isArray(data.relationships))data.relationships=[];
  const characters=()=>data.entries.filter(e=>e&&e.projectId===projectId&&e.category==="characters");
  const current=()=>data.relationships.filter(r=>r.projectId===projectId&&(r.characterA===entry.id||r.characterB===entry.id));
  const otherId=r=>r.characterA===entry.id?r.characterB:r.characterA;
  const other=r=>characters().find(e=>e.id===otherId(r));
  function editor(existing) {
    const options=characters().filter(c=>c.id!==entry.id).map(c=>[c.id,c.title||"이름 없음"]);
    if(!options.length){alert("관계를 연결할 다른 캐릭터를 먼저 등록해 주세요.");return}
    const target=existing?otherId(existing):options[0][0];
    modal(existing?"인물 관계 수정":"인물 관계 추가",[
      {key:"targetId",label:"상대 캐릭터",options,value:target},
      {key:"relation",label:"관계",value:existing?.relation||"",required:true},
      {key:"description",label:"관계 설명",multiline:true,value:existing?.description||""}
    ],v=>{
      const selected=characters().find(c=>c.id===v.targetId&&c.id!==entry.id);
      if(!selected){alert("연결할 캐릭터를 찾을 수 없습니다.");return false}
      const duplicated=data.relationships.some(r=>r!==existing&&r.projectId===projectId&&
        ((r.characterA===entry.id&&r.characterB===selected.id)||(r.characterB===entry.id&&r.characterA===selected.id)));
      if(duplicated){alert("두 캐릭터 사이의 관계가 이미 등록되어 있습니다.");return false}
      if(existing){
        const previous={...existing};
        Object.assign(existing,{characterA:entry.id,characterB:selected.id,relation:v.relation,description:v.description,updatedAt:Date.now()});
        if(!persist()){Object.assign(existing,previous);return false}
      }else{
        const relationship={id:uid(),projectId,characterA:entry.id,characterB:selected.id,relation:v.relation,description:v.description,updatedAt:Date.now()};
        data.relationships.push(relationship);
        if(!persist()){data.relationships.pop();return false}
      }
      draw();
    });
  }
  function remove(r){
    if(!confirm("이 인물 관계를 삭제하시겠습니까?"))return;
    const old=data.relationships;
    data.relationships=old.filter(x=>x.id!==r.id);
    if(!persist()){data.relationships=old;return}
    draw();
  }
  function draw(){
    content.replaceChildren();
    const bar=el("div",{class:"toolbar"});
    bar.append(btn("+ 관계 추가",()=>editor(null),"primary"));
    content.append(bar);
    const relations=current();
    const graphHost=el("div",{class:"relationship-graph"});
    content.append(graphHost);
    renderRelationshipGraph({host:graphHost,data,projectId,entry});
    if(!relations.length){content.append(el("p",{class:"hint",text:"등록된 인물 관계가 없습니다."}));return}
    for(const r of relations){
      const target=other(r),line=el("div",{class:"item"});
      const description=el("div",{class:"detail-info"});
      description.append(el("strong",{text:(target?.title||"삭제된 캐릭터")+" · "+(r.relation||"관계 없음")}));
      if(r.description)description.append(el("p",{text:r.description}));
      line.append(description);
      if(target)line.append(btn("수정",()=>editor(r)));
      line.append(btn("삭제",()=>remove(r),"danger"));
      content.append(line);
    }
  }
  draw();
}
