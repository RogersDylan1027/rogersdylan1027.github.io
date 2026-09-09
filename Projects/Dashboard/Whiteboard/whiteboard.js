(() => {
  "use strict";

  // Whiteboard 0.1.1 compatibility layer.
  // The original 0.1.0 application remains in whiteboard-core.js so this update
  // can stay narrowly focused on local .DD file handling.
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

  // The 0.1.0 core builds .DD objects internally. Override only the serialized
  // Whiteboard version field so files written by this release correctly report
  // 0.1.1 without changing unrelated JSON serialization.
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

  // Load the preserved 0.1.0 application after the compatibility layer is in
  // place. Its existing Open .DD workflow can now read locally saved .DD files.
  const core = document.createElement("script");
  core.src = "./whiteboard-core.js?v=" + VERSION;
  core.async = false;
  document.body.appendChild(core);
})();
