import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  AlertTitle,
  LinearProgress
} from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import { importArticle } from '../../services/articleService';
import { useI18n } from '../../i18n/I18nContext';
import { logger } from '../../services/logging';

interface ProcessedArticle {
  title: string;
  subtitle?: string;
  content: string;
  category: string;
  coverImage?: File;
  sourceUrl?: string;
}

interface ImportProgress {
  fileName: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
}

export const ArticleImporter: React.FC = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [importQueue, setImportQueue] = useState<ImportProgress[]>([]);
  const [progress, setProgress] = useState<ImportStage | null>(null);

  const processZipFile = async (file: File): Promise<ProcessedArticle> => {
    setProgress({ stage: 'importing', progress: 0 });
    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(file);
    setProgress({ stage: 'importing', progress: 30 });

    const detailsJson = await zip.file('details.json')?.async('string');
    if (!detailsJson) throw new Error(t('reading.import.error.missingFiles'));
    setProgress({ stage: 'analyzing', progress: 50 });
    
    const details = JSON.parse(detailsJson);
    
    const content = await zip.file('content.txt')?.async('string');
    if (!content) throw new Error(t('reading.import.error.missingFiles'));
    setProgress({ stage: 'analyzing', progress: 70 });

    let coverImage: File | undefined;
    const imageFile = zip.file(details.cover_image);
    if (imageFile) {
      const imageBlob = await imageFile.async('blob');
      coverImage = new File([imageBlob], details.cover_image, {
        type: imageBlob.type
      });
    }

    setProgress({ stage: 'saving', progress: 90 });
    return {
      title: details.title,
      subtitle: details.subtitle,
      content,
      category: details.category,
      coverImage,
      sourceUrl: details.article_url
    };
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!user) {
      logger.warn('Article import attempted without authentication', {
        operation: 'articleImport',
        status: 'rejected',
        reason: 'noAuth'
      });
      return;
    }

    const importId = Math.random().toString(36).substr(2, 9);
    logger.info('Starting article import batch', {
      operation: 'articleImport',
      importId,
      details: {
        fileCount: acceptedFiles.length,
        userId: user.uid,
        totalSize: acceptedFiles.reduce((acc, file) => acc + file.size, 0),
        files: acceptedFiles.map(f => ({ name: f.name, size: f.size }))
      }
    });

    setError(null);
    setSuccess(null);

    setImportQueue(acceptedFiles.map(file => ({
      fileName: file.name,
      status: 'queued',
      progress: 0
    })));

    for (let i = 0; i < acceptedFiles.length; i++) {
      const file = acceptedFiles[i];
      
      try {
        if (!file.name.endsWith('.zip')) {
          logger.warn('Invalid file type rejected', {
            operation: 'articleImport',
            importId,
            fileInfo: {
              name: file.name,
              type: file.type,
              size: file.size
            }
          });
          throw new Error(t('reading.import.error.invalidZip'));
        }

        logger.info('Processing article package', {
          operation: 'articleImport',
          importId,
          progress: {
            current: i + 1,
            total: acceptedFiles.length,
            fileName: file.name
          }
        });

        setImportQueue(prev => prev.map((item, index) => 
          index === i ? { ...item, status: 'processing' as const } : item
        ));

        const article = await processZipFile(file);
        await importArticle(user.uid, article);

        logger.info('Article successfully imported', {
          operation: 'articleImport',
          importId,
          articleInfo: {
            fileName: file.name,
            index: i + 1,
            total: acceptedFiles.length
          }
        });

        setImportQueue(prev => prev.map((item, index) => 
          index === i ? { ...item, status: 'completed' as const, progress: 100 } : item
        ));

      } catch (err) {
        logger.error('Article import failed', err as Error, {
          operation: 'articleImport',
          importId,
          fileInfo: {
            name: file.name,
            index: i + 1,
            total: acceptedFiles.length
          }
        });
        setImportQueue(prev => prev.map((item, index) => 
          index === i ? {
            ...item,
            status: 'failed' as const,
            error: err instanceof Error ? err.message : 'Unknown error'
          } : item
        ));
      }
    }

    const failedImports = importQueue.filter(item => item.status === 'failed').length;
    if (failedImports === 0) {
      setSuccess(t('reading.import.success'));
    } else {
      setError(t('reading.import.error.partialFail'));
    }
  }, [user]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/zip': ['.zip']
    },
    maxSize: 10485760, // 10MB
    multiple: true 
  });

  const renderImportProgress = () => (
    <Box sx={{ mt: 2 }}>
      {importQueue.map((item, index) => (
        <Box key={index} sx={{ mb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body2" noWrap sx={{ maxWidth: '80%' }}>
              {item.fileName}
            </Typography>
            <Typography variant="body2" color={
              item.status === 'completed' ? 'success.main' :
              item.status === 'failed' ? 'error.main' :
              'text.secondary'
            }>
              {t(`reading.import.status.${item.status}`)}
            </Typography>
          </Box>
          <LinearProgress 
            variant={item.status === 'processing' ? 'indeterminate' : 'determinate'}
            value={item.progress}
            color={
              item.status === 'completed' ? 'success' :
              item.status === 'failed' ? 'error' :
              'primary'
            }
            sx={{ height: 4, borderRadius: 2 }}
          />
          {item.error && (
            <Typography variant="caption" color="error.main">
              {item.error}
            </Typography>
          )}
        </Box>
      ))}
    </Box>
  );

  return (
    <Box sx={{ mb: 3 }}>
      <Paper
        {...getRootProps()}
        sx={{
          p: 3,
          border: '2px dashed',
          borderColor: isDragActive ? 'primary.main' : 'divider',
          bgcolor: isDragActive ? 'action.hover' : 'background.paper',
          cursor: 'pointer',
          transition: 'all 0.2s'
        }}
      >
        <input {...getInputProps()} />
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>
              {t('reading.import.dropzone.title')}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {t('reading.import.dropzone.description')}
            </Typography>
          </Box>
        )}
      </Paper>

      {importQueue.length > 0 && renderImportProgress()}

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          <AlertTitle>Error</AlertTitle>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mt: 2 }}>
          {success}
        </Alert>
      )}
    </Box>
  );
interface ImportStage {
  stage: 'importing' | 'analyzing' | 'saving';
  progress: number;
}
}

