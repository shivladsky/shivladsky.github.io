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
});
