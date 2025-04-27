export function resetModel(
  voxelData,
  dots,
  COLORS,
  voxelSize,
  undoManager,
  updateVoxelVisibility
) {
  voxelData.clear();

  for (const dot of dots) {
    dot.material.color.set(COLORS.base);
    dot.scale.set(voxelSize * 0.5, voxelSize * 0.5, 1); // Back to default size
  }

  undoManager.clearHistory();
  updateVoxelVisibility();
}

export function importModel(
  voxelData,
  dots,
  COLORS,
  voxelSize,
  undoManager,
  updateVoxelVisibility,
  onImportLoaded
) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const data = JSON.parse(reader.result);
      loadModel(
        data,
        voxelData,
        dots,
        COLORS,
        voxelSize,
        undoManager,
        updateVoxelVisibility,
        onImportLoaded
      );
    };
    reader.readAsText(file);
  };
  input.click();
}

function loadModel(
  data,
  voxelData,
  dots,
  COLORS,
  voxelSize,
  undoManager,
  updateVoxelVisibility,
  onImportLoaded
) {
  voxelData.clear();

  for (const dot of dots) {
    dot.material.color.set(COLORS.base);
    dot.scale.set(voxelSize * 0.5, voxelSize * 0.5, 1);
  }

  for (const { x, y, z, color } of data) {
    const coord = `${x},${y},${z}`;
    voxelData.set(coord, color);
    const dot = dots.find((d) => d.userData.coord === coord);
    if (dot) {
      if (dot.material.color.getHexString() === COLORS.base.replace('#', '')) {
        dot.material = dot.material.clone();
      }
      dot.material.color.set(color);
      dot.scale.set(voxelSize, voxelSize, 1);
    }
  }

  undoManager.clearHistory();
  updateVoxelVisibility();

  if (typeof onImportLoaded === 'function') {
    onImportLoaded();
  }
}

export async function exportModel(voxelData) {
  const model = Array.from(voxelData.entries()).map(([key, color]) => {
    const [x, y, z] = key.split(',').map(Number);
    return { x, y, z, color };
  });

  const filename = `model-${Date.now()}.json`;
  const json = JSON.stringify(model, null, 2);

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
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }
}
