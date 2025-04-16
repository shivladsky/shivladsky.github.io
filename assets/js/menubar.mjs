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

  // --- FILE MENU DROPDOWN ITEM CLICKS ---
  document.getElementById('newFile').addEventListener('click', (e) => {
    e.preventDefault();
    window.Volumetrik.resetModel();
  });

  document.getElementById('openFile').addEventListener('click', (e) => {
    e.preventDefault();
    window.Volumetrik.importModel();
  });

  document.getElementById('saveFile').addEventListener('click', (e) => {
    e.preventDefault();
    window.Volumetrik.exportModel();
  });

  // --- EDIT MENU DROPDOWN ITEM CLICKS ---
  document.getElementById('undoAction').addEventListener('click', (e) => {
    e.preventDefault();
    window.Volumetrik.handleUndo();
  });
  document.getElementById('redoAction').addEventListener('click', (e) => {
    e.preventDefault();
    window.Volumetrik.handleRedo();
  });

  // --- VIEW MENU DROPDOWN ITEM CLICKS ---
  document.getElementById('upOneLayer').addEventListener('click', (e) => {
    e.preventDefault();
    window.Volumetrik.increaseVisibleLayers();
  });

  document.getElementById('downOneLayer').addEventListener('click', (e) => {
    e.preventDefault();
    window.Volumetrik.decreaseVisibleLayers();
  });

  document.getElementById('jumpToTop').addEventListener('click', (e) => {
    e.preventDefault();
    window.Volumetrik.jumpToTopLayer();
  });

  document.getElementById('jumpToBottom').addEventListener('click', (e) => {
    e.preventDefault();
    window.Volumetrik.jumpToBottomLayer();
  });

  document.getElementById('toggleXray').addEventListener('click', (e) => {
    e.preventDefault();
    window.Volumetrik.toggleXrayMode();
  });

  document.getElementById('toggleGrid').addEventListener('click', (e) => {
    e.preventDefault();
    window.Volumetrik.toggleGridVisibility();
  });

  // --- TOOLS MENU DROPDOWN ITEM CLICKS ---
  document.getElementById('toggleOverpaint').addEventListener('click', (e) => {
    e.preventDefault();
    window.Volumetrik.toggleOverpaintMode();
  });

  document.getElementById('toggleFill').addEventListener('click', (e) => {
    e.preventDefault();
    window.Volumetrik.toggleFillMode();
  });
});
