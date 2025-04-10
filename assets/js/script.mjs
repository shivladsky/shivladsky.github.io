import * as THREE from 'https://unpkg.com/three@0.150.1/build/three.module.js';

// Color palette
const COLORS = {
  base: '#505050',
  active: '#6ABE30',
  hover: '#EDEDED',
};

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
    tryPaintVoxel(e); // Pass the event to ensure modifier keys are checked
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
  isDragging = false;
  isLeftMouseDown = false;
}

function tryPaintVoxel(e) {
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster
    .intersectObjects(dots, false)
    .filter((obj) => obj.object.visible);
  if (intersects.length > 0) {
    const obj = intersects[0].object;
    const coord = obj.userData.coord;

    // Make sure e is defined and then check the modifier keys
    const isDeleteMode = e && (e.ctrlKey || e.metaKey);

    if (isDeleteMode) {
      if (voxelData.has(coord)) {
        voxelData.delete(coord);
        obj.material.color.set(COLORS.base);
      }
    } else {
      if (!voxelData.has(coord)) {
        voxelData.set(coord, 1);
        obj.material.color.set(COLORS.active);
      }
    }
  }
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
    hovered.material.color.set(isFilled ? COLORS.active : COLORS.base);
    hovered.scale.set(
      voxelSize * (isFilled ? 1.0 : 0.5),
      voxelSize * (isFilled ? 1.0 : 0.5),
      1
    );
    hovered = null;
  }

  if (intersects.length > 0) {
    hovered = intersects[0].object;
    hovered.material.color.set(COLORS.hover);
    hovered.scale.set(voxelSize, voxelSize, 1); // Scale up to full on hover
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
        square.style.backgroundColor = palette[index];
      }
    });
  } catch (error) {
    console.error('Failed to load default palette:', error);
  }
}

window.addEventListener('DOMContentLoaded', loadDefaultPalette);

function exportModel() {
  const model = Array.from(voxelData.entries()).map(([key]) => {
    const [x, y, z] = key.split(',').map(Number);
    return { x, y, z, color: COLORS.active };
  });
  const blob = new Blob([JSON.stringify(model)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'model.json';
  link.click();
  URL.revokeObjectURL(url);
}

function importModel(data) {
  voxelData.clear();

  // Reset every dot to blank state
  for (const dot of dots) {
    dot.material.color.set(COLORS.base);
    dot.scale.set(voxelSize * 0.5, voxelSize * 0.5, 1);
  }

  // Apply imported voxel data
  for (const { x, y, z } of data) {
    const coord = `${x},${y},${z}`;
    voxelData.set(coord, 1);
    const dot = dots.find((d) => d.userData.coord === coord);
    if (dot) {
      dot.material.color.set(COLORS.active);
      dot.scale.set(voxelSize, voxelSize, 1); // Full size for active voxel
    }
  }

  updateVoxelVisibility(); // Reapply visibility logic after changes
}

// Bind events
canvas.addEventListener('mousedown', onMouseDown);
canvas.addEventListener('mousemove', onMouseMove);
canvas.addEventListener('mouseup', onMouseUp);
canvas.addEventListener('mouseleave', onMouseUp);

document.addEventListener('keydown', (e) => {
  const isShift = e.shiftKey;

  if (isShift && e.key.toLowerCase() === 'q') {
    // Shift + q → show only bottom layer
    visibleLayerCount = 1;
    updateLayerVisibility();
    e.preventDefault();
  } else if (isShift && e.key.toLowerCase() === 'e') {
    // Shift + e → show all layers
    visibleLayerCount = pointsPerAxis;
    updateLayerVisibility();
    e.preventDefault();
  } else if (!isShift && e.key.toLowerCase() === 'q') {
    // q → hide one layer
    if (visibleLayerCount > 1) {
      visibleLayerCount--;
      updateLayerVisibility();
    }
    e.preventDefault();
  } else if (!isShift && e.key.toLowerCase() === 'e') {
    // e → show one more layer
    if (visibleLayerCount < pointsPerAxis) {
      visibleLayerCount++;
      updateLayerVisibility();
    }
    e.preventDefault();
  } else if (e.key.toLowerCase() === 'r') {
    xrayMode = !xrayMode;
    updateVoxelVisibility();
    e.preventDefault();
  } else if (e.key === 'Tab') {
    showEmptyVoxels = !showEmptyVoxels;
    updateVoxelVisibility();
    e.preventDefault();
  }
});

document.getElementById('downloadLink').addEventListener('click', exportModel);
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

animate();
