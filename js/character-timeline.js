// 캐릭터가 출연하는 기존 세계선/사건의 ID만 저장합니다.
export function renderCharacterTimeline({content,data,projectId,entry,el,btn,persist,onOpenTimeline}) {
 const events=()=>data.entries.filter(x=>x&&x.projectId===projectId&&x.category==="timeline"&&x.kind!=="worldline");
 const links=()=>Array.isArray(entry.timelineEventIds)?entry.timelineEventIds:[];
 const worldName=id=>id==="main"||!id?"기본 세계선":data.entries.find(x=>x.projectId===projectId&&x.category==="timeline"&&x.kind==="worldline"&&x.id===id)?.title||"삭제된 세계선";
 function change(next){
  const before=entry.timelineEventIds;entry.timelineEventIds=next;
  if(!persist()){if(before===undefined)delete entry.timelineEventIds;else entry.timelineEventIds=before;return false}
  draw();return true;
 }
 function popup(title,render){
  const shade=el("div",{class:"modal-shade"}),panel=el("div",{class:"modal"});
  panel.append(el("h2",{text:title}));render(panel,()=>shade.remove());
  shade.append(panel);shade.addEventListener("click",e=>{if(e.target===shade)shade.remove()});
  document.querySelector("#app").append(shade);
 }
 function add(){
  const available=events().filter(x=>!links().includes(x.id));
  if(!available.length){alert("연결할 타임라인 사건이 없습니다.");return}
  popup("타임라인 사건 연결",(panel,close)=>{
   const select=el("select");
   for(const x of available)select.append(el("option",{value:x.id,text:worldName(x.worldline)+" · "+x.title}));
   panel.append(select,btn("연결",()=>{if(available.some(x=>x.id===select.value)&&change([...links(),select.value]))close()},"primary"),btn("취소",close));
  });
 }
 function editNote(item){
  popup("캐릭터별 사건 설명 · "+item.title,(panel,close)=>{
   const label=el("label",{text:"이 캐릭터의 사건 설명"}),input=el("textarea");
   input.value=entry.timelineEventNotes?.[item.id]||"";
   label.append(input);panel.append(label);
   panel.append(btn("저장",()=>{
    const previous=entry.timelineEventNotes;
    entry.timelineEventNotes={...(previous||{}),[item.id]:input.value.trim()};
    if(!persist()){if(previous===undefined)delete entry.timelineEventNotes;else entry.timelineEventNotes=previous;return}
    close();draw();
   },"primary"),btn("취소",close));
  });
 }
 function preview(item){
  popup(item.title||"이름 없음",(panel,close)=>{
   panel.append(el("p",{class:"hint",text:worldName(item.worldline)}),el("p",{class:"detail-text",text:item.body||"내용이 없습니다."}));
   panel.append(btn("타임라인으로 이동",()=>{close();onOpenTimeline(item.id)}),btn("닫기",close));
  });
 }
 function draw(){
  content.replaceChildren();const toolbar=el("div",{class:"toolbar"});
  toolbar.append(btn("+ 사건 연결",add,"primary"));content.append(toolbar);
  if(!links().length)content.append(el("p",{class:"hint",text:"연결된 타임라인 사건이 없습니다."}));
  for(const id of links()){
   const item=events().find(x=>x.id===id),line=el("div",{class:"item"});
   line.append(el("span",{text:item?worldName(item.worldline)+" · "+item.title:"삭제된 사건"}));
   if(item){
    const note=entry.timelineEventNotes?.[id];
    if(note)line.append(el("p",{class:"detail-text",text:note}));
    line.append(btn("설명 작성/수정",()=>editNote(item)),btn("열람",()=>preview(item)));
   }
   line.append(btn("연결 해제",()=>{if(confirm("사건 연결을 해제하시겠습니까?"))change(links().filter(x=>x!==id))},"danger"));
   content.append(line);
  }
 }
 draw();
}