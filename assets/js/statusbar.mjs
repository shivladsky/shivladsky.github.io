const TOOL_LABELS = {
  paint: 'Paint',
  fill: 'Fill',
};

const MODE_LABELS = {
  xray: 'X-Ray',
};

const PRESENTATION_LABELS = {
  '2d': '2D',
  '3d': '3D',
};

document.addEventListener('DOMContentLoaded', () => {
  const renderStatusText = document.getElementById('renderStatusText');
  const gridStatusText = document.getElementById('gridStatusText');
  const selectedToolText = document.getElementById('selectedToolText');
  const selectedModeStatus = document.getElementById('selectedModeStatus');
  const selectedModeText = document.getElementById('selectedModeText');

  const statusState = {
    presentationMode: '2d',
    grid: 'Visible',
    tool: 'paint',
    mode: null,
    isShiftHeld: false,
    isEraseModifierHeld: false,
  };

  const renderStatusBar = () => {
    if (renderStatusText) {
      renderStatusText.textContent =
        PRESENTATION_LABELS[statusState.presentationMode] || '2D';
    }

    if (gridStatusText) {
      gridStatusText.textContent = statusState.grid;
    }

    if (selectedToolText) {
      selectedToolText.textContent =
        statusState.tool === 'paint' && statusState.isEraseModifierHeld
          ? 'Erase'
          : statusState.tool === 'paint' && statusState.isShiftHeld
            ? 'Overpaint'
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

  document.addEventListener('presentationModeChanged', (event) => {
    const { mode } = event.detail;
    statusState.presentationMode = mode;
    renderStatusBar();
  });

  document.addEventListener('keyboardModifiersChanged', (event) => {
    const { isShiftHeld, isEraseModifierHeld } = event.detail;
    statusState.isShiftHeld = isShiftHeld;
    statusState.isEraseModifierHeld = isEraseModifierHeld;
    renderStatusBar();
  });

  renderStatusBar();
});
