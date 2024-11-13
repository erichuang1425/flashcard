import React from 'react';
import {
  Grid, Card, CardContent, Typography, 
  Box, Chip, useTheme, alpha
} from '@mui/material';
import { VocabularyWord } from '../types';
import { useInView } from 'react-intersection-observer';

interface WordGridProps {
  words: VocabularyWord[];
  onLoadMore: () => Promise<void>;
  hasMore: boolean;
}

export const WordGrid: React.FC<WordGridProps> = ({ words, onLoadMore, hasMore }) => {
  const theme = useTheme();
  const { ref, inView } = useInView({
    threshold: 0.1,
    onChange: (inView) => {
      if (inView && hasMore) {
        onLoadMore();
      }
    },
  });

  return (
    <Grid container spacing={2}>
      {words.map((word, index) => (
        <Grid 
          item 
          xs={12} 
          sm={6} 
          md={4} 
          lg={3} 
          key={word.id || index}
          ref={index === words.length - 3 ? ref : undefined}
        >
          <Card sx={{ 
            height: '100%',
            transition: 'transform 0.2s',
            '&:hover': {
              transform: 'translateY(-4px)'
            }
          }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {word.word}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {word.partOfSpeech}
              </Typography>
              <Typography variant="body1" paragraph>
                {word.englishDefinition}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {word.categories && word.categories.map((category) => (
                  <Chip
                    key={category}
                    label={category}
                    size="small"
                    sx={{
                      backgroundColor: alpha(theme.palette.primary.main, 0.1)
                    }}
                  />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};
