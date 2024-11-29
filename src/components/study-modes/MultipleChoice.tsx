import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, Paper, Alert } from '@mui/material';
import { getUserFlashcards, saveStudyProgress } from '../../services/firestore';
import type { Flashcard } from '../../types';
import { capitalizeFirstWord } from '../../utils/text';
import { useI18n } from '../../i18n/I18nContext';
import { useAudio } from '../../hooks/useAudio';

interface Props {
  card: Flashcard;
  onAnswer: (isCorrect: boolean) => void;
}

export const MultipleChoice: React.FC<Props> = ({ card, onAnswer }): JSX.Element => {
  const { playSound } = useAudio();
  const [selected, setSelected] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState(false);
  const { t } = useI18n();
  const startTime = React.useRef(Date.now());

  interface EnhancedOption {
    english: string;
    chinese: string;
    original: Flashcard;
  }

  const [options, setOptions] = useState<EnhancedOption[]>([]);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        // Get similar cards based on part of speech or difficulty
        const response = await getUserFlashcards(card.userId);
        const similarCards = response.cards.filter((c: Flashcard) => 
          c.id !== card.id && 
          (c.partOfSpeech === card.partOfSpeech || c.difficulty === card.difficulty)
        );
        
        if (similarCards.length < 3) {

          const fallbackOptions = [
            {
              english: capitalizeFirstWord(`not ${card.englishDefinition}`),
              chinese: `不是${card.chineseTranslation}`,
              original: card
            },
            {
              english: capitalizeFirstWord(`different from ${card.englishDefinition}`),
              chinese: `與${card.chineseTranslation}不同`,
              original: card
            },
            {
              english: capitalizeFirstWord(`opposite of ${card.englishDefinition}`),
              chinese: `${card.chineseTranslation}的相反`,
              original: card
            }
          ];
          setOptions(shuffle([
            {
              english: capitalizeFirstWord(card.englishDefinition),
              chinese: card.chineseTranslation || '未翻译',
              original: card
            },
            ...fallbackOptions
          ]));
        } else {

          const wrongOptions = safeOptions(shuffle(similarCards).slice(0, 3));
          setOptions(shuffle([
            {
              english: capitalizeFirstWord(card.englishDefinition),
              chinese: card.chineseTranslation || '未翻译',
              original: card
            },
            ...wrongOptions
          ]));
        }
        setError(null);
      } catch (err) {
        console.error('Error loading options:', err);
        setError('Failed to load options');
      }
    };

    loadOptions();
  }, [card]);

  const handleSelect = async (option: string) => {
    if (showResult || !option) return;
    
    const correct = capitalizeFirstWord(card.englishDefinition) === option;
    setIsCorrect(correct);
    setShowResult(true);
    
    playSound(correct ? 'CORRECT_ANSWER' : 'WRONG_ANSWER');

    await saveStudyProgress(card.userId, {
      cardId: card.id,
      rating: correct ? 4 : 2, 
      isCorrect: correct,
      mode: 'multipleChoice',
      timeSpent: Date.now() - startTime.current
    });

    // Reset timer for next card
    startTime.current = Date.now();
    
    setTimeout(() => {
      onAnswer(correct);
      setSelected(null);
      setShowResult(false);
      setOptions([]);
    }, 1500);
  };

  return (
    <Paper sx={{ p: 3, width: '100%', maxWidth: 600 }}>
      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {t('study.errors.loadingOptions')}
        </Alert>
      ) : (
        <>
          <Typography variant="h4" align="center" gutterBottom>
            {card.word}
          </Typography>
          <Typography variant="subtitle1" align="center" color="text.secondary" sx={{ mb: 3 }}>
            {card.partOfSpeech}
          </Typography>
          <Box sx={{ display: 'grid', gap: 2 }}>
            {options.map((option) => (
              <Button
                key={option.english}
                variant={selected === option.english ? 'contained' : 'outlined'}
                onClick={() => handleSelect(option.english)}
                color={
                  showResult
                    ? option.english === capitalizeFirstWord(card.englishDefinition)
                      ? 'success'
                      : selected === option.english
                      ? 'error'
                      : 'primary'
                    : 'primary'
                }
                sx={{ 
                  py: 2, 
                  textAlign: 'left', 
                  textTransform: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: 0.5
                }}
              >
                <Typography variant="body1">
                  {option.english}
                </Typography>
                <Typography 
                  variant="body2" 
                  color="text.secondary"
                  sx={{ 
                    opacity: 0.8,
                    fontStyle: 'italic'
                  }}
                >
                  {option.chinese}
                </Typography>
              </Button>
            ))}
            
            {showResult && (
              <Alert 
                severity={isCorrect ? "success" : "error"}
                sx={{ mb: 2 }}
              >
                {isCorrect 
                  ? t('study.feedback.correct') 
                  : `${t('study.feedback.incorrect')} The correct answer is: "${capitalizeFirstWord(card.englishDefinition)}"`}
              </Alert>
            )}
          </Box>
        </>
      )}
    </Paper>
  );
};

const shuffle = <T,>(array: T[]): T[] => {
  return [...array].sort(() => Math.random() - 0.5);
};


const safeOptions = (cards: Flashcard[]) => 
  cards.filter(c => c.chineseTranslation).map(c => ({
    english: capitalizeFirstWord(c.englishDefinition),
    chinese: c.chineseTranslation as string,
    original: c
  }));