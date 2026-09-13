(() => {
  "use strict";

  const RELEASE_VERSION = "0.2.0";
  const PENCIL_TOUCH_GRACE_MS = 900;
  const activePenPointers = new Set();
  let suppressTouchUntil = 0;

  window.WhiteboardEraserSize = window.WhiteboardEraserSize || { radius: 24 };

  function installEraserControls() {
    const eraserButton = document.querySelector('[data-tool="eraser"]');
    if (!eraserButton || document.getElementById("eraserSizeControl")) return;

    const wrapper = document.createElement("label");
    wrapper.id = "eraserSizeControl";
    wrapper.className = "tool";
    wrapper.style.cssText = "display:inline-flex;align-items:center;gap:6px;white-space:nowrap";
    wrapper.innerHTML = '<span style="font-size:12px;font-weight:750">Size</span><input id="eraserSize" type="range" min="6" max="72" step="2" value="24" style="width:92px"><span id="eraserSizeValue" style="min-width:24px;font-size:11px;font-weight:750">24</span>';

    const eraserMode = document.getElementById("eraserMode");
    (eraserMode || eraserButton).insertAdjacentElement("afterend", wrapper);

    const slider = wrapper.querySelector("#eraserSize");
    const value = wrapper.querySelector("#eraserSizeValue");
    slider.addEventListener("input", () => {
      const radius = Number(slider.value) || 24;
      window.WhiteboardEraserSize.radius = radius;
      value.textContent = String(radius);
      updateEraserCursorSize();
    });
  }

  const eraserCursor = document.createElement("div");
  eraserCursor.id = "whiteboardEraserCursor";
  eraserCursor.style.cssText = "position:fixed;left:0;top:0;border:1.5px solid rgba(24,32,43,.8);background:rgba(255,255,255,.12);border-radius:50%;pointer-events:none;z-index:9999;display:none;transform:translate(-50%,-50%);box-shadow:0 0 0 1px rgba(255,255,255,.75) inset";
  document.body.appendChild(eraserCursor);

  function updateEraserCursorSize() {
    const radius = Number(window.WhiteboardEraserSize?.radius) || 24;
    const diameter = radius * 2;
    eraserCursor.style.width = `${diameter}px`;
    eraserCursor.style.height = `${diameter}px`;
  }
  updateEraserCursorSize();

  function eraserIsActive() {
    return document.querySelector('[data-tool="eraser"]')?.classList.contains("active") === true;
  }

  function installEraserCursor() {
    const canvas = document.getElementById("canvas");
    if (!canvas) return;

    const move = event => {
      if (!eraserIsActive() || (event.pointerType !== "pen" && event.pointerType !== "mouse")) {
        eraserCursor.style.display = "none";
        return;
      }
      eraserCursor.style.left = `${event.clientX}px`;
      eraserCursor.style.top = `${event.clientY}px`;
      eraserCursor.style.display = "block";
    };

    const hide = () => { eraserCursor.style.display = "none"; };
    canvas.addEventListener("pointermove", move, true);
    canvas.addEventListener("pointerdown", move, true);
    canvas.addEventListener("pointerleave", hide, true);
    canvas.addEventListener("pointercancel", hide, true);

    document.querySelectorAll("[data-tool]").forEach(button => {
      button.addEventListener("click", () => {
        if (!eraserIsActive()) hide();
      });
    });
  }

  function markPencilActivity(extraMs = PENCIL_TOUCH_GRACE_MS) {
    suppressTouchUntil = Math.max(suppressTouchUntil, Date.now() + extraMs);
  }

  function shouldRejectTouch() {
    return activePenPointers.size > 0 || Date.now() < suppressTouchUntil;
  }

  function installPalmRejection() {
    const canvas = document.getElementById("canvas");
    if (!canvas) return;

    const watchPen = event => {
      if (event.pointerType !== "pen") return;
      markPencilActivity();
    };

    const penDown = event => {
      if (event.pointerType !== "pen") return;
      activePenPointers.add(event.pointerId);
      markPencilActivity(1400);
    };

    const penUp = event => {
      if (event.pointerType !== "pen") return;
      activePenPointers.delete(event.pointerId);
      markPencilActivity();
    };

    const rejectPalmTouch = event => {
      if (event.pointerType !== "touch" || !shouldRejectTouch()) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    };

    canvas.addEventListener("pointerover", watchPen, true);
    canvas.addEventListener("pointerenter", watchPen, true);
    canvas.addEventListener("pointermove", watchPen, true);
    canvas.addEventListener("pointerdown", penDown, true);
    canvas.addEventListener("pointerup", penUp, true);
    canvas.addEventListener("pointercancel", penUp, true);

    for (const type of ["pointerdown", "pointermove", "pointerup", "pointercancel"]) {
      canvas.addEventListener(type, rejectPalmTouch, { capture: true, passive: false });
    }
  }

  installPalmRejection();

  const fileManagerStyle = document.createElement("style");
  fileManagerStyle.textContent = `
    .wb-home-card{border:1px solid #d9dee7;background:#fff;border-radius:14px;overflow:hidden;display:flex;flex-direction:column}
    .wb-home-card .wb-home-item{border:0;border-radius:0;width:100%;flex:1}
    .wb-home-file-actions{display:flex;gap:8px;padding:9px 10px;border-top:1px solid #edf0f4;background:#fafbfc}
    .wb-home-file-actions button{flex:1;border:1px solid #d9dee7;background:#fff;border-radius:8px;padding:7px 9px;font-size:12px;font-weight:750;color:#344054}
    .wb-home-file-actions button.wb-delete{color:#b42318}
  `;
  document.head.appendChild(fileManagerStyle);

  function patchWrapper(source) {
    source = source.replaceAll("0.1.2", RELEASE_VERSION);

    source = source.replace(
      `'tool: "pen",','tool: "hand",',"default hand tool"`,
      `'tool: "pen",','tool: "pen",',"default pen tool"`
    );

    source = source.replace(
      'state.tool="hand";state.elements=[];',
      'state.tool="pen";state.elements=[];'
    );
    source = source.replace(
      'updateStatus();setTool("hand");render();',
      'updateStatus();setTool("pen");render();'
    );
    source = source.replace(
      `'updateModeUI();updateZoom();renderFiles();resize();setTool("hand");',"hand initialization"`,
      `'updateModeUI();updateZoom();renderFiles();resize();setTool("pen");',"pen initialization"`
    );

    source = source.replace(
      'state.fileFolderId="root";state.selectionPending=',
      'state.fileFolderId=currentFolderId||"root";state.selectionPending='
    );
    source = source.replace(
      'el.querySelector("#wbNewBoard").onclick = () => {\n        this.bridge?.newBoard?.();',
      'el.querySelector("#wbNewBoard").onclick = () => {\n        this.bridge?.setFolder?.(this.folderId);\n        this.bridge?.newBoard?.();'
    );

    source = source.replace(
      'window.WhiteboardHomeBridge={openFile,newBoard:resetNewBoard,setFolder:id=>{currentFolderId=id||"root";}};window.WhiteboardHome.bridge=window.WhiteboardHomeBridge;',
      'window.WhiteboardHomeBridge={openFile,newBoard:resetNewBoard,setFolder:id=>{currentFolderId=id||"root";},renameFile:(id,name)=>{const f=fs.files.find(x=>x.id===id);if(!f)return false;let next=String(name||"").trim();if(!next)return false;if(!/\\.dd$/i.test(next))next+=".DD";f.name=next;if(f.content&&typeof f.content==="object"){f.content.title=next.replace(/\\.dd$/i,"");f.content.savedAt=new Date().toISOString()}f.updatedAt=Date.now();if(state.fileId===id){state.title=next.replace(/\\.dd$/i,"");$("docTitle").value=state.title}saveFS(fs);return true;},deleteFile:id=>{const index=fs.files.findIndex(x=>x.id===id);if(index<0)return false;fs.files.splice(index,1);fs.shortcuts=fs.shortcuts.filter(s=>!(s.targetType==="file"&&s.targetId===id));if(state.fileId===id){state.fileId=null;state.fileFolderId=currentFolderId||"root";state.dirty=true;updateStatus()}saveFS(fs);return true;}};window.WhiteboardHome.bridge=window.WhiteboardHomeBridge;'
    );

    const oldHomeRows = `      rows.forEach(item=>{
        const b=document.createElement("button");b.className="wb-home-item";
        const icon=item.kind==="folder"?"📁":item.kind==="shortcut"?"↗":"◻️";
        const meta=item.kind==="folder"?"Folder":item.kind==="shortcut"?"Shortcut":"Whiteboard .DD";
        b.innerHTML=\`<span class="wb-home-icon">\${icon}</span><span class="wb-home-name"></span><span class="wb-home-meta">\${meta}</span>\`;
        b.querySelector(".wb-home-name").textContent=item.name;
        b.onclick=()=>{
          if(item.kind==="folder"){this.folderId=item.id;this.render();return;}
          if(item.kind==="shortcut"){
            if(item.targetType==="folder"){this.folderId=item.targetId;this.render();return;}
            this.bridge?.openFile?.(item.targetId);
          } else this.bridge?.openFile?.(item.id);
          this.hide();
        };
        grid.appendChild(b);
      });`;

    const newHomeRows = `      rows.forEach(item=>{
        const card=document.createElement("div");card.className="wb-home-card";
        const b=document.createElement("button");b.className="wb-home-item";
        const icon=item.kind==="folder"?"📁":item.kind==="shortcut"?"↗":"◻️";
        const meta=item.kind==="folder"?"Folder":item.kind==="shortcut"?"Shortcut":"Whiteboard .DD";
        b.innerHTML=\`<span class="wb-home-icon">\${icon}</span><span class="wb-home-name"></span><span class="wb-home-meta">\${meta}</span>\`;
        b.querySelector(".wb-home-name").textContent=item.name;
        b.onclick=()=>{
          if(item.kind==="folder"){this.folderId=item.id;this.render();return;}
          if(item.kind==="shortcut"){
            if(item.targetType==="folder"){this.folderId=item.targetId;this.render();return;}
            this.bridge?.openFile?.(item.targetId);
          } else this.bridge?.openFile?.(item.id);
          this.hide();
        };
        card.appendChild(b);
        if(item.kind==="file"){
          const actions=document.createElement("div");actions.className="wb-home-file-actions";
          const rename=document.createElement("button");rename.type="button";rename.textContent="Rename";
          rename.onclick=e=>{e.stopPropagation();const next=prompt("Rename Whiteboard",item.name);if(next===null)return;if(this.bridge?.renameFile?.(item.id,next))this.render();};
          const del=document.createElement("button");del.type="button";del.className="wb-delete";del.textContent="Delete";
          del.onclick=e=>{e.stopPropagation();if(!confirm(\`Delete \"\${item.name}\"? This cannot be undone.\`))return;if(this.bridge?.deleteFile?.(item.id))this.render();};
          actions.append(rename,del);card.appendChild(actions);
        }
        grid.appendChild(card);
      });`;

    if (!source.includes(oldHomeRows)) {
      throw new Error("Whiteboard 0.2.0 could not install file rename/delete controls.");
    }
    source = source.replace(oldHomeRows, newHomeRows);

    source = source.replace(
      `'if(state.tool==="hand"||(e.ctrlKey&&state.tool==="pen")||e.button===1||e.button===2){state.pointer={mode:"pan",sx:p.sx,sy:p.sy,cx:state.camera.x,cy:state.camera.y};canvas.style.cursor="grabbing";return;}',`,
      `'if(state.tool==="hand"||(e.pointerType==="mouse"&&e.ctrlKey)||e.button===1||e.button===2){state.pointer={mode:"pan",sx:p.sx,sy:p.sy,cx:state.camera.x,cy:state.camera.y};canvas.style.cursor="grabbing";return;}',`
    );

    source = source.replace(
      'else if(partialEraseAt(w)){markDirty();render();}',
      'else if(partialEraseAt(w,(window.WhiteboardEraserSize?.radius||24)/state.camera.zoom)){markDirty();render();}'
    );
    source = source.replace(
      'else if(state.pointer.mode==="erase-partial"){if(partialEraseAt(w)){markDirty();render()}}',
      'else if(state.pointer.mode==="erase-partial"){if(partialEraseAt(w,(window.WhiteboardEraserSize?.radius||24)/state.camera.zoom)){markDirty();render()}}'
    );
    source = source.replace(
      'const idx=hitStroke(w);if(idx>=0){state.elements.splice(idx,1);markDirty();render();}',
      'const idx=hitStroke(w,(window.WhiteboardEraserSize?.radius||24)/state.camera.zoom);if(idx>=0){state.elements.splice(idx,1);markDirty();render();}'
    );
    source = source.replace(
      'else if(state.pointer.mode==="erase-whole"){const idx=hitStroke(w);if(idx>=0){state.elements.splice(idx,1);markDirty();render()}}',
      'else if(state.pointer.mode==="erase-whole"){const idx=hitStroke(w,(window.WhiteboardEraserSize?.radius||24)/state.camera.zoom);if(idx>=0){state.elements.splice(idx,1);markDirty();render()}}'
    );

    const anchor = `source = replaceRequired(source,'function saveFS(fs){ localStorage.setItem(DB_KEY, JSON.stringify(fs)); }','function saveFS(fs){ localStorage.setItem(DB_KEY, JSON.stringify(fs)); window.WhiteboardSync?.queuePush(fs); window.WhiteboardHome?.render?.(); }',"Supabase file sync");`;

    const touchPatch = `\n    source = replaceRequired(source,\n      'function beginPointer(e){\\n    if(e.button!==undefined&&e.button>1)return; canvas.setPointerCapture?.(e.pointerId); const p=pointFromEvent(e), w=screenToWorld(p.sx,p.sy);',\n      'function beginPointer(e){\\n    if(e.button!==undefined&&e.button>1)return; canvas.setPointerCapture?.(e.pointerId); const p=pointFromEvent(e), w=screenToWorld(p.sx,p.sy); if(e.pointerType==="touch"){state.pointer={mode:"pan",sx:p.sx,sy:p.sy,cx:state.camera.x,cy:state.camera.y};canvas.style.cursor="grabbing";return;}',\n      "finger pan routing"\n    );`;

    const pastePatch = `\n    source = replaceRequired(source,\n      'function imageDimensions(src){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve({w:img.naturalWidth,h:img.naturalHeight});img.onerror=reject;img.src=src})}',\n      'function imageDimensions(src){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve({w:img.naturalWidth,h:img.naturalHeight});img.onerror=reject;img.src=src})}\\n  async function pasteImageFile(file){if(!file||!String(file.type||"").startsWith("image/"))return;pushHistory();const dataUrl=await fileToDataURL(file);const dims=await imageDimensions(dataUrl);const id=uid("asset");state.assets[id]={id,name:file.name||"Pasted Image",type:file.type||"image/png",dataUrl};const center=screenToWorld(wrap.clientWidth/2,wrap.clientHeight/2);const maxW=state.mode==="pages"?PAGE.width-80:900;const scale=Math.min(1,maxW/dims.w);state.elements.push({id:uid("image"),type:"image",assetId:id,x:center.x-dims.w*scale/2,y:center.y-dims.h*scale/2,w:dims.w*scale,h:dims.h*scale});markDirty();render();toast("Image pasted")}\\n  document.addEventListener("paste",async e=>{const active=document.activeElement;if(active&&(active.tagName==="INPUT"||active.tagName==="TEXTAREA"||active.isContentEditable))return;const items=[...(e.clipboardData?.items||[])];const item=items.find(x=>String(x.type||"").startsWith("image/"));if(!item)return;const file=item.getAsFile?.();if(!file)return;e.preventDefault();try{await pasteImageFile(file)}catch(err){console.error(err);alert("That pasted image could not be added.")}});',\n      "clipboard image paste"\n    );`;

    if (!source.includes(anchor)) {
      throw new Error("Whiteboard 0.2.0 could not install input routing.");
    }

    source = source.replace(anchor, anchor + touchPatch + pastePatch);
    return source;
  }

  fetch("./whiteboard.js?v=0.1.2", { cache: "no-store" })
    .then(response => {
      if (!response.ok) throw new Error(`Could not load Whiteboard runtime (${response.status}).`);
      return response.text();
    })
    .then(source => {
      const patched = patchWrapper(source);
      (0, eval)(`${patched}\n//# sourceURL=whiteboard-wrapper-0.2.0.js`);
      installEraserControls();
      installEraserCursor();
    })
    .catch(error => {
      console.error(error);
      alert("Whiteboard could not start. Please reload the page.");
    });
})();