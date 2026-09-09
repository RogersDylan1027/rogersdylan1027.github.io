(() => {
  "use strict";

  // Whiteboard 0.1.1 compatibility layer.
  // The original application remains in whiteboard-core.js while this layer
  // applies the approved local .DD and input-behavior fixes.
  const VERSION = "0.1.1";

  // Keep .DD downloads from being identified as ordinary JSON by Safari/iOS.
  // Some Apple save flows append .json when a download is advertised as
  // application/json even when the requested filename already ends in .DD.
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

  // The preserved core builds .DD objects internally. Override only the
  // serialized Whiteboard version field so files written by this release
  // correctly report 0.1.1 without changing unrelated JSON serialization.
  const nativeStringify = JSON.stringify.bind(JSON);
  JSON.stringify = function(value, replacer, space) {
    if (Array.isArray(replacer)) {
      return nativeStringify(value, replacer, space);
    }
    const userReplacer = typeof replacer === "function" ? replacer : null;
    return nativeStringify(value, function(key, currentValue) {
      let nextValue = currentValue;
      if (key === "whiteboardVersion" && this && this.type === "whiteboard") {
        nextValue = VERSION;
      }
      return userReplacer ? userReplacer.call(this, key, nextValue) : nextValue;
    }, space);
  };

  // On phones the original responsive rule hides non-primary top actions,
  // including Files. Keep Files reachable so a locally saved .DD can always be
  // reopened from the Whiteboard file panel.
  const style = document.createElement("style");
  style.textContent = "@media(max-width:760px){#filesBtn{display:inline-block!important}}";
  document.head.appendChild(style);

  const canvas = document.getElementById("canvas");
  const originalAddEventListener = canvas.addEventListener.bind(canvas);
  let pointerDownHandler = null;
  let pointerMoveHandler = null;
  let pointerUpHandler = null;
  let wheelHandlerInstalled = false;

  function penIsActive() {
    return document.querySelector('[data-tool="pen"]')?.classList.contains("active") === true;
  }

  function withMiddleButton(event) {
    return new Proxy(event, {
      get(target, property) {
        if (property === "button") return 1;
        const value = Reflect.get(target, property, target);
        return typeof value === "function" ? value.bind(target) : value;
      }
    });
  }

  function runPanStart(event) {
    if (!pointerDownHandler) return;
    const originalSetPointerCapture = canvas.setPointerCapture;
    try {
      canvas.setPointerCapture = () => {};
      pointerDownHandler(withMiddleButton(event));
    } finally {
      canvas.setPointerCapture = originalSetPointerCapture;
    }
  }

  function wheelDistance(event) {
    const multiplier = event.deltaMode === 1
      ? 16
      : event.deltaMode === 2
        ? canvas.clientHeight
        : 1;
    return {
      x: event.deltaX * multiplier,
      y: event.deltaY * multiplier
    };
  }

  function scrollBoardWithWheel(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!pointerDownHandler || !pointerMoveHandler || !pointerUpHandler) return;

    const distance = wheelDistance(event);
    runPanStart(event);
    pointerMoveHandler({
      clientX: event.clientX - distance.x,
      clientY: event.clientY - distance.y
    });
    pointerUpHandler();
  }

  // Intercept the core's input registration so approved desktop navigation can
  // be applied without changing drawing, touch, import/export, or file logic.
  canvas.addEventListener = function(type, listener, options) {
    if (type === "pointerdown" && !pointerDownHandler) {
      pointerDownHandler = listener;
      return originalAddEventListener(type, event => {
        // Control is a temporary modifier, not a tool toggle. When Pen is
        // selected, Ctrl + drag behaves exactly like a normal Hand drag.
        if (event.ctrlKey && penIsActive()) {
          listener(withMiddleButton(event));
        } else {
          listener(event);
        }
      }, options);
    }

    if (type === "pointermove" && !pointerMoveHandler) {
      pointerMoveHandler = listener;
      return originalAddEventListener(type, listener, options);
    }

    if ((type === "pointerup" || type === "pointercancel") && !pointerUpHandler) {
      pointerUpHandler = listener;
      return originalAddEventListener(type, listener, options);
    }

    if (type === "wheel" && !wheelHandlerInstalled) {
      wheelHandlerInstalled = true;
      return originalAddEventListener("wheel", scrollBoardWithWheel, { passive: false });
    }

    // Ignore the core's old wheel-to-zoom registration once our wheel handler
    // is installed. Zoom remains available through the +/- controls and pinch.
    if (type === "wheel") return;

    return originalAddEventListener(type, listener, options);
  };

  // Load the preserved application after the compatibility/input layer is in
  // place. Its existing Open .DD workflow reads locally saved .DD files.
  const core = document.createElement("script");
  core.src = "./whiteboard-core.js?v=" + VERSION;
  core.async = false;
  core.onload = () => {
    // Default to navigation/dragging. Pen becomes active only after the user
    // explicitly selects Pen.
    document.querySelector('[data-tool="hand"]')?.click();
    canvas.addEventListener = originalAddEventListener;
  };
  document.body.appendChild(core);
})();
