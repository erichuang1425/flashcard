import React, { useCallback, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { useAuth } from '../../context/AuthContext';
import { importArticle } from '../../services/articleService';
import {
  ArticleImportError,
  parseArticleArchive,
} from '../../utils/articleImport';
import { useI18n } from '../../i18n/I18nContext';

interface ArticleImporterProps {
  onImported: () => void | Promise<void>;
}

interface ImportStatus {
  name: string;
  state: 'processing' | 'complete' | 'error';
  error?: string;
}

export const ArticleImporter: React.FC<ArticleImporterProps> = ({
  onImported,
}) => {
  const { user } = useAuth();
  const { t } = useI18n();
  const [statuses, setStatuses] = useState<ImportStatus[]>([]);
  const [dragging, setDragging] = useState(false);

  const processFiles = useCallback(
    async (files: File[]) => {
      if (!user) return;

      const zipFiles = files.filter((file) =>
        file.name.toLocaleLowerCase().endsWith('.zip')
      );
      setStatuses(
        zipFiles.map((file) => ({ name: file.name, state: 'processing' }))
      );

      let imported = false;
      for (const file of zipFiles) {
        try {
          const article = await parseArticleArchive(await file.arrayBuffer());
          await importArticle(user.uid, article);
          imported = true;
          setStatuses((current) =>
            current.map((status) =>
              status.name === file.name
                ? { ...status, state: 'complete' }
                : status
            )
          );
        } catch (error) {
          setStatuses((current) =>
            current.map((status) =>
              status.name === file.name
                ? {
                    ...status,
                    state: 'error',
                    error: t(
                      error instanceof ArticleImportError
                        ? `reading.import.error.${error.code}`
                        : 'reading.import.failed'
                    ),
                  }
                : status
            )
          );
        }
      }

      if (imported) await onImported();
    },
    [onImported, t, user]
  );

  return (
    <Stack spacing={2}>
      <Paper
        variant="outlined"
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void processFiles(Array.from(event.dataTransfer.files));
        }}
        sx={{
          p: 5,
          textAlign: 'center',
          borderStyle: 'dashed',
          borderWidth: 2,
          borderColor: dragging ? 'primary.main' : 'divider',
          bgcolor: dragging ? 'action.hover' : 'background.paper',
        }}
      >
        <CloudUploadIcon color="primary" sx={{ fontSize: 48, mb: 1 }} />
        <Typography variant="h6">{t('reading.import.title')}</Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          {t('reading.import.description')}
        </Typography>
        <Button component="label" variant="contained">
          {t('reading.import.choose')}
          <input
            hidden
            type="file"
            accept=".zip,application/zip"
            multiple
            onChange={(event) => {
              void processFiles(Array.from(event.target.files ?? []));
              event.target.value = '';
            }}
          />
        </Button>
      </Paper>

      {statuses.map((status) => (
        <Box key={status.name}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body2">{status.name}</Typography>
            <Typography
              variant="body2"
              color={
                status.state === 'error'
                  ? 'error.main'
                  : status.state === 'complete'
                    ? 'success.main'
                    : 'text.secondary'
              }
            >
              {t(`reading.import.status.${status.state}`)}
            </Typography>
          </Box>
          <LinearProgress
            variant={status.state === 'processing' ? 'indeterminate' : 'determinate'}
            value={100}
            color={status.state === 'error' ? 'error' : 'primary'}
          />
          {status.error ? (
            <Alert severity="error" sx={{ mt: 1 }}>
              {status.error}
            </Alert>
          ) : null}
        </Box>
      ))}
    </Stack>
  );
};
