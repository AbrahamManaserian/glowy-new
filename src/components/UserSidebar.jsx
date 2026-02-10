import {
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Avatar,
  Box,
  Typography,
  Stack,
  Button,
  IconButton,
} from '@mui/material';
import { PhotoCamera, LogoutOutlined } from '@mui/icons-material';
import { Link, usePathname, useRouter } from '../i18n/navigation';
import { useAuth } from '../context/AuthContext';
import { UIContext } from '../context/UIContext';
import { userMenuItems } from './UserMenuItems';
import { useState, useContext } from 'react';
import { compressImage } from '../utils/imageUtils';

export default function UserSidebar() {
  // This line must match exactly up to the opening brace
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { pendingAvatar, setPendingAvatar } = useContext(UIContext);
  const [uploading, setUploading] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  // Simple check to see if the current path starts with the menu item path
  // Need to handle locale prefix if present in pathname or use a more robust matching
  // Assuming simple matching for now.
  // Since pathname includes locale (e.g. /en/user/profile), we check if it includes the item path
  const isActive = (path) => pathname.includes(path);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const compressedFile = await compressImage(file);
      // Create local preview immediately
      const objectUrl = URL.createObjectURL(compressedFile);
      setPendingAvatar({ file: compressedFile, preview: objectUrl });

      // Redirect to profile page to let them save
      if (!pathname.includes('/user/profile')) {
        router.push('/user/profile');
      }
    } catch (error) {
      console.error('Error Processing image:', error);
    } finally {
      setUploading(false);
    }
  };

  // if (!user) return null; // Removed to show sidebar for guests

  return (
    <Paper variant="outlined" sx={{ overflow: 'hidden', borderRadius: 2 }}>
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Box sx={{ position: 'relative', display: 'inline-block', mb: 2 }}>
          <Avatar
            src={pendingAvatar?.preview || user?.photoURL}
            alt={user?.displayName || 'Guest'}
            sx={{ width: 80, height: 80, margin: '0 auto', fontSize: '2rem' }}
          >
            {user?.displayName?.charAt(0).toUpperCase() || <PhotoCamera />}
          </Avatar>
          {user && (
            <IconButton
              component="label"
              disabled={uploading}
              sx={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                bgcolor: 'background.paper',
                borderRadius: '50%',
                border: '1px solid',
                borderColor: 'divider',
                p: 0.5,
                cursor: 'pointer',
                display: 'flex',
                '&:hover': { bgcolor: 'background.default' },
              }}
            >
              <input hidden accept="image/*" type="file" onChange={handleFileChange} />
              <PhotoCamera fontSize="small" color="action" />
            </IconButton>
          )}
        </Box>

        <Typography variant="subtitle1" fontWeight="bold">
          {user?.displayName || 'Guest User'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {user?.email || 'Sign in to access account'}
        </Typography>
      </Box>

      <Divider />

      <List disablePadding>
        {userMenuItems
          .filter((item) => (user ? true : !item.protected)) // Hide protected items if no user
          .map((item) => (
            <ListItem key={item.id} disablePadding>
              <ListItemButton
                component={Link}
                href={item.path}
                selected={isActive(item.path)}
                sx={{
                  py: 1.5,
                  '&.Mui-selected': {
                    borderRight: '3px solid',
                    borderColor: 'primary.main',
                    bgcolor: 'action.hover',
                    fontWeight: 'bold',
                    '& .MuiListItemIcon-root': {
                      color: 'primary.main',
                    },
                    '& .MuiTypography-root': {
                      fontWeight: 'bold',
                    },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            </ListItem>
          ))}

        <Divider />

        <ListItem disablePadding>
          <ListItemButton onClick={handleLogout} sx={{ py: 1.5 }}>
            <ListItemIcon sx={{ minWidth: 40 }}>
              <LogoutOutlined fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Logout" />
          </ListItemButton>
        </ListItem>
      </List>
    </Paper>
  );
}
