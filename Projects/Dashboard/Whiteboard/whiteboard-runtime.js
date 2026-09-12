(() => {
  "use strict";

  const RELEASE_VERSION = "0.2.0";

  function patchWrapper(source) {
    source = source.replaceAll("0.1.2", RELEASE_VERSION);

    source = source.replace(
      `'tool: "pen",','tool: "hand",',"default hand tool"`,
      `'tool: "pen",','tool: "pen",',"default pen tool"`
    );

    source = source
      .replaceAll('state.tool="hand"', 'state.tool="pen"')
      .replaceAll('setTool("hand")', 'setTool("pen")')
      .replaceAll('(e.ctrlKey&&state.tool==="pen")', '(e.pointerType==="mouse"&&e.ctrlKey)');

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