import { BuiltInPalettes } from './palette.mjs';

export function flashMenuLabel(menuId) {
  requestAnimationFrame(() => {
    const label = document.querySelector(`#${menuId}`);
    if (!label) return;

    label.classList.add('hover');
    setTimeout(() => {
      label.classList.remove('hover');
    }, 100);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const menuLabels = document.querySelectorAll('.menu-label');
  let menuActive = false;

  const closeAllDropdowns = () => {
    document.querySelectorAll('.dropdown.show').forEach((dropdown) => {
      dropdown.classList.remove('show');
    });
    menuActive = false;
  };

  menuLabels.forEach((label) => {
    const dropdown = label.nextElementSibling;

    // Ensure dropdown is wide enough for its longest item
    if (dropdown && dropdown.classList.contains('dropdown')) {
      // Check if any items are .checked
      const hasChecks = !!dropdown.querySelector('.dropdown-item.checked');
      dropdown.classList.toggle('with-checks', hasChecks);

      // Temporarily reveal dropdown for measurement
      const originalDisplay = dropdown.style.display;
      const originalVisibility = dropdown.style.visibility;
      const originalPosition = dropdown.style.position;
      const originalLeft = dropdown.style.left;

      dropdown.style.visibility = 'hidden';
      dropdown.style.display = 'block';
      dropdown.style.position = 'absolute';
      dropdown.style.left = '-9999px';

      let maxWidth = 0;
      dropdown.querySelectorAll('.dropdown-item').forEach((item) => {
        maxWidth = Math.max(maxWidth, item.offsetWidth);
      });

      // Reset to original styles
      dropdown.style.display = originalDisplay;
      dropdown.style.visibility = originalVisibility;
      dropdown.style.position = originalPosition;
      dropdown.style.left = originalLeft;

      // Apply computed width
      dropdown.style.minWidth = `${maxWidth + 32}px`;
    }

    // Click to open/close and activate menu bar mode
    label.addEventListener('click', (event) => {
      event.preventDefault();
      const isOpen = dropdown.classList.contains('show');
      closeAllDropdowns();

      if (!isOpen) {
        dropdown.classList.add('show');
        menuActive = true;
      }
    });

    // Hover over other menu labels if menu is active
    label.addEventListener('mouseenter', () => {
      if (menuActive) {
        closeAllDropdowns();
        dropdown.classList.add('show');
        menuActive = true;
      }
    });
  });

  // Close dropdowns when clicking outside OR selecting a dropdown item
  document.addEventListener('click', (event) => {
    const isInsideMenu = event.target.closest('.menu-item');
    const isDropdownItem = event.target.classList.contains('dropdown-item');
    if (!isInsideMenu || isDropdownItem) {
      closeAllDropdowns();
    }
  });

  // Right-click outside the menu closes it
  document.addEventListener('contextmenu', (event) => {
    const isInsideMenu = event.target.closest('.menu-item');
    if (!isInsideMenu) closeAllDropdowns();
  });

  // Window blur closes dropdowns
  window.addEventListener('blur', () => {
    closeAllDropdowns();
  });

  // Prevent default right-click on the menu bar itself
  const menuArea = document.getElementById('menuBar');
  if (menuArea) {
    menuArea.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
  }

  // Handle UndoManager state updates
  document.addEventListener('undoRedoChanged', (event) => {
    const { canUndo, canRedo } = event.detail;
    const undoMenuItem = document.getElementById('undoAction');
    const redoMenuItem = document.getElementById('redoAction');

    if (undoMenuItem) {
      undoMenuItem.classList.toggle('disabled', !canUndo);
    }
    if (redoMenuItem) {
      redoMenuItem.classList.toggle('disabled', !canRedo);
    }
  });

  // Handle layer state updates
  document.addEventListener('visibleLayerChanged', (event) => {
    const { canGoDown, canGoUp } = event.detail;

    document
      .getElementById('upOneLayer')
      .classList.toggle('disabled', !canGoUp);
    document.getElementById('jumpToTop').classList.toggle('disabled', !canGoUp);

    document
      .getElementById('downOneLayer')
      .classList.toggle('disabled', !canGoDown);
    document
      .getElementById('jumpToBottom')
      .classList.toggle('disabled', !canGoDown);
  });

  // Handle mode changes (xray, grid, overpaint, fill)
  document.addEventListener('modeChanged', (event) => {
    const { mode, value } = event.detail;

    const modeToElementId = {
      xray: 'toggleXray',
      grid: 'toggleGrid',
      paint: 'togglePaint',
      overpaint: 'toggleOverpaint',
      fill: 'toggleFill',
    };

    const elementId = modeToElementId[mode];
    if (!elementId) return;

    const menuItem = document.getElementById(elementId);
    if (!menuItem) return;

    menuItem.classList.toggle('checked', value);

    const dropdown = menuItem.closest('.dropdown');
    if (!dropdown) return;

    const anyChecked = dropdown.querySelector('.dropdown-item.checked');
    dropdown.classList.toggle('with-checks', !!anyChecked);

    // Recalculate dropdown minWidth if checkmark state has changed
    const dropdownItems = Array.from(
      dropdown.querySelectorAll('.dropdown-item')
    );
    // Reset dropdown width first to avoid cumulative growth
    dropdown.style.minWidth = 'auto';

    let maxWidth = 0;
    dropdownItems.forEach((item) => {
      item.style.minWidth = 'auto'; // Also reset individual items just in case
      maxWidth = Math.max(maxWidth, item.offsetWidth);
    });

    dropdown.style.minWidth = `${maxWidth}px`;
  });

  // Dynamically build the Palette menu dropdown
  const paletteDropdown = document.querySelector('#paletteMenu + .dropdown');
  if (paletteDropdown) {
    // Clear current palette items except "Load From File..." and "Get More..."
    const reservedItems = ['importPalette', 'getMorePalettes'];
    const reservedElements = reservedItems.map((id) =>
      document.getElementById(id)
    );

    paletteDropdown.innerHTML = ''; // Clear
    Object.entries(BuiltInPalettes).forEach(([key, { name }]) => {
      const a = document.createElement('a');
      a.href = '#';
      a.className = 'dropdown-item';
      a.id = `palette-${key}`; // id like palette-dawnbringer32
      a.dataset.palette = key;
      a.textContent = name;
      paletteDropdown.appendChild(a);
    });

    // Add back reserved items
    reservedElements.forEach((el) => {
      if (el) {
        paletteDropdown.appendChild(el);
      }
    });

    // Attach click handlers for all built-in palettes
    paletteDropdown.querySelectorAll('[data-palette]').forEach((menuItem) => {
      menuItem.addEventListener('click', (e) => {
        e.preventDefault();
        const paletteKey = menuItem.dataset.palette;
        import('./palette.mjs').then((Palette) => {
          Palette.loadBuiltInPalette(paletteKey, window.selectedColorRef).catch(
            (err) => {
              alert('Failed to load palette: ' + err.message);
            }
          );
        });
      });
    });
  }

  // Handle palette changes
  document.addEventListener('paletteChanged', (event) => {
    const { palette } = event.detail;

    // Clear previous checks
    document
      .querySelectorAll('#paletteMenu + .dropdown .dropdown-item')
      .forEach((item) => {
        item.classList.remove('checked');
      });

    // Determine the correct menu item ID
    let elementId;
    if (palette === 'custom') {
      elementId = 'importPalette';
    } else {
      elementId = `palette-${palette}`; // built-in palettes use id like palette-dawnbringer32
    }

    const menuItem = document.getElementById(elementId);
    if (menuItem) menuItem.classList.add('checked');

    // Update dropdown width (optional polish)
    const dropdown = menuItem ? menuItem.closest('.dropdown') : null;
    if (dropdown) {
      const anyChecked = dropdown.querySelector('.dropdown-item.checked');
      dropdown.classList.toggle('with-checks', !!anyChecked);

      dropdown.style.minWidth = 'auto';
      let maxWidth = 0;
      dropdown.querySelectorAll('.dropdown-item').forEach((item) => {
        item.style.minWidth = 'auto';
        maxWidth = Math.max(maxWidth, item.offsetWidth);
      });
      dropdown.style.minWidth = `${maxWidth}px`;
    }
  });

  document
    .getElementById('paletteFileInput')
    .addEventListener('change', (event) => {
      const file = event.target.files[0];
      if (!file) return;

      import('./palette.mjs').then((Palette) => {
        Palette.loadPaletteFromFile(file, window.selectedColorRef).catch(
          (err) => {
            alert('Failed to load palette: ' + err.message);
          }
        );
      });
    });

  // --- FILE MENU DROPDOWN ITEM CLICKS ---
  document.getElementById('newFile').addEventListener('click', (e) => {
    e.preventDefault();
    window.VoxPaint.resetModel();
  });

  document.getElementById('openFile').addEventListener('click', (e) => {
    e.preventDefault();
    window.VoxPaint.importModel();
  });

  document.getElementById('saveFile').addEventListener('click', (e) => {
    e.preventDefault();
    window.VoxPaint.exportModel();
  });

  // --- EDIT MENU DROPDOWN ITEM CLICKS ---
  document.getElementById('undoAction').addEventListener('click', (e) => {
    e.preventDefault();
    window.VoxPaint.handleUndo();
  });
  document.getElementById('redoAction').addEventListener('click', (e) => {
    e.preventDefault();
    window.VoxPaint.handleRedo();
  });

  // --- VIEW MENU DROPDOWN ITEM CLICKS ---
  document.getElementById('upOneLayer').addEventListener('click', (e) => {
    e.preventDefault();
    window.VoxPaint.increaseVisibleLayers();
  });

  document.getElementById('downOneLayer').addEventListener('click', (e) => {
    e.preventDefault();
    window.VoxPaint.decreaseVisibleLayers();
  });

  document.getElementById('jumpToTop').addEventListener('click', (e) => {
    e.preventDefault();
    window.VoxPaint.jumpToTopLayer();
  });

  document.getElementById('jumpToBottom').addEventListener('click', (e) => {
    e.preventDefault();
    window.VoxPaint.jumpToBottomLayer();
  });

  document.getElementById('toggleXray').addEventListener('click', (e) => {
    e.preventDefault();
    window.VoxPaint.toggleXrayMode();
  });

  document.getElementById('toggleGrid').addEventListener('click', (e) => {
    e.preventDefault();
    window.VoxPaint.toggleGridVisibility();
  });

  // --- PALETTE MENU DROPDOWN ITEM CLICKS ---
  document.getElementById('importPalette').addEventListener('click', (e) => {
    e.preventDefault();
    const fileInput = document.getElementById('paletteFileInput');
    if (fileInput) {
      fileInput.value = ''; // Reset in case the same file is chosen again
      fileInput.click();
    }
  });

  // --- TOOLS MENU DROPDOWN ITEM CLICKS ---
  document.getElementById('togglePaint').addEventListener('click', (e) => {
    e.preventDefault();
    window.VoxPaint.setToolMode('paint');
  });

  document.getElementById('toggleOverpaint').addEventListener('click', (e) => {
    e.preventDefault();
    window.VoxPaint.toggleOverpaintMode();
  });

  document.getElementById('toggleFill').addEventListener('click', (e) => {
    e.preventDefault();
    window.VoxPaint.toggleFillMode();
  });
});
