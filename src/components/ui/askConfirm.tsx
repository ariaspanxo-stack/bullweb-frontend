// LOTE 323 (B4-16): confirmacion con el modal propio (ConfirmDialog, portal z-100) desde codigo sin componente,
// en lugar de window.confirm. askConfirm(opciones) -> Promise<boolean>.
import { createRoot } from 'react-dom/client';
import { ConfirmDialog } from './ConfirmDialog';

export interface AskConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'default';
}

export function askConfirm(opts: AskConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    let done = false;
    const close = (value: boolean) => {
      if (done) return;
      done = true;
      resolve(value);
      setTimeout(() => {
        root.unmount();
        host.remove();
      }, 0);
    };
    root.render(
      <ConfirmDialog
        isOpen
        {...opts}
        onConfirm={() => close(true)}
        onCancel={() => close(false)}
      />,
    );
  });
}
