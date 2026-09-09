(() => {
  "use strict";

  const VERSION = "0.1.2";
  const SYNC_TABLE = "whiteboard_sync_state_v1";
  const DB_KEY = "dashboard-whiteboard-fs-v1";
  const NativeBlob = window.Blob;

  function WhiteboardBlob(parts, options = {}) {
    let nextOptions = options;
    if (options && options.type === "application/json") {
      const preview = Array.isArray(parts)
        ? parts.filter(part => typeof part === "string").join("").slice(0, 6000)
        : "";
      if (/"type"\s*:\s*"whiteboard"/i.test(preview)) {
        nextOptions = { ...options, type: "application/octet-stream" };
      }
    }
    return new NativeBlob(parts, nextOptions);
  }
  WhiteboardBlob.prototype = NativeBlob.prototype;
  Object.setPrototypeOf(WhiteboardBlob, NativeBlob);
  window.Blob = WhiteboardBlob;

  const toolbar = document.getElementById("toolbar");
  const eraserButton = document.querySelector('[data-tool="eraser"]');
  if (toolbar && eraserButton && !document.getElementById("eraserMode")) {
    const eraserMode = document.createElement("select");
    eraserMode.id = "eraserMode";
    eraserMode.className = "tool";
    eraserMode.title = "Eraser mode";
    eraserMode.innerHTML = '<option value="partial">Partial Erase</option><option value="whole">Whole Stroke</option>';
    eraserButton.insertAdjacentElement("afterend", eraserMode);
  }

  const style = document.createElement("style");
  style.textContent = `
    @media(max-width:760px){#filesBtn{display:inline-block!important}}
    #whiteboardHome{position:fixed;inset:0;z-index:100;background:#f6f7f9;display:flex;flex-direction:column;color:#18202b}
    #whiteboardHome.hidden{display:none!important}
    .wb-home-head{display:flex;align-items:center;gap:12px;padding:14px 18px;background:#fff;border-bottom:1px solid #d9dee7}
    .wb-home-head h1{font-size:22px;margin:0;flex:1}
    .wb-home-back,.wb-home-action{border:1px solid #d9dee7;background:#fff;border-radius:10px;padding:9px 12px;font-weight:750}
    .wb-home-action.primary{background:#28487e;color:#fff;border-color:#28487e}
    .wb-home-body{width:min(980px,calc(100% - 28px));margin:0 auto;padding:24px 0 40px;overflow:auto;flex:1}
    .wb-home-actions{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:22px}
    .wb-home-actions button{border:1px solid #d9dee7;background:#fff;border-radius:12px;padding:12px 16px;font-weight:800}
    .wb-home-actions button.primary{background:#28487e;color:#fff;border-color:#28487e}
    .wb-home-crumbs{font-size:13px;color:#667085;margin-bottom:12px;display:flex;gap:6px;align-items:center;flex-wrap:wrap}
    .wb-home-crumbs button{border:0;background:transparent;color:#28487e;padding:0;font:inherit;font-weight:750}
    .wb-home-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:12px}
    .wb-home-item{border:1px solid #d9dee7;background:#fff;border-radius:14px;padding:16px;text-align:left;min-height:112px;display:flex;flex-direction:column;gap:8px}
    .wb-home-item:hover{background:#fafbfc}
    .wb-home-icon{font-size:24px}.wb-home-name{font-weight:800;overflow-wrap:anywhere}.wb-home-meta{font-size:12px;color:#667085;margin-top:auto}
    .wb-home-empty{padding:30px;border:1px dashed #cbd3df;border-radius:14px;background:#fff;color:#667085;text-align:center}
    @media(max-width:760px){.wb-home-head{padding:10px}.wb-home-head h1{font-size:19px}.wb-home-body{padding-top:16px}.wb-home-actions button{flex:1;min-width:130px}}
  `;
  document.head.appendChild(style);

  function waitForDashboardAuth() {
    if (window.DashboardAuth?.client && window.DashboardAuth?.user) {
      return Promise.resolve({ client: window.DashboardAuth.client, user: window.DashboardAuth.user });
    }
    return new Promise(resolve => {
      const timeout = setTimeout(() => resolve(null), 10000);
      window.addEventListener("dashboard-auth-ready", event => {
        clearTimeout(timeout);
        const client = event.detail?.client || window.DashboardAuth?.client;
        const user = event.detail?.user || window.DashboardAuth?.user;
        resolve(client && user ? { client, user } : null);
      }, { once: true });
    });
  }

  function readLocalFS() {
    try {
      const value = JSON.parse(localStorage.getItem(DB_KEY) || "null");
      return value && typeof value === "object" ? value : null;
    } catch { return null; }
  }

  function latestLocalTimestamp(fs) {
    if (!fs) return 0;
    const times = [];
    for (const folder of fs.folders || []) times.push(Number(folder.createdAt) || 0);
    for (const file of fs.files || []) times.push(Number(file.updatedAt || file.createdAt) || 0);
    for (const shortcut of fs.shortcuts || []) times.push(Number(shortcut.createdAt) || 0);
    return Math.max(0, ...times);
  }

  function hasUserContent(fs) {
    if (!fs) return false;
    return (fs.files?.length || 0) > 0 || (fs.shortcuts?.length || 0) > 0 ||
      (fs.folders?.filter(folder => folder.id !== "root").length || 0) > 0;
  }

  const sync = {
    client: null,user: null,timer: null,pushing: false,queuedPayload: null,
    async initialize() {
      const auth = await waitForDashboardAuth();
      if (!auth) return;
      this.client = auth.client; this.user = auth.user;
      const local = readLocalFS();
      const { data, error } = await this.client.from(SYNC_TABLE).select("payload,updated_at").eq("user_id", this.user.id).maybeSingle();
      if (error) { console.warn("Whiteboard sync pull failed:", error.message); return; }
      if (!data) { if (local && hasUserContent(local)) await this.pushNow(local); return; }
      const remote = data.payload;
      if (!remote || typeof remote !== "object") return;
      const remoteTime = Date.parse(data.updated_at || "") || 0;
      const localTime = latestLocalTimestamp(local);
      if (local && hasUserContent(local) && localTime > remoteTime) await this.pushNow(local);
      else localStorage.setItem(DB_KEY, JSON.stringify(remote));
    },
    queuePush(fs) {
      if (!this.client || !this.user || !fs) return;
      this.queuedPayload = JSON.parse(JSON.stringify(fs));
      clearTimeout(this.timer); this.timer = setTimeout(() => this.flush(), 350);
    },
    async flush() {
      if (this.pushing || !this.queuedPayload) return;
      const payload = this.queuedPayload; this.queuedPayload = null;
      await this.pushNow(payload); if (this.queuedPayload) this.flush();
    },
    async pushNow(payload) {
      if (!this.client || !this.user || !payload) return;
      this.pushing = true;
      try {
        const { error } = await this.client.from(SYNC_TABLE).upsert({ user_id:this.user.id,payload,updated_at:new Date().toISOString() }, { onConflict:"user_id" });
        if (error) console.warn("Whiteboard sync push failed:", error.message);
      } finally { this.pushing = false; }
    }
  };
  window.WhiteboardSync = sync;

  const home = {
    folderId: "root",
    bridge: null,
    el: null,
    show() { if (!this.el) this.build(); this.render(); this.el.classList.remove("hidden"); },
    hide() { this.el?.classList.add("hidden"); },
    build() {
      const el = document.createElement("section");
      el.id = "whiteboardHome";
      el.innerHTML = `
        <div class="wb-home-head">
          <button class="wb-home-back" id="wbDashboardHome">← Dashboard</button>
          <h1>Whiteboard Files</h1>
        </div>
        <div class="wb-home-body">
          <div class="wb-home-actions">
            <button class="primary" id="wbNewBoard">New Whiteboard</button>
            <button id="wbOpenDevice">Open .DD File</button>
            <button id="wbNewFolder">New Folder</button>
          </div>
          <div class="wb-home-crumbs" id="wbHomeCrumbs"></div>
          <div class="wb-home-grid" id="wbHomeGrid"></div>
        </div>`;
      document.body.appendChild(el); this.el = el;
      el.querySelector("#wbDashboardHome").onclick = () => location.href = "../";
      el.querySelector("#wbOpenDevice").onclick = () => document.getElementById("ddDeviceInput")?.click();
      el.querySelector("#wbNewFolder").onclick = () => {
        this.bridge?.setFolder?.(this.folderId);
        document.getElementById("folderName").value = "";
        document.getElementById("folderDialog")?.showModal();
      };
      el.querySelector("#wbNewBoard").onclick = () => {
        this.bridge?.newBoard?.();
        this.hide();
        document.getElementById("boardDialog")?.showModal();
      };
    },
    render() {
      const fs = readLocalFS() || { folders:[{id:"root",name:"Whiteboard",parentId:null}],files:[],shortcuts:[] };
      if (!fs.folders?.some(f => f.id === this.folderId)) this.folderId = "root";
      const folders = fs.folders || [], files = fs.files || [], shortcuts = fs.shortcuts || [];
      const crumbs = this.el.querySelector("#wbHomeCrumbs"); crumbs.innerHTML = "";
      const path = []; let cur = folders.find(f => f.id === this.folderId);
      while (cur) { path.unshift(cur); cur = folders.find(f => f.id === cur.parentId); }
      for (const [i,p] of path.entries()) {
        const b=document.createElement("button");b.textContent=p.name;b.onclick=()=>{this.folderId=p.id;this.render()};crumbs.appendChild(b);
        if(i<path.length-1) crumbs.append(" / ");
      }
      const grid = this.el.querySelector("#wbHomeGrid"); grid.innerHTML = "";
      const rows=[];
      folders.filter(f=>f.parentId===this.folderId).forEach(f=>rows.push({kind:"folder",...f}));
      files.filter(f=>f.folderId===this.folderId).forEach(f=>rows.push({kind:"file",...f}));
      shortcuts.filter(s=>s.folderId===this.folderId).forEach(s=>rows.push({kind:"shortcut",...s}));
      if(!rows.length){grid.innerHTML='<div class="wb-home-empty">This folder is empty.</div>';return;}
      rows.sort((a,b)=>a.kind.localeCompare(b.kind)||String(a.name).localeCompare(String(b.name)));
      rows.forEach(item=>{
        const b=document.createElement("button");b.className="wb-home-item";
        const icon=item.kind==="folder"?"📁":item.kind==="shortcut"?"↗":"◻️";
        const meta=item.kind==="folder"?"Folder":item.kind==="shortcut"?"Shortcut":"Whiteboard .DD";
        b.innerHTML=`<span class="wb-home-icon">${icon}</span><span class="wb-home-name"></span><span class="wb-home-meta">${meta}</span>`;
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
      });
    }
  };
  window.WhiteboardHome = home;

  function replaceRequired(source, from, to, label) {
    if (!source.includes(from)) throw new Error(`Whiteboard 0.1.2 could not apply ${label}.`);
    return source.replace(from, to);
  }

  function patchCore(source) {
    source = replaceRequired(source,'const VERSION = "0.1.0";',`const VERSION = "${VERSION}";`,"version update");
    source = replaceRequired(source,'tool: "pen",','tool: "hand",',"default hand tool");
    source = replaceRequired(source,'function saveFS(fs){ localStorage.setItem(DB_KEY, JSON.stringify(fs)); }','function saveFS(fs){ localStorage.setItem(DB_KEY, JSON.stringify(fs)); window.WhiteboardSync?.queuePush(fs); window.WhiteboardHome?.render?.(); }',"Supabase file sync");

    source = replaceRequired(source,
      'let fs = loadFS();\n  let currentFolderId = "root";',
      'let fs = loadFS();\n  let currentFolderId = "root";\n  function resetNewBoard(){state.title="Untitled Whiteboard";state.mode="infinite";state.pageCount=5;state.camera={x:0,y:0,zoom:1};state.tool="hand";state.elements=[];state.assets={};state.history=[];state.future=[];state.dirty=false;state.fileId=null;state.fileFolderId="root";state.selectionPending=false;state.selectionStart=null;state.selectionRect=null;state.pointer=null;state.gesture=null;state.textPoint=null;$("docTitle").value=state.title;updateModeUI();updateZoom();updateStatus();setTool("hand");render();}',
      "new board reset"
    );

    source = replaceRequired(source,
      'function pageTop(i){ return PAGE.margin + i*(PAGE.height+PAGE.gap); }',
      `function pageTop(i){ return PAGE.margin + i*(PAGE.height+PAGE.gap); }
  function pageIndexAt(world){if(state.mode!=="pages")return -1;if(world.x < -PAGE.width/2 || world.x > PAGE.width/2)return -1;const relative=world.y-PAGE.margin;if(relative<0)return -1;const index=Math.floor(relative/(PAGE.height+PAGE.gap));if(index<0||index>=state.pageCount)return -1;const localY=relative-index*(PAGE.height+PAGE.gap);return localY>=0&&localY<=PAGE.height?index:-1;}
  function pointOnPage(world){return state.mode!=="pages"||pageIndexAt(world)>=0;}
  function partialEraseAt(world,radius=12/state.camera.zoom){let changed=false;for(let i=state.elements.length-1;i>=0;i--){const el=state.elements[i];if(el.type!=="stroke")continue;const kept=[];let segment=[];let touched=false;for(const point of el.points){if(Math.hypot(point.x-world.x,point.y-world.y)<=radius){touched=true;if(segment.length){kept.push(segment);segment=[];}}else segment.push(point);}if(segment.length)kept.push(segment);if(!touched)continue;changed=true;const replacements=kept.filter(points=>points.length>1).map(points=>({...el,id:uid("stroke"),points}));state.elements.splice(i,1,...replacements);}return changed;}`,
      "page boundary helpers"
    );
    source = replaceRequired(source,'ctx.lineWidth=Math.max(.5,el.width*state.camera.zoom);','ctx.lineWidth=state.mode==="infinite"?el.width*state.camera.zoom:Math.max(.5,el.width*state.camera.zoom);',"zoom-scaled stroke width");
    source = replaceRequired(source,'if(state.tool==="text"){state.textPoint=w;$("textInput").value="";$("textDialog").showModal();setTimeout(()=>$("textInput").focus(),50);return;}','if(state.tool==="text"){if(!pointOnPage(w))return;state.textPoint=w;$("textInput").value="";$("textDialog").showModal();setTimeout(()=>$("textInput").focus(),50);return;}',"page-bound text");
    source = replaceRequired(source,'if(state.tool==="eraser"){const idx=hitStroke(w);if(idx>=0){pushHistory();state.elements.splice(idx,1);markDirty();render();}state.pointer={mode:"erase"};return;}','if(state.tool==="eraser"){pushHistory();const whole=$("eraserMode")?.value==="whole";if(whole){const idx=hitStroke(w);if(idx>=0){state.elements.splice(idx,1);markDirty();render();}}else if(partialEraseAt(w)){markDirty();render();}state.pointer={mode:whole?"erase-whole":"erase-partial"};return;}',"eraser mode");
    source = replaceRequired(source,'if(state.tool==="hand"||e.button===1||e.button===2){state.pointer={mode:"pan",sx:p.sx,sy:p.sy,cx:state.camera.x,cy:state.camera.y};canvas.style.cursor="grabbing";return;}','if(state.tool==="hand"||(e.ctrlKey&&state.tool==="pen")||e.button===1||e.button===2){state.pointer={mode:"pan",sx:p.sx,sy:p.sy,cx:state.camera.x,cy:state.camera.y};canvas.style.cursor="grabbing";return;}',"temporary Control pan");
    source = replaceRequired(source,'pushHistory();const el={id:uid("stroke"),type:"stroke",color:state.tool==="highlighter"?"#ffd84a":"#18202b",opacity:state.tool==="highlighter"?.38:1,width:state.tool==="highlighter"?18:3,points:[w]};state.elements.push(el);state.pointer={mode:"draw",id:el.id};markDirty();render();','if(!pointOnPage(w))return;pushHistory();const pageIndex=state.mode==="pages"?pageIndexAt(w):-1;const el={id:uid("stroke"),type:"stroke",color:state.tool==="highlighter"?"#ffd84a":"#18202b",opacity:state.tool==="highlighter"?.38:1,width:state.tool==="highlighter"?18:3,points:[w]};state.elements.push(el);state.pointer={mode:"draw",id:el.id,pageIndex};markDirty();render();',"page-bound stroke start");
    source = replaceRequired(source,'else if(state.pointer.mode==="draw"){const el=state.elements.find(x=>x.id===state.pointer.id);if(el){const last=el.points.at(-1);if(!last||Math.hypot(last.x-w.x,last.y-w.y)>1/state.camera.zoom){el.points.push(w);render()}}}else if(state.pointer.mode==="erase"){const idx=hitStroke(w);if(idx>=0){state.elements.splice(idx,1);markDirty();render()}}','else if(state.pointer.mode==="draw"){const el=state.elements.find(x=>x.id===state.pointer.id);if(el){if(state.mode==="pages"&&pageIndexAt(w)!==state.pointer.pageIndex)return;const last=el.points.at(-1);if(!last||Math.hypot(last.x-w.x,last.y-w.y)>1/state.camera.zoom){el.points.push(w);render()}}}else if(state.pointer.mode==="erase-whole"){const idx=hitStroke(w);if(idx>=0){state.elements.splice(idx,1);markDirty();render()}}else if(state.pointer.mode==="erase-partial"){if(partialEraseAt(w)){markDirty();render()}}',"page-bound stroke continuation and partial erase");
    source = replaceRequired(source,'canvas.addEventListener("wheel",e=>{e.preventDefault();const p=pointFromEvent(e);if(e.ctrlKey||e.metaKey||Math.abs(e.deltaY)>0){zoomAt(p.sx,p.sy,Math.exp(-e.deltaY*.0015));}}, {passive:false});','canvas.addEventListener("wheel",e=>{e.preventDefault();const unit=e.deltaMode===1?16:e.deltaMode===2?wrap.clientHeight:1;state.camera.x+=e.deltaX*unit/state.camera.zoom;state.camera.y+=e.deltaY*unit/state.camera.zoom;render();}, {passive:false});',"wheel scrolling");

    source = replaceRequired(source,
      'function openFile(id){const f=fs.files.find(x=>x.id===id);if(!f)return;try{loadDD(f.content,id,f.folderId);$("filesPanel").classList.add("hidden");toast(`Opened ${f.name}`)}catch(e){alert(e.message)}}',
      'function openFile(id){const f=fs.files.find(x=>x.id===id);if(!f)return;try{loadDD(f.content,id,f.folderId);$("filesPanel").classList.add("hidden");window.WhiteboardHome?.hide?.();toast(`Opened ${f.name}`)}catch(e){alert(e.message)}}\n  window.WhiteboardHomeBridge={openFile,newBoard:resetNewBoard,setFolder:id=>{currentFolderId=id||"root";}};window.WhiteboardHome.bridge=window.WhiteboardHomeBridge;',
      "home file bridge"
    );

    source = replaceRequired(source,
      '$("dashboardBtn").onclick=()=>location.href="../";$("filesBtn").onclick=()=>{$("filesPanel").classList.toggle("hidden");renderFiles()};',
      '$("dashboardBtn").onclick=()=>location.href="../";$("filesBtn").textContent="Home";$("filesBtn").onclick=()=>window.WhiteboardHome?.show?.();',
      "home navigation button"
    );

    source = replaceRequired(source,
      '$("ddDeviceInput").addEventListener("change",async()=>{const f=$("ddDeviceInput").files[0];if(!f)return;try{loadDD(JSON.parse(await f.text()));toast(`Opened ${f.name}`)}catch(e){alert(e.message)}$("ddDeviceInput").value=""});',
      '$("ddDeviceInput").addEventListener("change",async()=>{const f=$("ddDeviceInput").files[0];if(!f)return;try{loadDD(JSON.parse(await f.text()));window.WhiteboardHome?.hide?.();toast(`Opened ${f.name}`)}catch(e){alert(e.message)}$("ddDeviceInput").value=""});',
      "device file home navigation"
    );

    source = replaceRequired(source,'updateModeUI();updateZoom();renderFiles();resize();','updateModeUI();updateZoom();renderFiles();resize();setTool("hand");',"hand initialization");
    return source;
  }

  sync.initialize()
    .catch(error => console.warn("Whiteboard sync initialization failed:", error))
    .then(() => fetch(`./whiteboard-core.js?v=${VERSION}`, { cache: "no-store" }))
    .then(response => { if (!response.ok) throw new Error(`Could not load Whiteboard core (${response.status}).`); return response.text(); })
    .then(source => {
      const patched = patchCore(source);
      (0, eval)(`${patched}\n//# sourceURL=whiteboard-core-0.1.2.js`);
      const oldStartup = document.getElementById("startupDialog");
      if (oldStartup?.open) oldStartup.close();
      home.bridge = window.WhiteboardHomeBridge;
      home.show();
    })
    .catch(error => { console.error(error); alert("Whiteboard could not start. Please reload the page."); });
})();
