
import React, { createContext, useContext, useState } from 'react';
import { ConfirmDialog } from '../components/dialogs/ConfirmDialog';

interface ConfirmContextType {
  confirm: (options: ConfirmDialogOptions) => Promise<boolean>;
}

interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: 'primary' | 'secondary' | 'error';
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    options: ConfirmDialogOptions;
    resolve: (value: boolean) => void;
  } | null>(null);

  const confirm = (options: ConfirmDialogOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialog({
        isOpen: true,
        options,
        resolve
      });
    });
  };

  const handleClose = () => {
    if (dialog) {
      dialog.resolve(false);
      setDialog(null);
    }
  };

  const handleConfirm = () => {
    if (dialog) {
      dialog.resolve(true);
      setDialog(null);
    }
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <ConfirmDialog
        open={dialog?.isOpen || false}
        title={dialog?.options.title || ''}
        message={dialog?.options.message || ''}
        confirmText={dialog?.options.confirmText}
        cancelText={dialog?.options.cancelText}
        confirmColor={dialog?.options.confirmColor}
        onConfirm={handleConfirm}
        onCancel={handleClose}
      />
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context.confirm;
};