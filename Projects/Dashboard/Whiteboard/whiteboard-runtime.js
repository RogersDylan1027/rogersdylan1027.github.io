(() => {
  "use strict";

  const RELEASE_VERSION = "0.2.0";
  const PENCIL_TOUCH_GRACE_MS = 900;
  const activePenPointers = new Set();
  let suppressTouchUntil = 0;

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

    // Capture-phase listeners run before the Whiteboard's own pointer handlers.
    // Hover/move support helps reject a resting palm even before Pencil contact
    // on iPads/Apple Pencil models that expose stylus hover.
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
      `'if(state.tool==="hand"||(e.ctrlKey&&state.tool==="pen")||e.button===1||e.button===2){state.pointer={mode:"pan",sx:p.sx,sy:p.sy,cx:state.camera.x,cy:state.camera.y};canvas.style.cursor="grabbing";return;}',`,
      `'if(state.tool==="hand"||(e.pointerType==="mouse"&&e.ctrlKey)||e.button===1||e.button===2){state.pointer={mode:"pan",sx:p.sx,sy:p.sy,cx:state.camera.x,cy:state.camera.y};canvas.style.cursor="grabbing";return;}',`
    );

    const anchor = `source = replaceRequired(source,'function saveFS(fs){ localStorage.setItem(DB_KEY, JSON.stringify(fs)); }','function saveFS(fs){ localStorage.setItem(DB_KEY, JSON.stringify(fs)); window.WhiteboardSync?.queuePush(fs); window.WhiteboardHome?.render?.(); }',"Supabase file sync");`;

    const touchPatch = `\n    source = replaceRequired(source,\n      'function beginPointer(e){\\n    if(e.button!==undefined&&e.button>1)return; canvas.setPointerCapture?.(e.pointerId); const p=pointFromEvent(e), w=screenToWorld(p.sx,p.sy);',\n      'function beginPointer(e){\\n    if(e.button!==undefined&&e.button>1)return; canvas.setPointerCapture?.(e.pointerId); const p=pointFromEvent(e), w=screenToWorld(p.sx,p.sy); if(e.pointerType==="touch"){state.pointer={mode:"pan",sx:p.sx,sy:p.sy,cx:state.camera.x,cy:state.camera.y};canvas.style.cursor="grabbing";return;}',\n      "finger pan routing"\n    );`;

    if (!source.includes(anchor)) {
      throw new Error("Whiteboard 0.2.0 could not install input routing.");
    }

    source = source.replace(anchor, anchor + touchPatch);
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
    })
    .catch(error => {
      console.error(error);
      alert("Whiteboard could not start. Please reload the page.");
    });
})();