import React from 'react';
import { Box, Typography, Paper, Grid } from '@mui/material';
import type { StudyAnalytics } from '../../types/analytics';

interface Props {
  analytics: StudyAnalytics;
}

export const AnalyticsOverview: React.FC<Props> = ({ analytics }) => {
  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>Study Overview</Typography>
          <Box sx={{ mt: 2 }}>
            <Typography>Total Study Time: {analytics.totalStudyTime} minutes</Typography>
            <Typography>Cards Reviewed: {analytics.totalCardsReviewed}</Typography>
            <Typography>Accuracy Rate: {analytics.accuracyRate}%</Typography>
          </Box>
        </Paper>
      </Grid>
    </Grid>
  );
};