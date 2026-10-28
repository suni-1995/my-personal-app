// Project creation is independent of the generic content editor.
export function showProjectCreate({types,onCreate}) {
  const overlay=document.createElement("div");
  overlay.className="modal-shade";
  const form=document.createElement("form");
  form.className="modal";
  const heading=document.createElement("h2");
  heading.textContent="새 프로젝트";
  const nameLabel=document.createElement("label");
  nameLabel.textContent="프로젝트 이름";
  const name=document.createElement("input");
  name.type="text";name.required=true;name.maxLength=150;name.autocomplete="off";
  nameLabel.append(name);
  const typeLabel=document.createElement("label");
  typeLabel.textContent="프로젝트 유형 (생성 후 변경 불가)";
  const type=document.createElement("select");
  for(const [key,value] of Object.entries(types)){
    const option=document.createElement("option");
    option.value=key;option.textContent=value.name;type.append(option);
  }
  type.selectedIndex=0;
  type.required=true;
  typeLabel.append(type);
  const error=document.createElement("p");
  error.className="hint";error.setAttribute("role","alert");
  const footer=document.createElement("footer");
  const cancel=document.createElement("button");
  cancel.type="button";cancel.textContent="취소";cancel.addEventListener("click",()=>overlay.remove());
  const save=document.createElement("button");
  save.type="submit";save.className="primary";save.textContent="생성";
  footer.append(cancel,save);
  form.append(heading,nameLabel,typeLabel,error,footer);
  overlay.append(form);
  form.addEventListener("submit",event=>{
    event.preventDefault();
    const projectName=name.value.trim(),projectType=type.value;
    if(!projectName){error.textContent="프로젝트 이름을 입력해 줘.";name.focus();return}
    if(!Object.prototype.hasOwnProperty.call(types,projectType)){error.textContent="올바른 프로젝트 유형을 선택해 줘.";return}
    save.disabled=true;
    try{
      const result=onCreate(projectName,projectType);
      if(result===false){error.textContent="프로젝트를 저장하지 못했어. 저장 공간이나 브라우저 설정을 확인해 줘.";save.disabled=false;return}
      overlay.remove();
    }catch(err){
      console.error("MYAPPS project creation failed",err);
      error.textContent="프로젝트 생성 오류: "+String(err?.message||err);
      save.disabled=false;
    }
  });
  overlay.addEventListener("click",e=>{if(e.target===overlay)overlay.remove()});
  document.querySelector("#app").append(overlay);
  name.focus();
}
