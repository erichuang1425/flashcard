import React from 'react';
import { Container, Typography, Box, Paper } from '@mui/material';
import { ImportTools } from '../components/ImportTools';

export const Import: React.FC = () => {
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
        <Paper sx={{ 
          p: { xs: 2, sm: 3 },
          overflow: 'hidden' // Prevent content overflow
        }}>
          <Typography variant="body1" paragraph>
            Upload a CSV file with two columns: front and back of the cards.
          </Typography>
          <ImportTools />
        </Paper>
      </Box>
    </Container>
  );
};
