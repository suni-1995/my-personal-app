import {uid} from "./schema.js";

export function renderWriting({area,data,projectId,category,el,btn,heading,modal,persist}) {
  const isTimeline=category==="timeline";
  const isNovel=category==="novels";
  const label=isTimeline?"타임라인":isNovel?"장문":"썰";
  let worldline="main";
  let parentId="";
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
    return r;
  }
  function navigation(title,onBack){
    const bar=heading(title,onBack);
    area.append(bar);
    return bar;
  }
  function displayEntries(entries,open){
    if(!entries.length)area.append(text("아직 등록한 항목이 없어.","empty"));
    for(const item of entries.sort((a,b)=>(a.order??a.updatedAt??0)-(b.order??b.updatedAt??0)))area.append(row(item,()=>open(item)));
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
    area.replaceChildren();navigation(item.title,view);
    area.append(text(item.body||"내용 없음","detail-text"));
    area.append(btn("편집",()=>createOrEdit(item,item.kind,item.parentId||"",item.worldline||"main")));
  }
  function renderNovels(){
    const current=find(parentId);
    const bar=navigation(current?.title||"장문",current?()=>{parentId=current.parentId||"";view()}:null);
    const level=current?.kind==="work"?"season":current?.kind==="season"?"chapter":"work";
    bar.append(btn("+ "+(level==="work"?"작품":level==="season"?"시즌":"회차"),()=>createOrEdit(null,level,parentId),"primary"));
    if(current?.kind==="chapter"){showDetail(current);return}
    const entries=items().filter(e=>(e.parentId||"")===parentId&&(e.kind||"work")===level);
    displayEntries(entries,item=>{if(item.kind==="chapter")showDetail(item);else{parentId=item.id;view()}});
  }
  function renderPosts(){
    const bar=navigation("썰");
    bar.append(btn("+ 게시물",()=>createOrEdit(null,"post"),"primary"));
    const entries=items().filter(e=>!e.kind||e.kind==="post").sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
    if(!entries.length)area.append(text("아직 작성한 썰이 없어.","empty"));
    for(const post of entries){
      const article=el("article",{class:"post"});
      article.append(el("h3",{text:post.title}),text(post.body||"","detail-text"));
      article.append(btn("수정",()=>createOrEdit(post,"post")),btn("삭제",()=>remove(post),"danger"));
      area.append(article);
    }
  }
  function view(){
    area.replaceChildren();
    if(isTimeline)renderTimeline();
    else if(isNovel)renderNovels();
    else renderPosts();
  }
  view();
}
