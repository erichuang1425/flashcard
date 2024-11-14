import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

interface Props {
  patterns: {
    day: string;
    count: number;
  }[];
}

export const StudyPatterns: React.FC<Props> = ({ patterns }) => {
  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>Weekly Study Pattern</Typography>
      <Box sx={{ mt: 2 }}>
        {patterns.map((pattern, index) => (
          <Box key={index} sx={{ mb: 1 }}>
            <Typography>{pattern.day}: {pattern.count} cards studied</Typography>
          </Box>
        ))}
      </Box>
    </Paper>
  );
};
