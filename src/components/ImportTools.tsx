import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  Box, Button, Typography, LinearProgress, Alert, 
  Table, TableBody, TableCell, TableHead, TableRow,
  Paper, Stepper, Step, StepLabel, CircularProgress,
  TablePagination, Tooltip, IconButton, ToggleButton, 
  ToggleButtonGroup, TextField, Grid, MenuItem,
  SelectChangeEvent, FormControl, InputLabel, Select, Chip
} from '@mui/material';
import PreviewIcon from '@mui/icons-material/Preview';
import ErrorIcon from '@mui/icons-material/Error';
import { uploadFile } from '../services/storage';
import { addCategory, addFlashcard, getUserFlashcards } from '../services/firestore';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import { ImportManualEntry } from './ImportManualEntry';
import type { FlashcardsResponse } from '../types/responses';
import type { Flashcard } from '../types';
import { translateToTraditionalChinese } from '../services/translationService';

interface ImportStats {
  total: number;
  processed: number;
  success: number;
  failed: number;
  completed: boolean; 
}

interface PreviewData {
  word: string;
  partOfSpeech: string;
  englishDefinition: string;
  chineseTranslation: string;
  categories: string[];
}

const parseCSVLine = (line: string): string[] => {
  const result = [];
  let cell = '';
  let isQuoted = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (isQuoted && line[i + 1] === '"') {
        // Handle escaped quotes
        cell += '"';
        i++;
      } else {
        // Toggle quote mode
        isQuoted = !isQuoted;
      }
    } else if (char === ',' && !isQuoted) {
      // End of cell
      result.push(cell.trim());
      cell = '';
    } else {
      cell += char;
    }
  }
  
  if (cell) {
    result.push(cell.trim());
  }
  
  return result;
};

interface ImportToolsProps {
  defaultMode: 'file' | 'manual';
  onModeChange: (mode: 'file' | 'manual') => void;
}

export const ImportTools: React.FC<ImportToolsProps> = ({ defaultMode, onModeChange }) => {
  const { user } = useAuth();
  const { t } = useI18n();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<ImportStats>({ 
    total: 0, 
    processed: 0, 
    success: 0, 
    failed: 0, 
    completed: false 
  });
  const [preview, setPreview] = useState<PreviewData[]>([]);
  const [activeStep, setActiveStep] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [fullPreview, setFullPreview] = useState<PreviewData[]>([]);
  const [importMode, setImportMode] = useState<'file' | 'manual'>(defaultMode);
  const [manualEntry, setManualEntry] = useState({
    word: '',
    partOfSpeech: '',
    englishDefinition: '',
    chineseTranslation: '',
    categories: [] as string[]
  });
  const [globalCategories, setGlobalCategories] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);

  const handleCategoryChange = (event: SelectChangeEvent<string[]>) => {
    setSelectedCategories(event.target.value as string[]);
  };

  useEffect(() => {
    const loadCategories = async () => {
      if (!user) return;
      try {
        const response: FlashcardsResponse = await getUserFlashcards(user.uid);
        const uniqueCategories = new Set<string>();
        response.cards.forEach((card: Flashcard) => {
          card.categories?.forEach((category: string) => uniqueCategories.add(category));
        });
        setGlobalCategories(Array.from(uniqueCategories));
      } catch (err) {
        setError('Failed to load categories');
      }
    };
    loadCategories();
  }, [user]);

  const processCSV = async (csvText: string) => {
    try {
      const dataLines = csvText.split('\n')
        .filter(line => line.trim())
        .slice(1);
      
      // Move to import stage immediately
      setActiveStep(2);
      setStats({ total: dataLines.length, processed: 0, success: 0, failed: 0, completed: false });
      
      // Process in smaller batches to allow UI updates
      const batchSize = 5;
      for (let i = 0; i < dataLines.length; i += batchSize) {
        const batch = dataLines.slice(i, i + batchSize);
        
        // Process each item in the current batch
        for (let j = 0; j < batch.length; j++) {
          const [word, partOfSpeech, englishDefinition, chineseTranslation] = parseCSVLine(batch[j]);
          
          try {
            if (word && partOfSpeech && englishDefinition && chineseTranslation && user) {
              await addFlashcard({
                userId: user.uid,
                word,
                partOfSpeech,
                englishDefinition,
                chineseTranslation,
                categories: selectedCategories,
                difficulty: 0,
                created: new Date(),
                lastReviewed: undefined,
                nextReview: new Date(),
                mastered: false
              });
              
              setStats(prev => ({ 
                ...prev, 
                processed: i + j + 1,
                success: prev.success + 1,
                completed: (i + j + 1) === dataLines.length
              }));
            }
          } catch (err) {
            setStats(prev => ({ 
              ...prev, 
              processed: i + j + 1,
              failed: prev.failed + 1,
              completed: (i + j + 1) === dataLines.length
            }));
          }
        }
        
        // Add a small delay between batches to allow UI updates
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import flashcards');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    try {
      setUploading(true);
      setError(null);
      
      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        const allPreviewData = lines.slice(1).map(line => {
          const [word, partOfSpeech, englishDefinition, chineseTranslation] = parseCSVLine(line);
          return { word, partOfSpeech, englishDefinition, chineseTranslation, categories: [] };
        });
        setFullPreview(allPreviewData);
        setPreview(allPreviewData.slice(0, rowsPerPage));
        setActiveStep(1);
        setText(text);
      };
      reader.readAsText(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setUploading(false);
    }
  };

  const [text, setText] = useState<string | null>(null);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
    setPreview(fullPreview.slice(newPage * rowsPerPage, (newPage + 1) * rowsPerPage));
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    setRowsPerPage(newRowsPerPage);
    setPage(0);
    setPreview(fullPreview.slice(0, newRowsPerPage));
  };

  const renderPreview = () => (
    <Paper sx={{ mt: 2, width: '100%', overflow: 'hidden' }}>
      <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell>Word</TableCell>
              <TableCell>Part of Speech</TableCell>
              <TableCell>English Definition</TableCell>
              <TableCell>Chinese Translation</TableCell>
              <TableCell align="center">Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {preview.map((row, index) => (
              <TableRow 
                key={index}
                sx={{ '&:nth-of-type(odd)': { backgroundColor: 'rgba(0, 0, 0, 0.04)' } }}
              >
                <TableCell>{row.word}</TableCell>
                <TableCell>{row.partOfSpeech}</TableCell>
                <TableCell>
                  <Tooltip title={row.englishDefinition} arrow>
                    <span>
                      {row.englishDefinition.length > 50 
                        ? `${row.englishDefinition.slice(0, 50)}...` 
                        : row.englishDefinition}
                    </span>
                  </Tooltip>
                </TableCell>
                <TableCell>{row.chineseTranslation}</TableCell>
                <TableCell align="center">
                  {!row.word || !row.partOfSpeech || !row.englishDefinition || !row.chineseTranslation ? (
                    <Tooltip title="Missing required fields" arrow>
                      <ErrorIcon color="error" />
                    </Tooltip>
                  ) : (
                    <Tooltip title="Valid entry" arrow>
                      <PreviewIcon color="success" />
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
      <TablePagination
        component="div"
        count={fullPreview.length}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[5, 10, 25]}
      />
    </Paper>
  );

  const renderProgress = () => (
    <Box sx={{ mt: 2 }}>
      <LinearProgress 
        variant="determinate" 
        value={(stats.processed / stats.total) * 100} 
        sx={{ height: 8, borderRadius: 2 }}
      />
      <Typography variant="body2" sx={{ mt: 1 }}>
        {t('import.progress.processed')}: {Math.round((stats.processed / stats.total) * 100)}%
        ({stats.processed}/{stats.total})
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {t('import.progress.success')}: {stats.success}, {t('import.progress.failed')}: {stats.failed}
      </Typography>
      {stats.completed && (
        <Alert severity="success" sx={{ mt: 2 }}>
          {stats.failed > 0 ? t('import.progress.completeWithErrors') : t('import.progress.complete')}
        </Alert>
      )}
    </Box>
  );

  const handleManualSubmit = async () => {
    if (!user) return;
    
    try {
      setUploading(true);
      setError(null);

      let chineseTranslation = manualEntry.chineseTranslation;

      // If Chinese translation is empty, attempt auto-translation
      if (!chineseTranslation && manualEntry.englishDefinition) {
        try {
          chineseTranslation = await translateToTraditionalChinese(manualEntry.englishDefinition);
        } catch (err) {
          console.error('Auto-translation failed:', err);
          setError(t('import.errors.translationFailed'));
          return;
        }
      }

      await addFlashcard({
        userId: user.uid,
        ...manualEntry,
        chineseTranslation,
        difficulty: 0,
        created: new Date(),
        lastReviewed: undefined,
        nextReview: new Date(),
        mastered: false
      });

      // Reset form and show success
      setManualEntry({
        word: '',
        partOfSpeech: '',
        englishDefinition: '',
        chineseTranslation: '',
        categories: []
      });

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add flashcard');
    } finally {
      setUploading(false);
    }
  };

  const renderManualEntry = () => (
    <Box>
      <ImportManualEntry 
        onSubmit={handleManualSubmit}
        availableCategories={globalCategories}
      />
      <Button
        variant="contained"
        onClick={handleManualSubmit}
        disabled={uploading}
        sx={{ mt: 2 }}
      >
        {t('import.actions.startImport')}
      </Button>
    </Box>
  );

  const renderCategorySelect = () => (
    <Box sx={{ mt: 2, mb: 2 }}>
      <TextField
        select
        fullWidth
        label="Add Categories to Imported Cards"
        value={selectedCategories}
        onChange={(e) => setSelectedCategories(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
        SelectProps={{
          multiple: true,
          renderValue: (selected) => (
            Array.isArray(selected) ? (selected as string[]).join(', ') : ''
          ),
        }}
      >
        {globalCategories.map((category) => (
          <MenuItem key={category} value={category}>
            {category}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        fullWidth
        label="Add New Category"
        placeholder="Type and press Enter to add"
        sx={{ mt: 1 }}
        onKeyDown={async (e) => {
          if (e.key === 'Enter' && (e.target as HTMLInputElement).value) {
            const newCategory = (e.target as HTMLInputElement).value;
            await handleNewCategory(newCategory);
            (e.target as HTMLInputElement).value = '';
          }
        }}
      />
    </Box>
  );

  const isValidEntry = () => {
    return manualEntry.word.trim() !== '' &&
           manualEntry.partOfSpeech.trim() !== '' &&
           manualEntry.englishDefinition.trim() !== '' &&
           manualEntry.chineseTranslation.trim() !== '';
  };

  const handleNewCategory = async (newCategory: string) => {
    if (!user || !newCategory.trim() || globalCategories.includes(newCategory)) {
      return;
    }
  
    try {
      await addCategory(newCategory.trim(), user.uid);
      setGlobalCategories(prev => [...prev, newCategory.trim()]);
      setSelectedCategories(prev => [...prev, newCategory.trim()]);
    } catch (err) {
      setError('Failed to create new category');
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    // ...existing onDrop logic...
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
    },
    maxSize: 5 * 1024 * 1024, // 5MB
  });

  const dropzoneStyles = {
    p: 3,
    border: '2px dashed',
    borderColor: isDragActive ? 'primary.main' : 'divider',
    bgcolor: isDragActive ? 'action.hover' : 'background.paper',
    cursor: 'pointer',
    '&:hover': {
      bgcolor: 'action.hover',
    },
  };

  const renderCategoryManagement = () => (
    <Box sx={{ mt: 3, mb: 2 }}>
      <Typography variant="subtitle1" gutterBottom>
        {t('import.manual.categories')}
      </Typography>
      <Box sx={{ 
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        gap: 2,
        alignItems: 'flex-start'
      }}>
        <FormControl sx={{ minWidth: 200, flex: 1 }}>
          <InputLabel>{t('import.manual.categories')}</InputLabel>
          <Select
            multiple
            value={selectedCategories}
            onChange={handleCategoryChange}
            label={t('import.manual.categories')}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {(selected as string[]).map((value) => (
                  <Chip 
                    key={value} 
                    label={value} 
                    size="small"
                    onDelete={() => {
                      const newCategories = selectedCategories.filter(cat => cat !== value);
                      setSelectedCategories(newCategories);
                    }}
                  />
                ))}
              </Box>
            )}
            MenuProps={{
              PaperProps: {
                style: {
                  maxHeight: 48 * 4.5,
                },
              },
            }}
          >
            {globalCategories.map((category) => (
              <MenuItem key={category} value={category}>
                {category}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box sx={{ 
          display: 'flex',
          gap: 1,
          alignItems: 'flex-start',
          flex: { xs: '1', sm: '0 0 auto' }
        }}>
          <TextField
            label={t('import.manual.help.categories')}
            size="small"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.target as HTMLInputElement).value) {
                handleNewCategory((e.target as HTMLInputElement).value);
                (e.target as HTMLInputElement).value = '';
              }
            }}
            sx={{ minWidth: 200 }}
            placeholder={t('import.manual.help.categories')}
          />
          <Button 
            variant="outlined"
            size="small"
            onClick={() => {
              const input = document.querySelector('input[name="new-category"]') as HTMLInputElement;
              if (input?.value) {
                handleNewCategory(input.value);
                input.value = '';
              }
            }}
            sx={{ height: 40 }}
          >
            {t('common.save')}
          </Button>
        </Box>
      </Box>
    </Box>
  );

  const renderFileImport = () => (
    <Box>
      <Stepper activeStep={activeStep} sx={{
        mb: 3,
        flexWrap: 'wrap',
        '& .MuiStep-root': {
          mb: { xs: 1, sm: 0 }
        }
      }}>
        <Step>
          <StepLabel>{t('import.steps.select')}</StepLabel>
        </Step>
        <Step>
          <StepLabel>{t('import.steps.preview')}</StepLabel>
        </Step>
        <Step>
          <StepLabel>{t('import.steps.import')}</StepLabel>
        </Step>
      </Stepper>

      {activeStep === 0 && (
        <>
          {renderCategoryManagement()}
          <Paper
            {...getRootProps()}
            sx={{
              p: 3,
              border: '2px dashed',
              borderColor: isDragActive ? 'primary.main' : 'divider',
              bgcolor: isDragActive ? 'action.hover' : 'background.paper',
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': {
                bgcolor: 'action.hover',
              },
            }}
          >
            <input {...getInputProps()} />
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" gutterBottom>
                {t('import.dropzone.title')}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {t('import.dropzone.accept')}
              </Typography>
              <Typography variant="caption" display="block" color="textSecondary">
                {t('import.dropzone.maxSize')}
              </Typography>
            </Box>
          </Paper>
        </>
      )}

      {activeStep === 1 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            {t('import.preview.title')}
          </Typography>
          {renderPreview()}
          <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
            <Button variant="contained" onClick={() => setActiveStep(0)}>
              {t('import.actions.back')}
            </Button>
            <Button 
              variant="contained" 
              onClick={() => text && processCSV(text)}
              disabled={!text}
            >
              {t('import.actions.startImport')}
            </Button>
          </Box>
        </Box>
      )}

      {activeStep === 2 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            {t('import.progress.title')}
          </Typography>
          {renderProgress()}
          {stats.processed === stats.total && (
            <Alert severity="success" sx={{ mt: 2 }}>
              Import complete! Successfully imported {stats.success} cards 
              {stats.failed > 0 && `, ${stats.failed} cards failed`}.
            </Alert>
          )}
        </Box>
      )}
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <ToggleButtonGroup
        value={importMode}
        exclusive
        onChange={(_, mode) => {
          if (mode) {
            setImportMode(mode);
            onModeChange(mode);
          }
        }}
        fullWidth
        sx={{
          display: 'flex',
          '.MuiToggleButton-root': {
            flex: 1,
            py: 1.5
          }
        }}
      >
        <ToggleButton value="file">
          {t('import.fileImport.title')}
        </ToggleButton>
        <ToggleButton value="manual">
          {t('import.manualEntry.title')}
        </ToggleButton>
      </ToggleButtonGroup>

      <Box>
        {importMode === 'file' ? renderFileImport() : renderManualEntry()}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
};
