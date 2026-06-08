import React from 'react';
import { Box, LinearProgress, Typography, Paper, CircularProgress, Grid } from '@mui/material';
import type { StudyProgress } from '../types';

interface StudyProgressProps {
  progress: StudyProgress;
  total: number;
}

const StudyProgress: React.FC<StudyProgressProps> = ({ progress, total }) => {
  const completion = total > 0 ? (progress.cardsReviewed / total) * 100 : 0;
  const accuracy = progress.cardsReviewed > 0 
    ? (progress.correct / progress.cardsReviewed) * 100 
    : 0;

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      {/* Progress section */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>Overall Progress</Typography>
        <LinearProgress 
          variant="determinate" 
          value={completion} 
          sx={{ 
            height: 10, 
            borderRadius: 5,
            backgroundColor: 'action.hover',
            '& .MuiLinearProgress-bar': {
              borderRadius: 5
            }
          }} 
        />
        <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
          {progress.cardsReviewed} of {total} cards reviewed
        </Typography>
      </Box>

      {/* Stats grid */}
      <Grid container spacing={2}>
        {/* Streak stat */}
        <Grid item xs={6}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography 
              variant="h4" 
              sx={{ 
                color: theme => progress.streak >= 5 ? theme.palette.success.main : 'text.primary'
              }}
            >
              {progress.streak}
            </Typography>
            <Typography variant="body2">Current Streak</Typography>
          </Box>
        </Grid>

        {/* Accuracy stat */}
        <Grid item xs={6}>
          <Box sx={{ textAlign: 'center' }}>
            <Box sx={{ position: 'relative', display: 'inline-flex' }}>
              <CircularProgress
                variant="determinate"
                value={accuracy}
                size={60}
                thickness={4}
                sx={{ color: theme => accuracy >= 70 ? theme.palette.success.main : theme.palette.warning.main }}
              />
              <Box
                sx={{
                  top: 0,
                  left: 0,
                  bottom: 0,
                  right: 0,
                  position: 'absolute',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                  {accuracy.toFixed(0)}%
                </Typography>
              </Box>
            </Box>
            <Typography variant="body2" sx={{ mt: 1 }}>Accuracy</Typography>
          </Box>
        </Grid>

        {/* Additional stats */}
        <Grid item xs={6}>
          <Typography variant="body2" color="text.secondary">
            Correct: {progress.correct}
          </Typography>
        </Grid>
        <Grid item xs={6}>
          <Typography variant="body2" color="text.secondary">
            Incorrect: {progress.incorrect}
          </Typography>
        </Grid>
      </Grid>
    </Paper>
  );
};

export { StudyProgress };
