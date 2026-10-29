import {uid} from "./schema.js";

// 조직도 문서 ID를 기준으로 구성원과 소속 관계를 저장합니다.
export function renderOrganization({area,document,data,projectId,el,btn,modal,persist,onBack}) {
 const people=()=>data.entries.filter(x=>x&&x.projectId===projectId&&x.category==="characters");
 const members=()=>Array.isArray(document.orgMembers)?document.orgMembers:[];
 function save(next){
  const previous=document.orgMembers;
  document.orgMembers=next;
  if(!persist()){if(previous===undefined)delete document.orgMembers;else document.orgMembers=previous;return false}
  draw();return true;
 }
 function editor(existing){
  const options=[["","직접 입력"],...people().map(c=>[c.id,c.title||"이름 없음"])];
  modal(existing?"구성원 수정":"구성원 추가",[
   {key:"characterId",label:"연결 캐릭터",options,value:existing?.characterId||""},
   {key:"name",label:"구성원 이름 (직접 입력 시 필수)",value:existing?.name||""},
   {key:"role",label:"직책 / 역할",value:existing?.role||""},
   {key:"parentId",label:"상위 구성원",options:[["","상위 없음"],...members().filter(m=>m.id!==existing?.id).map(m=>[m.id,memberName(m)])],value:existing?.parentId||""}
  ],v=>{
   if(!v.characterId&&!v.name){alert("구성원 이름을 입력해 주세요.");return false}
   if(v.characterId&&!people().some(c=>c.id===v.characterId)){alert("연결할 캐릭터를 찾을 수 없습니다.");return false}
   const id=existing?.id||uid();
   if(v.parentId){
    let cursor=v.parentId,visited=new Set([id]);
    while(cursor){if(visited.has(cursor)){alert("상위 구성원 관계가 순환될 수 없습니다.");return false}visited.add(cursor);cursor=members().find(m=>m.id===cursor)?.parentId||""}
   }
   const row={id,characterId:v.characterId,name:v.name,role:v.role,parentId:v.parentId};
   return save(existing?members().map(m=>m.id===id?row:m):[...members(),row]);
  });
 }
 function memberName(m){return people().find(c=>c.id===m.characterId)?.title||m.name||"삭제된 캐릭터"}
 function remove(m){
  if(!confirm("이 구성원을 삭제하시겠습니까? 하위 구성원은 상위 없음으로 변경됩니다."))return;
  save(members().filter(x=>x.id!==m.id).map(x=>x.parentId===m.id?{...x,parentId:""}:x));
 }
 function draw(){
  area.replaceChildren();
  const bar=el("div",{class:"toolbar"});
  bar.append(btn("← 돌아가기",onBack),el("h2",{text:document.title||"조직도"}),btn("+ 구성원",()=>editor(null),"primary"));
  area.append(bar);
  if(document.body)area.append(el("p",{class:"detail-text",text:document.body}));
  if(!members().length)area.append(el("p",{class:"hint",text:"등록된 구성원이 없습니다."}));
  for(const m of members()){
   const parent=members().find(x=>x.id===m.parentId);
   const line=el("div",{class:"item"});
   const label=el("div",{class:"detail-info"});
   label.append(el("strong",{text:memberName(m)+(m.role?" · "+m.role:"")}));
   label.append(el("p",{class:"hint",text:"상위 구성원: "+(parent?memberName(parent):"없음")}));
   line.append(label,btn("수정",()=>editor(m)),btn("삭제",()=>remove(m),"danger"));
   area.append(line);
  }
 }
 draw();
}
