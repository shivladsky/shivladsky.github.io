import * as THREE from 'https://unpkg.com/three@0.150.1/build/three.module.js';
import { UndoManager } from './undo.mjs';

// Color palette
const COLORS = {
  base: '#505050',
  active: '#6ABE30',
  hover: '#EDEDED',
};

let selectedColor = COLORS.active; // Default to green

// VOLUMETRIK-01 Starter - 16x16x16cm cube with 10mm points
const canvas = document.getElementById('viewportCanvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);

canvas.addEventListener('contextmenu', (e) => e.preventDefault());

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0.2, 0.2, 0.2);
camera.lookAt(0, 0, 0);

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Dot params
const resolution = 10; // mm
const size = 160; // mm (16 cm)
const pointsPerAxis = size / resolution; // 160 / 10 = 16

const voxelSize = resolution / 1000; // convert mm to meters for Three.js
const baseMaterial = new THREE.SpriteMaterial({ color: COLORS.base });
const activeMaterial = new THREE.SpriteMaterial({ color: COLORS.active });
const hoverMaterial = new THREE.SpriteMaterial({ color: COLORS.hover });

// Sparse Voxel Octree Stub (simplified)
const voxelData = new Map(); // key = "x,y,z", value = 1

// Group to rotate
const voxelGroup = new THREE.Group();
scene.add(voxelGroup);

// Start with only bottom layer visible
let visibleLayerCount = 1;
let xrayMode = false;

// Create all dots
const dots = [];
for (let x = 0; x < pointsPerAxis; x++) {
  for (let y = 0; y < pointsPerAxis; y++) {
    for (let z = 0; z < pointsPerAxis; z++) {
      const mesh = new THREE.Sprite(baseMaterial.clone());
      mesh.scale.set(voxelSize * 0.5, voxelSize * 0.5, 1);
      mesh.position.set(
        (x - pointsPerAxis / 2 + 0.5) * voxelSize,
        (y - pointsPerAxis / 2 + 0.5) * voxelSize,
        (z - pointsPerAxis / 2 + 0.5) * voxelSize
      );
      mesh.userData = { coord: `${x},${y},${z}` };
      voxelGroup.add(mesh);
      dots.push(mesh);
    }
  }
}

let showEmptyVoxels = true;
const undoManager = new UndoManager(
  voxelData,
  dots,
  updateVoxelVisibility,
  COLORS,
  voxelSize,
  baseMaterial
);

updateLayerVisibility();

let hovered = null;
let isLeftMouseDown = false;

// Mouse drag rotate logic
let dragButton = null;
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };

function onMouseDown(e) {
  if (e.button === 2) {
    // Right-click only for rotation
    isDragging = true;
    dragButton = 2;
    previousMousePosition = { x: e.clientX, y: e.clientY };
  } else if (e.button === 0) {
    isLeftMouseDown = true;
    undoManager.beginStroke(e.ctrlKey || e.metaKey ? 'erase' : 'paint');
    tryPaintVoxel(e);
  }
}

function onMouseMove(e) {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

  if (isLeftMouseDown) {
    tryPaintVoxel(e);
  }

  if (!isDragging) return;

  const deltaX = e.clientX - previousMousePosition.x;
  const rotationSpeed = 0.005;
  voxelGroup.rotation.y += deltaX * rotationSpeed; // Only rotate around Y axis

  previousMousePosition = { x: e.clientX, y: e.clientY };
}

function onMouseUp() {
  undoManager.endStroke();
  isDragging = false;
  isLeftMouseDown = false;
}

function tryPaintVoxel(e) {
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster
    .intersectObjects(dots, false)
    .filter((obj) => obj.object.visible);

  if (intersects.length === 0) return false;

  const obj = intersects[0].object;
  const coord = obj.userData.coord;

  // Determine if we're in deletion (erase) mode.
  const isDeleteMode = e && (e.ctrlKey || e.metaKey);

  // If not in deletion mode and the voxel is already painted, do nothing.
  if (!isDeleteMode && voxelData.has(coord)) return false;

  const oldColor = voxelData.get(coord) || COLORS.base;
  const newColor = isDeleteMode ? COLORS.base : selectedColor;

  // If the intended color is the same as the current color, nothing to do.
  if (oldColor === newColor) return false;

  undoManager.recordChange(coord, oldColor, newColor);

  if (isDeleteMode) {
    voxelData.delete(coord);
    obj.material = baseMaterial;
    obj.material.color.set(COLORS.base);
    obj.scale.set(voxelSize * 0.5, voxelSize * 0.5, 1);
  } else {
    voxelData.set(coord, selectedColor);
    if (obj.material === baseMaterial) {
      obj.material = obj.material.clone();
    }
    obj.material.color.set(selectedColor);
    obj.scale.set(voxelSize, voxelSize, 1);
  }

  // Set the final color
  obj.material.color.set(newColor);
  return true;
}

function updateLayerVisibility() {
  updateVoxelVisibility();
}

function updateVoxelVisibility() {
  const camDir = new THREE.Vector3();
  camera.getWorldDirection(camDir).normalize();

  const inverseMatrix = new THREE.Matrix4()
    .copy(voxelGroup.matrixWorld)
    .invert();
  camDir.applyMatrix4(inverseMatrix).normalize();

  for (const dot of dots) {
    const [x, y, z] = dot.userData.coord.split(',').map(Number);
    const coord = `${x},${y},${z}`;
    const isFilled = voxelData.has(coord);

    if (xrayMode) {
      // In xray mode, only show the voxels on the lid
      if (y !== visibleLayerCount - 1) {
        dot.visible = false;
        continue;
      }

      if (isFilled) {
        dot.visible = true;
      } else {
        dot.visible = showEmptyVoxels;
      }
      continue;
    }

    // Regular visibility rules
    const withinVisibleLayer = y < visibleLayerCount;

    if (!withinVisibleLayer) {
      dot.visible = false;
      continue;
    }

    if (isFilled) {
      dot.visible = true;
      continue;
    }

    if (!showEmptyVoxels) {
      dot.visible = false;
      continue;
    }

    if (visibleLayerCount === 1) {
      dot.visible = true;
      continue;
    }

    const neighborOffsets = [
      [1, 0, 0],
      [-1, 0, 0],
      [0, 1, 0],
      [0, -1, 0],
      [0, 0, 1],
      [0, 0, -1],
    ];

    let shouldRender = false;

    for (const [dx, dy, dz] of neighborOffsets) {
      const nx = x + dx;
      const ny = y + dy;
      const nz = z + dz;

      const normal = new THREE.Vector3(dx, dy, dz).normalize();
      const dotProd = normal.dot(camDir);

      if (dotProd > -0.225) continue; // Skip faces facing away from cam

      const outOfBounds =
        nx < 0 ||
        nx >= pointsPerAxis ||
        ny < 0 ||
        ny >= visibleLayerCount ||
        nz < 0 ||
        nz >= pointsPerAxis;

      if (outOfBounds) {
        shouldRender = true;
        break;
      }
    }

    dot.visible = shouldRender;
  }
}

function animate() {
  requestAnimationFrame(animate);

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster
    .intersectObjects(dots, false)
    .filter((obj) => obj.object.visible);

  if (hovered) {
    const coord = hovered.userData.coord;
    const isFilled = voxelData.has(coord);
    const color = isFilled ? voxelData.get(coord) : COLORS.base;

    // If it's empty, reset to shared base material
    if (!isFilled) {
      hovered.material = baseMaterial;
    }

    hovered.material.color.set(color);
    hovered.scale.set(
      voxelSize * (isFilled ? 1.0 : 0.5),
      voxelSize * (isFilled ? 1.0 : 0.5),
      1
    );

    hovered = null;
  }

  if (intersects.length > 0) {
    hovered = intersects[0].object;

    // Prevent shared base material from being mutated
    if (hovered.material === baseMaterial) {
      hovered.material = hovered.material.clone();
    }

    hovered.material.color.set(COLORS.hover);
    hovered.scale.set(voxelSize, voxelSize, 1);
  }

  updateVoxelVisibility(); // Real-time visibility update
  renderer.render(scene, camera);
}

async function loadDefaultPalette() {
  try {
    const response = await fetch('./assets/data/db32.json');
    const palette = await response.json();
    const paletteSquares = document.querySelectorAll(
      '#colorPalettePanel .colorSquare'
    );

    paletteSquares.forEach((square, index) => {
      if (palette[index]) {
        const colorHex = palette[index];
        square.style.backgroundColor = colorHex;

        square.addEventListener('click', () => {
          // Update selectedColor
          selectedColor = colorHex;

          // Highlight active square
          document
            .querySelectorAll('#colorPalettePanel .colorSquare')
            .forEach((sq) => sq.classList.remove('active'));
          square.classList.add('active');
        });
      }
    });
  } catch (error) {
    console.error('Failed to load default palette:', error);
  }
}

window.addEventListener('DOMContentLoaded', loadDefaultPalette);

function resetModel(e) {
  if (e) e.preventDefault();

  voxelData.clear();

  for (const dot of dots) {
    dot.material.color.set(COLORS.base);
    dot.scale.set(voxelSize * 0.5, voxelSize * 0.5, 1); // Back to default size
  }

  // Clear the undo/redo history
  undoManager.clearHistory();

  updateVoxelVisibility();
}

function importModel(data) {
  voxelData.clear();

  // Reset every dot to blank state
  for (const dot of dots) {
    dot.material.color.set(COLORS.base);
    dot.scale.set(voxelSize * 0.5, voxelSize * 0.5, 1);
  }

  // Apply imported voxel data
  for (const { x, y, z, color } of data) {
    const coord = `${x},${y},${z}`;
    voxelData.set(coord, color);
    const dot = dots.find((d) => d.userData.coord === coord);
    if (dot) {
      dot.material.color.set(color);
      dot.scale.set(voxelSize, voxelSize, 1); // Full size for active voxel
    }
  }

  // Clear undo/redo history after import
  undoManager.clearHistory();

  updateVoxelVisibility(); // Reapply visibility logic after changes
}

async function exportModel() {
  const model = Array.from(voxelData.entries()).map(([key, color]) => {
    const [x, y, z] = key.split(',').map(Number);
    return { x, y, z, color };
  });

  const filename = `model-${Date.now()}.json`;
  const json = JSON.stringify(model, null, 2); // Pretty-print

  if ('showSaveFilePicker' in window) {
    try {
      const fileHandle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [
          {
            description: 'JSON file',
            accept: { 'application/json': ['.json'] },
          },
        ],
      });

      const writable = await fileHandle.createWritable();
      await writable.write(json);
      await writable.close();
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Save failed:', err);
      }
    }
  } else {
    // Fallback: force download via link
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }
}

// Bind events
canvas.addEventListener('mousedown', onMouseDown);
canvas.addEventListener('mousemove', onMouseMove);
canvas.addEventListener('mouseup', onMouseUp);
canvas.addEventListener('mouseleave', onMouseUp);

const keyState = new Set();

document.addEventListener('keydown', (e) => {
  keyState.add(e.key);

  const isShift = e.shiftKey;

  // --- PAINTING CONTROLS ---
  if (isShift && e.key.toLowerCase() === 'q') {
    // Shift + Q → show only bottom layer
    visibleLayerCount = 1;
    updateLayerVisibility();
    e.preventDefault();
  } else if (isShift && e.key.toLowerCase() === 'e') {
    // Shift + E → show all layers
    visibleLayerCount = pointsPerAxis;
    updateLayerVisibility();
    e.preventDefault();
  } else if (!isShift && e.key.toLowerCase() === 'q') {
    // Q → hide one layer
    if (visibleLayerCount > 1) {
      visibleLayerCount--;
      updateLayerVisibility();
    }
    e.preventDefault();
  } else if (!isShift && e.key.toLowerCase() === 'e') {
    // E → show one more layer
    if (visibleLayerCount < pointsPerAxis) {
      visibleLayerCount++;
      updateLayerVisibility();
    }
    e.preventDefault();
  } else if (e.key.toLowerCase() === 'r') {
    // R → toggle xray
    xrayMode = !xrayMode;
    updateVoxelVisibility();
    e.preventDefault();
  } else if (e.key === 'Tab') {
    // Tab → toggle empty voxel visibility
    showEmptyVoxels = !showEmptyVoxels;
    updateVoxelVisibility();
    e.preventDefault();
  }

  // --- UNDO / REDO ---
  else if (
    keyState.has('Meta') &&
    keyState.has('Shift') &&
    (e.key === 'z' || e.key === 'Z')
  ) {
    // Cmd+Shift+Z → Redo (Mac)
    undoManager.redo();
    e.preventDefault();
  } else if (e.metaKey && e.key.toLowerCase() === 'z') {
    // Cmd+Z → Undo (Mac)
    undoManager.undo();
    e.preventDefault();
  } else if (e.ctrlKey && e.key.toLowerCase() === 'y') {
    // Ctrl+Y → Redo (Windows)
    undoManager.redo();
    e.preventDefault();
  }
});

document.addEventListener('keyup', (e) => {
  keyState.delete(e.key);
});

document.getElementById('resetLink').addEventListener('click', resetModel);
document.getElementById('openLink').addEventListener('click', () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = () => importModel(JSON.parse(reader.result));
    reader.readAsText(file);
  };
  input.click();
});
document.getElementById('downloadLink').addEventListener('click', exportModel);

canvas.addEventListener(
  'wheel',
  (e) => {
    // Two-finger horizontal swipe on Mac trackpad
    const isHorizontalSwipe = Math.abs(e.deltaX) > Math.abs(e.deltaY);

    if (isHorizontalSwipe) {
      const rotationSpeed = 0.003;
      voxelGroup.rotation.y += e.deltaX * rotationSpeed;

      // Prevent browser history back/forward
      e.preventDefault();
    }
  },
  { passive: false } // Needed for preventDefault() to work
);

animate();
