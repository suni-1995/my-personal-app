import {uid} from "./schema.js";
export function renderWritingPart({area,data,projectId,category,el,btn,heading,modal,persist}) {
  let activeThreadId="default";
  let snsEvents=new AbortController();
  const items=()=>data.entries.filter(e=>e&&e.projectId===projectId&&e.category===category);
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
    if(activeThreadId!=="default")top.append(btn("타래 삭제",()=>{if(!confirm("타래를 삭제하시겠습니까? 게시물은 기본 타래에 남습니다."))return;const old=data.socialThreads,changed=entries().filter(p=>p.threadId===activeThreadId),ids=changed.map(p=>p.threadId);data.socialThreads=old.filter(t=>t.id!==activeThreadId);changed.forEach(p=>p.threadId="default");if(!persist()){data.socialThreads=old;changed.forEach((p,i)=>p.threadId=ids[i]);return}activeThreadId="default";view()},"danger"));
    root.append(top);
    const feed=el("div",{class:"my-sns-feed"});
    root.append(feed);
    const box=el("div",{class:"my-sns-composer"});
    const keyboard=()=>window.visualViewport?.height < window.innerHeight*0.88;
    const keepFocus=e=>{if(document.activeElement===editor&&e.cancelable)e.preventDefault()};
    const editor=el("textarea",{placeholder:"지금 떠오른 이야기를 남겨보세요.",class:"my-sns-editor"});
    editor.rows=3;
    const pending=el("div",{class:"my-sns-pending"});
    box.append(pending,editor);
    let quoteRef=null,threadRef=null;
    const allQuotes=()=>data.entries.filter(e=>e&&e.projectId===projectId&&e.category!=="posts"&&["settings","characters","timeline","novels","fanworks"].includes(e.category)&&e.kind!=="worldline");
    const quoteName=x=>({settings:"설정",characters:"캐릭터",timeline:"타임라인",novels:"장문",fanworks:"창작물"}[x.category]||x.category)+" · "+(x.title||"제목 없음");
    function updatePending(){
      pending.replaceChildren();
      if(threadRef){const t=threads().find(x=>x.id===threadRef);pending.append(el("div",{class:"my-sns-quote",text:"연결 타래: "+(t?.name||"기본 타래")}),btn("×",()=>{threadRef=null;updatePending()}))}
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
      shade.classList.add("my-sns-viewport-modal");shade.append(panel);area.ownerDocument.querySelector("#app").append(shade);const vv=window.visualViewport;const place=()=>{if(vv){shade.style.top=vv.offsetTop+"px";shade.style.height=vv.height+"px";shade.style.bottom="auto"}};place();vv?.addEventListener("resize",place,{signal:snsEvents.signal});
    }
    const actions=el("div",{class:"my-sns-compose-actions"});
    actions.append(btn("자료 인용",chooseQuote),btn("타래 연결",()=>{const choices=[{id:"default",name:"기본 타래"},...threads()].filter(t=>t.id!==activeThreadId);if(!choices.length){alert("연결할 다른 타래가 없습니다.");return}const shade=el("div",{class:"modal-shade"}),panel=el("div",{class:"modal"}),select=el("select");panel.append(el("h2",{text:"타래 연결"}));for(const t of choices)select.append(el("option",{value:t.id,text:t.name}));panel.append(select,btn("선택",()=>{threadRef=select.value;updatePending();shade.remove()},"primary"),btn("취소",()=>shade.remove()));shade.append(panel);area.ownerDocument.querySelector("#app").append(shade)}),btn("게시",()=>{
      const body=editor.value.trim();
      if(!body){alert("글 내용을 입력해 주세요.");return}
      const post={id:uid(),projectId,category:"posts",kind:"post",title:body.slice(0,40),body,threadId:activeThreadId,quoteRef,threadLinkId:threadRef,createdAt:Date.now(),updatedAt:Date.now()};
      data.entries.push(post);
      if(!persist()){data.entries.pop();return}
      editor.value="";quoteRef=null;threadRef=null;updatePending();
      // Keep the existing composer focused so Android does not dismiss the keyboard.
      const empty=feed.querySelector(".empty");if(empty)empty.remove();
      feed.append(renderSnsPost(post));
      editor.focus({preventScroll:true});
      requestAnimationFrame(()=>{editor.focus({preventScroll:true});keepVisible()});
    },"primary"));
    box.append(actions);root.append(box);
    const send=actions.lastElementChild;send.addEventListener("pointerdown",keepFocus);
    const shown=entries().filter(e=>(e.threadId||"default")===activeThreadId).sort((a,b)=>(a.createdAt??a.updatedAt??0)-(b.createdAt??b.updatedAt??0));
    if(!shown.length)feed.append(el("p",{class:"empty",text:"아직 이 타래에 게시물이 없습니다."}));
    for(const post of shown)feed.append(renderSnsPost(post));
    function renderSnsPost(post){
      const article=el("article",{class:"my-sns-post"});
      article.append(el("div",{class:"my-sns-post-body",text:post.body||post.title||""}));
      const ref=post.quoteRef||(post.quoteId?{id:post.quoteId,category:"posts"}:null);
      if(ref){
        const q=data.entries.find(e=>e.id===ref.id&&e.projectId===projectId);
        const card=el("div",{class:"my-sns-quote"});
        card.append(el("strong",{text:q?quoteName(q):"인용 자료 없음"}));
        card.append(el("p",{text:q?(q.body||q.baseSetting||"").slice(0,180):"삭제되었거나 찾을 수 없는 자료입니다."}));
        if(q){card.classList.add("my-sns-quote-open");card.setAttribute("role","button");card.tabIndex=0;const open=()=>{const shade=el("div",{class:"modal-shade"}),panel=el("div",{class:"modal"});panel.append(el("h2",{text:q.title||"인용 자료"}),el("p",{class:"hint",text:quoteName(q)}),el("div",{class:"detail-text",text:q.body||q.baseSetting||"내용이 없습니다."}),btn("닫기",()=>shade.remove()));shade.append(panel);shade.addEventListener("click",e=>{if(e.target===shade)shade.remove()});area.ownerDocument.querySelector("#app").append(shade)};card.addEventListener("click",open);card.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();open()}})}
        article.append(card);
      }
      if(post.threadLinkId){const t=threads().find(x=>x.id===post.threadLinkId);article.append(btn("↗ "+(post.threadLinkId==="default"?"기본 타래":t?.name||"삭제된 타래"),()=>{if(post.threadLinkId==="default"||t){activeThreadId=post.threadLinkId;view()}}))}
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
      article.append(footer);return article;
    }
    function keepVisible(){const viewport=window.visualViewport;const bottom=viewport?viewport.offsetTop+viewport.height:window.innerHeight;const bounds=box.getBoundingClientRect();if(bounds.bottom>bottom-8)window.scrollBy(0,bounds.bottom-(bottom-8));}
    editor.addEventListener("focus",()=>{root.classList.add("my-sns-keyboard");requestAnimationFrame(keepVisible)});
    window.visualViewport?.addEventListener("resize",keepVisible,{signal:snsEvents.signal});
    editor.addEventListener("blur",()=>root.classList.remove("my-sns-keyboard"));
    area.addEventListener("pointerdown",e=>{if(!box.contains(e.target)&&!e.target.closest(".modal-shade")&&document.activeElement===editor)editor.blur()},{signal:snsEvents.signal});
  }
  function view(){
    snsEvents.abort();snsEvents=new AbortController();
    area.replaceChildren();
    renderPosts();
  }
  view();
}
