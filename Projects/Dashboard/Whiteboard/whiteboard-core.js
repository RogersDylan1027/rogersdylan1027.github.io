(() => {
  "use strict";

  const VERSION = "0.1.0";
  const DD_VERSION = "1.0";
  const canvas = document.getElementById("canvas");
  const wrap = document.getElementById("canvasWrap");
  const ctx = canvas.getContext("2d", { alpha: false });
  const $ = id => document.getElementById(id);

  const state = {
    title: "Untitled Whiteboard",
    mode: "infinite",
    pageCount: 5,
    camera: { x: 0, y: 0, zoom: 1 },
    tool: "pen",
    elements: [],
    assets: {},
    history: [],
    future: [],
    dirty: false,
    fileId: null,
    fileFolderId: "root",
    selectionPending: false,
    selectionStart: null,
    selectionRect: null,
    pointer: null,
    gesture: null,
    textPoint: null
  };

  const PAGE = { width: 816, height: 1056, gap: 42, margin: 90 };
  const DB_KEY = "dashboard-whiteboard-fs-v1";

  function defaultFS() {
    return {
      folders: [{ id: "root", name: "Whiteboard", parentId: null, createdAt: Date.now() }],
      files: [], shortcuts: []
    };
  }
  function loadFS(){ try { return { ...defaultFS(), ...JSON.parse(localStorage.getItem(DB_KEY) || "{}") }; } catch { return defaultFS(); } }
  function saveFS(fs){ localStorage.setItem(DB_KEY, JSON.stringify(fs)); }
  let fs = loadFS();
  let currentFolderId = "root";
  let shortcutTarget = null;

  function uid(prefix="id"){ return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`; }
  function clone(v){ return JSON.parse(JSON.stringify(v)); }
  function markDirty(){ state.dirty=true; updateStatus(); }
  function updateStatus(){ $("saveStatus").textContent = state.dirty ? (state.fileId ? "Edited" : "Not saved") : (state.fileId ? "Saved" : "Not saved"); }
  function toast(msg){ const t=$("toast"); t.textContent=msg; t.classList.remove("hidden"); clearTimeout(toast._t); toast._t=setTimeout(()=>t.classList.add("hidden"),2200); }

  function snapshot(){ return JSON.stringify({mode:state.mode,pageCount:state.pageCount,camera:state.camera,elements:state.elements,assets:state.assets,title:state.title}); }
  function pushHistory(){ state.history.push(snapshot()); if(state.history.length>80)state.history.shift(); state.future=[]; }
  function restore(raw){ const s=JSON.parse(raw); Object.assign(state,{mode:s.mode,pageCount:s.pageCount,camera:s.camera,elements:s.elements,assets:s.assets,title:s.title}); $("docTitle").value=state.title; updateModeUI(); render(); markDirty(); }
  function undo(){ if(!state.history.length)return; state.future.push(snapshot()); restore(state.history.pop()); }
  function redo(){ if(!state.future.length)return; state.history.push(snapshot()); restore(state.future.pop()); }

  function resize(){ const dpr=Math.max(1,window.devicePixelRatio||1); const r=wrap.getBoundingClientRect(); canvas.width=Math.round(r.width*dpr); canvas.height=Math.round(r.height*dpr); canvas.style.width=r.width+"px"; canvas.style.height=r.height+"px"; ctx.setTransform(dpr,0,0,dpr,0,0); render(); }
  window.addEventListener("resize",resize);

  const worldToScreen=(x,y)=>({x:(x-state.camera.x)*state.camera.zoom+wrap.clientWidth/2,y:(y-state.camera.y)*state.camera.zoom+wrap.clientHeight/2});
  const screenToWorld=(x,y)=>({x:(x-wrap.clientWidth/2)/state.camera.zoom+state.camera.x,y:(y-wrap.clientHeight/2)/state.camera.zoom+state.camera.y});

  function zoomAt(screenX,screenY,factor){
    const before=screenToWorld(screenX,screenY); const next=Math.max(0.0001,Math.min(10000,state.camera.zoom*factor)); state.camera.zoom=next; const after=screenToWorld(screenX,screenY); state.camera.x += before.x-after.x; state.camera.y += before.y-after.y; updateZoom(); render();
  }
  function updateZoom(){ const z=state.camera.zoom; $("zoomLabel").textContent = z>=0.01&&z<100 ? `${Math.round(z*100)}%` : z<0.01 ? `${(z*100).toExponential(1)}%` : `${Math.round(z)}×`; }

  function visibleWorld(){ const a=screenToWorld(0,0), b=screenToWorld(wrap.clientWidth,wrap.clientHeight); return {x:a.x,y:a.y,w:b.x-a.x,h:b.y-a.y}; }

  function drawBackground(){
    ctx.save(); ctx.fillStyle=state.mode==="infinite"?"#f7f8fb":"#e7ebf0"; ctx.fillRect(0,0,wrap.clientWidth,wrap.clientHeight);
    if(state.mode==="infinite"){
      const z=state.camera.zoom; const minor=50, step=minor*z; if(step>7&&step<180){ ctx.strokeStyle="#e7ebf2"; ctx.lineWidth=1; const origin=worldToScreen(0,0); for(let x=((origin.x%step)+step)%step;x<wrap.clientWidth;x+=step){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,wrap.clientHeight);ctx.stroke()} for(let y=((origin.y%step)+step)%step;y<wrap.clientHeight;y+=step){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(wrap.clientWidth,y);ctx.stroke()} }
    } else drawPages();
    ctx.restore();
  }

  function pageTop(i){ return PAGE.margin + i*(PAGE.height+PAGE.gap); }
  function drawPages(){
    const v=visibleWorld(); const first=Math.max(0,Math.floor((v.y-PAGE.margin)/(PAGE.height+PAGE.gap))-1); const last=Math.min(state.pageCount-1,Math.ceil((v.y+v.h-PAGE.margin)/(PAGE.height+PAGE.gap))+1);
    for(let i=first;i<=last;i++){
      const p1=worldToScreen(-PAGE.width/2,pageTop(i)); const p2=worldToScreen(PAGE.width/2,pageTop(i)+PAGE.height); const x=p1.x,y=p1.y,w=p2.x-p1.x,h=p2.y-p1.y;
      ctx.fillStyle="#fff";ctx.fillRect(x,y,w,h);ctx.strokeStyle="#ccd3dc";ctx.lineWidth=1;ctx.strokeRect(x,y,w,h);
      if(state.camera.zoom>.15){ const spacing=32*state.camera.zoom; ctx.strokeStyle="#dce7f5";ctx.lineWidth=Math.max(.5,state.camera.zoom*.7); for(let ly=y+72*state.camera.zoom;ly<y+h-30*state.camera.zoom;ly+=spacing){ctx.beginPath();ctx.moveTo(x+45*state.camera.zoom,ly);ctx.lineTo(x+w-35*state.camera.zoom,ly);ctx.stroke()} const mx=x+82*state.camera.zoom;ctx.strokeStyle="#f0c9c9";ctx.beginPath();ctx.moveTo(mx,y+35*state.camera.zoom);ctx.lineTo(mx,y+h-35*state.camera.zoom);ctx.stroke(); }
    }
  }

  function ensurePages(){ if(state.mode!=="pages")return; const v=visibleWorld(); const need=Math.ceil((v.y+v.h-PAGE.margin)/(PAGE.height+PAGE.gap))+2; if(need>state.pageCount){state.pageCount=need;markDirty();} }

  const imageCache=new Map();
  function getImage(src){ if(imageCache.has(src))return imageCache.get(src); const img=new Image(); img.src=src; imageCache.set(src,img); img.onload=render; return img; }

  function renderElement(el){
    if(el.type==="stroke"){
      if(el.points.length<1)return; ctx.save(); ctx.lineCap="round";ctx.lineJoin="round";ctx.strokeStyle=el.color;ctx.globalAlpha=el.opacity??1;ctx.lineWidth=Math.max(.5,el.width*state.camera.zoom); const p0=worldToScreen(el.points[0].x,el.points[0].y);ctx.beginPath();ctx.moveTo(p0.x,p0.y);for(let i=1;i<el.points.length;i++){const p=worldToScreen(el.points[i].x,el.points[i].y);ctx.lineTo(p.x,p.y)}ctx.stroke();ctx.restore();
    } else if(el.type==="text"){
      const p=worldToScreen(el.x,el.y);ctx.save();ctx.fillStyle=el.color||"#18202b";ctx.font=`${Math.max(5,el.size*state.camera.zoom)}px -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif`;ctx.textBaseline="top";ctx.fillText(el.text,p.x,p.y);ctx.restore();
    } else if(el.type==="image"){
      const asset=state.assets[el.assetId];if(!asset)return;const img=getImage(asset.dataUrl);if(!img.complete)return;const p=worldToScreen(el.x,el.y);ctx.drawImage(img,p.x,p.y,el.w*state.camera.zoom,el.h*state.camera.zoom);
    }
  }

  function render(){ if(!ctx)return; drawBackground(); state.elements.forEach(renderElement); if(state.selectionRect){const r=state.selectionRect,a=worldToScreen(r.x,r.y),b=worldToScreen(r.x+r.w,r.y+r.h);ctx.save();ctx.setLineDash([7,5]);ctx.strokeStyle="#28487e";ctx.lineWidth=2;ctx.strokeRect(a.x,a.y,b.x-a.x,b.y-a.y);ctx.restore();} ensurePages(); }

  function setTool(tool){state.tool=tool;document.querySelectorAll("[data-tool]").forEach(b=>b.classList.toggle("active",b.dataset.tool===tool));canvas.style.cursor=tool==="hand"?"grab":tool==="text"?"text":tool==="eraser"?"cell":"crosshair";}

  function pointFromEvent(e){const r=canvas.getBoundingClientRect();return {sx:e.clientX-r.left,sy:e.clientY-r.top};}
  function hitStroke(world,radius=12/state.camera.zoom){
    let best=-1; for(let i=state.elements.length-1;i>=0;i--){const el=state.elements[i];if(el.type==="stroke"){for(const p of el.points){if(Math.hypot(p.x-world.x,p.y-world.y)<=radius)return i}} else if(el.type==="text"){if(world.x>=el.x-radius&&world.x<=el.x+el.text.length*el.size*.65+radius&&world.y>=el.y-radius&&world.y<=el.y+el.size+radius)return i} else if(el.type==="image"){if(world.x>=el.x&&world.x<=el.x+el.w&&world.y>=el.y&&world.y<=el.y+el.h)return i}} return best;
  }

  function beginPointer(e){
    if(e.button!==undefined&&e.button>1)return; canvas.setPointerCapture?.(e.pointerId); const p=pointFromEvent(e), w=screenToWorld(p.sx,p.sy);
    if(state.selectionPending){state.selectionStart=w;state.selectionRect={x:w.x,y:w.y,w:0,h:0};render();return;}
    if(state.tool==="text"){state.textPoint=w;$("textInput").value="";$("textDialog").showModal();setTimeout(()=>$("textInput").focus(),50);return;}
    if(state.tool==="eraser"){const idx=hitStroke(w);if(idx>=0){pushHistory();state.elements.splice(idx,1);markDirty();render();}state.pointer={mode:"erase"};return;}
    if(state.tool==="hand"||e.button===1||e.button===2){state.pointer={mode:"pan",sx:p.sx,sy:p.sy,cx:state.camera.x,cy:state.camera.y};canvas.style.cursor="grabbing";return;}
    if(state.tool==="pen"||state.tool==="highlighter"){
      pushHistory();const el={id:uid("stroke"),type:"stroke",color:state.tool==="highlighter"?"#ffd84a":"#18202b",opacity:state.tool==="highlighter"?.38:1,width:state.tool==="highlighter"?18:3,points:[w]};state.elements.push(el);state.pointer={mode:"draw",id:el.id};markDirty();render();
    }
  }
  function movePointer(e){const p=pointFromEvent(e),w=screenToWorld(p.sx,p.sy);if(state.selectionPending&&state.selectionStart){const s=state.selectionStart;state.selectionRect={x:Math.min(s.x,w.x),y:Math.min(s.y,w.y),w:Math.abs(w.x-s.x),h:Math.abs(w.y-s.y)};render();return}if(!state.pointer)return;if(state.pointer.mode==="pan"){state.camera.x=state.pointer.cx-(p.sx-state.pointer.sx)/state.camera.zoom;state.camera.y=state.pointer.cy-(p.sy-state.pointer.sy)/state.camera.zoom;render()}else if(state.pointer.mode==="draw"){const el=state.elements.find(x=>x.id===state.pointer.id);if(el){const last=el.points.at(-1);if(!last||Math.hypot(last.x-w.x,last.y-w.y)>1/state.camera.zoom){el.points.push(w);render()}}}else if(state.pointer.mode==="erase"){const idx=hitStroke(w);if(idx>=0){state.elements.splice(idx,1);markDirty();render()}}}
  async function endPointer(){if(state.selectionPending&&state.selectionStart){state.selectionPending=false;state.selectionStart=null;const r=state.selectionRect;if(r&&r.w>2/state.camera.zoom&&r.h>2/state.camera.zoom)await runExport(r);state.selectionRect=null;render();return}if(state.pointer?.mode==="draw")markDirty();state.pointer=null;canvas.style.cursor=state.tool==="hand"?"grab":state.tool==="text"?"text":"crosshair";}
  canvas.addEventListener("pointerdown",beginPointer);canvas.addEventListener("pointermove",movePointer);canvas.addEventListener("pointerup",endPointer);canvas.addEventListener("pointercancel",endPointer);canvas.addEventListener("contextmenu",e=>e.preventDefault());
  canvas.addEventListener("wheel",e=>{e.preventDefault();const p=pointFromEvent(e);if(e.ctrlKey||e.metaKey||Math.abs(e.deltaY)>0){zoomAt(p.sx,p.sy,Math.exp(-e.deltaY*.0015));}}, {passive:false});

  // Two-finger pinch/pan while preserving single-pointer drawing.
  const touches=new Map();
  canvas.addEventListener("pointerdown",e=>{if(e.pointerType==="touch"){touches.set(e.pointerId,{x:e.clientX,y:e.clientY});if(touches.size===2){const a=[...touches.values()];state.gesture={distance:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y),zoom:state.camera.zoom,cx:state.camera.x,cy:state.camera.y,mid:{x:(a[0].x+a[1].x)/2,y:(a[0].y+a[1].y)/2}};state.pointer=null;}}});
  canvas.addEventListener("pointermove",e=>{if(e.pointerType==="touch"&&touches.has(e.pointerId)){touches.set(e.pointerId,{x:e.clientX,y:e.clientY});if(touches.size===2&&state.gesture){const a=[...touches.values()],dist=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y),mid={x:(a[0].x+a[1].x)/2,y:(a[0].y+a[1].y)/2};const r=wrap.getBoundingClientRect();state.camera.zoom=Math.max(.0001,Math.min(10000,state.gesture.zoom*dist/state.gesture.distance));state.camera.x=state.gesture.cx-(mid.x-state.gesture.mid.x)/state.camera.zoom;state.camera.y=state.gesture.cy-(mid.y-state.gesture.mid.y)/state.camera.zoom;updateZoom();render();}}});
  const touchEnd=e=>{touches.delete(e.pointerId);if(touches.size<2)state.gesture=null};canvas.addEventListener("pointerup",touchEnd);canvas.addEventListener("pointercancel",touchEnd);

  function boardData(){return {mode:state.mode,pageCount:state.pageCount,camera:state.camera,elements:state.elements,assets:state.assets};}
  function makeDD(){return {ddVersion:DD_VERSION,type:"whiteboard",app:"Whiteboard",title:state.title,whiteboardVersion:VERSION,savedAt:new Date().toISOString(),data:boardData()};}
  function loadDD(obj,fileId=null,folderId="root"){
    if(!obj||obj.type!=="whiteboard"||!obj.data)throw new Error("This .DD file is not a Whiteboard file.");pushHistory();state.title=obj.title||"Untitled Whiteboard";state.mode=obj.data.mode||"infinite";state.pageCount=obj.data.pageCount||5;state.camera=obj.data.camera||{x:0,y:0,zoom:1};state.elements=obj.data.elements||[];state.assets=obj.data.assets||{};state.fileId=fileId;state.fileFolderId=folderId;state.dirty=false;$("docTitle").value=state.title;updateModeUI();updateZoom();updateStatus();render();
  }

  function downloadBlob(blob,name){const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
  function saveDDToDevice(name){downloadBlob(new Blob([JSON.stringify(makeDD(),null,2)],{type:"application/json"}),name);state.dirty=false;updateStatus();toast(".DD file saved to device");}

  function currentUserEmail(){return window.DashboardAuth?.user?.email || "Current Dashboard account";}
  function showSaveAs(){
    $("saveName").value=(state.title||"Untitled Whiteboard").replace(/\.dd$/i,"")+".DD";$("saveAccount").innerHTML="";const op=document.createElement("option");op.value=currentUserEmail();op.textContent=currentUserEmail();$("saveAccount").append(op);renderFolderPicker($("saveFolderPicker"),state.fileFolderId||"root",id=>state.fileFolderId=id);$("saveStorage").value="dashboard";$("folderField").classList.remove("hidden");$("saveDialog").showModal();
  }
  function saveCurrent(){if(!state.fileId)return showSaveAs();const file=fs.files.find(f=>f.id===state.fileId);if(!file)return showSaveAs();file.name=(state.title||"Untitled Whiteboard").replace(/\.dd$/i,"")+".DD";file.content=makeDD();file.updatedAt=Date.now();saveFS(fs);state.dirty=false;updateStatus();renderFiles();toast("Saved");}
  function confirmSave(){
    let name=$("saveName").value.trim()||"Untitled Whiteboard.DD";if(!/\.dd$/i.test(name))name+=".DD";state.title=name.replace(/\.dd$/i,"");$("docTitle").value=state.title;const storage=$("saveStorage").value;if(storage==="device"){saveDDToDevice(name);$("saveDialog").close();return}
    const existing=state.fileId&&fs.files.find(f=>f.id===state.fileId);if(existing){existing.name=name;existing.folderId=state.fileFolderId;existing.content=makeDD();existing.updatedAt=Date.now()}else{const id=uid("file");fs.files.push({id,name,folderId:state.fileFolderId||"root",account:$("saveAccount").value,storage:"dashboard",content:makeDD(),createdAt:Date.now(),updatedAt:Date.now()});state.fileId=id}saveFS(fs);state.dirty=false;updateStatus();renderFiles();$("saveDialog").close();toast("Saved to Dashboard Storage");
  }

  function childrenFolders(parentId){return fs.folders.filter(f=>f.parentId===parentId)}
  function folderPath(id){const out=[];let cur=fs.folders.find(f=>f.id===id);while(cur){out.unshift(cur);cur=fs.folders.find(f=>f.id===cur.parentId)}return out}
  function folderDepth(id){let d=0,cur=fs.folders.find(f=>f.id===id);while(cur?.parentId){d++;cur=fs.folders.find(f=>f.id===cur.parentId)}return d}
  function allFolders(){return [...fs.folders].sort((a,b)=>folderDepth(a.id)-folderDepth(b.id)||a.name.localeCompare(b.name))}
  function renderFolderPicker(el,selected,onSelect){el.innerHTML="";for(const f of allFolders()){const row=document.createElement("div");row.className="folder-choice"+(f.id===selected?" selected":"");row.textContent=`${"  ".repeat(folderDepth(f.id))}${folderDepth(f.id)?"↳ ":""}${f.name}`;row.style.paddingLeft=`${9+folderDepth(f.id)*16}px`;row.onclick=()=>{selected=f.id;onSelect(f.id);renderFolderPicker(el,selected,onSelect)};el.append(row)}}
  function openFolder(id){currentFolderId=id;renderFiles()}
  function openFile(id){const f=fs.files.find(x=>x.id===id);if(!f)return;try{loadDD(f.content,id,f.folderId);$("filesPanel").classList.add("hidden");toast(`Opened ${f.name}`)}catch(e){alert(e.message)}}
  function openShortcut(s){if(s.targetType==="folder")openFolder(s.targetId);else openFile(s.targetId)}
  function renderFiles(){
    const path=folderPath(currentFolderId);$("fileCrumbs").innerHTML="";path.forEach((p,i)=>{const b=document.createElement("button");b.textContent=p.name;b.style.cssText="border:0;background:transparent;color:#28487e;padding:0;font:inherit;cursor:pointer";b.onclick=()=>openFolder(p.id);$("fileCrumbs").append(b);if(i<path.length-1)$("fileCrumbs").append(document.createTextNode(" / "))});
    const list=$("fileList");list.innerHTML="";const rows=[];for(const f of childrenFolders(currentFolderId))rows.push({kind:"folder",id:f.id,name:f.name,icon:"📁",meta:"Folder"});for(const f of fs.files.filter(f=>f.folderId===currentFolderId))rows.push({kind:"file",id:f.id,name:f.name,icon:"◻️",meta:"Whiteboard .DD"});for(const s of fs.shortcuts.filter(s=>s.folderId===currentFolderId))rows.push({kind:"shortcut",id:s.id,name:s.name,icon:"↗",meta:`Shortcut to ${s.targetType}`});
    if(!rows.length){list.innerHTML='<div class="hint" style="padding:16px">This folder is empty.</div>';return}
    rows.sort((a,b)=>a.kind.localeCompare(b.kind)||a.name.localeCompare(b.name));for(const item of rows){const row=document.createElement("div");row.className="file-row";const icon=document.createElement("span");icon.textContent=item.icon;const body=document.createElement("div");body.innerHTML=`<div class="name"></div><div class="meta">${item.meta}${item.kind==="shortcut"?' <span class="shortcut-badge">SHORTCUT</span>':''}</div>`;body.querySelector(".name").textContent=item.name;body.onclick=()=>item.kind==="folder"?openFolder(item.id):item.kind==="file"?openFile(item.id):openShortcut(fs.shortcuts.find(s=>s.id===item.id));const menu=document.createElement("button");menu.className="row-menu";menu.textContent="•••";menu.onclick=e=>{e.stopPropagation();fileMenu(item,e.currentTarget)};row.append(icon,body,menu);list.append(row)}
  }
  function fileMenu(item,anchor){
    const choices=[];if(item.kind!=="shortcut")choices.push("Create Shortcut");if(item.kind==="file")choices.push("Save a Copy","Move");if(item.id!=="root")choices.push("Delete");const action=prompt(`${item.name}\n\nChoose an action:\n${choices.map((x,i)=>`${i+1}. ${x}`).join("\n")}`);const idx=Number(action)-1;if(idx<0||idx>=choices.length)return;const choice=choices[idx];if(choice==="Create Shortcut"){shortcutTarget=item;$("shortcutName").value=item.name.replace(/\.dd$/i,"");let dest="root";renderFolderPicker($("shortcutFolderPicker"),dest,id=>dest=id);$("shortcutDialog").dataset.dest=dest;$("shortcutFolderPicker").onclick=()=>{$("shortcutDialog").dataset.dest=dest};$("shortcutDialog").showModal()}else if(choice==="Save a Copy"){const f=fs.files.find(x=>x.id===item.id);const copy={...clone(f),id:uid("file"),name:f.name.replace(/\.DD$/i," Copy.DD"),createdAt:Date.now(),updatedAt:Date.now()};fs.files.push(copy);saveFS(fs);renderFiles()}else if(choice==="Move"){let dest=prompt("Enter destination folder name:");const folder=fs.folders.find(f=>f.name.toLowerCase()===String(dest).toLowerCase());if(!folder)return alert("Folder not found.");const target=item.kind==="file"?fs.files.find(f=>f.id===item.id):fs.folders.find(f=>f.id===item.id);if(item.kind==="file")target.folderId=folder.id;else target.parentId=folder.id;saveFS(fs);renderFiles()}else if(choice==="Delete"){if(!confirm(`Delete ${item.name}?`))return;if(item.kind==="file")fs.files=fs.files.filter(f=>f.id!==item.id);else if(item.kind==="folder"){if(childrenFolders(item.id).length||fs.files.some(f=>f.folderId===item.id)||fs.shortcuts.some(s=>s.folderId===item.id))return alert("Move or delete the folder contents first.");fs.folders=fs.folders.filter(f=>f.id!==item.id)}else fs.shortcuts=fs.shortcuts.filter(s=>s.id!==item.id);saveFS(fs);renderFiles()}}

  function createFolder(){const name=$("folderName").value.trim();if(!name)return;fs.folders.push({id:uid("folder"),name,parentId:currentFolderId,createdAt:Date.now()});saveFS(fs);$("folderDialog").close();renderFiles()}
  function createShortcut(){if(!shortcutTarget)return;const name=$("shortcutName").value.trim()||shortcutTarget.name;const dest=$("shortcutDialog").dataset.dest||"root";fs.shortcuts.push({id:uid("shortcut"),name,folderId:dest,targetType:shortcutTarget.kind,targetId:shortcutTarget.id,createdAt:Date.now()});saveFS(fs);$("shortcutDialog").close();renderFiles();toast("Shortcut created")}

  function updateModeUI(){document.querySelectorAll("[data-mode]").forEach(b=>b.classList.toggle("selected",b.dataset.mode===state.mode));$("modeBadge").textContent=state.mode==="infinite"?"Infinite Whiteboard":"Paper / Pages";updateExportScopes();}
  function applyBoard(){const selected=document.querySelector("[data-mode].selected")?.dataset.mode||state.mode;if(selected!==state.mode){pushHistory();state.mode=selected;if(selected==="pages"&&state.camera.y<0)state.camera={x:0,y:PAGE.height/2,zoom:.7};markDirty();render()}$("boardDialog").close();updateModeUI()}

  function updateExportScopes(){const s=$("exportScope");s.innerHTML="";const opts=state.mode==="infinite"?[["all","Everything on the board"],["visible","Visible area"],["selection","Selected region"]]:[["all","All pages"],["visible","Visible area"],["selection","Selected region"]];opts.forEach(([v,t])=>s.add(new Option(t,v)));}
  function elementsBounds(){let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;for(const el of state.elements){if(el.type==="stroke"){for(const p of el.points){minX=Math.min(minX,p.x);minY=Math.min(minY,p.y);maxX=Math.max(maxX,p.x);maxY=Math.max(maxY,p.y)}}else if(el.type==="text"){minX=Math.min(minX,el.x);minY=Math.min(minY,el.y);maxX=Math.max(maxX,el.x+el.text.length*el.size*.65);maxY=Math.max(maxY,el.y+el.size*1.3)}else if(el.type==="image"){minX=Math.min(minX,el.x);minY=Math.min(minY,el.y);maxX=Math.max(maxX,el.x+el.w);maxY=Math.max(maxY,el.y+el.h)}}if(!isFinite(minX))return state.mode==="pages"?{x:-PAGE.width/2,y:PAGE.margin,w:PAGE.width,h:state.pageCount*(PAGE.height+PAGE.gap)-PAGE.gap}:{x:-600,y:-400,w:1200,h:800};const pad=30;return{x:minX-pad,y:minY-pad,w:maxX-minX+pad*2,h:maxY-minY+pad*2}}

  function renderRegionToCanvas(region,scale=1){const out=document.createElement("canvas");const max=8192;const ratio=Math.min(scale,max/Math.max(1,region.w),max/Math.max(1,region.h));out.width=Math.max(1,Math.round(region.w*ratio));out.height=Math.max(1,Math.round(region.h*ratio));const o=out.getContext("2d");o.fillStyle=state.mode==="pages"?"#e7ebf0":"#f7f8fb";o.fillRect(0,0,out.width,out.height);const old={...state.camera};const oldCanvas={w:canvas.width,h:canvas.height};const fauxZoom=ratio;function pt(x,y){return{x:(x-region.x)*fauxZoom,y:(y-region.y)*fauxZoom}}
    if(state.mode==="pages"){for(let i=0;i<state.pageCount;i++){const y=pageTop(i);if(y>region.y+region.h||y+PAGE.height<region.y)continue;const a=pt(-PAGE.width/2,y);o.fillStyle="#fff";o.fillRect(a.x,a.y,PAGE.width*fauxZoom,PAGE.height*fauxZoom);o.strokeStyle="#ccd3dc";o.strokeRect(a.x,a.y,PAGE.width*fauxZoom,PAGE.height*fauxZoom);o.strokeStyle="#dce7f5";for(let ly=y+72;ly<y+PAGE.height-30;ly+=32){const l=pt(-PAGE.width/2+45,ly);o.beginPath();o.moveTo(l.x,l.y);o.lineTo(l.x+(PAGE.width-80)*fauxZoom,l.y);o.stroke()}}}
    for(const el of state.elements){if(el.type==="stroke"){o.save();o.lineCap="round";o.lineJoin="round";o.strokeStyle=el.color;o.globalAlpha=el.opacity??1;o.lineWidth=el.width*fauxZoom;if(el.points.length){const a=pt(el.points[0].x,el.points[0].y);o.beginPath();o.moveTo(a.x,a.y);for(let i=1;i<el.points.length;i++){const p=pt(el.points[i].x,el.points[i].y);o.lineTo(p.x,p.y)}o.stroke()}o.restore()}else if(el.type==="text"){const p=pt(el.x,el.y);o.fillStyle=el.color||"#18202b";o.font=`${el.size*fauxZoom}px sans-serif`;o.textBaseline="top";o.fillText(el.text,p.x,p.y)}else if(el.type==="image"){const asset=state.assets[el.assetId];const img=asset&&getImage(asset.dataUrl);if(img?.complete){const p=pt(el.x,el.y);o.drawImage(img,p.x,p.y,el.w*fauxZoom,el.h*fauxZoom)}}}return out;
  }
  async function canvasToBlob(c,type,quality=.92){return new Promise(r=>c.toBlob(r,type,quality))}
  function canvasToSVG(c,region){const png=c.toDataURL("image/png");return `<svg xmlns="http://www.w3.org/2000/svg" width="${c.width}" height="${c.height}" viewBox="0 0 ${c.width} ${c.height}"><image href="${png}" width="100%" height="100%"/></svg>`}
  async function runExport(forcedRegion=null){const fmt=$("exportFormat").value;const scope=$("exportScope").value;let region=forcedRegion;if(!region){region=scope==="visible"?visibleWorld():elementsBounds()}if(scope==="all"&&state.mode==="pages"&&!forcedRegion)region={x:-PAGE.width/2,y:PAGE.margin,w:PAGE.width,h:state.pageCount*(PAGE.height+PAGE.gap)-PAGE.gap};const base=(state.title||"Whiteboard").replace(/[\\/:*?"<>|]/g,"-");
    if(fmt==="pdf"){
      const {jsPDF}=window.jspdf||{};if(!jsPDF)return alert("PDF export library is still loading. Try again.");if(state.mode==="pages"&&scope==="all"&&!forcedRegion){const pdf=new jsPDF({unit:"pt",format:"letter",orientation:"portrait"});for(let i=0;i<state.pageCount;i++){if(i)pdf.addPage("letter","portrait");const r={x:-PAGE.width/2,y:pageTop(i),w:PAGE.width,h:PAGE.height};const c=renderRegionToCanvas(r,1.5);pdf.addImage(c.toDataURL("image/jpeg",.94),"JPEG",0,0,612,792)}pdf.save(base+".pdf")}else{const c=renderRegionToCanvas(region,1.5);const landscape=c.width>c.height;const pdf=new jsPDF({unit:"pt",format:[c.width,c.height],orientation:landscape?"landscape":"portrait"});pdf.addImage(c.toDataURL("image/jpeg",.94),"JPEG",0,0,c.width,c.height);pdf.save(base+".pdf")}toast("PDF exported");return}
    const c=renderRegionToCanvas(region,1.5);if(fmt==="svg"){downloadBlob(new Blob([canvasToSVG(c,region)],{type:"image/svg+xml"}),base+".svg")}else{const mime=fmt==="jpeg"?"image/jpeg":"image/png";downloadBlob(await canvasToBlob(c,mime),base+"."+(fmt==="jpeg"?"jpg":"png"))}toast(`${fmt.toUpperCase()} exported`)
  }
  async function confirmExport(){const scope=$("exportScope").value;$("exportDialog").close();if(scope==="selection"){state.selectionPending=true;toast("Drag a rectangle to export");return}await runExport()}

  function parsePageRange(text,max){const set=new Set();for(const part of text.split(",")){const p=part.trim();if(!p)continue;if(p.includes("-")){let[a,b]=p.split("-").map(Number);if(a>b)[a,b]=[b,a];for(let n=a;n<=b;n++)if(n>=1&&n<=max)set.add(n-1)}else{const n=Number(p);if(n>=1&&n<=max)set.add(n-1)}}return [...set].sort((a,b)=>a-b)}
  async function importFile(){const file=$("importFile").files[0];if(!file)return alert("Choose a file first.");if(/\.dd$/i.test(file.name)){try{loadDD(JSON.parse(await file.text()));$("importDialog").close();toast(".DD file opened")}catch(e){alert(e.message)}return}
    pushHistory();if(file.type.startsWith("image/")){const dataUrl=await fileToDataURL(file);const dims=await imageDimensions(dataUrl);const id=uid("asset");state.assets[id]={id,name:file.name,type:file.type,dataUrl};const center=screenToWorld(wrap.clientWidth/2,wrap.clientHeight/2);const maxW=state.mode==="pages"?PAGE.width-80:900;const scale=Math.min(1,maxW/dims.w);state.elements.push({id:uid("image"),type:"image",assetId:id,x:center.x-dims.w*scale/2,y:center.y-dims.h*scale/2,w:dims.w*scale,h:dims.h*scale});markDirty();render();$("importDialog").close();toast("Image imported");return}
    if(file.type==="application/pdf"||/\.pdf$/i.test(file.name)){await importPDF(file);$("importDialog").close();markDirty();render();return}alert("That file type is not supported for import yet.")
  }
  function fileToDataURL(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)})}
  function imageDimensions(src){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve({w:img.naturalWidth,h:img.naturalHeight});img.onerror=reject;img.src=src})}
  async function getPdfjs(){if(window.pdfjsLib)return window.pdfjsLib;try{const mod=await import("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs");mod.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";return mod}catch(e){throw new Error("PDF import library could not load.")}}
  async function importPDF(file){const pdfjs=await getPdfjs();const bytes=new Uint8Array(await file.arrayBuffer());const pdf=await pdfjs.getDocument({data:bytes}).promise;let pages=[...Array(pdf.numPages).keys()];const layout=$("importLayout").value;if(layout==="selected"){pages=parsePageRange($("pageRange").value,pdf.numPages);if(!pages.length)throw new Error("No valid PDF pages were selected.")}
    let cursorY=state.mode==="pages"?PAGE.margin:screenToWorld(wrap.clientWidth/2,wrap.clientHeight/2).y;let maxPageW=0;for(let pos=0;pos<pages.length;pos++){const idx=pages[pos],page=await pdf.getPage(idx+1),vp=page.getViewport({scale:1.6});const c=document.createElement("canvas");c.width=Math.ceil(vp.width);c.height=Math.ceil(vp.height);await page.render({canvasContext:c.getContext("2d"),viewport:vp}).promise;const dataUrl=c.toDataURL("image/jpeg",.92),assetId=uid("asset");state.assets[assetId]={id:assetId,name:`${file.name} · page ${idx+1}`,type:"image/jpeg",dataUrl};const targetW=state.mode==="pages"?PAGE.width:Math.min(PAGE.width,vp.width);const scale=targetW/vp.width,targetH=vp.height*scale;let x=-targetW/2,y;
      if(state.mode==="pages"||layout==="stack"){if(state.mode==="pages"){const pageIndex=pos;while(state.pageCount<=pageIndex)state.pageCount++;y=pageTop(pageIndex);x=-PAGE.width/2}else{y=cursorY;cursorY+=targetH+40}}else{const col=pos%3,row=Math.floor(pos/3);x=(col-1)*(targetW+40);y=cursorY+row*(targetH+40)}state.elements.push({id:uid("image"),type:"image",assetId,x,y,w:targetW,h:targetH,sourcePdfPage:idx+1});maxPageW=Math.max(maxPageW,targetW)}toast(`${pages.length} PDF page${pages.length===1?"":"s"} imported`)
  }

  function openDDDevice(){$("ddDeviceInput").click()}
  $("ddDeviceInput").addEventListener("change",async()=>{const f=$("ddDeviceInput").files[0];if(!f)return;try{loadDD(JSON.parse(await f.text()));toast(`Opened ${f.name}`)}catch(e){alert(e.message)}$("ddDeviceInput").value=""});

  $("dashboardBtn").onclick=()=>location.href="../";$("filesBtn").onclick=()=>{$("filesPanel").classList.toggle("hidden");renderFiles()};$("closeFilesBtn").onclick=()=>$("filesPanel").classList.add("hidden");$("settingsBtn").onclick=()=>{$("boardDialog").showModal();updateModeUI()};document.querySelectorAll("[data-mode]").forEach(b=>b.onclick=()=>{document.querySelectorAll("[data-mode]").forEach(x=>x.classList.remove("selected"));b.classList.add("selected")});$("applyBoardBtn").onclick=applyBoard;document.querySelectorAll("[data-tool]").forEach(b=>b.onclick=()=>setTool(b.dataset.tool));$("undoBtn").onclick=undo;$("redoBtn").onclick=redo;$("zoomInBtn").onclick=()=>zoomAt(wrap.clientWidth/2,wrap.clientHeight/2,1.25);$("zoomOutBtn").onclick=()=>zoomAt(wrap.clientWidth/2,wrap.clientHeight/2,.8);
  $("saveBtn").onclick=saveCurrent;$("confirmSaveBtn").onclick=confirmSave;$("saveStorage").onchange=()=>$("folderField").classList.toggle("hidden",$("saveStorage").value==="device");$("docTitle").addEventListener("input",()=>{state.title=$("docTitle").value||"Untitled Whiteboard";markDirty()});
  $("exportBtn").onclick=()=>{updateExportScopes();$("exportDialog").showModal()};$("exportScope").onchange=()=>$("selectionHelp").classList.toggle("hidden",$("exportScope").value!=="selection");$("confirmExportBtn").onclick=confirmExport;
  $("importBtn").onclick=()=>{$("importFile").value="";$("importDialog").showModal()};$("importLayout").onchange=()=>$("pageRangeField").classList.toggle("hidden",$("importLayout").value!=="selected");$("confirmImportBtn").onclick=()=>importFile().catch(e=>alert(e.message));
  $("addTextBtn").onclick=()=>{const text=$("textInput").value;if(text&&state.textPoint){pushHistory();state.elements.push({id:uid("text"),type:"text",x:state.textPoint.x,y:state.textPoint.y,text,size:24,color:"#18202b"});markDirty();render()}$("textDialog").close()};$("textInput").addEventListener("keydown",e=>{if(e.key==="Enter")$("addTextBtn").click()});
  $("newFolderBtn").onclick=()=>{$("folderName").value="";$("folderDialog").showModal()};$("createFolderBtn").onclick=createFolder;$("openDDFromDeviceBtn").onclick=openDDDevice;
  $("createShortcutBtn").onclick=createShortcut;
  document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>$(b.dataset.close).close());
  window.addEventListener("keydown",e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="s"){e.preventDefault();e.shiftKey?showSaveAs():saveCurrent()}if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="z"){e.preventDefault();e.shiftKey?redo():undo()}if(e.key===" "&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)){e.preventDefault();setTool("hand")}});
  window.addEventListener("beforeunload",e=>{if(state.dirty){e.preventDefault();e.returnValue=""}});
  window.addEventListener("dashboard-auth-ready",()=>{const select=$("saveAccount");if(select&&select.options.length===0){select.add(new Option(currentUserEmail(),currentUserEmail()))}});

  updateModeUI();updateZoom();renderFiles();resize();
})();
