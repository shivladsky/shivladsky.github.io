/**
 * Parses JASC-PAL formatted text and returns an array of hex colors.
 */
function parseJASCPAL(text) {
  const lines = text
    .replace(/^\uFEFF/, '') // Remove BOM if present
    .trim()
    .split('\n')
    .map((line) => line.trim());

  if (lines[0] !== 'JASC-PAL' || lines[1] !== '0100') {
    throw new Error('Invalid JASC-PAL header');
  }

  const colorCount = parseInt(lines[2], 10);
  return lines.slice(3, 3 + colorCount).map((line) => {
    const [r, g, b] = line.split(/\s+/).map(Number);
    return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
  });
}

/**
 * Renders color swatches into the #colorPalettePanel and attaches click events
 * to update selectedColorRef when a swatch is clicked.
 */
function renderPaletteSwatches(hexColors, selectedColorRef) {
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
}

/**
 * Loads a JASC-PAL formatted palette and injects swatches into #colorPalettePanel.
 * When clicked, a swatch updates the global selectedColor.
 */
export async function loadDefault32(selectedColorRef) {
  try {
    const response = await fetch('./assets/data/dawnbringer-32.pal');
    const text = await response.text();
    const hexColors = parseJASCPAL(text);
    renderPaletteSwatches(hexColors, selectedColorRef);

    // Dispatch event when palette is successfully loaded
    document.dispatchEvent(
      new CustomEvent('paletteChanged', {
        detail: { palette: 'default32' },
      })
    );
  } catch (error) {
    console.error('Failed to load JASC-PAL palette:', error);
  }
}

export async function loadDefault16(selectedColorRef) {
  try {
    const response = await fetch('./assets/data/dawnbringer-16.pal');
    const text = await response.text();
    const hexColors = parseJASCPAL(text);
    renderPaletteSwatches(hexColors, selectedColorRef);

    document.dispatchEvent(
      new CustomEvent('paletteChanged', {
        detail: { palette: 'default16' },
      })
    );
  } catch (error) {
    console.error('Failed to load JASC-PAL palette:', error);
  }
}

export function loadPaletteFromFile(file, selectedColorRef) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result;
        const hexColors = parseJASCPAL(text);
        renderPaletteSwatches(hexColors, selectedColorRef);

        document.dispatchEvent(
          new CustomEvent('paletteChanged', {
            detail: { palette: 'custom' },
          })
        );

        resolve();
      } catch (err) {
        console.error('Invalid .pal file:', err);
        reject(err);
      }
    };

    reader.onerror = () => {
      console.error('Failed to read file:', reader.error);
      reject(reader.error);
    };

    reader.readAsText(file);
  });
}
