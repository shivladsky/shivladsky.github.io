const TOOL_LABELS = {
  paint: 'Paint',
  overpaint: 'Overpaint',
  fill: 'Fill',
};

const MODE_LABELS = {
  xray: 'X-Ray',
};

document.addEventListener('DOMContentLoaded', () => {
  const gridStatusText = document.getElementById('gridStatusText');
  const selectedToolText = document.getElementById('selectedToolText');
  const selectedModeStatus = document.getElementById('selectedModeStatus');
  const selectedModeText = document.getElementById('selectedModeText');

  const statusState = {
    grid: 'Visible',
    tool: 'paint',
    mode: null,
    isShiftHeld: false,
    isEraseModifierHeld: false,
  };

  const renderStatusBar = () => {
    if (gridStatusText) {
      gridStatusText.textContent = statusState.grid;
    }

    if (selectedToolText) {
      selectedToolText.textContent =
        (statusState.tool === 'paint' || statusState.tool === 'overpaint') &&
        statusState.isEraseModifierHeld
          ? 'Erase'
          : statusState.tool === 'fill' && statusState.isShiftHeld
            ? 'Megafill'
            : TOOL_LABELS[statusState.tool] || 'Paint';
    }

    if (!selectedModeStatus || !selectedModeText) return;

    if (statusState.mode) {
      selectedModeText.textContent = statusState.mode;
      selectedModeStatus.hidden = false;
      return;
    }

    selectedModeText.textContent = '';
    selectedModeStatus.hidden = true;
  };

  document.addEventListener('modeChanged', (event) => {
    const { mode, value } = event.detail;

    if (value && TOOL_LABELS[mode]) {
      statusState.tool = mode;
    }

    if (mode === 'grid') {
      statusState.grid = value ? 'Visible' : 'Hidden';
    }

    if (mode in MODE_LABELS) {
      statusState.mode = value ? MODE_LABELS[mode] : null;
    }

    renderStatusBar();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Shift' && !statusState.isShiftHeld) {
      statusState.isShiftHeld = true;
      renderStatusBar();
      return;
    }

    if (
      (event.key === 'Meta' || event.key === 'Control') &&
      !statusState.isEraseModifierHeld
    ) {
      statusState.isEraseModifierHeld = true;
      renderStatusBar();
    }
  });

  document.addEventListener('keyup', (event) => {
    if (event.key === 'Shift' && statusState.isShiftHeld) {
      statusState.isShiftHeld = false;
      renderStatusBar();
      return;
    }

    if (
      (event.key === 'Meta' || event.key === 'Control') &&
      statusState.isEraseModifierHeld
    ) {
      statusState.isEraseModifierHeld = false;
      renderStatusBar();
    }
  });

  window.addEventListener('blur', () => {
    if (!statusState.isShiftHeld && !statusState.isEraseModifierHeld) return;
    statusState.isShiftHeld = false;
    statusState.isEraseModifierHeld = false;
    renderStatusBar();
  });

  renderStatusBar();
});
