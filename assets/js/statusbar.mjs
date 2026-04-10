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
    tool: 'Paint',
    mode: null,
  };

  const renderStatusBar = () => {
    if (gridStatusText) {
      gridStatusText.textContent = statusState.grid;
    }

    if (selectedToolText) {
      selectedToolText.textContent = statusState.tool;
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
      statusState.tool = TOOL_LABELS[mode];
    }

    if (mode === 'grid') {
      statusState.grid = value ? 'Visible' : 'Hidden';
    }

    if (mode in MODE_LABELS) {
      statusState.mode = value ? MODE_LABELS[mode] : null;
    }

    renderStatusBar();
  });

  renderStatusBar();
});
