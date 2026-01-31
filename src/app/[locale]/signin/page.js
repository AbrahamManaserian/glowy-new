'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '../../../i18n/navigation';
import { useAuth } from '../../../context/AuthContext';
import { useSearchParams } from 'next/navigation';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Divider,
  IconButton,
  Alert,
  CircularProgress,
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import FacebookIcon from '@mui/icons-material/Facebook';

export default function SignInPage() {
  const t = useTranslations('Auth');
  const router = useRouter();
  const { login, googleSignIn, facebookSignIn } = useAuth();
  const searchParams = useSearchParams();
  const from = searchParams.get('from') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      setSuccess(t('success_login'));
      setTimeout(() => {
        router.replace(from);
      }, 1000);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await googleSignIn();
      setSuccess(t('success_login'));
      router.replace(from);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleFacebookSignIn = async () => {
    try {
      await facebookSignIn();
      setSuccess(t('success_login'));
      router.replace(from);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          bgcolor: 'background.paper',
          p: { xs: 2, sm: 4 },
          borderRadius: 2,
          boxShadow: 3,
          mb: '5px',
        }}
      >
        <Typography component="h1" variant="h5" sx={{ mb: 3, fontWeight: 'bold' }}>
          {t('signin')}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ width: '100%', mb: 2 }}>
            {success}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
          <TextField
            margin="normal"
            required
            fullWidth
            size="small"
            id="email"
            label={t('email')}
            name="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            margin="normal"
            required
            size="small"
            fullWidth
            name="password"
            label={t('password')}
            type="password"
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={loading}
            sx={{ mt: 3, mb: 2, bgcolor: '#000', '&:hover': { bgcolor: '#333' } }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : t('signin')}
          </Button>

          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <Link href="#" style={{ fontSize: '0.875rem', color: '#666', textDecoration: 'none' }}>
              {t('forgot_password')}
            </Link>
          </Box>

          <Divider sx={{ my: 2 }}>{t('continue_with')}</Divider>

          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
            <IconButton onClick={handleGoogleSignIn} sx={{ border: '1px solid #ddd', p: 1 }}>
              <GoogleIcon color="error" />
            </IconButton>
            <IconButton onClick={handleFacebookSignIn} sx={{ border: '1px solid #ddd', p: 1 }}>
              <FacebookIcon color="primary" />
            </IconButton>
          </Box>

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              {t('dont_have_account')}{' '}
              <Link
                href={`/signup?from=${encodeURIComponent(from)}`}
                style={{ fontWeight: 'bold', color: '#000', textDecoration: 'none' }}
              >
                {t('get_started')}
              </Link>
            </Typography>
          </Box>
        </Box>
      </Box>
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          bgcolor: 'background.paper',
          p: { xs: 2, sm: 4 },
          borderRadius: 2,
          boxShadow: 3,
          mb: '5px',
        }}
      >
        <Typography component="h1" variant="h5" sx={{ mb: 3, fontWeight: 'bold' }}>
          {t('signin')}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ width: '100%', mb: 2 }}>
            {success}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
          <TextField
            margin="normal"
            required
            fullWidth
            size="small"
            id="email"
            label={t('email')}
            name="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            margin="normal"
            required
            size="small"
            fullWidth
            name="password"
            label={t('password')}
            type="password"
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={loading}
            sx={{ mt: 3, mb: 2, bgcolor: '#000', '&:hover': { bgcolor: '#333' } }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : t('signin')}
          </Button>

          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <Link href="#" style={{ fontSize: '0.875rem', color: '#666', textDecoration: 'none' }}>
              {t('forgot_password')}
            </Link>
          </Box>

          <Divider sx={{ my: 2 }}>{t('continue_with')}</Divider>

          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
            <IconButton onClick={handleGoogleSignIn} sx={{ border: '1px solid #ddd', p: 1 }}>
              <GoogleIcon color="error" />
            </IconButton>
            <IconButton onClick={handleFacebookSignIn} sx={{ border: '1px solid #ddd', p: 1 }}>
              <FacebookIcon color="primary" />
            </IconButton>
          </Box>

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              {t('dont_have_account')}{' '}
              <Link
                href={`/signup?from=${encodeURIComponent(from)}`}
                style={{ fontWeight: 'bold', color: '#000', textDecoration: 'none' }}
              >
                {t('get_started')}
              </Link>
            </Typography>
          </Box>
        </Box>
      </Box>
    </Container>
  );
}
