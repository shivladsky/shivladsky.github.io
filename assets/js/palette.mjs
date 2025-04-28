// List of built-in palettes
export const BuiltInPalettes = {
  ammo8: {
    name: 'Ammo-8',
    path: './assets/data/ammo-8.pal',
  },
  slso8: {
    name: 'SLSO8',
    path: './assets/data/slso8.pal',
  },
  pico8: {
    name: 'PICO-8',
    path: './assets/data/pico-8.pal',
  },
  lostcentury: {
    name: 'Lost Century',
    path: './assets/data/lost-century.pal',
  },
  dawnbringer32: {
    name: 'DawnBringer 32',
    path: './assets/data/dawnbringer-32.pal',
  },
  lospec500: {
    name: 'Lospec500',
    path: './assets/data/lospec500.pal',
  },
  apollo: {
    name: 'Apollo',
    path: './assets/data/apollo.pal',
  },
  endesga64: {
    name: 'Endesga 64',
    path: './assets/data/endesga-64.pal',
  },
  resurrect64: {
    name: 'Resurrect 64',
    path: './assets/data/resurrect-64.pal',
  },
};

/**
 * Parses JASC-PAL formatted text and returns an array of hex colors.
 * Loads a maximum of 128 colors.
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

  const colorCount = Math.min(parseInt(lines[2], 10), 128);
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
export async function loadBuiltInPalette(paletteKey, selectedColorRef) {
  const paletteInfo = BuiltInPalettes[paletteKey];
  if (!paletteInfo) throw new Error(`Unknown built-in palette: ${paletteKey}`);

  const response = await fetch(paletteInfo.path);
  if (!response.ok)
    throw new Error(`Failed to load palette from ${paletteInfo.path}`);

  const text = await response.text();
  const hexColors = parseJASCPAL(text);

  renderPaletteSwatches(hexColors, selectedColorRef);

  document.dispatchEvent(
    new CustomEvent('paletteChanged', {
      detail: { palette: paletteKey },
    })
  );

  return hexColors;
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
