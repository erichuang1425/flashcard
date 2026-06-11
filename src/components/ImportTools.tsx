import React, { useState, useEffect } from 'react';
import { 
  Box, Button, Typography, LinearProgress, Alert, 
  Table, TableBody, TableCell, TableHead, TableRow,
  Paper, Stepper, Step, StepLabel, CircularProgress,
  TablePagination, Tooltip, IconButton, ToggleButton, 
  ToggleButtonGroup, TextField, Grid, MenuItem,
  SelectChangeEvent, 
} from '@mui/material';
import PreviewIcon from '@mui/icons-material/Preview';
import ErrorIcon from '@mui/icons-material/Error';
import { addCategory, addFlashcard, getCategories } from '../services/firestore';
import { useAuth } from '../context/AuthContext';
import { parseCSVLine, normalizeCSVText } from '../utils/csv';
import { useLanguage } from '../i18n/LanguageContext';

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

interface RowError {
  row: number;
  reason: string;
}

interface BundledPack {
  /** Stable id used to track which pack is currently loading. */
  id: string;
  /** Button label shown to the user. */
  labelKey: string;
  /** Public path fetched for the pack's CSV. */
  file: string;
  /** Category automatically tagged onto every card in the pack. */
  category: string;
  /** Short helper text describing the pack. */
  descriptionKey: string;
}

// Curated word lists bundled with the app and importable in one click. Each
// CSV lives under /public and uses the standard
// word,partOfSpeech,englishDefinition,chineseTranslation columns. The PTE
// Academic and TOEFL iBT packs ship with Traditional Chinese translations.
const BUNDLED_PACKS: BundledPack[] = [
  {
    id: 'sat',
    labelKey: 'import.pack.satLabel',
    file: '/sat.csv',
    category: 'SAT',
    descriptionKey: 'import.pack.sat',
  },
  {
    id: 'pte-academic-core',
    labelKey: 'import.pack.pteCoreLabel',
    file: '/pte-academic-core.csv',
    category: 'PTE Academic',
    descriptionKey: 'import.pack.pteCore',
  },
  {
    id: 'pte-academic-advanced',
    labelKey: 'import.pack.pteAdvancedLabel',
    file: '/pte-academic-advanced.csv',
    category: 'PTE Academic',
    descriptionKey: 'import.pack.pteAdvanced',
  },
  {
    id: 'pte-describe-image',
    labelKey: 'import.pack.pteImageLabel',
    file: '/pte-describe-image.csv',
    category: 'PTE Academic',
    descriptionKey: 'import.pack.pteImage',
  },
  {
    id: 'pte-essay-connectors',
    labelKey: 'import.pack.pteEssayLabel',
    file: '/pte-essay-connectors.csv',
    category: 'PTE Academic',
    descriptionKey: 'import.pack.pteEssay',
  },
  {
    id: 'toefl-reading-academic-core',
    labelKey: 'import.pack.toeflReadingCoreLabel',
    file: '/toefl-reading-academic-core.csv',
    category: 'TOEFL iBT',
    descriptionKey: 'import.pack.toeflReadingCore',
  },
  {
    id: 'toefl-connectors',
    labelKey: 'import.pack.toeflConnectorsLabel',
    file: '/toefl-connectors.csv',
    category: 'TOEFL iBT',
    descriptionKey: 'import.pack.toeflConnectors',
  },
  {
    id: 'toefl-writing-build-a-sentence',
    labelKey: 'import.pack.toeflBuildSentenceLabel',
    file: '/toefl-writing-build-a-sentence.csv',
    category: 'TOEFL iBT',
    descriptionKey: 'import.pack.toeflBuildSentence',
  },
  {
    id: 'toefl-writing-email',
    labelKey: 'import.pack.toeflEmailLabel',
    file: '/toefl-writing-email.csv',
    category: 'TOEFL iBT',
    descriptionKey: 'import.pack.toeflEmail',
  },
  {
    id: 'toefl-writing-academic-discussion',
    labelKey: 'import.pack.toeflDiscussionLabel',
    file: '/toefl-writing-academic-discussion.csv',
    category: 'TOEFL iBT',
    descriptionKey: 'import.pack.toeflDiscussion',
  },
  {
    id: 'toefl-reading-word-families',
    labelKey: 'import.pack.toeflWordFamiliesLabel',
    file: '/toefl-reading-word-families.csv',
    category: 'TOEFL iBT',
    descriptionKey: 'import.pack.toeflWordFamilies',
  },
  {
    id: 'toefl-listening-speaking',
    labelKey: 'import.pack.toeflListeningSpeakingLabel',
    file: '/toefl-listening-speaking.csv',
    category: 'TOEFL iBT',
    descriptionKey: 'import.pack.toeflListeningSpeaking',
  },
];


export const ImportTools: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
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
  const [importMode, setImportMode] = useState<'file' | 'manual'>('file');
  const [manualEntry, setManualEntry] = useState({
    word: '',
    partOfSpeech: '',
    englishDefinition: '',
    chineseTranslation: '',
    categories: [] as string[]
  });
  const [globalCategories, setGlobalCategories] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [rowErrors, setRowErrors] = useState<RowError[]>([]);
  const [manualSuccess, setManualSuccess] = useState<string | null>(null);

  const handleCategoryChange = (event: SelectChangeEvent<string[]>) => {
    setSelectedCategories(event.target.value as string[]);
  };

  useEffect(() => {
    const loadCategories = async () => {
      if (!user) return;
      try {
        // Read from the dedicated (small) categories collection scoped to this
        // user instead of streaming the entire flashcard library just to
        // collect distinct category names.
        const cats = await getCategories(user.uid);
        const uniqueCategories = new Set<string>(cats.map(cat => cat.name));
        setGlobalCategories(Array.from(uniqueCategories));
      } catch (err) {
        setError(t('import.loadCategoriesFailed'));
      }
    };
    loadCategories();
  }, [user, t]);

  const processCSV = async (csvText: string) => {
    try {
      const dataLines = normalizeCSVText(csvText).split('\n')
        .filter(line => line.trim())
        .slice(1);
      
      // Move to import stage immediately
      setActiveStep(2);
      setStats({ total: dataLines.length, processed: 0, success: 0, failed: 0, completed: false });
      setRowErrors([]);

      // Process in smaller batches to allow UI updates
      const batchSize = 5;
      for (let i = 0; i < dataLines.length; i += batchSize) {
        const batch = dataLines.slice(i, i + batchSize);

        // Process each item in the current batch
        for (let j = 0; j < batch.length; j++) {
          const lineIndex = i + j;
          // +2 maps the zero-based data index back to the original file line
          // number (one header row plus 1-based counting) for error reports.
          const rowNumber = lineIndex + 2;
          const [word, partOfSpeech, englishDefinition, chineseTranslation] = parseCSVLine(batch[j]);

          const missing = !word || !partOfSpeech || !englishDefinition || !chineseTranslation;

          const recordFailure = (reason: string) => {
            setRowErrors(prev => [...prev, { row: rowNumber, reason }]);
            setStats(prev => ({
              ...prev,
              processed: lineIndex + 1,
              failed: prev.failed + 1,
              completed: (lineIndex + 1) === dataLines.length
            }));
          };

          if (missing || !user) {
            // Previously these rows were silently skipped, leaving
            // processed < total so the progress bar never reached 100% and
            // the completion alert never appeared.
            recordFailure(missing ? t('import.missingFields') : t('import.notSignedIn'));
            continue;
          }

          try {
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
              processed: lineIndex + 1,
              success: prev.success + 1,
              completed: (lineIndex + 1) === dataLines.length
            }));
          } catch (err) {
            recordFailure(err instanceof Error ? err.message : t('import.saveFailed'));
          }
        }
        
        // Add a small delay between batches to allow UI updates
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('import.failed'));
    }
  };

  // Build the preview table from raw CSV text. Shared by file upload and the
  // bundled SAT word list so both paths use the exact same parsing.
  const buildPreviewFromText = (csvText: string) => {
    const lines = normalizeCSVText(csvText).split('\n').filter(line => line.trim());
    const allPreviewData = lines.slice(1).map(line => {
      const [word, partOfSpeech, englishDefinition, chineseTranslation] = parseCSVLine(line);
      return { word, partOfSpeech, englishDefinition, chineseTranslation, categories: [] };
    });
    setFullPreview(allPreviewData);
    setPreview(allPreviewData.slice(0, rowsPerPage));
    setPage(0);
    setActiveStep(1);
    setText(csvText);
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
        buildPreviewFromText(text);
      };
      reader.readAsText(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('import.failed'));
    } finally {
      setUploading(false);
    }
  };

  const handleLoadPack = async (pack: BundledPack) => {
    if (!user) return;

    try {
      setLoadingPackId(pack.id);
      setError(null);
      const response = await fetch(pack.file);
      if (!response.ok) {
        throw new Error(t('import.couldNotLoadPack', { pack: t(pack.labelKey) }));
      }
      const csvText = await response.text();
      setSelectedCategories(prev => (prev.includes(pack.category) ? prev : [...prev, pack.category]));
      buildPreviewFromText(csvText);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('import.loadPackFailed', { pack: t(pack.labelKey) })
      );
    } finally {
      setLoadingPackId(null);
    }
  };

  const [text, setText] = useState<string | null>(null);
  const [loadingPackId, setLoadingPackId] = useState<string | null>(null);

  // Return the importer to its initial "Select File" state. Without this the
  // page got stuck on the progress screen after an import finished, with no way
  // back to upload another file or load another pack short of a full reload.
  const resetImport = () => {
    setActiveStep(0);
    setStats({ total: 0, processed: 0, success: 0, failed: 0, completed: false });
    setPreview([]);
    setFullPreview([]);
    setRowErrors([]);
    setText(null);
    setSelectedCategories([]);
    setPage(0);
    setError(null);
  };

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
              <TableCell>{t('common.word')}</TableCell>
              <TableCell>{t('common.partOfSpeech')}</TableCell>
              <TableCell>{t('common.englishDefinition')}</TableCell>
              <TableCell>{t('common.chineseTranslation')}</TableCell>
              <TableCell align="center">{t('common.status')}</TableCell>
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
                    <Tooltip title={t('import.table.missingFields')} arrow>
                      <ErrorIcon color="error" />
                    </Tooltip>
                  ) : (
                    <Tooltip title={t('import.table.valid')} arrow>
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
        labelRowsPerPage={t('import.pagination.rowsPerPage')}
        labelDisplayedRows={({ from, to, count }) =>
          t('import.pagination.displayedRows', { from, to, count })
        }
      />
    </Paper>
  );

  const renderProgress = () => {
    const progressPct = stats.total > 0 ? (stats.processed / stats.total) * 100 : 0;
    return (
    <Box sx={{ mt: 2 }}>
      <LinearProgress
        variant="determinate"
        value={progressPct}
        sx={{ height: 8, borderRadius: 2 }}
      />
      <Typography variant="body2" sx={{ mt: 1 }}>
        {t('import.progress', {
          percent: Math.round(progressPct),
          processed: stats.processed,
          total: stats.total,
        })}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {t('import.stats', { success: stats.success, failed: stats.failed })}
      </Typography>
      {stats.completed && (
        <Alert severity={stats.failed > 0 ? 'warning' : 'success'} sx={{ mt: 2 }}>
          {stats.failed > 0
            ? t('import.completeWithFailures', { success: stats.success, failed: stats.failed })
            : t('import.complete', { success: stats.success })}
        </Alert>
      )}
      {rowErrors.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="subtitle2">
              {t('import.rowsFailed', { count: rowErrors.length })}
            </Typography>
            <Button size="small" onClick={handleDownloadErrors}>
              {t('import.downloadErrors')}
            </Button>
          </Box>
          <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('common.row')}</TableCell>
                  <TableCell>{t('common.reason')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rowErrors.map(({ row, reason }) => (
                  <TableRow key={row}>
                    <TableCell>{row}</TableCell>
                    <TableCell>{reason}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </Box>
      )}
    </Box>
    );
  };

  const handleDownloadErrors = () => {
    const header = 'row,reason';
    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const body = rowErrors
      .map(({ row, reason }) => `${row},${escape(reason)}`)
      .join('\n');
    const blob = new Blob([`${header}\n${body}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'import-errors.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleManualSubmit = async () => {
    if (!user) return;
    
    try {
      setUploading(true);
      setError(null);
      setManualSuccess(null);
      const addedWord = manualEntry.word.trim();
      await addFlashcard({
        userId: user.uid,
        ...manualEntry,
        difficulty: 0,
        created: new Date(),
        lastReviewed: undefined,
        nextReview: new Date(),
        mastered: false
      });

      setManualSuccess(addedWord);

      // Reset form after successful submission
      setManualEntry({
        word: '',
        partOfSpeech: '',
        englishDefinition: '',
        chineseTranslation: '',
        categories: [] as string[]
      });

      setStats(prev => ({
        ...prev,
        total: prev.total + 1,
        processed: prev.processed + 1,
        success: prev.success + 1,
        completed: true
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('import.addFailed'));
    } finally {
      setUploading(false);
    }
  };

  const renderManualEntry = () => (
    <Box sx={{ mt: 2 }}>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label={t('common.word')}
            value={manualEntry.word}
            onChange={(e) => setManualEntry(prev => ({ ...prev, word: e.target.value }))}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label={t('common.partOfSpeech')}
            value={manualEntry.partOfSpeech}
            onChange={(e) => setManualEntry(prev => ({ ...prev, partOfSpeech: e.target.value }))}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            multiline
            rows={2}
            label={t('common.englishDefinition')}
            value={manualEntry.englishDefinition}
            onChange={(e) => setManualEntry(prev => ({ ...prev, englishDefinition: e.target.value }))}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label={t('common.chineseTranslation')}
            value={manualEntry.chineseTranslation}
            onChange={(e) => setManualEntry(prev => ({ ...prev, chineseTranslation: e.target.value }))}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label={t('import.categoriesLabel')}
            value={manualEntry.categories.join(', ')}
            onChange={(e) => setManualEntry(prev => ({ 
              ...prev, 
              categories: e.target.value.split(',').map(c => c.trim()).filter(c => c)
            }))}
            helperText={t('import.categoriesHint')}
          />
        </Grid>
        <Grid item xs={12}>
          <Button
            variant="contained"
            onClick={handleManualSubmit}
            disabled={
              uploading ||
              !manualEntry.word.trim() ||
              !manualEntry.partOfSpeech.trim() ||
              !manualEntry.englishDefinition.trim() ||
              !manualEntry.chineseTranslation.trim()
            }
          >
            {t('import.addFlashcard')}
          </Button>
        </Grid>
        {manualSuccess && (
          <Grid item xs={12}>
            <Alert severity="success" onClose={() => setManualSuccess(null)}>
              {t('import.added', { word: manualSuccess })}
            </Alert>
          </Grid>
        )}
      </Grid>
    </Box>
  );

  const renderCategorySelect = () => (
    <Box sx={{ mt: 2, mb: 2 }}>
      <TextField
        select
        fullWidth
        label={t('import.addCategories')}
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
        label={t('import.addCategory')}
        placeholder={t('import.addCategoryPlaceholder')}
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

  const handleNewCategory = async (newCategory: string) => {
    if (!user || !newCategory.trim() || globalCategories.includes(newCategory)) {
      return;
    }
  
    try {
      await addCategory(newCategory.trim(), user.uid);
      setGlobalCategories(prev => [...prev, newCategory.trim()]);
      setSelectedCategories(prev => [...prev, newCategory.trim()]);
    } catch (err) {
      setError(t('import.createCategoryFailed'));
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <ToggleButtonGroup
        value={importMode}
        exclusive
        onChange={(_, newMode) => newMode && setImportMode(newMode)}
        sx={{ 
          mb: 3,
          display: 'flex',
          flexWrap: 'wrap',
          '& .MuiToggleButton-root': {
            flex: { xs: '1 1 auto', sm: '0 1 auto' }
          }
        }}
      >
        <ToggleButton value="file">
          {t('import.mode.file')}
        </ToggleButton>
        <ToggleButton value="manual">
          {t('import.mode.manual')}
        </ToggleButton>
      </ToggleButtonGroup>

      {importMode === 'file' ? (
        <>
          <Stepper 
            activeStep={activeStep} 
            sx={{ 
              mb: 3,
              '& .MuiStepLabel-root': {
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: 'center',
              },
              '& .MuiStepLabel-labelContainer': {
                mt: { xs: 1, sm: 0 }
              },
              '& .MuiStepConnector-root': {
                display: { xs: 'none', sm: 'block' }
              },
              '& .MuiStep-root': {
                p: { xs: 1, sm: 2 },
                flex: { xs: '1 1 33.333%', sm: 'initial' }
              },
              '& .MuiStepLabel-label': {
                textAlign: 'center',
                fontSize: { xs: '0.75rem', sm: '0.875rem' }
              }
            }}
          >
            <Step>
              <StepLabel>{t('import.step.select')}</StepLabel>
            </Step>
            <Step>
              <StepLabel>{t('import.step.preview')}</StepLabel>
            </Step>
            <Step>
              <StepLabel>{t('import.step.import')}</StepLabel>
            </Step>
          </Stepper>

          {activeStep === 0 && (
            <>
              <Typography variant="h6" gutterBottom>
                {t('import.action.import')}
              </Typography>
              {renderCategorySelect()}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
                <Button
                  variant="contained"
                  component="label"
                  disabled={uploading || loadingPackId !== null}
                >
                  {t('import.upload')}
                  <input
                    type="file"
                    hidden
                    accept=".csv,.txt"
                    onChange={handleFileUpload}
                  />
                </Button>
              </Box>
              <Typography variant="subtitle2" sx={{ mt: 3 }}>
                {t('import.packs')}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', mt: 1 }}>
                {BUNDLED_PACKS.map((pack) => (
                  <Tooltip key={pack.id} title={t(pack.descriptionKey)} arrow>
                    <span>
                      <Button
                        variant="outlined"
                        onClick={() => handleLoadPack(pack)}
                        disabled={uploading || loadingPackId !== null}
                        startIcon={loadingPackId === pack.id ? <CircularProgress size={16} /> : undefined}
                      >
                        {t(pack.labelKey)}
                      </Button>
                    </span>
                  </Tooltip>
                ))}
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {t('import.packsDescription')}
              </Typography>
            </>
          )}

          {activeStep === 1 && (
            <>
              <Typography variant="h6" gutterBottom>
                {t('import.previewTitle')}
              </Typography>
              {renderPreview()}
              <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                <Button variant="contained" onClick={() => setActiveStep(0)}>
                  {t('common.back')}
                </Button>
                <Button 
                  variant="contained" 
                  onClick={() => text && processCSV(text)}
                  disabled={!text}
                >
                  {t('import.start')}
                </Button>
              </Box>
            </>
          )}

          {activeStep === 2 && (
            <>
              <Typography variant="h6" gutterBottom>
                {t('import.progressTitle')}
              </Typography>
              {renderProgress()}
              {stats.completed && (
                <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Button variant="contained" onClick={resetImport}>
                    {t('import.more')}
                  </Button>
                </Box>
              )}
            </>
          )}
        </>
      ) : (
        <>
          <Typography variant="h6" gutterBottom>
            {t('import.manualTitle')}
          </Typography>
          {renderManualEntry()}
        </>
      )}

      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      {uploading && <CircularProgress sx={{ mt: 2 }} />}
    </Box>
  );
};
