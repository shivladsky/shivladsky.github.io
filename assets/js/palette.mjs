export const MAX_PALETTE_COLORS = 128;

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

  const colorCount = Math.min(parseInt(lines[2], 10), MAX_PALETTE_COLORS);
  return lines.slice(3, 3 + colorCount).map((line) => {
    const [r, g, b] = line.split(/\s+/).map(Number);
    return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
  });
}

/**
 * Parses Paint.NET TXT palette format and returns an array of hex colors.
 */
function parsePaintNetTXT(text) {
  const lines = text
    .replace(/^\uFEFF/, '') // Remove BOM if present
    .trim()
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith(';')); // Ignore empty and comment lines

  lines.forEach((line, index) => {
    if (line.length !== 8 || !/^FF/i.test(line)) {
      throw new Error(
        `Invalid color format at line ${
          index + 1
        }: "${line}" (expected 8 hex digits starting with 'FF')`
      );
    }
  });

  return lines.slice(0, MAX_PALETTE_COLORS).map((line) => `#${line.slice(2)}`); // Skip 'FF' alpha
}

/**
 * Parses GIMP GPL palette format and returns an array of hex colors.
 */
function parseGimpGPL(text) {
  const lines = text
    .replace(/^\uFEFF/, '') // Remove BOM if present
    .trim()
    .split('\n')
    .map((line) => line.trim())
    .filter(
      (line) => line && !line.startsWith('#') && !/^GIMP Palette/i.test(line)
    );

  const hexColors = [];
  for (const line of lines) {
    const parts = line.split(/\s+/);
    if (parts.length >= 3) {
      const [r, g, b] = parts.slice(0, 3).map(Number);
      if ([r, g, b].every((v) => !isNaN(v))) {
        hexColors.push(
          `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`
        );
        if (hexColors.length >= MAX_PALETTE_COLORS) break;
      }
    }
  }
  return hexColors;
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
 * Loads a supported format palette and injects swatches into #colorPalettePanel.
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
        let hexColors;

        if (file.name.toLowerCase().endsWith('.pal')) {
          hexColors = parseJASCPAL(text);
        } else if (file.name.toLowerCase().endsWith('.txt')) {
          hexColors = parsePaintNetTXT(text);
        } else if (file.name.toLowerCase().endsWith('.gpl')) {
          hexColors = parseGimpGPL(text);
        } else {
          throw new Error('Unsupported palette format');
        }

        renderPaletteSwatches(hexColors, selectedColorRef);

        document.dispatchEvent(
          new CustomEvent('paletteChanged', {
            detail: { palette: 'custom' },
          })
        );

        resolve();
      } catch (err) {
        console.error('Invalid palette file:', err);
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
