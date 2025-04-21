/**
 * Loads a JASC-PAL formatted palette and injects swatches into #colorPalettePanel.
 * When clicked, a swatch updates the global selectedColor.
 */
export async function loadDefaultPalette(selectedColorRef) {
  try {
    const response = await fetch('./assets/data/dawnbringer-32.pal');
    const text = await response.text();

    // Clean BOM and line endings
    const lines = text
      .replace(/^\uFEFF/, '')
      .trim()
      .split('\n')
      .map((line) => line.trim());

    if (lines[0] !== 'JASC-PAL' || lines[1] !== '0100') {
      throw new Error('Invalid JASC-PAL header');
    }

    const colorCount = parseInt(lines[2], 10);
    const hexColors = lines.slice(3, 3 + colorCount).map((line) => {
      const [r, g, b] = line.split(/\s+/).map(Number);
      return `#${[r, g, b]
        .map((v) => v.toString(16).padStart(2, '0'))
        .join('')}`;
    });

    // Clear and populate the palette panel
    const panel = document.getElementById('colorPalettePanel');
    panel.innerHTML = '';

    hexColors.forEach((colorHex) => {
      const square = document.createElement('div');
      square.classList.add('colorSwatch');
      square.style.backgroundColor = colorHex;

      square.addEventListener('click', () => {
        selectedColorRef.value = colorHex;

        document
          .querySelectorAll('#colorPalettePanel .colorSwatch')
          .forEach((sq) => sq.classList.remove('active'));

        square.classList.add('active');
      });

      panel.appendChild(square);
    });
  } catch (error) {
    console.error('Failed to load JASC-PAL palette:', error);
  }
}
