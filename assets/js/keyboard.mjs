import { flashMenuLabel } from './menubar.mjs';

const modifierState = {
  isShiftHeld: false,
  isEraseModifierHeld: false,
};

function dispatchModifierState() {
  document.dispatchEvent(
    new CustomEvent('keyboardModifiersChanged', {
      detail: { ...modifierState },
    })
  );
}

function updateModifierState(event) {
  const isKeyDown = event.type === 'keydown';
  const isShiftEvent = event.key === 'Shift';
  const isEraseModifierEvent = event.key === 'Meta' || event.key === 'Control';

  const nextShiftHeld = isShiftEvent ? isKeyDown : event.shiftKey;
  const nextEraseModifierHeld = isEraseModifierEvent
    ? isKeyDown
    : event.metaKey || event.ctrlKey;

  if (
    modifierState.isShiftHeld === nextShiftHeld &&
    modifierState.isEraseModifierHeld === nextEraseModifierHeld
  ) {
    return;
  }

  modifierState.isShiftHeld = nextShiftHeld;
  modifierState.isEraseModifierHeld = nextEraseModifierHeld;
  dispatchModifierState();
}

document.addEventListener('DOMContentLoaded', () => {
  document.addEventListener('keydown', (e) => {
    updateModifierState(e);

    const isCmdOrCtrl = e.metaKey || e.ctrlKey;
    const key = e.key.toLowerCase();
    const isShift = e.shiftKey;

    // --- TOGGLE MODES ---
    if (!e.ctrlKey && !e.metaKey && !e.altKey && key === 'p') {
      if (!window.VoxPaint.isPaintMode()) {
        window.VoxPaint.setToolMode('paint');
      }
      e.preventDefault();
      flashMenuLabel('toolsMenu');
      return;
    }

    if (!e.ctrlKey && !e.metaKey && !e.altKey && key === 'f') {
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
    else if (!e.ctrlKey && !e.metaKey && !e.altKey && key === 'x') {
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
    updateModifierState(e);
  });

  window.addEventListener('blur', () => {
    if (!modifierState.isShiftHeld && !modifierState.isEraseModifierHeld) return;

    modifierState.isShiftHeld = false;
    modifierState.isEraseModifierHeld = false;
    dispatchModifierState();
  });

  dispatchModifierState();
});
