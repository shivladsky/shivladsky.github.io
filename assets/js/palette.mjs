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

function parseASE(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  let offset = 0;

  const readUint16 = () => {
    const v = view.getUint16(offset, false);
    offset += 2;
    return v;
  };
  const readUint32 = () => {
    const v = view.getUint32(offset, false);
    offset += 4;
    return v;
  };

  const readString = (length) => {
    const str = [];
    for (let i = 0; i < length; i++) {
      str.push(String.fromCharCode(view.getUint16(offset, false)));
      offset += 2;
    }
    return str.join('').replace(/\0/g, '');
  };

  const signature = String.fromCharCode(
    view.getUint8(0),
    view.getUint8(1),
    view.getUint8(2),
    view.getUint8(3)
  );
  if (signature !== 'ASEF') throw new Error('Not an ASE file');

  offset = 4;
  offset += 4; // skip versionMajor + versionMinor
  const numBlocks = readUint32();

  const colors = [];

  for (let i = 0; i < numBlocks; i++) {
    const blockType = readUint16();
    const blockLength = readUint32();

    if (blockType === 0x0001) {
      // COLOR_ENTRY
      const nameLength = readUint16();
      offset += nameLength * 2; // skip color name

      const colorModel = String.fromCharCode(
        view.getUint8(offset++),
        view.getUint8(offset++),
        view.getUint8(offset++),
        view.getUint8(offset++)
      );

      if (colorModel === 'RGB ') {
        const r = view.getFloat32(offset, false);
        offset += 4;
        const g = view.getFloat32(offset, false);
        offset += 4;
        const b = view.getFloat32(offset, false);
        offset += 4;

        const hex = `#${[r, g, b]
          .map((v) =>
            Math.round(v * 255)
              .toString(16)
              .padStart(2, '0')
          )
          .join('')}`;

        colors.push(hex);
      }

      offset += 2; // skip color type
    } else {
      offset += blockLength; // skip unknown block
    }
  }

  return colors.slice(0, MAX_PALETTE_COLORS);
}

function parseHEX(text) {
  const lines = text
    .replace(/^\uFEFF/, '') // Remove BOM if present
    .trim()
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^[0-9a-fA-F]{6}$/.test(line)); // Keep only valid 6-digit hex codes

  if (lines.length === 0)
    throw new Error('No valid hex colors found in HEX file');

  return lines.slice(0, MAX_PALETTE_COLORS).map((hex) => `#${hex}`);
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
    const ext = file.name.toLowerCase().split('.').pop();

    reader.onload = () => {
      try {
        let hexColors;

        if (ext === 'pal') {
          hexColors = parseJASCPAL(reader.result);
        } else if (ext === 'txt') {
          hexColors = parsePaintNetTXT(reader.result);
        } else if (ext === 'gpl') {
          hexColors = parseGimpGPL(reader.result);
        } else if (ext === 'ase') {
          hexColors = parseASE(reader.result);
        } else if (ext === 'hex') {
          hexColors = parseHEX(reader.result);
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

    if (ext === 'ase') {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  });
}
