
import { useCallback } from 'react';
import { useSnackbar as useNotistack } from 'notistack';

type SnackbarSeverity = 'success' | 'error' | 'warning' | 'info';

export const useSnackbar = () => {
  const { enqueueSnackbar } = useNotistack();

  return useCallback((message: string, severity: SnackbarSeverity = 'info') => {
    enqueueSnackbar(message, { 
      variant: severity,
      anchorOrigin: { vertical: 'bottom', horizontal: 'center' },
      autoHideDuration: 3000
    });
  }, [enqueueSnackbar]);
};