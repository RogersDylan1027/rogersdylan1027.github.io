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
      installEraserControls();
      installEraserCursor();
    })
    .catch(error => {
      console.error(error);
      alert("Whiteboard could not start. Please reload the page.");
    });
})();