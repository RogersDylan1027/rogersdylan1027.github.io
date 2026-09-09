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
  style.textContent = "@media(max-width:760px){#filesBtn{display:inline-block!important}}";
  document.head.appendChild(style);

  function waitForDashboardAuth() {
    if (window.DashboardAuth?.client && window.DashboardAuth?.user) {
      return Promise.resolve({
        client: window.DashboardAuth.client,
        user: window.DashboardAuth.user
      });
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
    } catch {
      return null;
    }
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
    return (fs.files?.length || 0) > 0 ||
      (fs.shortcuts?.length || 0) > 0 ||
      (fs.folders?.filter(folder => folder.id !== "root").length || 0) > 0;
  }

  const sync = {
    client: null,
    user: null,
    timer: null,
    pushing: false,
    queuedPayload: null,

    async initialize() {
      const auth = await waitForDashboardAuth();
      if (!auth) return;
      this.client = auth.client;
      this.user = auth.user;

      const local = readLocalFS();
      const { data, error } = await this.client
        .from(SYNC_TABLE)
        .select("payload,updated_at")
        .eq("user_id", this.user.id)
        .maybeSingle();

      if (error) {
        console.warn("Whiteboard sync pull failed:", error.message);
        return;
      }

      if (!data) {
        if (local && hasUserContent(local)) {
          await this.pushNow(local);
        }
        return;
      }

      const remote = data.payload;
      if (!remote || typeof remote !== "object") return;

      const remoteTime = Date.parse(data.updated_at || "") || 0;
      const localTime = latestLocalTimestamp(local);

      if (local && hasUserContent(local) && localTime > remoteTime) {
        await this.pushNow(local);
      } else {
        localStorage.setItem(DB_KEY, JSON.stringify(remote));
      }
    },

    queuePush(fs) {
      if (!this.client || !this.user || !fs) return;
      this.queuedPayload = JSON.parse(JSON.stringify(fs));
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.flush(), 350);
    },

    async flush() {
      if (this.pushing || !this.queuedPayload) return;
      const payload = this.queuedPayload;
      this.queuedPayload = null;
      await this.pushNow(payload);
      if (this.queuedPayload) this.flush();
    },

    async pushNow(payload) {
      if (!this.client || !this.user || !payload) return;
      this.pushing = true;
      try {
        const { error } = await this.client
          .from(SYNC_TABLE)
          .upsert({
            user_id: this.user.id,
            payload,
            updated_at: new Date().toISOString()
          }, { onConflict: "user_id" });
        if (error) console.warn("Whiteboard sync push failed:", error.message);
      } finally {
        this.pushing = false;
      }
    }
  };

  window.WhiteboardSync = sync;

  function replaceRequired(source, from, to, label) {
    if (!source.includes(from)) {
      throw new Error(`Whiteboard 0.1.2 could not apply ${label}.`);
    }
    return source.replace(from, to);
  }

  function patchCore(source) {
    source = replaceRequired(source,
      'const VERSION = "0.1.0";',
      `const VERSION = "${VERSION}";`,
      "version update"
    );

    source = replaceRequired(source,
      'tool: "pen",',
      'tool: "hand",',
      "default hand tool"
    );

    source = replaceRequired(source,
      'function saveFS(fs){ localStorage.setItem(DB_KEY, JSON.stringify(fs)); }',
      'function saveFS(fs){ localStorage.setItem(DB_KEY, JSON.stringify(fs)); window.WhiteboardSync?.queuePush(fs); }',
      "Supabase file sync"
    );

    source = replaceRequired(source,
      'function pageTop(i){ return PAGE.margin + i*(PAGE.height+PAGE.gap); }',
      `function pageTop(i){ return PAGE.margin + i*(PAGE.height+PAGE.gap); }
  function pageIndexAt(world){
    if(state.mode!=="pages")return -1;
    if(world.x < -PAGE.width/2 || world.x > PAGE.width/2)return -1;
    const relative=world.y-PAGE.margin;
    if(relative<0)return -1;
    const index=Math.floor(relative/(PAGE.height+PAGE.gap));
    if(index<0||index>=state.pageCount)return -1;
    const localY=relative-index*(PAGE.height+PAGE.gap);
    return localY>=0&&localY<=PAGE.height?index:-1;
  }
  function pointOnPage(world){return state.mode!=="pages"||pageIndexAt(world)>=0;}
  function partialEraseAt(world,radius=12/state.camera.zoom){
    let changed=false;
    for(let i=state.elements.length-1;i>=0;i--){
      const el=state.elements[i];
      if(el.type!=="stroke")continue;
      const kept=[];let segment=[];let touched=false;
      for(const point of el.points){
        if(Math.hypot(point.x-world.x,point.y-world.y)<=radius){
          touched=true;
          if(segment.length){kept.push(segment);segment=[];}
        }else segment.push(point);
      }
      if(segment.length)kept.push(segment);
      if(!touched)continue;
      changed=true;
      const replacements=kept.filter(points=>points.length>1).map(points=>({...el,id:uid("stroke"),points}));
      state.elements.splice(i,1,...replacements);
    }
    return changed;
  }`,
      "page boundary helpers"
    );

    source = replaceRequired(source,
      'ctx.lineWidth=Math.max(.5,el.width*state.camera.zoom);',
      'ctx.lineWidth=state.mode==="infinite"?el.width*state.camera.zoom:Math.max(.5,el.width*state.camera.zoom);',
      "zoom-scaled stroke width"
    );

    source = replaceRequired(source,
      'if(state.tool==="text"){state.textPoint=w;$("textInput").value="";$("textDialog").showModal();setTimeout(()=>$("textInput").focus(),50);return;}',
      'if(state.tool==="text"){if(!pointOnPage(w))return;state.textPoint=w;$("textInput").value="";$("textDialog").showModal();setTimeout(()=>$("textInput").focus(),50);return;}',
      "page-bound text"
    );

    source = replaceRequired(source,
      'if(state.tool==="eraser"){const idx=hitStroke(w);if(idx>=0){pushHistory();state.elements.splice(idx,1);markDirty();render();}state.pointer={mode:"erase"};return;}',
      'if(state.tool==="eraser"){pushHistory();const whole=$("eraserMode")?.value==="whole";if(whole){const idx=hitStroke(w);if(idx>=0){state.elements.splice(idx,1);markDirty();render();}}else if(partialEraseAt(w)){markDirty();render();}state.pointer={mode:whole?"erase-whole":"erase-partial"};return;}',
      "eraser mode"
    );

    source = replaceRequired(source,
      'if(state.tool==="hand"||e.button===1||e.button===2){state.pointer={mode:"pan",sx:p.sx,sy:p.sy,cx:state.camera.x,cy:state.camera.y};canvas.style.cursor="grabbing";return;}',
      'if(state.tool==="hand"||(e.ctrlKey&&state.tool==="pen")||e.button===1||e.button===2){state.pointer={mode:"pan",sx:p.sx,sy:p.sy,cx:state.camera.x,cy:state.camera.y};canvas.style.cursor="grabbing";return;}',
      "temporary Control pan"
    );

    source = replaceRequired(source,
      'pushHistory();const el={id:uid("stroke"),type:"stroke",color:state.tool==="highlighter"?"#ffd84a":"#18202b",opacity:state.tool==="highlighter"?.38:1,width:state.tool==="highlighter"?18:3,points:[w]};state.elements.push(el);state.pointer={mode:"draw",id:el.id};markDirty();render();',
      'if(!pointOnPage(w))return;pushHistory();const pageIndex=state.mode==="pages"?pageIndexAt(w):-1;const el={id:uid("stroke"),type:"stroke",color:state.tool==="highlighter"?"#ffd84a":"#18202b",opacity:state.tool==="highlighter"?.38:1,width:state.tool==="highlighter"?18:3,points:[w]};state.elements.push(el);state.pointer={mode:"draw",id:el.id,pageIndex};markDirty();render();',
      "page-bound stroke start"
    );

    source = replaceRequired(source,
      'else if(state.pointer.mode==="draw"){const el=state.elements.find(x=>x.id===state.pointer.id);if(el){const last=el.points.at(-1);if(!last||Math.hypot(last.x-w.x,last.y-w.y)>1/state.camera.zoom){el.points.push(w);render()}}}else if(state.pointer.mode==="erase"){const idx=hitStroke(w);if(idx>=0){state.elements.splice(idx,1);markDirty();render()}}',
      'else if(state.pointer.mode==="draw"){const el=state.elements.find(x=>x.id===state.pointer.id);if(el){if(state.mode==="pages"&&pageIndexAt(w)!==state.pointer.pageIndex)return;const last=el.points.at(-1);if(!last||Math.hypot(last.x-w.x,last.y-w.y)>1/state.camera.zoom){el.points.push(w);render()}}}else if(state.pointer.mode==="erase-whole"){const idx=hitStroke(w);if(idx>=0){state.elements.splice(idx,1);markDirty();render()}}else if(state.pointer.mode==="erase-partial"){if(partialEraseAt(w)){markDirty();render()}}',
      "page-bound stroke continuation and partial erase"
    );

    source = replaceRequired(source,
      'canvas.addEventListener("wheel",e=>{e.preventDefault();const p=pointFromEvent(e);if(e.ctrlKey||e.metaKey||Math.abs(e.deltaY)>0){zoomAt(p.sx,p.sy,Math.exp(-e.deltaY*.0015));}}, {passive:false});',
      'canvas.addEventListener("wheel",e=>{e.preventDefault();const unit=e.deltaMode===1?16:e.deltaMode===2?wrap.clientHeight:1;state.camera.x+=e.deltaX*unit/state.camera.zoom;state.camera.y+=e.deltaY*unit/state.camera.zoom;render();}, {passive:false});',
      "wheel scrolling"
    );

    source = replaceRequired(source,
      'updateModeUI();updateZoom();renderFiles();resize();',
      'updateModeUI();updateZoom();renderFiles();resize();setTool("hand");',
      "hand initialization"
    );

    return source;
  }

  function installStartupChooser() {
    const dialog = document.getElementById("startupDialog");
    if (!dialog) return;

    document.getElementById("startupOpenBtn")?.addEventListener("click", () => {
      dialog.close();
      document.getElementById("filesBtn")?.click();
    });

    document.getElementById("startupDeviceBtn")?.addEventListener("click", () => {
      dialog.close();
      document.getElementById("ddDeviceInput")?.click();
    });

    document.getElementById("startupNewBtn")?.addEventListener("click", () => {
      dialog.close();
    });

    if (!dialog.open) dialog.showModal();
  }

  sync.initialize()
    .catch(error => console.warn("Whiteboard sync initialization failed:", error))
    .then(() => fetch(`./whiteboard-core.js?v=${VERSION}`, { cache: "no-store" }))
    .then(response => {
      if (!response.ok) throw new Error(`Could not load Whiteboard core (${response.status}).`);
      return response.text();
    })
    .then(source => {
      const patched = patchCore(source);
      (0, eval)(`${patched}\n//# sourceURL=whiteboard-core-0.1.2.js`);
      installStartupChooser();
    })
    .catch(error => {
      console.error(error);
      alert("Whiteboard could not start. Please reload the page.");
    });
})();
