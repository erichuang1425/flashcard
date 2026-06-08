import React from 'react';
import { Container, Typography, Box, Paper } from '@mui/material';
import { ImportTools } from '../components/ImportTools';
import { GuideTip } from '../components/guide/GuideTip';
import { useLanguage } from '../i18n/LanguageContext';

export const Import: React.FC = () => {
  const { t } = useLanguage();
  return (
    <Container maxWidth="md" sx={{
      py: { xs: 2, sm: 4 },
      px: { xs: 1, sm: 3 }  // Add responsive padding
    }}>
      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: { xs: 2, sm: 3 }
      }}>
        <Typography variant="h4" gutterBottom>
          Import Flashcards
        </Typography>
        <GuideTip
          id="import.add"
          order={1}
          title={t('guide.import.title')}
          body={t('guide.import.body')}
          placement="top"
        >
          <Paper sx={{
            p: { xs: 2, sm: 3 },
            overflow: 'hidden' // Prevent content overflow
          }}>
            <Typography variant="body1" paragraph>
              Upload a CSV file with four columns: word, part of speech, English definition, and Chinese translation.
            </Typography>
            <ImportTools />
          </Paper>
        </GuideTip>
      </Box>
    </Container>
  );
};
