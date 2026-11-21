// SOLARA — input.js
// Keyboard + mouse input. Tracks held keys, edge-triggered presses,
// mouse drag deltas for the orbit camera, and click state for shooting.

export function createInput(canvas) {
  const input = {
    keys: new Set(),
    pressed: new Set(),
    mouseDX: 0,
    mouseDY: 0,
    mouseDown: false,
    clicked: false,
    dragging: false,
    lastX: 0,
    lastY: 0,

    isDown(code) { return this.keys.has(code); },

    // Edge trigger: true only on the frame the key went down.
    wasPressed(code) { return this.pressed.has(code); },

    endFrame() {
      this.pressed.clear();
      this.mouseDX = 0;
      this.mouseDY = 0;
      this.clicked = false;
    },
  };

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    input.keys.add(e.code);
    input.pressed.add(e.code);
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) {
      e.preventDefault();
    }
  });
  window.addEventListener('keyup', (e) => input.keys.delete(e.code));
  window.addEventListener('blur', () => input.keys.clear());

  canvas.addEventListener('mousedown', (e) => {
    input.mouseDown = true;
    input.dragging = true;
    input.lastX = e.clientX;
    input.lastY = e.clientY;
    input.clicked = true;
  });
  window.addEventListener('mouseup', () => {
    input.mouseDown = false;
    input.dragging = false;
  });
  window.addEventListener('mousemove', (e) => {
    if (!input.dragging) return;
    input.mouseDX += e.clientX - input.lastX;
    input.mouseDY += e.clientY - input.lastY;
    input.lastX = e.clientX;
    input.lastY = e.clientY;
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  return input;
}
