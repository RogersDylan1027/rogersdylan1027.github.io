Whiteboard · Version 0.1.1
Local .DD File Handling Fix · 2026-09-09

CHANGELOG
=========
Version 0.1.1: Local .DD File Handling Fix

Description:
Fixes local Whiteboard file handling so device downloads keep the custom .DD
extension exactly instead of being saved as .dd.json, and makes locally saved .DD
files easy to reopen from Whiteboard with the Open .DD File picker.

BUG FIXES
=========
- Local device saves now download with the exact .DD extension.
- Uses a generic binary MIME type for .DD downloads so browsers such as Safari
  do not reinterpret the file as JSON and append .json.
- Save As normalizes names ending in .dd.json back to .DD.
- The Files panel now labels the action Open .DD File.
- The local file picker is restricted to .DD-compatible file selection.
- Opening a local .DD file restores the Whiteboard data without pretending it
  is still linked to a Dashboard Storage record.

Version 0.1.0: First Whiteboard Build

Introduced the first Dashboard Dylan Whiteboard project with infinite-canvas
and page modes, .DD files, local/Dashboard Storage saving, importing, exporting,
folders, shortcuts, and shared Dashboard authentication.
