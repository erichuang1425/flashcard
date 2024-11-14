import React from 'react';
import { Box, Typography, Paper, LinearProgress } from '@mui/material';

interface Props {
  categories: {
    category: string;
    progress: number;
    count: number;
    mastered: number;
  }[];
}

export const CategoryProgress: React.FC<Props> = ({ categories }) => {
  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>Category Progress</Typography>
      <Box sx={{ mt: 2 }}>
        {categories.map((category, index) => (
          <Box key={index} sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body2">{category.category}</Typography>
              <Typography variant="body2" color="text.secondary">
                {category.mastered}/{category.count} cards
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={category.progress} 
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>
        ))}
      </Box>
    </Paper>
  );
};
