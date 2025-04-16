const keyState = new Set();

document.addEventListener('DOMContentLoaded', () => {
  document.addEventListener('keydown', (e) => {
    keyState.add(e.key);

    const isCmdOrCtrl = e.metaKey || e.ctrlKey;
    const key = e.key.toLowerCase();
    const isShift = e.shiftKey;

    // --- TOGGLE MODES ---
    if (key === 'f') {
      window.Volumetrik.toggleFillMode();
      e.preventDefault();
      return;
    }

    if (!e.ctrlKey && !e.metaKey && !e.altKey && key === 'o') {
      window.Volumetrik.toggleOverpaintMode();
      e.preventDefault();
      return;
    }

    // --- LAYER CONTROLS ---
    if (isShift && key === 'q') {
      window.Volumetrik.jumpToBottomLayer();
      e.preventDefault();
    } else if (isShift && key === 'e') {
      window.Volumetrik.jumpToTopLayer();
      e.preventDefault();
    } else if (!isShift && key === 'q') {
      window.Volumetrik.decreaseVisibleLayers();
      e.preventDefault();
    } else if (!isShift && key === 'e') {
      window.Volumetrik.increaseVisibleLayers();
      e.preventDefault();
    }

    // --- XRAY & GRID ---
    else if (key === 'r') {
      window.Volumetrik.toggleXrayMode();
      e.preventDefault();
    } else if (key === 'tab') {
      window.Volumetrik.toggleGridVisibility();
      e.preventDefault();
    }

    // --- UNDO / REDO ---
    else if (
      (e.metaKey && e.shiftKey && key === 'z') || // Cmd+Shift+Z → Redo (Mac)
      (e.ctrlKey && key === 'y') // Ctrl+Y → Redo (Win)
    ) {
      window.Volumetrik.handleRedo();
      e.preventDefault();
    } else if (
      (e.metaKey && key === 'z') || // Cmd+Z → Undo (Mac)
      (e.ctrlKey && key === 'z') // Ctrl+Z → Undo (Win)
    ) {
      window.Volumetrik.handleUndo();
      e.preventDefault();
    }

    // --- FILE SHORTCUTS ---
    else if (isCmdOrCtrl && key === 'o') {
      e.preventDefault();
      window.Volumetrik.importModel();
    } else if (isCmdOrCtrl && key === 's') {
      e.preventDefault();
      window.Volumetrik.exportModel();
    }
  });

  document.addEventListener('keyup', (e) => {
    keyState.delete(e.key);
  });
});
