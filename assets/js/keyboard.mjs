const keyState = new Set();

document.addEventListener('DOMContentLoaded', () => {
  document.addEventListener('keydown', (e) => {
    keyState.add(e.key);

    const isCmdOrCtrl = e.metaKey || e.ctrlKey;
    const key = e.key.toLowerCase();
    const isShift = e.shiftKey;

    // --- TOGGLE MODES ---
    if (key === 'f') {
      window.VoxPaint.toggleFillMode();
      e.preventDefault();
      return;
    }

    if (!e.ctrlKey && !e.metaKey && !e.altKey && key === 'o') {
      window.VoxPaint.toggleOverpaintMode();
      e.preventDefault();
      return;
    }

    // --- LAYER CONTROLS ---
    if (isShift && key === 'q') {
      window.VoxPaint.jumpToBottomLayer();
      e.preventDefault();
    } else if (isShift && key === 'e') {
      window.VoxPaint.jumpToTopLayer();
      e.preventDefault();
    } else if (!isShift && key === 'q') {
      window.VoxPaint.decreaseVisibleLayers();
      e.preventDefault();
    } else if (!isShift && key === 'e') {
      window.VoxPaint.increaseVisibleLayers();
      e.preventDefault();
    }

    // --- XRAY & GRID ---
    else if (key === 'r') {
      window.VoxPaint.toggleXrayMode();
      e.preventDefault();
    } else if (key === 'tab') {
      window.VoxPaint.toggleGridVisibility();
      e.preventDefault();
    }

    // --- UNDO / REDO ---
    else if (
      (e.metaKey && e.shiftKey && key === 'z') || // Cmd+Shift+Z → Redo (Mac)
      (e.ctrlKey && key === 'y') // Ctrl+Y → Redo (Win)
    ) {
      window.VoxPaint.handleRedo();
      e.preventDefault();
    } else if (
      (e.metaKey && key === 'z') || // Cmd+Z → Undo (Mac)
      (e.ctrlKey && key === 'z') // Ctrl+Z → Undo (Win)
    ) {
      window.VoxPaint.handleUndo();
      e.preventDefault();
    }

    // --- FILE SHORTCUTS ---
    else if (isCmdOrCtrl && key === 'o') {
      e.preventDefault();
      window.VoxPaint.importModel();
    } else if (isCmdOrCtrl && key === 's') {
      e.preventDefault();
      window.VoxPaint.exportModel();
    }
  });

  document.addEventListener('keyup', (e) => {
    keyState.delete(e.key);
  });
});
