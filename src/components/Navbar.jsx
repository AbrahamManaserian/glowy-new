'use client';

import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import MenuIcon from '@mui/icons-material/Menu';
import Container from '@mui/material/Container';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import Divider from '@mui/material/Divider';
import ListItemIcon from '@mui/material/ListItemIcon';
import Collapse from '@mui/material/Collapse';

import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import PaymentOutlinedIcon from '@mui/icons-material/PaymentOutlined';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import TranslateIcon from '@mui/icons-material/Translate';
import LogoutIcon from '@mui/icons-material/Logout';
import LoginIcon from '@mui/icons-material/Login';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import DashboardIcon from '@mui/icons-material/Dashboard';
import Avatar from '@mui/material/Avatar';

import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTranslations } from 'next-intl';
import { Link, usePathname, useRouter } from '../i18n/routing';
import { useSearchParams } from 'next/navigation';
import { ShoppingBasketIcon } from './ShoppingBasketIcon';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCategories } from '../context/CategoriesContext';


const navItems = ['shop', 'sale', 'gift cards', 'about'];
const languages = [
  { code: 'am', label: 'Հայերեն' },
  { code: 'en', label: 'English' },
  { code: 'ru', label: 'Русский' },
];

function Navbar({ locale }) {
  const t = useTranslations('Navigation');
  const tCats = useTranslations('CategoryNames');
  const tCategories = useTranslations('Categories');
  const tCommon = useTranslations('Common'); // Assuming "All Items" or similar is common
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, logout } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { categories } = useCategories();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileUserMenuOpen, setMobileUserMenuOpen] = useState(false);
  const [anchorElUser, setAnchorElUser] = useState(null);
  const [langOpen, setLangOpen] = useState(false);

  // Mobile Category State
  const [catsOpen, setCatsOpen] = useState(true); // Open "All Categories" by default? Or closed.
  const [mobileExpandedCat, setMobileExpandedCat] = useState(null); // Track expanded categories

  const handleMobileCatToggle = (key) => {
    setMobileExpandedCat((prev) => (prev === key ? null : key));
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
    if (mobileUserMenuOpen) setMobileUserMenuOpen(false);
  };

  const handleLinkClick = () => {
    setMobileOpen(false);
    setMobileUserMenuOpen(false);
    if (anchorElUser) setAnchorElUser(null);
  };

  const handleOpenUserMenu = (event) => {
    if (isMobile) {
      setMobileUserMenuOpen(!mobileUserMenuOpen);
      if (mobileOpen) setMobileOpen(false);
    } else {
      setAnchorElUser(event.currentTarget);
      setLangOpen(false);
    }
  };

  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
    setMobileUserMenuOpen(false);
  };

  const changeLanguage = (newLocale) => {
    localStorage.setItem('preferredLanguage', newLocale);
    router.replace(pathname, { locale: newLocale });
    handleCloseUserMenu();
  };

  useEffect(() => {
    localStorage.setItem('preferredLanguage', locale);
  }, [locale]);

  const getPath = (item) => {
    if (item === 'gift cards') return '/gift-cards';
    return `/${item}`;
  };

  // Content for Navigation Drawer
  const drawer = (
    <Box sx={{ width: '100%', maxWidth: '100%', bgcolor: 'background.paper' }}>
      <List component="nav" aria-labelledby="nested-list-subheader">
        {/* All Categories Section (Desktop Mega Menu equivalent) */}
        <ListItemButton
          onClick={() => setCatsOpen(!catsOpen)}
          sx={{ borderBottom: '1px solid', borderColor: 'divider' }}
        >
          <ListItemText
            primary={tCategories('title') || 'All Categories'}
            primaryTypographyProps={{ fontWeight: 'bold' }}
          />
          {catsOpen ? <ExpandLess /> : <ExpandMore />}
        </ListItemButton>
        <Collapse in={catsOpen} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {/* Dynamically Loaded Categories */}
            {Object.keys(categories).map((catKey) => {
              const category = categories[catKey];
              const isExpanded = mobileExpandedCat === catKey;
              const hasSub = category.subcategories && Object.keys(category.subcategories).length > 0;
              const currentCat = searchParams.get('category');
              const currentSub = searchParams.get('subcategory');
              // Trim to handle potential spacing issues in URL params
              const currentType = searchParams.get('type')?.trim();

              // Active if matches category (parent highlight)
              const isCatActive = currentCat === catKey;

              return (
                <React.Fragment key={catKey}>
                  <ListItemButton
                    sx={{ pl: 4, borderBottom: '1px solid', borderColor: 'divider' }}
                    onClick={() => (hasSub ? handleMobileCatToggle(catKey) : handleLinkClick())}
                    component={!hasSub ? Link : 'div'} // Only Link if no subcategories (leaf)
                    href={!hasSub ? `/shop?category=${catKey}` : undefined}
                  >
                    <ListItemText
                      primary={tCats.has(catKey) ? tCats(catKey) : category.label}
                      primaryTypographyProps={{
                        sx: { color: isCatActive ? 'var(--active-color)' : 'inherit' },
                        fontWeight: isCatActive ? 'bold' : 'normal',
                      }}
                    />
                    {hasSub ? isExpanded ? <ExpandLess /> : <ExpandMore /> : null}
                  </ListItemButton>

                  {/* Nested Subcategories */}
                  {hasSub && (
                    <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                      <List component="div" disablePadding sx={{ bgcolor: 'action.hover' }}>
                        {/* "All Items" Link for Category */}
                        <ListItemButton
                          sx={{ pl: 6 }}
                          component={Link}
                          href={`/shop?category=${catKey}`}
                          onClick={handleLinkClick}
                        >
                          <ListItemText
                            primary={tCommon('allItems') || 'All Items'}
                            primaryTypographyProps={{
                              variant: 'body2',
                              fontWeight: isCatActive && !currentSub ? 700 : 600,
                              sx: { color: isCatActive && !currentSub ? 'var(--active-color)' : 'inherit' },
                            }}
                          />
                        </ListItemButton>

                        {Object.keys(category.subcategories).map((subKey) => {
                          const subCat = category.subcategories[subKey];
                          // Active if matches subcategory
                          const isSubActive = currentCat === catKey && currentSub === subKey;

                          return (
                            <Box key={subKey} sx={{ pl: 6, pr: 2, py: 1 }}>
                              {/* Subcategory Title is now clickable */}
                              <Link
                                href={`/shop?category=${catKey}&subcategory=${subKey}`}
                                onClick={handleLinkClick}
                                style={{ textDecoration: 'none', color: 'inherit' }}
                              >
                                <Typography
                                  variant="subtitle2"
                                  sx={{
                                    fontWeight: 'bold',
                                    mb: 1,
                                    color: isSubActive ? 'var(--active-color)' : 'inherit',
                                    '&:hover': { textDecoration: 'underline' },
                                  }}
                                >
                                  {tCats.has(subKey) ? tCats(subKey) : subCat.label}
                                </Typography>
                              </Link>

                              {subCat.types &&
                                subCat.types.map((type) => {
                                  // Active if matches type
                                  const isTypeActive =
                                    currentCat === catKey && currentSub === subKey && currentType === type;
                                  return (
                                    <Box
                                      key={type}
                                      component={Link}
                                      href={`/shop?category=${catKey}&subcategory=${subKey}&type=${encodeURIComponent(type)}`}
                                      onClick={handleLinkClick}
                                      sx={{
                                        display: 'block',
                                        py: 1, // Increased spacing
                                        color: isTypeActive ? 'var(--active-color)' : 'text.secondary',
                                        fontWeight: isTypeActive ? 'bold' : 'normal',
                                        textDecoration: 'none',
                                        fontSize: '0.9rem',
                                        pl: 1,
                                        borderLeft: '1px solid',
                                        borderColor: isTypeActive ? 'var(--active-color)' : 'divider',
                                        ml: 0.5,
                                      }}
                                    >
                                      {tCats.has(type) ? tCats(type) : type}
                                    </Box>
                                  );
                                })}
                            </Box>
                          );
                        })}
                      </List>
                    </Collapse>
                  )}
                </React.Fragment>
              );
            })}
          </List>
        </Collapse>

        {/* Standard Nav Items */}
        {navItems.map((item) => {
          const path = getPath(item);
          const isActive = pathname === path;
          return (
            <ListItemButton
              key={item}
              component={Link}
              href={path}
              onClick={handleLinkClick}
              sx={{ borderBottom: '1px solid', borderColor: 'divider' }}
            >
              <ListItemText
                primary={t(item)}
                primaryTypographyProps={{
                  color: isActive ? 'var(--active-color)' : 'inherit',
                  textTransform: 'capitalize',
                  fontWeight: 500,
                }}
              />
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );

  const menuItems = [
    { label: t('profile'), icon: <PersonOutlineIcon fontSize="small" />, link: '/profile' },
    { label: t('orders'), icon: <ShoppingBagOutlinedIcon fontSize="small" />, link: '/orders' },
    { label: t('wishlist'), icon: <FavoriteBorderIcon fontSize="small" />, link: '/wishlist' },
    ...(user?.role === 'admin'
      ? [{ label: 'Admin Panel', icon: <DashboardIcon fontSize="small" />, link: '/admin/dashboard' }]
      : []),
    ...(user
      ? [
          { label: t('settings'), icon: <SettingsOutlinedIcon fontSize="small" />, link: '/settings' },
          { label: t('payment'), icon: <PaymentOutlinedIcon fontSize="small" />, link: '/payment' },
        ]
      : []),
    { label: t('help'), icon: <HelpOutlineIcon fontSize="small" />, link: '/help' },
  ];

  // Content for User Menu (Shared)
  const renderUserMenuContent = () => (
    <Box sx={{ width: '100%', maxWidth: isMobile ? '100%' : 250 }}>
      <Box sx={{ px: 2, py: 1.5 }}>
        <Typography variant="subtitle1" noWrap sx={{ fontWeight: 'bold' }}>
          {user ? t('welcome', { name: user.displayName || user.email }) : t('welcome_guest')}
        </Typography>
        {user && user.email && (
          <Typography variant="body2" color="text.secondary" noWrap>
            {user.email}
          </Typography>
        )}
      </Box>
      <Divider />

      <List disablePadding>
        {menuItems.map((item) => (
          <ListItemButton key={item.label} onClick={handleLinkClick} component={Link} href={item.link}>
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}

        <ListItemButton onClick={() => setLangOpen(!langOpen)}>
          <ListItemIcon>
            <TranslateIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary={t('language')} />
          {langOpen ? <ExpandLess /> : <ExpandMore />}
        </ListItemButton>
        <Collapse in={langOpen} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {languages.map((lang) => (
              <ListItemButton
                key={lang.code}
                sx={{ pl: 4 }}
                onClick={() => changeLanguage(lang.code)}
                selected={locale === lang.code}
              >
                <ListItemText primary={lang.label} />
              </ListItemButton>
            ))}
          </List>
        </Collapse>

        <Divider />

        {user ? (
          <ListItemButton
            onClick={() => {
              logout();
              handleLinkClick();
            }}
          >
            <ListItemIcon>
              <LogoutIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary={t('logout')} />
          </ListItemButton>
        ) : (
          <ListItemButton onClick={handleLinkClick} component={Link} href={`/signin?from=${pathname}`}>
            <ListItemIcon>
              <LoginIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary={t('login')} />
          </ListItemButton>
        )}
      </List>
    </Box>
  );

  return (
    <AppBar
      position="sticky"
      color="inherit"
      elevation={0}
      sx={{
        borderBottom: '1px solid #eaeaea',
        bgcolor: 'background.paper',
        top: 0,
        zIndex: (theme) => theme.zIndex.drawer + 1, // Ensure AppBar is above Drawer
      }}
    >
      <Container maxWidth="xl">
        <Toolbar disableGutters>
          {/* Mobile Menu Icon */}
          <Box sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none' } }}>
            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleDrawerToggle}
              color="inherit"
            >
              <MenuIcon />
            </IconButton>
          </Box>

          {/* Desktop Logo */}
          <Typography
            variant="h6"
            noWrap
            component={Link}
            href="/"
            sx={{
              mr: 2,
              display: { xs: 'none', md: 'flex' },
              fontFamily: 'monospace',
              fontWeight: 300,
              letterSpacing: '.3rem',
              color: 'inherit',
              textDecoration: 'none',
              fontSize: '1.5rem',
            }}
          >
            GLOWY
          </Typography>

          {/* Mobile Logo (Centered) */}
          <Typography
            variant="h5"
            noWrap
            component={Link}
            href="/"
            onClick={handleLinkClick}
            sx={{
              mr: 2,
              display: { xs: 'flex', md: 'none' },
              flexGrow: 1,
              fontFamily: 'monospace',
              fontWeight: 300,
              letterSpacing: '.3rem',
              color: 'inherit',
              textDecoration: 'none',
              fontSize: '1.2rem',
            }}
          >
            GLOWY
          </Typography>

          {/* Desktop Menu */}
          <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' }, justifyContent: 'center', gap: 2 }}>
            {navItems.map((item) => {
              const path = getPath(item);
              const isActive = pathname === path;
              return (
                <Button
                  key={item}
                  component={Link}
                  href={path}
                  sx={{
                    my: 2,
                    color: isActive ? 'var(--active-color)' : 'text.primary',
                    display: 'block',
                    fontWeight: 400,
                    letterSpacing: '0.05rem',
                    textTransform: 'capitalize',
                    '&:hover': {
                      backgroundColor: 'transparent',
                      textDecoration: 'underline',
                      color: isActive ? 'var(--active-color)' : 'text.primary',
                    },
                  }}
                >
                  {t(item)}
                </Button>
              );
            })}
          </Box>

          {/* Actions (User Menu + Basket) */}
          <Box sx={{ flexGrow: 0, display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton sx={{ ml: 1 }} component={Link} href="/cart">
              <ShoppingBasketIcon color="#000" size="24" />
            </IconButton>
            <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
              <Avatar
                sx={{ bgcolor: 'transparent', color: '#000', width: 32, height: 32 }}
                src={user?.photoURL}
                alt={user?.displayName || 'User'}
              >
                {!user?.photoURL && <PersonOutlineIcon sx={{ fontSize: 27 }} />}
              </Avatar>
            </IconButton>

            {/* Desktop User Menu */}
            {!isMobile && (
              <Menu
                sx={{ mt: '45px' }}
                id="menu-appbar"
                anchorEl={anchorElUser}
                anchorOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                keepMounted
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                open={Boolean(anchorElUser)}
                onClose={handleCloseUserMenu}
                PaperProps={{
                  style: {
                    width: 250,
                  },
                }}
              >
                {renderUserMenuContent()}
              </Menu>
            )}
          </Box>
        </Toolbar>
      </Container>

      {/* Mobile Navigation Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true,
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: '100%',
            top: { xs: '56px', sm: '64px' },
            height: { xs: 'calc(100% - 56px)', sm: 'calc(100% - 64px)' },
            boxShadow: 'none',
          },
          '& .MuiBackdrop-root': {
            top: { xs: '56px', sm: '64px' },
          },
        }}
      >
        {drawer}
      </Drawer>

      {/* Mobile User Menu Drawer (Acts like the Nav Drawer) */}
      <Drawer
        variant="temporary"
        anchor="right"
        open={mobileUserMenuOpen}
        onClose={handleCloseUserMenu}
        ModalProps={{
          keepMounted: true,
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          zIndex: (theme) => theme.zIndex.drawer,
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: '100%',
            top: { xs: '56px', sm: '64px' },
            height: { xs: 'calc(100% - 56px)', sm: 'calc(100% - 64px)' },
            boxShadow: 'none',
          },
          '& .MuiBackdrop-root': {
            top: { xs: '56px', sm: '64px' },
          },
        }}
      >
        {renderUserMenuContent()}
      </Drawer>
    </AppBar>
  );
}
export default Navbar;
