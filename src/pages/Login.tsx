import React, { useState } from 'react';
import { Box, Button, TextField, Typography, Alert, Paper, Divider } from '@mui/material';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import GoogleIcon from '@mui/icons-material/Google';
import { useLanguage } from '../i18n/LanguageContext';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { signIn, signInWithGoogle } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      return setError(t('login.errorEmpty'));
    }
    try {
      setError('');
      await signIn(trimmedEmail, password);
      navigate('/');
    } catch (err) {
      setError(t('login.errorFail'));
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setError('');
      await signInWithGoogle();
      navigate('/');
    } catch (err) {
      setError(t('login.errorGoogle'));
    }
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '80vh' 
    }}>
      <Paper sx={{ p: 4, maxWidth: '400px', width: '100%' }}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
          <LanguageSwitcher />
        </Box>
        <Typography variant="h5" component="h1" gutterBottom>
          {t('login.title')}
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
          <TextField
            margin="normal"
            required
            fullWidth
            label={t('login.email')}
            type="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            label={t('login.password')}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
          >
            {t('login.signIn')}
          </Button>

          <Divider sx={{ my: 2 }}>{t('login.or')}</Divider>

          <Button
            fullWidth
            variant="outlined"
            startIcon={<GoogleIcon />}
            onClick={handleGoogleSignIn}
            sx={{ mb: 2 }}
          >
            {t('login.google')}
          </Button>

          <Typography variant="body2" align="center">
            {t('login.noAccount')}{' '}
            <Link to="/register">{t('login.registerHere')}</Link>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};