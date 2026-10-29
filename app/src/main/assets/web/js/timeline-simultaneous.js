// 동시 발생 관계는 같은 프로젝트와 세계선의 사건 ID를 상호 참조합니다.
export function editSimultaneous({item,data,projectId,el,btn,persist,onChange}) {
 const valid=()=>data.entries.filter(e=>e&&e.projectId===projectId&&e.category==="timeline"&&["event","detail"].includes(e.kind)&&e.id!==item.id&&(e.worldline||"main")===(item.worldline||"main"));
 const connected=()=>valid().filter(e=>(item.simultaneousIds||[]).includes(e.id));
 const shade=el("div",{class:"modal-shade"}),panel=el("div",{class:"modal"});
 panel.append(el("h2",{text:"동시 발생 사건 · "+item.title}));
 const list=el("div");
 function update(other,connect){
  const oldA=item.simultaneousIds,oldB=other.simultaneousIds;
  item.simultaneousIds=connect?[...new Set([...(oldA||[]),other.id])]: (oldA||[]).filter(id=>id!==other.id);
  other.simultaneousIds=connect?[...new Set([...(oldB||[]),item.id])]: (oldB||[]).filter(id=>id!==item.id);
  if(!persist()){if(oldA===undefined)delete item.simultaneousIds;else item.simultaneousIds=oldA;if(oldB===undefined)delete other.simultaneousIds;else other.simultaneousIds=oldB;return}
  draw();onChange();
 }
 function draw(){
  list.replaceChildren();
  const options=valid();
  if(!options.length)list.append(el("p",{class:"hint",text:"같은 세계선에 연결할 다른 사건이 없습니다."}));
  for(const e of options){
   const linked=connected().some(x=>x.id===e.id);
   const row=el("div",{class:"item"});
   row.append(el("span",{text:e.title+" · "+(e.kind==="detail"?"세부 사건":"타임라인 사건")}));
   row.append(btn(linked?"연결 해제":"동시 발생 연결",()=>update(e,!linked)));
   list.append(row);
  }
 }
 panel.append(list,btn("닫기",()=>shade.remove()));
 shade.append(panel);shade.addEventListener("click",e=>{if(e.target===shade)shade.remove()});
 globalThis.document.querySelector("#app").append(shade);
 draw();
}
