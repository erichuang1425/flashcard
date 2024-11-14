import React, { useState } from 'react';
import { Container, Typography, Box, Paper, Grid, Button, TextField, InputAdornment } from '@mui/material';
import { ImportTools } from '../components/ImportTools';
import { useI18n } from '../i18n/I18nContext';
import SelectAllIcon from '@mui/icons-material/SelectAll';
import SearchIcon from '@mui/icons-material/Search';

export const Import: React.FC = () => {
  const { t } = useI18n();
  const [importMode, setImportMode] = useState<'file' | 'manual'>('file');

  return (
    <Container maxWidth="lg" sx={{ 
      py: { xs: 2, sm: 4 },
      px: { xs: 1, sm: 3 }
    }}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Typography variant="h4" gutterBottom>
            {t(importMode === 'file' ? 'import.fileImport.title' : 'import.manualEntry.title')}
          </Typography>
        </Grid>
        
        <Grid item xs={12}>
          <Paper sx={{ 
            p: { xs: 2, sm: 3 },
            overflow: 'hidden'
          }}>
            <ImportTools defaultMode={importMode} onModeChange={setImportMode} />
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};
