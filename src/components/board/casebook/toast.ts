export function toast(msg: string): void {
  window.dispatchEvent(new CustomEvent('cb:toast', { detail: msg }));
}
