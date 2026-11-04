/** Presence boundary shared by a help trigger and its portalled text. */
export function createTooltipPresence({ show, hide }: { show: () => void; hide: () => void }) {
  let hovered = false;
  let focused = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const cancel = () => {
    clearTimeout(timer);
    timer = undefined;
  };
  const open = () => {
    cancel();
    show();
  };
  const schedule = () => {
    cancel();
    if (hovered || focused) return;
    // Bridge the small physical gap between the button and its portal.
    timer = setTimeout(() => {
      timer = undefined;
      hide();
    }, 150);
  };
  return {
    open,
    enter: () => {
      hovered = true;
      open();
    },
    leave: () => {
      hovered = false;
      schedule();
    },
    focus: () => {
      focused = true;
      open();
    },
    blur: () => {
      focused = false;
      schedule();
    },
    dismiss: () => {
      cancel();
      hide();
    },
    dispose: () => {
      cancel();
      hovered = false;
      focused = false;
    },
  };
}
