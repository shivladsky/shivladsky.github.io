export class UndoManager {
  constructor(
    voxelData,
    dots,
    updateVoxelVisibility,
    COLORS,
    voxelSize,
    baseMaterial
  ) {
    this.voxelData = voxelData;
    this.dots = dots;
    this.updateVoxelVisibility = updateVoxelVisibility;
    this.COLORS = COLORS;
    this.baseMaterial = baseMaterial;
    this.voxelSize = voxelSize;
    this.undoStack = [];
    this.redoStack = [];
    this.currentStroke = null;
  }

  beginStroke(actionType) {
    this.currentStroke = { actionType, voxels: [] };
  }

  recordChange(coord, oldColor, newColor) {
    if (!this.currentStroke) return;
    if (oldColor === newColor) return;
    this.currentStroke.voxels.push({ coord, oldColor, newColor });
  }

  endStroke() {
    if (this.currentStroke?.voxels.length > 0) {
      this.undoStack.push(this.currentStroke);
      this.redoStack = []; // Clear redo history after a new action
      this.dispatchUndoRedoChanged();
    }

    this.currentStroke = null;
  }

  canUndo() {
    return this.undoStack.length > 0;
  }

  canRedo() {
    return this.redoStack.length > 0;
  }

  undo() {
    const stroke = this.undoStack.pop();
    if (!stroke) return;

    for (const { coord, oldColor } of stroke.voxels) {
      const dot = this.dots.find((d) => d.userData.coord === coord);
      if (!dot) continue;

      if (oldColor === this.COLORS.base) {
        this.voxelData.delete(coord);
        dot.material = this.baseMaterial;
        dot.material.color.set(this.COLORS.base);
        dot.scale.set(this.voxelSize * 0.5, this.voxelSize * 0.5, 1);
      } else {
        this.voxelData.set(coord, oldColor);
        if (dot.material === this.baseMaterial) {
          dot.material = dot.material.clone();
        }
        dot.material.color.set(oldColor);
        dot.scale.set(this.voxelSize, this.voxelSize, 1);
      }
    }

    this.redoStack.push(stroke);
    this.updateVoxelVisibility();
    this.dispatchUndoRedoChanged();
  }

  redo() {
    const stroke = this.redoStack.pop();
    if (!stroke) return;

    for (const { coord, newColor } of stroke.voxels) {
      const dot = this.dots.find((d) => d.userData.coord === coord);
      if (!dot) continue;

      if (newColor === this.COLORS.base) {
        this.voxelData.delete(coord);
        dot.material = this.baseMaterial;
        dot.material.color.set(this.COLORS.base);
        dot.scale.set(this.voxelSize * 0.5, this.voxelSize * 0.5, 1);
      } else {
        this.voxelData.set(coord, newColor);
        if (dot.material === this.baseMaterial) {
          dot.material = dot.material.clone();
        }
        dot.material.color.set(newColor);
        dot.scale.set(this.voxelSize, this.voxelSize, 1);
      }

      dot.material.color.set(newColor);
    }

    this.undoStack.push(stroke);
    this.updateVoxelVisibility();
    this.dispatchUndoRedoChanged();
  }

  dispatchUndoRedoChanged() {
    const event = new CustomEvent('undoRedoChanged', {
      detail: { canUndo: this.canUndo(), canRedo: this.canRedo() },
    });
    document.dispatchEvent(event);
  }

  clearHistory() {
    this.undoStack = [];
    this.redoStack = [];
    this.currentStroke = null;
    this.dispatchUndoRedoChanged();
  }
}
