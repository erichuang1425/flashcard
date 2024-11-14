import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Box, Typography, Paper, Button, 
  TextField, RadioGroup, FormControlLabel, Radio,
  LinearProgress, Alert, CircularProgress
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { getWorksheet, updateWorksheetProgress } from '../services/firestore';
import type { Worksheet, WorksheetQuestion } from '../types';
import { useI18n } from '../i18n/I18nContext';

export const StudyWorksheet = () => {
  const { worksheetId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [worksheet, setWorksheet] = useState<Worksheet | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const loadWorksheet = async () => {
      if (!user?.uid || !worksheetId) {
        setError('Missing required information');
        setLoading(false);
        return;
      }

      try {
        const data = await getWorksheet(user.uid, worksheetId);
        if (!data) {
          setError('Worksheet not found');
        } else {
          setWorksheet(data);
        }
      } catch (err) {
        setError('Error loading worksheet');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadWorksheet();
  }, [worksheetId, user]);

  const handleSubmitAnswer = async () => {
    if (!worksheet || !answer) return;
    
    const question = worksheet.questions[currentQuestionIndex];
    const isCorrect = question.type === 'multipleChoice' 
      ? answer === question.correctAnswer
      : true; // For other types, manual review needed

    try {
      const newStats = {
        ...worksheet.stats,
        completed: currentQuestionIndex + 1,
        accuracy: isCorrect 
          ? ((worksheet.stats.accuracy || 0) + 100) / (currentQuestionIndex + 1)
          : worksheet.stats.accuracy
      };

      await updateWorksheetProgress(user!.uid, worksheet.id!, newStats);
      
      // Move to next question or finish
      if (currentQuestionIndex + 1 < worksheet.questions.length) {
        setCurrentQuestionIndex(prev => prev + 1);
        setAnswer('');
      } else {
        navigate('/worksheets');
      }
    } catch (err) {
      setError('Failed to save progress');
      console.error(err);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !worksheet || !worksheet.questions || worksheet.questions.length === 0) {
    return (
      <Box p={3}>
        <Typography color="error">
          {error || t('worksheets.errors.noQuestions')}
        </Typography>
        <Button
          variant="contained"
          onClick={() => navigate('/worksheets')}
          sx={{ mt: 2 }}
        >
          {t('worksheets.actions.back')}
        </Button>
      </Box>
    );
  }

  const currentQuestion = worksheet.questions[currentQuestionIndex];
  
  if (!currentQuestion) {
    return (
      <Box p={3}>
        <Typography color="error">Question not found</Typography>
        <Button
          variant="contained"
          onClick={() => navigate('/worksheets')}
          sx={{ mt: 2 }}
        >
          Back to Worksheets
        </Button>
      </Box>
    );
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>{worksheet.title}</Typography>
        
        <LinearProgress 
          variant="determinate"
          value={(currentQuestionIndex / worksheet.questions.length) * 100}
          sx={{ mb: 4, height: 8, borderRadius: 2 }}
        />

        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            {t('worksheets.question', {
              values: {
                current: currentQuestionIndex + 1,
                total: worksheet.questions.length
              }
            })}
          </Typography>
          
          <Typography sx={{ mb: 3 }}>{currentQuestion.question}</Typography>

          {currentQuestion.type === 'multipleChoice' ? (
            <RadioGroup value={answer} onChange={(e) => setAnswer(e.target.value)}>
              {currentQuestion.options?.map((option, i) => (
                <FormControlLabel
                  key={i}
                  value={option}
                  control={<Radio />}
                  label={option}
                />
              ))}
            </RadioGroup>
          ) : (
            <TextField
              fullWidth
              multiline
              rows={4}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Enter your answer"
            />
          )}

          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
            <Button
              onClick={() => navigate('/worksheets')}
              variant="outlined"
            >
              {t('common.exit')}
            </Button>
            <Button
              onClick={handleSubmitAnswer}
              variant="contained"
              disabled={!answer}
            >
              {currentQuestionIndex + 1 === worksheet.questions.length ? t('common.finish') : t('common.next')}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};