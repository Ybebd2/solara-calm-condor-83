// SOLARA — input.js
// Keyboard + mouse input. Tracks held keys, camera orbit drag, and
// one-shot key presses the game loop consumes each frame.

export function createInput(canvas) {
  const keys = {};
  const pressed = {};
  let dragX = 0;
  let dragY = 0;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let mouseDown = false;

  function onKeyDown(e) {
    if (e.repeat) return;
    keys[e.code] = true;
    pressed[e.code] = true;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault();
    }
  }
  function onKeyUp(e) {
    keys[e.code] = false;
  }
  function onMouseDown(e) {
    dragging = true;
    mouseDown = true;
    lastX = e.clientX;
    lastY = e.clientY;
  }
  function onMouseMove(e) {
    if (!dragging) return;
    dragX += e.clientX - lastX;
    dragY += e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
  }
  function onMouseUp() {
    dragging = false;
    mouseDown = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  if (canvas) {
    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  return {
    keys,
    pressed,
    get mouseDown() { return mouseDown; },
    consumeDrag() {
      const d = { x: dragX, y: dragY };
      dragX = 0;
      dragY = 0;
      return d;
    },
    wasPressed(code) {
      if (pressed[code]) {
        pressed[code] = false;
        return true;
      }
      return false;
    },
    clearPressed() {
      for (const k of Object.keys(pressed)) pressed[k] = false;
    },
  };
}
