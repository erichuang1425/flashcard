import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  Paper,
  Divider,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import GoogleIcon from '@mui/icons-material/Google';
import { useLanguage } from '../i18n/LanguageContext';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { dvhMinHeight } from '../utils/viewport';
import { getAuthErrorKey, NEEDS_PASSWORD_LINK_CODE } from '../utils/authErrors';

export const Register: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  // Shown when Google sign-up finds an existing password account: registration
  // is really a sign-in, so we point the user to the login screen where the
  // Google credential links automatically.
  const [linkPrompt, setLinkPrompt] = useState('');
  const { signUp, signInWithGoogle, pendingLinkEmail } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    if (pendingLinkEmail) {
      setLinkPrompt(t('register.linkPrompt'));
    }
  }, [pendingLinkEmail, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      return setError(t('register.errorEmail'));
    }
    if (password.length < 6) {
      return setError(t('register.errorPasswordShort'));
    }
    if (password !== confirmPassword) {
      return setError(t('register.errorMismatch'));
    }

    try {
      setError('');
      await signUp(trimmedEmail, password, rememberMe);
      navigate('/');
    } catch (err) {
      setError(t(getAuthErrorKey(err, 'register.errorFail')));
    }
  };

  const handleGoogleSignUp = async () => {
    try {
      setError('');
      setLinkPrompt('');
      // First Google sign-in registers the account; a returning user simply
      // signs in. Either way they land in the app.
      await signInWithGoogle(rememberMe);
      navigate('/');
    } catch (err) {
      if ((err as { code?: string })?.code === NEEDS_PASSWORD_LINK_CODE) {
        setLinkPrompt(t('register.linkPrompt'));
        return;
      }
      setError(t(getAuthErrorKey(err, 'register.errorGoogle')));
    }
  };

  return (
    <Box sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      ...dvhMinHeight('80dvh')
    }}>
      <Paper sx={{ p: 4, maxWidth: '400px', width: '100%' }}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
          <LanguageSwitcher />
        </Box>
        <Typography variant="h5" component="h1" gutterBottom>
          {t('register.title')}
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {linkPrompt && <Alert severity="info" sx={{ mb: 2 }}>{linkPrompt}</Alert>}
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
          <TextField
            margin="normal"
            required
            fullWidth
            label={t('register.email')}
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
            label={t('register.password')}
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            label={t('register.confirmPassword')}
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                color="primary"
              />
            }
            label={t('register.rememberMe')}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 2, mb: 2 }}
          >
            {t('register.signUp')}
          </Button>

          <Divider sx={{ my: 2 }}>{t('register.or')}</Divider>

          <Button
            fullWidth
            variant="outlined"
            startIcon={<GoogleIcon />}
            onClick={handleGoogleSignUp}
            sx={{ mb: 2 }}
          >
            {t('register.google')}
          </Button>

          <Typography variant="body2" align="center">
            {t('register.haveAccount')}{' '}
            <Link to="/login">{t('register.loginHere')}</Link>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};
