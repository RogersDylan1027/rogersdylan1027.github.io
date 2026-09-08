Whiteboard · Version 0.1.0
First Whiteboard Build · 2026-09-08

CHANGELOG
=========
Version 0.1.0: First Whiteboard Build

Description:
Introduces the first Dashboard Dylan Whiteboard project with configurable infinite-canvas and paper/page modes, editable .DD files, import and export workflows, and a Dashboard-style file system foundation for saving, organizing, and reopening Whiteboard work.

INCLUDED IN 0.1.0
=================
- Infinite Whiteboard mode with panning and effectively continuous zoom.
- Paper / Pages mode with lined pages that extend downward as needed.
- Pen, highlighter, eraser, text, undo, and redo for writing and annotation.
- .DD Version 1.0 container structure with type="whiteboard" and project-specific data.
- Save, Save As, and reopen .DD files.
- Dashboard Storage file browser with folders.
- Create Shortcut for both files and folders.
- Save a Copy and Move actions for saved Whiteboard files.
- Local-device .DD export/open support.
- PDF and image import for writing directly on assignments and note packets.
- PDF import layouts for stacked pages, infinite-canvas placement, and selected pages.
- Export to PDF, PNG, JPEG, and SVG.
- Export scope choices for everything/all pages, visible area, or selected region.
- Uses the shared Dashboard login and project-access guard with project id "whiteboard".

ACCOUNT / STORAGE FOUNDATION
============================
Version 0.1.0 uses the authenticated Dashboard account and includes Dashboard Storage plus Local Device. The storage layer is intentionally adapter-friendly so additional connected account/storage providers can be wired in later without storing credentials in .DD files.

DASHBOARD INTEGRATION
=====================
Dashboard/projects.json adds:
- id: whiteboard
- name: Whiteboard
- folder: Whiteboard

The Dashboard itself remains Version 0.7.1 in this package. Dashboard/index.html is included unchanged as requested.
