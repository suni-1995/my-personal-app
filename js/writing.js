import {uid} from "./schema.js";
import {editSimultaneous} from "./timeline-simultaneous.js";

export function renderWriting({area,data,projectId,category,el,btn,heading,modal,persist,initialEventId=null}) {
  const isTimeline=category==="timeline";
  const isNovel=category==="novels";
  const label=isTimeline?"타임라인":isNovel?"장문":"썰";
  const initialEvent=data.entries.find(e=>e&&e.id===initialEventId&&e.projectId===projectId&&e.category==="timeline");
  let worldline=initialEvent?.worldline||"main";
  let parentId=initialEvent?.kind==="detail"?(initialEvent.parentId||""):(initialEvent?.id||"");
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
    if(!confirm(descendants.size>1?"하위 항목까지 "+descendants.size+"개를 삭제할까?":"이 항목을 삭제할까?"))return;
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
    if(!entries.length)area.append(text("아직 등록한 항목이 없어.","empty"));
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
    const bar=navigation("썰");
    bar.append(btn("+ 게시물",()=>createOrEdit(null,"post"),"primary"));
    area.append(text("게시물에 답글을 연결하거나 다른 게시물을 인용할 수 있습니다.","hint"));
    const all=items().filter(e=>!e.kind||e.kind==="post");
    const roots=all.filter(e=>!e.parentId||!all.some(p=>p.id===e.parentId))
      .sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
    if(!roots.length)area.append(text("아직 작성한 썰이 없습니다.","empty"));
    const seen=new Set();
    function drawPost(post,depth){
      if(seen.has(post.id))return;seen.add(post.id);
      const article=el("article",{class:"post"});
      article.style.marginLeft=Math.min(depth,5)*14+"px";
      article.append(el("h3",{text:post.title}));
      if(post.quoteId){
        const quoted=all.find(e=>e.id===post.quoteId);
        article.append(el("blockquote",{class:"post-quote",text:quoted?"인용: "+quoted.title+"\n"+(quoted.body||""):"인용한 게시물이 삭제되었습니다."}));
      }
      article.append(text(post.body||"","detail-text"));
      article.append(btn("답글",()=>postEditor(post,"reply")),btn("인용",()=>postEditor(post,"quote")),
        btn("수정",()=>createOrEdit(post,"post")),btn("삭제",()=>remove(post),"danger"));
      area.append(article);
      all.filter(e=>e.parentId===post.id).sort((a,b)=>(a.updatedAt||0)-(b.updatedAt||0))
        .forEach(child=>drawPost(child,depth+1));
    }
    roots.forEach(post=>drawPost(post,0));
  }
  function postEditor(parent,mode){
    modal(mode==="reply"?"답글 작성":"인용 게시물 작성",[
      {key:"title",label:"제목",required:true,value:mode==="reply"?"Re: "+parent.title:""},
      {key:"body",label:"내용",multiline:true,value:""}
    ],v=>{
      const fresh={id:uid(),projectId,category:"posts",kind:"post",title:v.title,body:v.body||"",
        parentId:mode==="reply"?parent.id:"",quoteId:mode==="quote"?parent.id:"",updatedAt:Date.now()};
      data.entries.push(fresh);
      if(!persist()){data.entries=data.entries.filter(e=>e.id!==fresh.id);return false}
      view();
    });
  }
  function view(){
    area.replaceChildren();
    if(isTimeline){if(openingDetail){const item=openingDetail;openingDetail=null;showDetail(item)}else renderTimeline();}
    else if(isNovel)renderNovels();
    else renderPosts();
  }
  view();
}
