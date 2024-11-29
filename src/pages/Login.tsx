import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  Paper,
  Divider,
  ToggleButtonGroup,
  ToggleButton,
  IconButton,
  InputAdornment,
  useTheme,
  useMediaQuery,
  Container,
  Card,
  Avatar
} from '@mui/material';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import GoogleIcon from '@mui/icons-material/Google';
import { useI18n } from '../i18n/I18nContext';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import SchoolIcon from '@mui/icons-material/School';
import { logger } from '../services/logging';
import { MobileAuthLayout } from '../components/auth/MobileAuthLayout';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { signIn, signInWithGoogle, user, loading, authInitialized } = useAuth();
  const navigate = useNavigate();
  const { t, setLanguage: setI18nLanguage } = useI18n();
  const [language, setLanguage] = useState('en');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Only redirect if auth is initialized and user exists
    if (user && !loading && authInitialized) {
      const redirectUrl = sessionStorage.getItem('redirectUrl') || '/';
      sessionStorage.removeItem('redirectUrl'); // Clean up after getting the URL
      navigate(redirectUrl, { replace: true });
    }
  }, [user, loading, authInitialized, navigate]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    try {
      setError('');
      setIsLoading(true);
      setIsExiting(true);
      await signIn(email, password);
      // Redirect handling is now done in useEffect
    } catch (err) {
      setError(t('auth.errors.failed'));
      setIsExiting(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setError('');
      setIsLoading(true);
      await signInWithGoogle();
      // Redirect is now handled by useEffect
    } catch (err) {
      logger.error('Google sign-in failed', err as Error);
      setError(t('auth.errors.googleFailed'));
      setIsLoading(false); // Make sure to set loading to false on error
    }
  };

  const handleLanguageChange = (event: React.MouseEvent<HTMLElement>, newLang: string) => {
    if (newLang) {
      setLanguage(newLang);
      setI18nLanguage(newLang as any);
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  if (isMobile) {
    return (
      <MobileAuthLayout onExit={async () => {
        setIsExiting(true);
        await new Promise(resolve => setTimeout(resolve, 800));
      }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Language Toggle */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <ToggleButtonGroup
              value={language}
              exclusive
              onChange={handleLanguageChange}
              aria-label="language"
              size="small"
              sx={{ 
                transform: 'scale(0.9)',
                '& .MuiToggleButton-root': {
                  px: 1,
                  py: 0.5,
                  fontSize: '0.8rem'
                }
              }}
            >
              <ToggleButton value="en">🇺🇸 EN</ToggleButton>
              <ToggleButton value="zh-TW">🇹🇼 中文</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Box component="form" onSubmit={handleSubmit}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<GoogleIcon />}
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              sx={{ 
                mb: 3, 
                py: 1.5,
                borderRadius: 2,
                borderWidth: 2,
                '&:hover': {
                  borderWidth: 2
                }
              }}
            >
              {t('auth.googleSignIn')}
            </Button>

            <Divider sx={{ my: 3 }}>
              <Typography variant="body2" color="text.secondary">
                {t('auth.or')}
              </Typography>
            </Divider>

            <TextField
              margin="normal"
              required
              fullWidth
              label={t('auth.email')}
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              sx={{ mb: 2 }}
            />

            <TextField
              margin="normal"
              required
              fullWidth
              label={t('auth.password')}
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={isLoading}
              sx={{ 
                mt: 3, 
                mb: 2,
                py: 1.5,
                borderRadius: 2,
                boxShadow: theme => `0 8px 24px -4px ${theme.palette.primary.main}40`
              }}
            >
              {t('auth.signIn')}
            </Button>

            <Typography variant="body2" align="center" sx={{ mt: 2 }}>
              {t('auth.noAccount')}{' '}
              <Link 
                to="/register" 
                style={{ 
                  color: theme.palette.primary.main,
                  textDecoration: 'none',
                  fontWeight: 500
                }}
              >
                {t('auth.createOne')}
              </Link>
            </Typography>
          </Box>
        </motion.div>
      </MobileAuthLayout>
    );
  }

  return (
    <Container 
      maxWidth={false}
      sx={{
        minHeight: '100vh',
        display: 'flex',
        p: { xs: 2, sm: 3 }, 
        bgcolor: 'background.default'
      }}
    >
      <Container
        maxWidth="xl"
        disableGutters
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: { xs: 2, sm: 3 },
          px: { xs: 1, sm: 2 }
        }}
      >
        <Card
          component={motion.div}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.6, ease: "easeOut" }}
          sx={{
            display: 'flex',
            width: '100%',
            maxWidth: '95vw',
            minHeight: { xs: '85vh', sm: '90vh' },
            borderRadius: 3,
            overflow: 'hidden',
            boxShadow: theme => `0 8px 40px -12px ${theme.palette.primary.main}20`
          }}
        >
          {/* Left side - Branding */}
          {!isMobile && (
            <Box
              sx={{
                flex: 1,
                background: theme => `linear-gradient(45deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
                p: 6,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                color: 'white',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                <SchoolIcon sx={{ 
                  fontSize: 80, 
                  mb: 4,
                  filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.2))'
                }} />
                <Typography variant="h4" fontWeight="bold" gutterBottom>
                  {t('auth.branding.title')}
                </Typography>
                <Typography 
                  variant="body1" 
                  sx={{ 
                    opacity: 0.9, 
                    mb: 4,
                    fontSize: '1.1rem',
                    lineHeight: 1.6 
                  }}
                >
                  {t('auth.branding.tagline')}
                </Typography>
              </motion.div>
            </Box>
          )}

          {/* Right side - Login Form */}
          <Box
            sx={{
              flex: 1,
              p: { xs: 3, sm: 6 },
              display: 'flex',
              flexDirection: 'column',
              background: 'white',
              position: 'relative'
            }}
          >
            <Box sx={{ 
              width: '100%',
              display: 'flex',
              justifyContent: 'flex-end',
              mb: 3
            }}>
              <ToggleButtonGroup
                value={language}
                exclusive
                onChange={handleLanguageChange}
                aria-label="language"
                size="small"
                sx={{
                  '& .MuiToggleButton-root': {
                    px: 1.5,
                    py: 0.5,
                    fontSize: '0.85rem'
                  }
                }}
              >
                <ToggleButton value="en">🇺🇸 EN</ToggleButton>
                <ToggleButton value="zh-TW">🇹🇼 中文</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center',
              mt: 2 
            }}>
              <Avatar sx={{ 
                bgcolor: 'primary.main',
                width: 48, 
                height: 48,
                mb: 2
              }}>
                <LockOutlinedIcon />
              </Avatar>

              <Typography 
                variant="h5" 
                component="h1" 
                gutterBottom 
                fontWeight="500"
                sx={{ mb: 4 }}
              >
                {t('auth.login')}
              </Typography>
            </Box>

            {error && (
              <Alert 
                severity="error" 
                sx={{ mb: 3, borderRadius: 2 }}
                variant="filled"
              >
                {t('auth.errors.failed')}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<GoogleIcon />}
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                sx={{ 
                  mb: 3, 
                  py: 1.5,
                  borderRadius: 2,
                  borderWidth: 2,
                  '&:hover': {
                    borderWidth: 2
                  }
                }}
              >
                {t('auth.googleSignIn')}
              </Button>

              <Divider sx={{ my: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  {t('auth.or')}
                </Typography>
              </Divider>

              <TextField
                margin="normal"
                required
                fullWidth
                label={t('auth.email')}
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                sx={{ mb: 2 }}
              />

              <TextField
                margin="normal"
                required
                fullWidth
                label={t('auth.password')}
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={isLoading}
                sx={{ 
                  mt: 3, 
                  mb: 2,
                  py: 1.5,
                  borderRadius: 2,
                  boxShadow: theme => `0 8px 24px -4px ${theme.palette.primary.main}40`
                }}
              >
                {t('auth.signIn')}
              </Button>

              <Typography variant="body2" align="center" sx={{ mt: 2 }}>
                {t('auth.noAccount')}{' '}
                <Link 
                  to="/register" 
                  style={{ 
                    color: theme.palette.primary.main,
                    textDecoration: 'none',
                    fontWeight: 500
                  }}
                >
                  {t('auth.createOne')}
                </Link>
              </Typography>
            </Box>
          </Box>
        </Card>
      </Container>
    </Container>
  );
};