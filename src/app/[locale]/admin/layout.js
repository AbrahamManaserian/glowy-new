'use client';

import * as React from 'react';
import { styled, createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import CloseIcon from '@mui/icons-material/Close';
import TuneIcon from '@mui/icons-material/Tune';
import Drawer from '@mui/material/Drawer';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import PeopleIcon from '@mui/icons-material/People';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SettingsIcon from '@mui/icons-material/Settings';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import useMediaQuery from '@mui/material/useMediaQuery';

const drawerWidth = 240;

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  padding: theme.spacing(0, 1),
  minHeight: 64, // Explicit height to ensure visibility
}));

const defaultTheme = createTheme();

export default function AdminLayout({ children }) {
  const isMobile = useMediaQuery(defaultTheme.breakpoints.down('sm'));
  const pathname = usePathname();
  const [open, setOpen] = React.useState(!isMobile);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  // Sync open state with screen size if needed, or rely on distinct mobileOpen
  React.useEffect(() => {
    setOpen(!isMobile);
  }, [isMobile]);

  const toggleDrawer = () => {
    if (isMobile) {
      setMobileOpen(!mobileOpen);
    } else {
      setOpen(!open);
    }
  };

  const closeMobileDrawer = () => {
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  // Close drawer when clicking top navbar (which is outside the drawer's backdrop context)
  React.useEffect(() => {
    const handleGlobalClick = (event) => {
      if (isMobile && mobileOpen) {
        // Navbar is typically 56px on mobile. If click is in that top area, close sidebar.
        // We add a small buffer or check if it's the toggle button area (which is covered anyway)
        if (event.clientY <= 60) {
          setMobileOpen(false);
        }
      }
    };

    // Use capture to ensuring we catch it
    window.addEventListener('click', handleGlobalClick, { capture: true });
    return () => window.removeEventListener('click', handleGlobalClick, { capture: true });
  }, [isMobile, mobileOpen]);

  return (
    <ThemeProvider theme={defaultTheme}>
      <Box sx={{ display: 'flex' }}>
        <CssBaseline />

        <Drawer
          anchor="right"
          variant={isMobile ? 'temporary' : 'permanent'}
          open={isMobile ? mobileOpen : open}
          onClose={isMobile ? toggleDrawer : undefined}
          ModalProps={{
            keepMounted: true,
            sx: { zIndex: (theme) => (isMobile ? 1200 : theme.zIndex.drawer) },
          }}
          PaperProps={{
            sx: {
              ...(isMobile && {
                width: '100vw !important',
                maxWidth: '100vw !important',
                top: '50px !important', // Slightly larger than 56px to ensure no overlap
                height: 'calc(100% - 50px) !important',
                boxShadow: 'none !important',
                backgroundImage: 'none !important',
              }),
            },
          }}
          sx={{
            flexShrink: 0,
            zIndex: (theme) => (isMobile ? 1200 : theme.zIndex.drawer),
            '& .MuiDrawer-paper': {
              whiteSpace: 'nowrap',
              width: drawerWidth, // Desktop width
              boxSizing: 'border-box',
              ...(!isMobile && {
                position: 'relative',
                transition: defaultTheme.transitions.create('width', {
                  easing: defaultTheme.transitions.easing.sharp,
                  duration: defaultTheme.transitions.duration.enteringScreen,
                }),
                ...(!open && {
                  overflowX: 'hidden',
                  transition: defaultTheme.transitions.create('width', {
                    easing: defaultTheme.transitions.easing.sharp,
                    duration: defaultTheme.transitions.duration.leavingScreen,
                  }),
                  width: defaultTheme.spacing(7),
                  [defaultTheme.breakpoints.up('sm')]: {
                    width: defaultTheme.spacing(9),
                  },
                }),
              }),
            },
          }}
        >
          {isMobile && (
            <DrawerHeader sx={{ justifyContent: 'space-between', pl: 2, pr: 2 }}>
              <Typography variant="h6" color="text.primary" sx={{ fontWeight: 'bold' }}>
                Menu
              </Typography>
              <IconButton onClick={toggleDrawer} size="large" sx={{ color: 'text.primary' }}>
                <CloseIcon fontSize="large" />
              </IconButton>
            </DrawerHeader>
          )}
          {!isMobile && (
            <DrawerHeader>
              <IconButton onClick={toggleDrawer} size="large">
                <ChevronLeftIcon />
              </IconButton>
            </DrawerHeader>
          )}
          <Divider />
          <List component="nav">
            <ListItemButton
              selected={pathname === '/admin/dashboard'}
              component={Link}
              href="/admin/dashboard"
              onClick={closeMobileDrawer}
            >
              <ListItemIcon>
                <DashboardIcon />
              </ListItemIcon>
              <ListItemText primary="Dashboard" />
            </ListItemButton>
            <ListItemButton
              selected={pathname === '/admin/orders'}
              component={Link}
              href="/admin/orders"
              onClick={closeMobileDrawer}
            >
              <ListItemIcon>
                <ShoppingCartIcon />
              </ListItemIcon>
              <ListItemText primary="Orders" />
            </ListItemButton>
            <ListItemButton
              selected={pathname === '/admin/users'}
              component={Link}
              href="/admin/users"
              onClick={closeMobileDrawer}
            >
              <ListItemIcon>
                <PeopleIcon />
              </ListItemIcon>
              <ListItemText primary="Users" />
            </ListItemButton>
            <ListItemButton
              selected={pathname === '/admin/suppliers'}
              component={Link}
              href="/admin/suppliers"
              onClick={closeMobileDrawer}
            >
              <ListItemIcon>
                <LocalShippingIcon />
              </ListItemIcon>
              <ListItemText primary="Suppliers" />
            </ListItemButton>
            <ListItemButton
              selected={pathname === '/admin/analytics'}
              component={Link}
              href="/admin/analytics"
              onClick={closeMobileDrawer}
            >
              <ListItemIcon>
                <AssessmentIcon />
              </ListItemIcon>
              <ListItemText primary="Analytics" />
            </ListItemButton>
            <ListItemButton
              selected={pathname === '/admin/settings'}
              component={Link}
              href="/admin/settings"
              onClick={closeMobileDrawer}
            >
              <ListItemIcon>
                <SettingsIcon />
              </ListItemIcon>
              <ListItemText primary="Settings" />
            </ListItemButton>

            <ListItemButton
              selected={pathname === '/admin/add-product'}
              component={Link}
              href="/admin/add-product"
              onClick={closeMobileDrawer}
            >
              <ListItemIcon>
                <AddIcon />
              </ListItemIcon>
              <ListItemText primary="Add Product" />
            </ListItemButton>
            <ListItemButton
              selected={pathname === '/admin/edit-product'}
              component={Link}
              href="/admin/edit-product"
              onClick={closeMobileDrawer}
            >
              <ListItemIcon>
                <EditIcon />
              </ListItemIcon>
              <ListItemText primary="Edit Product" />
            </ListItemButton>
          </List>
        </Drawer>
        <Box
          component="main"
          sx={{
            backgroundColor: (theme) =>
              theme.palette.mode === 'light' ? theme.palette.grey[100] : theme.palette.grey[900],
            flexGrow: 1,
            height: '90vh',
            overflow: 'auto',
            position: 'relative',
          }}
        >
          {/* Menu Button for mobile/collapsed state */}
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={toggleDrawer}
            sx={{
              position: 'fixed',
              right: 10,
              bottom: '30px', // Position below the main navbar (approx 64px + spacing)
              zIndex: 9999,
              backgroundColor: 'rgba(255, 255, 255, 1)',

              boxShadow: 1,
              display: { xs: 'flex', sm: open ? 'none' : 'flex' },
            }}
          >
            <TuneIcon />
          </IconButton>

          <Box maxWidth="lg" sx={{ p: { xs: '5px', sm: '10px' }, mt: '40px', mb: '15px' }}>
            {children}
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}
