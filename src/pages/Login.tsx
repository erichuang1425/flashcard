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

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  // Set when a Google sign-in needs the user to confirm their password first so
  // the two accounts can be linked. While shown, submitting the form below links
  // Google automatically (handled inside AuthContext.signIn).
  const [linkPrompt, setLinkPrompt] = useState('');
  const { signIn, signInWithGoogle, pendingLinkEmail } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    if (!pendingLinkEmail) return;
    setEmail(pendingLinkEmail);
    setPassword('');
    setLinkPrompt(t('login.linkPrompt'));
  }, [pendingLinkEmail, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      return setError(t('login.errorEmpty'));
    }
    try {
      setError('');
      await signIn(trimmedEmail, password, rememberMe);
      navigate('/');
    } catch (err) {
      setError(t(getAuthErrorKey(err, 'login.errorFail')));
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setError('');
      setLinkPrompt('');
      const signedIn = await signInWithGoogle(rememberMe);
      if (signedIn) navigate('/');
    } catch (err) {
      if ((err as { code?: string })?.code === NEEDS_PASSWORD_LINK_CODE) {
        // Existing password account: prefill the email and ask for the password.
        // The next submit signs in and links Google onto the same account.
        const linkedEmail = (err as { email?: string })?.email;
        if (linkedEmail) setEmail(linkedEmail);
        setPassword('');
        setLinkPrompt(t('login.linkPrompt'));
        return;
      }
      setError(t(getAuthErrorKey(err, 'login.errorGoogle')));
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
          {t('login.title')}
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {linkPrompt && <Alert severity="info" sx={{ mb: 2 }}>{linkPrompt}</Alert>}
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
          <FormControlLabel
            control={
              <Checkbox
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                color="primary"
              />
            }
            label={t('login.rememberMe')}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 2, mb: 2 }}
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
