export function renderCharacterDocuments({content,data,projectId,entry,el,btn,persist}) {
  const docs=()=>data.entries.filter(d=>d.projectId===projectId&&d.category==="settings");
  const ids=()=>Array.isArray(entry.linkedDocumentIds)?entry.linkedDocumentIds:[];
  function saveLinks(next){
    const before=entry.linkedDocumentIds;entry.linkedDocumentIds=next;
    if(!persist()){if(before===undefined)delete entry.linkedDocumentIds;else entry.linkedDocumentIds=before;return false}
    draw();return true;
  }
  function popup(title,build){
    const shade=el("div",{class:"modal-shade"}),panel=el("div",{class:"modal"});
    panel.append(el("h2",{text:title}));build(panel,()=>shade.remove());
    shade.append(panel);shade.addEventListener("click",e=>{if(e.target===shade)shade.remove()});
    document.querySelector("#app").append(shade);
  }
  function add(){
    const options=docs().filter(d=>!ids().includes(d.id));
    if(!options.length){alert("연결할 설정 문서가 없습니다.");return}
    popup("설정 문서 연결",(panel,close)=>{
      const select=el("select");
      for(const d of options)select.append(el("option",{value:d.id,text:(d.group||"세계관")+" · "+d.title}));
      panel.append(select,btn("연결",()=>{if(saveLinks([...ids(),select.value]))close()},"primary"),btn("취소",close));
    });
  }
  function open(id){
    const d=docs().find(x=>x.id===id);
    if(!d){alert("원본 문서를 찾을 수 없습니다.");return}
    popup(d.title||"제목 없음",(panel,close)=>{
      panel.append(el("p",{class:"hint",text:"설정 · "+(d.group||"세계관")}),el("p",{class:"detail-text",text:d.body||"문서 내용이 없습니다."}),btn("닫기",close));
    });
  }
  function draw(){
    content.replaceChildren();
    const bar=el("div",{class:"toolbar"});bar.append(btn("+ 문서 연결",add,"primary"));content.append(bar);
    if(!ids().length)content.append(el("p",{class:"hint",text:"연결된 문서가 없습니다."}));
    for(const id of ids()){
      const d=docs().find(x=>x.id===id),line=el("div",{class:"item"});
      line.append(el("span",{text:d?(d.group||"세계관")+" · "+d.title:"삭제된 문서"}));
      if(d)line.append(btn("열람",()=>open(id)));
      line.append(btn("연결 해제",()=>{if(confirm("문서 연결을 해제하시겠습니까?"))saveLinks(ids().filter(x=>x!==id))},"danger"));
      content.append(line);
    }
  }
  draw();
}