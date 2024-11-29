import React from 'react';
import { useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { ConfirmDialog, ConfirmDialogProps } from '../components/dialogs/ConfirmDialog';

type ConfirmOptions = Omit<ConfirmDialogProps, 'open' | 'onConfirm' | 'onCancel'>;

export const useConfirm = () => {
  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = createRoot(container);

      const handleClose = (result: boolean) => {
        root.unmount();
        document.body.removeChild(container);
        resolve(result);
      };

      root.render(
        React.createElement(ConfirmDialog, {
          ...options,
          open: true,
          onConfirm: () => handleClose(true),
          onCancel: () => handleClose(false)
        })
      );
    });
  }, []);

  return confirm;
};