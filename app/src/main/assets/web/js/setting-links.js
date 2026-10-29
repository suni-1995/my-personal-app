// 설정 문서와 동일 프로젝트의 문서/캐릭터를 고유 ID로 연결합니다.
export function renderSettingLinks({area,document,data,projectId,el,btn,persist,onBack}) {
 const refs=()=>Array.isArray(document.settingLinks)?document.settingLinks:[];
 const targets=()=>data.entries.filter(x=>x&&x.projectId===projectId&&x.id!==document.id&&(x.category==="settings"||x.category==="characters"));
 const label=x=>(x.category==="characters"?"캐릭터":x.group||"세계관")+" · "+(x.title||"제목 없음");
 function change(next){
  const before=document.settingLinks;document.settingLinks=next;
  if(!persist()){if(before===undefined)delete document.settingLinks;else document.settingLinks=before;return false}
  draw();return true;
 }
 function popup(title,build){
  const shade=el("div",{class:"modal-shade"}),panel=el("div",{class:"modal"});
  panel.append(el("h2",{text:title}));build(panel,()=>shade.remove());
  shade.append(panel);shade.addEventListener("click",e=>{if(e.target===shade)shade.remove()});
  document.querySelector("#app").append(shade);
 }
 function add(){
  const available=targets().filter(x=>!refs().some(r=>r.id===x.id));
  if(!available.length){alert("연결할 다른 문서나 캐릭터가 없습니다.");return}
  popup("자료 연결",(panel,close)=>{
   const select=el("select");
   for(const x of available)select.append(el("option",{value:x.id,text:label(x)}));
   panel.append(select,btn("연결",()=>{const x=available.find(t=>t.id===select.value);if(x&&change([...refs(),{id:x.id,category:x.category}]))close()},"primary"),btn("취소",close));
  });
 }
 function preview(id){
  const x=targets().find(t=>t.id===id);
  if(!x){alert("원본 자료를 찾을 수 없습니다.");return}
  popup(x.title||"제목 없음",(panel,close)=>{
   panel.append(el("p",{class:"hint",text:label(x)}),el("p",{class:"detail-text",text:x.body||x.baseSetting||"내용이 없습니다."}),btn("닫기",close));
  });
 }
 function draw(){
  area.replaceChildren();
  const bar=el("div",{class:"toolbar"});
  bar.append(btn("← 돌아가기",onBack),el("h2",{text:document.title||"설정 문서"}),btn("+ 자료 연결",add,"primary"));
  area.append(bar);
  if(document.body)area.append(el("p",{class:"detail-text",text:document.body}));
  if(!refs().length)area.append(el("p",{class:"hint",text:"연결된 자료가 없습니다."}));
  for(const r of refs()){
   const x=targets().find(t=>t.id===r.id),line=el("div",{class:"item"});
   line.append(el("span",{text:x?label(x):"삭제된 자료"}));
   if(x)line.append(btn("열람",()=>preview(r.id)));
   line.append(btn("연결 해제",()=>{if(confirm("자료 연결을 해제하시겠습니까?"))change(refs().filter(t=>t.id!==r.id))},"danger"));
   area.append(line);
  }
 }
 draw();
}
