// 기존 인물 관계 데이터를 읽기 전용으로 표시한다.
export function renderRelationshipGraph({host,data,projectId,entry}) {
  host.replaceChildren();
  const people=data.entries.filter(x=>x&&x.projectId===projectId&&x.category==="characters");
  const links=(data.relationships||[]).filter(r=>r.projectId===projectId&&(r.characterA===entry.id||r.characterB===entry.id));
  const nodes=[entry,...links.map(r=>people.find(p=>p.id===(r.characterA===entry.id?r.characterB:r.characterA))).filter(Boolean)];
  const unique=[...new Map(nodes.map(p=>[p.id,p])).values()];
  const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");
  const count=unique.length-1,outer=Math.max(190,Math.ceil(count/7)*75+145),size=outer*2+140,mid=size/2;
  svg.setAttribute("viewBox",`0 0 ${size} ${size}`);
  svg.setAttribute("role","img");
  svg.setAttribute("aria-label",entry.title+"의 인물 관계도");
  svg.style.cssText="display:block;width:100%;min-width:280px;max-width:760px;height:auto;margin:auto";
  const ns="http://www.w3.org/2000/svg";
  const item=(tag,attrs,text)=>{const n=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));if(text!==undefined)n.textContent=text;svg.append(n);return n};
  const positions=new Map([[entry.id,{x:mid,y:mid}]]);
  unique.slice(1).forEach((person,i)=>{const a=2*Math.PI*i/Math.max(1,count)-Math.PI/2;positions.set(person.id,{x:mid+outer*Math.cos(a),y:mid+outer*Math.sin(a)})});
  for(const r of links){
    const id=r.characterA===entry.id?r.characterB:r.characterA,p=positions.get(id);
    if(!p)continue;
    item("line",{x1:mid,y1:mid,x2:p.x,y2:p.y,stroke:"currentColor","stroke-opacity":0.48,"stroke-width":2});
    const label=item("text",{x:(mid+p.x)/2,y:(mid+p.y)/2-9,"text-anchor":"middle","font-size":13,fill:"currentColor"},r.relation||"관계");
    label.setAttribute("paint-order","stroke");label.setAttribute("stroke","var(--surface,white)");label.setAttribute("stroke-width","5");
  }
  for(const person of unique){
    const p=positions.get(person.id),center=person.id===entry.id;
    item("circle",{cx:p.x,cy:p.y,r:center?54:47,fill:"var(--surface,white)",stroke:"currentColor","stroke-width":center?3:1.5});
    const name=person.title||"이름 없음";
    const t=item("text",{x:p.x,y:p.y,"text-anchor":"middle","dominant-baseline":"middle","font-size":center?16:14,"font-weight":center?700:500,fill:"currentColor"},name.length>9?name.slice(0,8)+"…":name);
    const title=document.createElementNS(ns,"title");title.textContent=name;t.append(title);
  }
  if(count===0){const p=document.createElement("p");p.className="hint";p.textContent="연결된 인물 관계가 없습니다.";host.append(p)}
  host.append(svg);
}
