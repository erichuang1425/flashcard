import React, { useState } from 'react';
import { Box, Button, TextField, Typography, Alert, Paper, Divider } from '@mui/material';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import GoogleIcon from '@mui/icons-material/Google';
import { useI18n } from '../i18n/I18nContext';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { signIn, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const { t } = useI18n();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      await signIn(email, password);
      navigate('/');
    } catch (err) {
      setError('Failed to sign in');
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setError('');
      await signInWithGoogle();
      navigate('/');
    } catch (err) {
      setError('Failed to sign in with Google');
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
        <Typography variant="h5" component="h1" gutterBottom>
          {t('auth.login')}
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{t('auth.errors.failed')}</Alert>}
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
          <TextField
            margin="normal"
            required
            fullWidth
            label={t('auth.email')}
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            label={t('auth.password')}
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
            {t('auth.signIn')}
          </Button>
          
          <Divider sx={{ my: 2 }}>or</Divider>
          
          <Button
            fullWidth
            variant="outlined"
            startIcon={<GoogleIcon />}
            onClick={handleGoogleSignIn}
            sx={{ mb: 2 }}
          >
            {t('auth.googleSignIn')}
          </Button>

          <Typography variant="body2" align="center">
            Don't have an account?{' '}
            <Link to="/register">Register here</Link>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};