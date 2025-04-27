import * as THREE from 'https://unpkg.com/three@0.150.1/build/three.module.js';
import * as Model from './model.mjs';
import * as Palette from './palette.mjs';
import { UndoManager } from './undo.mjs';

/**
 * Core UI built-in colour roles for VoxPaint.
 * These three are guaranteed defaults:
 *   • base   – the immutable empty voxel colour - never changes
 *   • hover  – the immutable highlight colour on mouseover - never changes
 *   • active – the default and fallback paint colour
 */
const COLORS = {
  base: '#505050',
  hover: '#EDEDED',
  active: '#6ABE30',
};

/**
 * The colour currently in use for painting/filling.
 * Initialized from COLORS.active and stays that way
 * until the user clicks a swatch in the palette UI.
 */
const selectedColorRef = { value: COLORS.active };
window.selectedColorRef = selectedColorRef;

// VoxPaint Starter - 16x16x16cm cube with 10mm points
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

// Sparse Voxel Octree Stub (simplified)
const voxelData = new Map(); // key = "x,y,z", value = 1

// Group to rotate
const voxelGroup = new THREE.Group();
scene.add(voxelGroup);

// Start with only bottom layer visible
let visibleLayerCount = 1;
let xrayMode = false;
let fillMode = false;
let overpaintMode = false;

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
    // Right-click for rotation
    isDragging = true;
    dragButton = 2;
    previousMousePosition = { x: e.clientX, y: e.clientY };
  } else if (e.button === 0) {
    if (fillMode) {
      // In fill mode, run the fill operation once
      fillAtVoxel(e);
    } else {
      // Otherwise, use normal painting
      isLeftMouseDown = true;
      undoManager.beginStroke(e.ctrlKey || e.metaKey ? 'erase' : 'paint');
      tryPaintVoxel(e);
    }
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

  const isPaintable = overpaintMode || !voxelData.has(coord);
  if (!isDeleteMode && !isPaintable) return false;

  const oldColor = voxelData.get(coord) || COLORS.base;
  const newColor = isDeleteMode ? COLORS.base : selectedColorRef.value;

  // If the intended color is the same as the current color, nothing to do.
  if (oldColor === newColor) return false;

  undoManager.recordChange(coord, oldColor, newColor);

  if (isDeleteMode) {
    voxelData.delete(coord);
    obj.material = baseMaterial;
    obj.material.color.set(COLORS.base);
    obj.scale.set(voxelSize * 0.5, voxelSize * 0.5, 1);
  } else {
    voxelData.set(coord, selectedColorRef.value);
    if (obj.material === baseMaterial) {
      obj.material = obj.material.clone();
    }
    obj.material.color.set(selectedColorRef.value);
    obj.scale.set(voxelSize, voxelSize, 1);
  }

  // Set the final color
  obj.material.color.set(newColor);
  return true;
}

function fillAtVoxel(e) {
  // Use the raycaster to find the target voxel
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster
    .intersectObjects(dots, false)
    .filter((obj) => obj.object.visible);
  if (intersects.length === 0) return;

  const targetObj = intersects[0].object;
  const startCoordStr = targetObj.userData.coord;
  const [startX, startY, startZ] = startCoordStr.split(',').map(Number);
  const startCoord = { x: startX, y: startY, z: startZ };

  // Determine the current color at the start voxel.
  const currentColor = voxelData.has(startCoordStr)
    ? voxelData.get(startCoordStr)
    : COLORS.base;
  const newColor = selectedColorRef.value;
  if (currentColor === newColor) return;

  // Begin a new stroke for undo/redo purposes.
  undoManager.beginStroke('fill');

  // Determine if this is a blank fill versus an active fill.
  const isBlankFill = currentColor === COLORS.base;
  let faceAxis = null;
  let faceValue = null;

  // Determine fill mode:
  // If Shift is held, we want to fill all visible layers (i.e., layers with y < visibleLayerCount)
  // Otherwise, restrict the fill to only the horizontal layer (the clicked layer).
  const fillAcrossVisibleLayers = e.shiftKey;
  if (isBlankFill) {
    if (!fillAcrossVisibleLayers) {
      faceAxis = 'y';
      faceValue = startY;
    }
    // If Shift is held, no per-voxel face constraint is set here.
  }

  // Set up data structures for flood fill.
  const queue = [startCoord];
  const visited = new Set();
  visited.add(startCoordStr);

  // Offsets for the 6-connected (orthogonal) neighbors.
  const neighborOffsets = [
    { dx: 1, dy: 0, dz: 0 },
    { dx: -1, dy: 0, dz: 0 },
    { dx: 0, dy: 1, dz: 0 },
    { dx: 0, dy: -1, dz: 0 },
    { dx: 0, dy: 0, dz: 1 },
    { dx: 0, dy: 0, dz: -1 },
  ];

  // Flood fill loop using BFS.
  while (queue.length > 0) {
    const { x, y, z } = queue.shift();
    const coordStr = `${x},${y},${z}`;

    // Get the color of the current voxel.
    const voxelColor = voxelData.has(coordStr)
      ? voxelData.get(coordStr)
      : COLORS.base;
    // Skip if the color does not match the target.
    if (voxelColor !== currentColor) continue;

    // Enforce fill constraints:
    if (fillAcrossVisibleLayers) {
      // Only process voxels in layers that are visible (i.e., below the top visible layer).
      if (y >= visibleLayerCount) continue;
    } else if (faceAxis) {
      // Constrain propagation to the clicked horizontal layer.
      if (faceAxis === 'y' && y !== faceValue) continue;
    }

    // Update voxel: record change, update voxelData and visuals.
    undoManager.recordChange(coordStr, voxelColor, newColor);
    if (newColor === COLORS.base) {
      voxelData.delete(coordStr);
    } else {
      voxelData.set(coordStr, newColor);
    }

    const dot = dots.find((d) => d.userData.coord === coordStr);
    if (dot) {
      if (dot.material === baseMaterial) {
        dot.material = dot.material.clone();
      }
      dot.material.color.set(newColor);
      dot.scale.set(
        newColor === COLORS.base ? voxelSize * 0.5 : voxelSize,
        voxelSize,
        1
      );
    }

    // Process neighboring voxels.
    for (const { dx, dy, dz } of neighborOffsets) {
      const nx = x + dx;
      const ny = y + dy;
      const nz = z + dz;
      if (
        nx < 0 ||
        nx >= pointsPerAxis ||
        ny < 0 ||
        ny >= pointsPerAxis ||
        nz < 0 ||
        nz >= pointsPerAxis
      )
        continue;
      const nCoordStr = `${nx},${ny},${nz}`;
      if (visited.has(nCoordStr)) continue;
      visited.add(nCoordStr);
      queue.push({ x: nx, y: ny, z: nz });
    }
  }

  // Finalize the fill stroke for undo/redo integration.
  undoManager.endStroke();
  updateVoxelVisibility();
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

function dispatchVisibleLayerChanged() {
  const canGoDown = visibleLayerCount > 1;
  const canGoUp = visibleLayerCount < pointsPerAxis;

  const event = new CustomEvent('visibleLayerChanged', {
    detail: { canGoDown, canGoUp },
  });
  document.dispatchEvent(event);
}

function dispatchModeChanged(mode, value) {
  document.dispatchEvent(
    new CustomEvent('modeChanged', {
      detail: { mode, value },
    })
  );

  // Paint is implicit — update its menu state as complement of Fill and Overpaint
  const isPaint = !overpaintMode && !fillMode;
  document.dispatchEvent(
    new CustomEvent('modeChanged', {
      detail: { mode: 'paint', value: isPaint },
    })
  );
}

window.addEventListener('DOMContentLoaded', () => {
  Palette.loadDefault32(selectedColorRef);
  undoManager.dispatchUndoRedoChanged();
  dispatchVisibleLayerChanged();
  dispatchModeChanged('grid', showEmptyVoxels);
  dispatchModeChanged('paint', true);
});

// --- Control Functions ---
function handleUndo() {
  undoManager.undo();
}

function handleRedo() {
  undoManager.redo();
}

function increaseVisibleLayers() {
  if (visibleLayerCount < pointsPerAxis) {
    visibleLayerCount++;
    updateLayerVisibility();
    dispatchVisibleLayerChanged();
  }
}

function decreaseVisibleLayers() {
  if (visibleLayerCount > 1) {
    visibleLayerCount--;
    updateLayerVisibility();
    dispatchVisibleLayerChanged();
  }
}

function jumpToTopLayer() {
  visibleLayerCount = pointsPerAxis;
  updateLayerVisibility();
  dispatchVisibleLayerChanged();
}

function jumpToBottomLayer() {
  visibleLayerCount = 1;
  updateLayerVisibility();
  dispatchVisibleLayerChanged();
}

function toggleXrayMode() {
  xrayMode = !xrayMode;
  updateVoxelVisibility();
  dispatchModeChanged('xray', xrayMode);
}

function toggleGridVisibility() {
  showEmptyVoxels = !showEmptyVoxels;
  updateVoxelVisibility();
  dispatchModeChanged('grid', showEmptyVoxels);
}

function setToolMode(mode) {
  // Valid modes: 'paint', 'overpaint', 'fill'

  // Do nothing if the tool is already active
  if (
    (mode === 'paint' && !overpaintMode && !fillMode) ||
    (mode === 'overpaint' && overpaintMode) ||
    (mode === 'fill' && fillMode)
  ) {
    return;
  }

  const wasOverpaint = overpaintMode;
  const wasFill = fillMode;

  // Reset all
  overpaintMode = false;
  fillMode = false;

  if (mode === 'overpaint') {
    overpaintMode = true;
  } else if (mode === 'fill') {
    fillMode = true;
  }

  // Only dispatch events if the state actually changed
  if (wasOverpaint !== overpaintMode) {
    dispatchModeChanged('overpaint', overpaintMode);
  }
  if (wasFill !== fillMode) {
    dispatchModeChanged('fill', fillMode);
  }

  // Implicitly update paint status
  const isPaint = !overpaintMode && !fillMode;
  dispatchModeChanged('paint', isPaint);
}

function toggleOverpaintMode() {
  overpaintMode = !overpaintMode;

  if (overpaintMode && fillMode) {
    fillMode = false;
    dispatchModeChanged('fill', fillMode);
  }

  dispatchModeChanged('overpaint', overpaintMode);
}

function toggleFillMode() {
  fillMode = !fillMode;

  if (fillMode && overpaintMode) {
    overpaintMode = false;
    dispatchModeChanged('overpaint', overpaintMode);
  }

  dispatchModeChanged('fill', fillMode);
}

// --- Model Import/Export ---
function resetModel() {
  Model.resetModel(
    voxelData,
    dots,
    COLORS,
    voxelSize,
    undoManager,
    updateVoxelVisibility
  );
}

function importModel() {
  Model.importModel(
    voxelData,
    dots,
    COLORS,
    voxelSize,
    undoManager,
    updateVoxelVisibility,
    () => {
      VoxPaint.jumpToTopLayer();
      if (showEmptyVoxels) VoxPaint.toggleGridVisibility();
    }
  );
}

async function exportModel() {
  await Model.exportModel(voxelData);
}

// Bind events
canvas.addEventListener('mousedown', onMouseDown);
canvas.addEventListener('mousemove', onMouseMove);
canvas.addEventListener('mouseup', onMouseUp);
canvas.addEventListener('mouseleave', onMouseUp);

// --- TRACKPAD/TOUCH CONTROLS ---
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

// --- Export global controls ---
window.VoxPaint = {
  resetModel,
  importModel,
  exportModel,
  handleUndo,
  handleRedo,
  increaseVisibleLayers,
  decreaseVisibleLayers,
  jumpToTopLayer,
  jumpToBottomLayer,
  toggleXrayMode,
  toggleGridVisibility,
  toggleOverpaintMode,
  toggleFillMode,
  setToolMode,
  isPaintMode: () => !overpaintMode && !fillMode,
  isOverpaintMode: () => overpaintMode,
  isFillMode: () => fillMode,
};

animate();
