document.addEventListener('DOMContentLoaded', () => {
  const menuLabels = document.querySelectorAll('.menu-label');

  menuLabels.forEach((label) => {
    const dropdown = label.nextElementSibling;

    label.addEventListener('click', (event) => {
      event.preventDefault();

      // Close all other dropdowns
      document.querySelectorAll('.dropdown.show').forEach((openDropdown) => {
        if (openDropdown !== dropdown) {
          openDropdown.classList.remove('show');
        }
      });

      // Toggle the clicked one
      dropdown.classList.toggle('show');
    });
  });

  // Close dropdowns when clicking outside any menu item
  const closeAllDropdowns = () => {
    document.querySelectorAll('.dropdown.show').forEach((dropdown) => {
      dropdown.classList.remove('show');
    });
  };

  document.addEventListener('click', (event) => {
    const isInsideMenu = event.target.closest('.menu-item');
    if (!isInsideMenu) closeAllDropdowns();
  });

  // Close dropdowns when clicking any dropdown item
  document.addEventListener('click', (event) => {
    if (event.target.classList.contains('dropdown-item')) {
      closeAllDropdowns();
    }
  });

  // Also close on right-click outside
  document.addEventListener('contextmenu', (event) => {
    const isInsideMenu = event.target.closest('.menu-item');
    if (!isInsideMenu) closeAllDropdowns();
  });

  // And when the window/tab loses focus
  window.addEventListener('blur', () => {
    closeAllDropdowns();
  });

  // Disable right-click on menu bar and dropdowns
  const menuArea = document.getElementById('menuBar');
  menuArea.addEventListener('contextmenu', (e) => {
    e.preventDefault(); // Block right-click context menu only in menuBar
  });
});
