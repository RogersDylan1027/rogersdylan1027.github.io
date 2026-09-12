Whiteboard · Version 0.2.0
Cross-Device Sync & Files-First Home · 2026-09-12

CHANGELOG
=========
Version 0.2.0: Cross-Device Sync & Files-First Home

Description:
Adds account-based Whiteboard syncing across devices, introduces a full files-first
Home Screen for opening and switching between boards, and improves input handling
so fingers pan while Apple Pencil / stylus and mouse input can draw naturally.

NEW / CHANGED IN 0.2.0
======================
- Dashboard Storage Whiteboards now sync through Supabase for the signed-in
  Dashboard account, allowing the same saved boards to appear across devices.
- Existing local Whiteboard data is preserved during first sync with a newest-copy
  check instead of blindly overwriting one device with another.
- Whiteboard now opens to a full files-first Home Screen instead of the older
  startup chooser.
- The Home Screen can browse folders and synced Whiteboards, create a new board,
  create a folder, or open a local .DD file.
- Inside a board, the Files action becomes Home so the user can leave the current
  board, return to the file browser, and open a different board.
- Finger / touch input pans and drags the canvas even when a drawing tool is active.
- Apple Pencil and other stylus input use the active drawing tool.
- Mouse input defaults to drawing with the active tool.
- Holding Control while dragging with a mouse temporarily pans without changing
  the selected drawing tool.
- Pen is the default drawing tool for new/opened workspaces while finger navigation
  remains independent from the selected tool.
- Existing 0.1.2 page boundaries, partial/whole-stroke erasing, zoom-scaled strokes,
  import/export workflows, .DD handling, and folder/shortcut support are preserved.

Version 0.1.2: File-First Workspace & Drawing Controls

Description:
Makes Whiteboard open with a file-first chooser, improves navigation and drawing
behavior, keeps Paper / Pages annotations inside the paper boundaries, scales
infinite-canvas strokes naturally with zoom, and adds partial or whole-stroke
erasing.

NEW / CHANGED IN 0.1.2
======================
- Whiteboard now opens to a startup file selector instead of immediately opening
  a blank board.
- Startup choices include opening a Dashboard Storage Whiteboard, opening a local
  .DD file, or creating a new Whiteboard.
- Hand / drag is the default interaction when a board opens.
- The mouse wheel scrolls / pans the board instead of zooming it.
- While Pen is selected, holding Control while dragging temporarily pans the
  board. Releasing Control leaves Pen selected; Control is not a toggle.
- Paper / Pages mode only accepts pen, highlighter, and text input on an actual
  page. Strokes cannot continue across the gaps between pages or off the paper.
- Infinite Whiteboard pen and highlighter widths now scale with the board zoom:
  zooming in makes a stroke appear thicker and zooming out makes it appear
  thinner.
- Eraser now defaults to Partial Erase, which removes only the touched portion of
  a stroke.
- Eraser includes a Whole Stroke option for the previous behavior.
- Existing local .DD opening and exact .DD extension handling from 0.1.1 are
  preserved.

Version 0.1.1: Local .DD File Handling Fix

Fixes local Whiteboard file handling so device downloads keep the custom .DD
extension exactly instead of being saved as .dd.json, and makes locally saved .DD
files easy to reopen from Whiteboard with the Open .DD File picker.

Version 0.1.0: First Whiteboard Build

Introduced the first Dashboard Dylan Whiteboard project with infinite-canvas
and page modes, .DD files, local/Dashboard Storage saving, importing, exporting,
folders, shortcuts, and shared Dashboard authentication.
