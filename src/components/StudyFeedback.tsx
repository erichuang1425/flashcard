import React from 'react';
import { Box, Button, ButtonGroup, Typography, Fade } from '@mui/material';

interface StudyFeedbackProps {
  onRating: (rating: 1 | 2 | 3 | 4 | 5) => void;
  disabled?: boolean;
}

export const StudyFeedback: React.FC<StudyFeedbackProps> = ({ onRating, disabled }) => {
  const ratings = [
    { value: 1, label: 'Again', color: 'error' },
    { value: 2, label: 'Hard', color: 'warning' },
    { value: 3, label: 'Good', color: 'info' },
    { value: 4, label: 'Easy', color: 'success' },
    { value: 5, label: 'Perfect', color: 'success' }
  ] as const;

  return (
    <Fade in={!disabled}>
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2" gutterBottom align="center">
          How well did you know this?
        </Typography>
        <ButtonGroup variant="contained" fullWidth>
          {ratings.map(({ value, label, color }) => (
            <Button
              key={value}
              onClick={() => onRating(value)}
              color={color as any}
              disabled={disabled}
            >
              {label}
            </Button>
          ))}
        </ButtonGroup>
      </Box>
    </Fade>
  );
};
