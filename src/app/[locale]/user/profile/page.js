'use client';

import {
  Box,
  Typography,
  Grid,
  TextField,
  Button,
  MenuItem,
  Stack,
  Avatar,
  IconButton,
  Alert,
  InputAdornment,
  Snackbar,
} from '@mui/material';
import { PersonOutline, PhotoCamera, Verified, GppMaybe } from '@mui/icons-material';
import { useAuth } from '../../../../context/AuthContext';
import { UIContext } from '../../../../context/UIContext';
import { Link, usePathname } from '../../../../i18n/routing';
import { useState, useEffect, useContext } from 'react';
import { sendEmailVerification, updateProfile } from 'firebase/auth';
import { auth, storage } from '../../../../../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { compressImage } from '../../../../utils/imageUtils';

const CustomTextField = (props) => (
  <TextField
    {...props}
    variant="outlined"
    fullWidth
    InputLabelProps={{ shrink: true, sx: { fontWeight: 'bold' }, ...props.InputLabelProps }}
    sx={{
      '& .MuiOutlinedInput-root': {
        bgcolor: '#f8f9fa',
        borderRadius: 2,
        '& fieldset': {
          border: '1px solid transparent', // Effectively no border
        },
        '&:hover fieldset': {
          borderColor: 'transparent',
        },
        '&.Mui-focused fieldset': {
          borderColor: 'primary.main',
          borderWidth: 1,
        },
        '& input': {
          py: 1.5,
          px: 2,
        },
      },
      '& .MuiInputLabel-root': {
        position: 'static',
        transform: 'none',
        mb: 1,
        fontSize: '0.9rem',
        color: 'text.primary',
      },
      ...props.sx,
    }}
  />
);

export default function UserProfilePage() {
  const { user, updateUserData } = useAuth();
  const { pendingAvatar, setPendingAvatar } = useContext(UIContext);
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [uploading, setUploading] = useState(false);

  // UI State
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  // Removed local avatar state in favor of context

  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    birthday: '',
    gender: 'Male',
    address: '',
  });

  const handleCloseSnackbar = () => setSnackbar((prev) => ({ ...prev, open: false }));

  useEffect(() => {
    if (user) {
      const names = user.displayName ? user.displayName.split(' ') : [''];
      const fName = user.firstName || names[0] || '';
      const lName = user.lastName || names.slice(1).join(' ') || '';

      setFormData({
        firstName: fName,
        lastName: lName,
        email: user.email || '',
        phoneNumber: user.phoneNumber || '',
        birthday: user.birthday || '',
        gender: user.gender || 'Male',
        address: user.address || '',
      });

      // Only set default if no pending update
      if (!pendingAvatar.preview) {
        // We'll use user.photoURL directly in render
      }
    }
  }, [user]); // Removed pendingAvatar from deps to avoid loop if we were setting it here

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveChanges = async () => {
    setLoading(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('No user logged in');

      let photoURL = user.photoURL;

      // 1. Upload new avatar if selected
      if (pendingAvatar.file) {
        // Using a fixed name 'avatar.jpg' forces replacement of the previous file
        const storageRef = ref(storage, `avatars/${currentUser.uid}/avatar.jpg`);
        await uploadBytes(storageRef, pendingAvatar.file);
        photoURL = await getDownloadURL(storageRef);
      }

      const fullName = `${formData.firstName} ${formData.lastName}`.trim();

      // 2. Update Auth Profile (Display Name & Photo)
      // Check if anything changed
      if (currentUser.displayName !== fullName || (pendingAvatar.file && currentUser.photoURL !== photoURL)) {
        await updateProfile(currentUser, {
          displayName: fullName,
          photoURL: photoURL,
        });
      }

      // 3. Update Firestore
      await updateUserData({
        ...formData,
        fullName,
        displayName: fullName,
        photoURL: photoURL,
      });

      setSnackbar({ open: true, message: 'Profile updated successfully!', severity: 'success' });
      setPendingAvatar({ file: null, preview: null }); // Reset file selection
    } catch (error) {
      console.error('Error updating profile:', error);
      setSnackbar({ open: true, message: 'Failed to update profile.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        await sendEmailVerification(currentUser);
        setVerificationSent(true);
        setSnackbar({ open: true, message: 'Verification email sent!', severity: 'success' });
      } else {
        throw new Error('No user found');
      }
    } catch (error) {
      console.error('Error sending verification email:', error);
      setSnackbar({ open: true, message: 'Error sending verification email.', severity: 'error' });
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const compressedFile = await compressImage(file);
      // Create local preview immediately
      const objectUrl = URL.createObjectURL(compressedFile);
      setPendingAvatar({ file: compressedFile, preview: objectUrl });
    } catch (error) {
      console.error('Error compressing image:', error);
      setSnackbar({ open: true, message: 'Error processing image.', severity: 'error' });
    }
  };

  // Split name into first and last name for placeholder logic
  const names = user?.displayName ? user.displayName.split(' ') : [''];
  const firstName = names[0] || '';
  const lastName = names.slice(1).join(' ') || '';

  if (!user) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          py: 8,
          textAlign: 'center',
        }}
      >
        <Avatar sx={{ width: 64, height: 64, bgcolor: '#ff5252', mb: 2 }}>
          <PersonOutline sx={{ fontSize: 32, color: 'white' }} />
        </Avatar>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          Sign in to your profile
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 400, mb: 4 }}>
          Sign in to access your personal information, manage your orders, and view your wishlist.
        </Typography>
        <Button
          variant="contained"
          color="primary"
          size="large"
          component={Link}
          href={`/signin?from=${pathname}`}
          sx={{ px: 4, py: 1.5, borderRadius: 2, bgcolor: '#ff5252', '&:hover': { bgcolor: '#ff1744' } }}
        >
          Sign In / Register
        </Button>
      </Box>
    );
  }

  const isSocialLogin = user.providerData.some(
    (p) => p.providerId === 'google.com' || p.providerId === 'facebook.com',
  );

  return (
    <Box>
      <Box
        sx={{
          display: { xs: 'flex', md: 'none' }, // Only show on mobile
          flexDirection: 'column',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Box sx={{ position: 'relative', display: 'inline-block' }}>
          <Avatar
            src={pendingAvatar?.preview || user?.photoURL}
            sx={{ width: 80, height: 80, bgcolor: 'primary.main' }}
          >
            {user?.displayName?.charAt(0).toUpperCase()}
          </Avatar>
          <IconButton
            disabled={uploading}
            sx={{
              position: 'absolute',
              bottom: -5,
              right: -5,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              '&:hover': { bgcolor: 'background.default' },
            }}
            size="small"
            component="label"
          >
            <input hidden accept="image/*" type="file" onChange={handleFileChange} />
            <PhotoCamera fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      <Typography variant="h5" fontWeight="bold" sx={{ mb: 3 }}>
        Personal
      </Typography>

      {/* Social Login Hint */}
      {isSocialLogin && (
        <Alert severity="info" sx={{ mb: 3 }}>
          You signed in with Google/Facebook. To enable email/password sign-in, please set a password in the{' '}
          <Link href="/user/settings" style={{ fontWeight: 'bold', color: 'inherit' }}>
            Settings
          </Link>{' '}
          tab.
        </Alert>
      )}

      {/* Email Verification Hint */}
      {!user.emailVerified && (
        <Alert
          severity="warning"
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" onClick={handleVerifyEmail} disabled={verificationSent}>
              {verificationSent ? 'Sent' : 'Verify'}
            </Button>
          }
        >
          Your email address is not verified. Please verify it to secure your account.
        </Alert>
      )}

      <Stack spacing={3}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              name="firstName"
              label="First name"
              value={formData.firstName}
              onChange={handleChange}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              name="lastName"
              label="Last name"
              value={formData.lastName}
              onChange={handleChange}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              name="email"
              label="Email address"
              value={formData.email}
              disabled={true} // Usually email shouldn't be changeable easily here if verified
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    {user.emailVerified ? (
                      <Verified color="primary" fontSize="small" />
                    ) : (
                      <GppMaybe color="warning" fontSize="small" />
                    )}
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              name="phoneNumber"
              label="Phone number"
              value={formData.phoneNumber}
              onChange={handleChange}
              placeholder="Add phone number"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              name="birthday"
              label="Birthday"
              value={formData.birthday}
              onChange={handleChange}
              placeholder="MM/DD/YYYY"
              type="date"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              select
              name="gender"
              label="Gender"
              value={formData.gender}
              onChange={handleChange}
            >
              <MenuItem value="Male">Male</MenuItem>
              <MenuItem value="Female">Female</MenuItem>
              <MenuItem value="None">None</MenuItem>
            </CustomTextField>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <CustomTextField
              name="address"
              label="Address"
              value={formData.address}
              onChange={handleChange}
            />
          </Grid>
        </Grid>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
          <Button
            variant="contained"
            color="primary"
            size="large"
            sx={{ borderRadius: 2 }}
            onClick={handleSaveChanges}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save changes'}
          </Button>
        </Box>
      </Stack>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
