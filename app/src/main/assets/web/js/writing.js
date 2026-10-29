import {uid} from "./schema.js";
import {editSimultaneous} from "./timeline-simultaneous.js";

export function renderWriting({area,data,projectId,category,el,btn,heading,modal,persist,initialEventId=null}) {
  const isTimeline=category==="timeline";
  const isNovel=category==="novels";
  const label=isTimeline?"타임라인":isNovel?"장문":"썰";
  const initialEvent=data.entries.find(e=>e&&e.id===initialEventId&&e.projectId===projectId&&e.category==="timeline");
  let worldline=initialEvent?.worldline||"main";
  let parentId=initialEvent?.kind==="detail"?(initialEvent.parentId||""):(initialEvent?.id||"");
  let activeThreadId="default";
  let openingDetail=initialEvent?.kind==="detail"?initialEvent:null;
  const items=()=>data.entries.filter(e=>e && e.projectId===projectId && e.category===category);
  const find=id=>items().find(e=>e.id===id);
  const text=(value,className="")=>el("p",{text:value,class:className});
  function commit(change,undo){
    change();
    if(!persist()){undo();return false}
    view();return true;
  }
  function createOrEdit(existing,kind,selectedParent="",scope="main"){
    const fields=[{key:"title",label:isTimeline?(kind==="worldline"?"세계선 이름":kind==="major"?"큰 사건 이름":kind==="event"?"사건 이름":"세부 사건 이름"):isNovel?(kind==="work"?"작품 이름":kind==="season"?"시즌 이름":"회차 제목"):"게시물 제목",required:true,value:existing?.title||""}];
    if(kind!=="worldline"&&kind!=="season") fields.push({key:"body",label:isTimeline?"사건 내용":isNovel?"본문":"게시물 내용",multiline:true,value:existing?.body||""});
    modal(existing?"수정":"새 "+(isTimeline?"사건":isNovel?"항목":"게시물"),fields,v=>{
      if(!v.title)return false;
      const previous=existing?{...existing}:null;
      const fresh={id:uid(),projectId,category,kind,title:v.title,body:v.body||"",parentId:selectedParent,worldline:scope,updatedAt:Date.now()};
      if(existing){Object.assign(existing,{title:v.title,...(v.body!==undefined?{body:v.body}:{}),updatedAt:Date.now()})}
      else data.entries.push(fresh);
      if(!persist()){
        if(existing)Object.assign(existing,previous);else data.entries=data.entries.filter(e=>e.id!==fresh.id);
        return false;
      }
      view();
    });
  }
  function remove(item){
    const descendants=new Set([item.id]);
    let changed=true;
    while(changed){changed=false;for(const e of items())if(e.parentId&&descendants.has(e.parentId)&&!descendants.has(e.id)){descendants.add(e.id);changed=true}}
    if(item.kind==="worldline")for(const e of items())if(e.worldline===item.id)descendants.add(e.id);
    if(!confirm(descendants.size>1?"하위 항목까지 "+descendants.size+"개를 삭제하시겠습니까?":"이 항목을 삭제하시겠습니까?"))return;
    const prev=data.entries;
    commit(()=>{data.entries=prev.filter(e=>!descendants.has(e.id))},()=>{data.entries=prev});
    if(descendants.has(parentId))parentId="";
    if(descendants.has(worldline))worldline="main";
  }
  function row(item,open){
    const r=el("div",{class:"item"});
    r.append(btn(item.title,open,"name"));
    r.append(btn("편집",()=>createOrEdit(item,item.kind,item.parentId||"",item.worldline||"main")));
    r.append(btn("삭제",()=>remove(item),"danger"));
    if(isTimeline&&["event","detail"].includes(item.kind))r.append(btn("동시 사건",()=>editSimultaneous({item,data,projectId,el,btn,persist,onChange:view})));
    return r;
  }
  function navigation(title,onBack){
    const bar=heading(title,onBack);
    area.append(bar);
    return bar;
  }
  function displayEntries(entries,open){
    if(!entries.length)area.append(text("아직 등록한 항목이 없습니다.","empty"));
    const ordered=entries.slice().sort((a,b)=>(a.order??a.createdAt??a.updatedAt??0)-(b.order??b.createdAt??b.updatedAt??0));
    for(let i=0;i<ordered.length;i++){
      const item=ordered[i],r=row(item,()=>open(item));
      if(isTimeline){
        r.append(btn("↑",()=>move(ordered,i,-1)));
        r.append(btn("↓",()=>move(ordered,i,1)));
      }
      area.append(r);
    }
  }
  function move(records,index,delta){
    const other=index+delta;if(other<0||other>=records.length)return;
    const snapshots=records.map(e=>({id:e.id,order:e.order}));
    const reordered=records.slice();
    [reordered[index],reordered[other]]=[reordered[other],reordered[index]];
    reordered.forEach((e,i)=>e.order=i);
    // 순서 이동 후 전체 목록에서 변경된 값을 저장한다.
    if(!persist()){for(const p of snapshots){const entry=records.find(e=>e.id===p.id);entry.order=p.order}return}
    view();
  }
  function worldlineOptions(){
    const tabs=el("div",{class:"tabs"});
    tabs.append(btn("기본 세계선",()=>{worldline="main";parentId="";view()},"nav"+(worldline==="main"?" active":"")));
    for(const w of items().filter(e=>e.kind==="worldline")){
      tabs.append(btn(w.title,()=>{worldline=w.id;parentId="";view()},"nav"+(worldline===w.id?" active":"")));
      tabs.append(btn("⋯",()=>worldlineActions(w),"subtle"));
    }
    area.append(tabs);
  }
  function worldlineActions(w){
    const shade=el("div",{class:"modal-shade"}),panel=el("div",{class:"modal"});
    panel.append(el("h2",{text:w.title}),btn("이름 변경",()=>{shade.remove();createOrEdit(w,"worldline")}),btn("세계선 삭제",()=>{shade.remove();remove(w)},"danger"),btn("닫기",()=>shade.remove()));
    shade.append(panel);shade.addEventListener("click",e=>{if(e.target===shade)shade.remove()});document.querySelector("#app").append(shade);
  }
  function renderTimeline(){
    const top=navigation("타임라인");
    top.append(btn("+ 세계선",()=>createOrEdit(null,"worldline"),""));
    worldlineOptions();
    const selected=worldline==="main"?null:find(worldline);
    if(worldline!=="main"&&!selected){worldline="main";parentId=""}
    const parent=find(parentId);
    const level=parent?.kind==="major"?"event":parent?.kind==="event"?"detail":"major";
    if(parent&&parent.worldline!==worldline)parentId="";
    if(parentId&&(!parent||parent.kind==="detail"))parentId="";
    const effectiveParent=find(parentId);
    if(effectiveParent){
      const breadcrumb=el("div",{class:"toolbar"});
      breadcrumb.append(btn("← 이전 단계",()=>{parentId=effectiveParent.parentId||"";view()}));
      breadcrumb.append(el("h2",{text:effectiveParent.title}));
      area.append(breadcrumb);
      if(effectiveParent.body)area.append(text(effectiveParent.body,"detail-text"));
    }
    const childKind=effectiveParent?.kind==="major"?"event":effectiveParent?.kind==="event"?"detail":"major";
    const childTitle=childKind==="major"?"큰 사건":childKind==="event"?"타임라인 사건":"세부 사건";
    if(childKind!=="detail"||effectiveParent?.kind==="event"){
      const bar=el("div",{class:"toolbar"});
      bar.append(btn("+ "+childTitle,()=>createOrEdit(null,childKind,parentId,worldline),"primary"));
      area.append(bar);
    }
    const children=items().filter(e=>(e.kind||"major")===childKind&&(e.parentId||"")===parentId&&(e.worldline||"main")===worldline);
    displayEntries(children,item=>{if(item.kind==="detail"){showDetail(item)}else{parentId=item.id;view()}});
  }
  function showDetail(item){
    area.replaceChildren();navigation(item.title,()=>{parentId=item.parentId||"";view()});
    area.append(text(item.body||"내용 없음","detail-text"));
    area.append(btn("편집",()=>createOrEdit(item,item.kind,item.parentId||"",item.worldline||"main")));
    if(isTimeline&&["event","detail"].includes(item.kind))area.append(btn("동시 사건",()=>editSimultaneous({item,data,projectId,el,btn,persist,onChange:()=>showDetail(item)})));
  }
  function novelReader(chapter){
    const chapters=items().filter(e=>e.kind==="chapter"&&e.parentId===chapter.parentId)
      .sort((a,b)=>(a.order??a.updatedAt??0)-(b.order??b.updatedAt??0));
    const index=chapters.findIndex(e=>e.id===chapter.id);
    area.replaceChildren();
    const season=find(chapter.parentId),work=find(season?.parentId);
    const bar=navigation([work?.title,season?.title,chapter.title].filter(Boolean).join(" · "),()=>{parentId=chapter.parentId||"";view()});
    bar.append(btn("PDF로 저장 / 인쇄",()=>printReading(chapter.title,chapter.body||"")));
    area.append(text(chapter.body||"내용 없음","detail-text reading-body"));
    const controls=el("div",{class:"toolbar"});
    if(index>0)controls.append(btn("← 이전 회차",()=>novelReader(chapters[index-1])));
    controls.append(btn("회차 목록",()=>{parentId=chapter.parentId||"";view()}));
    if(index>=0&&index<chapters.length-1)controls.append(btn("다음 회차 →",()=>novelReader(chapters[index+1])));
    controls.append(btn("회차 편집",()=>createOrEdit(chapter,"chapter",chapter.parentId)));
    area.append(controls);
  }
  function printReading(title,body){
    const w=window.open("","_blank");
    if(!w){alert("새 창이 차단되어 PDF 저장 화면을 열 수 없습니다.");return}
    const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
    w.document.write('<!doctype html><html lang="ko"><meta charset="utf-8"><title>'+esc(title)+'</title><style>body{font-family:serif;max-width:800px;margin:48px auto;padding:0 25px;line-height:1.9}article{white-space:pre-wrap;overflow-wrap:anywhere}@media print{body{margin:0;max-width:none}}</style><h1>'+esc(title)+'</h1><article>'+esc(body)+'</article></html>');
    w.document.close();w.focus();w.print();
  }
  function renderNovels(){
    const current=find(parentId);
    if(current?.kind==="chapter"){novelReader(current);return}
    const bar=navigation(current?.title||"장문",current?()=>{parentId=current.parentId||"";view()}:null);
    const level=current?.kind==="work"?"season":current?.kind==="season"?"chapter":"work";
    bar.append(btn("+ "+(level==="work"?"작품":level==="season"?"시즌":"회차"),()=>createOrEdit(null,level,parentId),"primary"));
    const entries=items().filter(e=>(e.parentId||"")===parentId&&(e.kind||"work")===level);
    displayEntries(entries,item=>{if(item.kind==="chapter")novelReader(item);else{parentId=item.id;view()}});
  }
  function renderPosts(){
    if(!Array.isArray(data.socialThreads))data.socialThreads=[];
    const threads=()=>data.socialThreads.filter(t=>t.projectId===projectId);
    const entries=()=>items().filter(e=>!e.kind||e.kind==="post");
    // Existing posts are shown in the default thread without changing their data.
    let current=threads().find(t=>t.id===activeThreadId);
    if(!current){
      current=threads()[0]||null;
      activeThreadId=current?.id||"default";
    }
    const root=el("div",{class:"my-sns"});
    area.append(root);
    const top=el("div",{class:"my-sns-top"});
    top.append(el("h2",{text:"SNS · 썰"}));
    const selector=el("select",{class:"my-sns-thread-select"});
    function fillThreads(){
      selector.replaceChildren(el("option",{value:"default",text:"기본 타래"}));
      for(const t of threads())selector.append(el("option",{value:t.id,text:t.name}));
      selector.value=activeThreadId;
    }
    fillThreads();
    selector.addEventListener("change",()=>{activeThreadId=selector.value;view()});
    top.append(selector,btn("+ 타래",()=>modal("새 타래",[{key:"name",label:"타래 이름",required:true}],v=>{
      const t={id:uid(),projectId,name:v.name,createdAt:Date.now()};
      data.socialThreads.push(t);
      if(!persist()){data.socialThreads.pop();return false}
      activeThreadId=t.id;view();
    })));
    if(activeThreadId!=="default")top.append(btn("타래 이름 변경",()=>modal("타래 이름 변경",[{key:"name",label:"이름",required:true,value:current?.name||""}],v=>{
      const old=current.name;current.name=v.name;
      if(!persist()){current.name=old;return false}view();
    })));
    root.append(top);
    const feed=el("div",{class:"my-sns-feed"});
    root.append(feed);
    const box=el("div",{class:"my-sns-composer"});
    const editor=el("textarea",{placeholder:"지금 떠오른 이야기를 남겨보세요.",class:"my-sns-editor"});
    editor.rows=3;
    box.append(editor);
    const pending=el("div",{class:"my-sns-pending"});
    box.append(pending);
    let quoteRef=null;
    const allQuotes=()=>data.entries.filter(e=>e&&e.projectId===projectId&&e.category!=="posts"&&["settings","characters","timeline","novels","fanworks"].includes(e.category)&&e.kind!=="worldline");
    const quoteName=x=>({settings:"설정",characters:"캐릭터",timeline:"타임라인",novels:"장문",fanworks:"창작물"}[x.category]||x.category)+" · "+(x.title||"제목 없음");
    function updatePending(){
      pending.replaceChildren();
      if(!quoteRef)return;
      const q=allQuotes().find(e=>e.id===quoteRef.id);
      pending.append(el("div",{class:"my-sns-quote",text:q?"인용할 자료: "+quoteName(q):"자료를 찾을 수 없습니다."}),btn("×",()=>{quoteRef=null;updatePending()}));
    }
    function chooseQuote(){
      const choices=allQuotes();
      if(!choices.length){alert("이 프로젝트에 인용할 자료가 없습니다.");return}
      const shade=el("div",{class:"modal-shade"}),panel=el("div",{class:"modal"}),select=el("select");
      panel.append(el("h2",{text:"프로젝트 자료 인용"}));
      for(const q of choices)select.append(el("option",{value:q.id,text:quoteName(q)}));
      panel.append(select,btn("인용 선택",()=>{
        const chosen=choices.find(q=>q.id===select.value);
        if(chosen){quoteRef={id:chosen.id,category:chosen.category};updatePending();shade.remove()}
      },"primary"),btn("취소",()=>shade.remove()));
      shade.append(panel);area.ownerDocument.querySelector("#app").append(shade);
    }
    const actions=el("div",{class:"my-sns-compose-actions"});
    actions.append(btn("자료 인용",chooseQuote),btn("게시",()=>{
      const body=editor.value.trim();
      if(!body){alert("글 내용을 입력해 주세요.");return}
      const post={id:uid(),projectId,category:"posts",kind:"post",title:body.slice(0,40),body,threadId:activeThreadId,quoteRef,createdAt:Date.now(),updatedAt:Date.now()};
      data.entries.push(post);
      if(!persist()){data.entries.pop();return}
      editor.value="";quoteRef=null;view();
    },"primary"));
    box.append(actions);root.append(box);
    const shown=entries().filter(e=>(e.threadId||"default")===activeThreadId).sort((a,b)=>(a.createdAt??a.updatedAt??0)-(b.createdAt??b.updatedAt??0));
    if(!shown.length)feed.append(el("p",{class:"empty",text:"아직 이 타래에 게시물이 없습니다."}));
    for(const post of shown){
      const article=el("article",{class:"my-sns-post"});
      article.append(el("div",{class:"my-sns-post-body",text:post.body||post.title||""}));
      const ref=post.quoteRef||(post.quoteId?{id:post.quoteId,category:"posts"}:null);
      if(ref){
        const q=data.entries.find(e=>e.id===ref.id&&e.projectId===projectId);
        const card=el("div",{class:"my-sns-quote"});
        card.append(el("strong",{text:q?quoteName(q):"인용 자료 없음"}));
        card.append(el("p",{text:q?(q.body||q.baseSetting||"").slice(0,180):"삭제되었거나 찾을 수 없는 자료입니다."}));
        article.append(card);
      }
      article.append(el("p",{class:"hint",text:new Date(post.createdAt||post.updatedAt||Date.now()).toLocaleString("ko-KR")}));
      const footer=el("div",{class:"my-sns-post-actions"});
      footer.append(btn(post.liked?"♥ 좋아요":"♡ 좋아요",()=>{
        post.liked=!post.liked;
        if(!persist())post.liked=!post.liked;else view();
      }));
      footer.append(btn("복사",()=>navigator.clipboard?.writeText(post.body||"").catch(()=>alert("복사하지 못했습니다."))));
      footer.append(btn("수정",()=>modal("게시물 수정",[{key:"body",label:"내용",multiline:true,required:true,value:post.body||""}],v=>{
        const old={body:post.body,title:post.title,updatedAt:post.updatedAt};
        post.body=v.body;post.title=v.body.slice(0,40);post.updatedAt=Date.now();
        if(!persist()){Object.assign(post,old);return false}view();
      })));
      footer.append(btn("삭제",()=>{
        if(!confirm("게시물을 삭제하시겠습니까?"))return;
        const old=data.entries;data.entries=old.filter(x=>x.id!==post.id);
        if(!persist())data.entries=old;else view();
      },"danger"));
      article.append(footer);feed.append(article);
    }
  }
  function view(){
    area.replaceChildren();
    if(isTimeline){if(openingDetail){const item=openingDetail;openingDetail=null;showDetail(item)}else renderTimeline();}
    else if(isNovel)renderNovels();
    else renderPosts();
  }
  view();
}
