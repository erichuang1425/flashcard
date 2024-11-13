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
import { uploadFile } from '../services/storage';
import { addCategory, addFlashcard, getUserFlashcards } from '../services/firestore';
import { useAuth } from '../context/AuthContext';

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

export const ImportTools: React.FC = () => {
  const { user } = useAuth();
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

  const handleCategoryChange = (event: SelectChangeEvent<string[]>) => {
    setSelectedCategories(event.target.value as string[]);
  };

  useEffect(() => {
    const loadCategories = async () => {
      if (!user) return;
      try {

        const cards = await getUserFlashcards(user.uid);
        const uniqueCategories = new Set<string>();
        cards.forEach(card => {
          card.categories?.forEach(category => uniqueCategories.add(category));
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
        Progress: {Math.round((stats.processed / stats.total) * 100)}%
        ({stats.processed}/{stats.total})
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Success: {stats.success}, Failed: {stats.failed}
      </Typography>
      {stats.completed && (
        <Alert severity="success" sx={{ mt: 2 }}>
          Import completed! Successfully imported {stats.success} cards
          {stats.failed > 0 ? ` (${stats.failed} failed)` : ''}
        </Alert>
      )}
    </Box>
  );

  const handleManualSubmit = async () => {
    if (!user) return;
    
    try {
      setUploading(true);
      setError(null);
      await addFlashcard({
        userId: user.uid,
        ...manualEntry,
        difficulty: 0,
        created: new Date(),
        lastReviewed: undefined,
        nextReview: new Date(),
        mastered: false
      });

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
      setError(err instanceof Error ? err.message : 'Failed to add flashcard');
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
            label="Word"  
            value={manualEntry.word}
            onChange={(e) => setManualEntry(prev => ({ ...prev, word: e.target.value }))}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Part of Speech"
            value={manualEntry.partOfSpeech}
            onChange={(e) => setManualEntry(prev => ({ ...prev, partOfSpeech: e.target.value }))}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            multiline
            rows={2}
            label="English Definition"
            value={manualEntry.englishDefinition}
            onChange={(e) => setManualEntry(prev => ({ ...prev, englishDefinition: e.target.value }))}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Chinese Translation"
            value={manualEntry.chineseTranslation}
            onChange={(e) => setManualEntry(prev => ({ ...prev, chineseTranslation: e.target.value }))}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Categories (comma-separated)"
            value={manualEntry.categories.join(', ')}
            onChange={(e) => setManualEntry(prev => ({ 
              ...prev, 
              categories: e.target.value.split(',').map(c => c.trim()).filter(c => c)
            }))}
            helperText="Enter categories separated by commas"
          />
        </Grid>
        <Button>Add Flashcard</Button>
      </Grid>
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
          File Import
        </ToggleButton>
        <ToggleButton value="manual">
          Manual Entry
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
              <StepLabel>Select File</StepLabel>
            </Step>
            <Step>
              <StepLabel>Preview</StepLabel>
            </Step>
            <Step>
              <StepLabel>Import</StepLabel>
            </Step>
          </Stepper>

          {activeStep === 0 && (
            <>
              <Typography variant="h6" gutterBottom>
                Import Flashcards
              </Typography>
              {renderCategorySelect()}
              <Button
                variant="contained"
                component="label"
                disabled={uploading}
              >
                Upload CSV File
                <input
                  type="file"
                  hidden
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                />
              </Button>
            </>
          )}

          {activeStep === 1 && (
            <>
              <Typography variant="h6" gutterBottom>
                Preview Import Data
              </Typography>
              {renderPreview()}
              <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                <Button variant="contained" onClick={() => setActiveStep(0)}>
                  Back
                </Button>
                <Button 
                  variant="contained" 
                  onClick={() => text && processCSV(text)}
                  disabled={!text}
                >
                  Start Import
                </Button>
              </Box>
            </>
          )}

          {activeStep === 2 && (
            <>
              <Typography variant="h6" gutterBottom>
                Import Progress
              </Typography>
              {renderProgress()}
              {stats.processed === stats.total && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  Import complete! Successfully imported {stats.success} cards 
                  {stats.failed > 0 && `, ${stats.failed} cards failed`}.
                </Alert>
              )}
            </>
          )}
        </>
      ) : (
        <>
          <Typography variant="h6" gutterBottom>
            Manual Entry
          </Typography>
          {renderManualEntry()}
        </>
      )}

      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      {uploading && <CircularProgress sx={{ mt: 2 }} />}
    </Box>
  );
};
