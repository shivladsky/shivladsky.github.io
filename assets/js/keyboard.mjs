import { flashMenuLabel } from './menubar.mjs';

const keyState = new Set();

document.addEventListener('DOMContentLoaded', () => {
  document.addEventListener('keydown', (e) => {
    keyState.add(e.key);

    const isCmdOrCtrl = e.metaKey || e.ctrlKey;
    const key = e.key.toLowerCase();
    const isShift = e.shiftKey;

    // --- TOGGLE MODES ---
    if (!e.ctrlKey && !e.metaKey && !e.altKey && key === 'p') {
      if (!window.VoxPaint.isPaintMode()) {
        window.VoxPaint.setToolMode('paint');
      }
      flashMenuLabel('toolsMenu');
    }

    if (!e.ctrlKey && !e.metaKey && !e.altKey && key === 'o') {
      window.VoxPaint.toggleOverpaintMode();
      flashMenuLabel('toolsMenu');
      e.preventDefault();
      return;
    }

    if (key === 'f') {
      window.VoxPaint.toggleFillMode();
      flashMenuLabel('toolsMenu');
      e.preventDefault();
      return;
    }

    // --- LAYER CONTROLS ---
    if (isShift && key === 'q') {
      window.VoxPaint.jumpToBottomLayer();
      flashMenuLabel('viewMenu');
      e.preventDefault();
    } else if (isShift && key === 'e') {
      window.VoxPaint.jumpToTopLayer();
      flashMenuLabel('viewMenu');
      e.preventDefault();
    } else if (!isShift && key === 'q') {
      window.VoxPaint.decreaseVisibleLayers();
      flashMenuLabel('viewMenu');
      e.preventDefault();
    } else if (!isShift && key === 'e') {
      window.VoxPaint.increaseVisibleLayers();
      flashMenuLabel('viewMenu');
      e.preventDefault();
    }

    // --- XRAY & GRID ---
    else if (key === 'r') {
      window.VoxPaint.toggleXrayMode();
      flashMenuLabel('viewMenu');
      e.preventDefault();
    } else if (key === 'tab') {
      window.VoxPaint.toggleGridVisibility();
      flashMenuLabel('viewMenu');
      e.preventDefault();
    }

    // --- UNDO / REDO ---
    else if (
      (e.metaKey && e.shiftKey && key === 'z') || // Cmd+Shift+Z → Redo (Mac)
      (e.ctrlKey && key === 'y') // Ctrl+Y → Redo (Win)
    ) {
      window.VoxPaint.handleRedo();
      flashMenuLabel('editMenu');
      e.preventDefault();
    } else if (
      (e.metaKey && key === 'z') || // Cmd+Z → Undo (Mac)
      (e.ctrlKey && key === 'z') // Ctrl+Z → Undo (Win)
    ) {
      window.VoxPaint.handleUndo();
      flashMenuLabel('editMenu');
      e.preventDefault();
    }

    // --- FILE SHORTCUTS ---
    else if (isCmdOrCtrl && key === 'o') {
      e.preventDefault();
      window.VoxPaint.importModel();
      flashMenuLabel('fileMenu');
    } else if (isCmdOrCtrl && key === 's') {
      e.preventDefault();
      window.VoxPaint.exportModel();
      flashMenuLabel('fileMenu');
    }
  });

  document.addEventListener('keyup', (e) => {
    keyState.delete(e.key);
  });
});
