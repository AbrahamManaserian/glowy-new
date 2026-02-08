'use client';

import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import MenuIcon from '@mui/icons-material/Menu';
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
import StoreOutlinedIcon from '@mui/icons-material/StoreOutlined';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import CardGiftcardOutlinedIcon from '@mui/icons-material/CardGiftcardOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTranslations } from 'next-intl';
import { Link, usePathname, useRouter } from '../i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { ShoppingBasketIcon } from './ShoppingBasketIcon';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCategories } from '../context/CategoriesContext';
import { useUI } from '../context/UIContext';
import { useShop } from '../context/ShopContext';
import {
  AccessoriesIcon,
  BathBodyIcon,
  CollectionIcon,
  FragranceIcon,
  HairIcon,
  MakeupIcon,
  NailIcon,
  SkincareIcon,
} from './icons';


const navItems = ['shop', 'sale', 'gift cards', 'about'];
const languages = [
  { code: 'am', label: 'Հայերեն' },
  { code: 'en', label: 'English' },
  { code: 'ru', label: 'Русский' },
];

const MobileCategoryItem = ({
  catKey,
  category,
  isExpanded,
  onToggle,
  onLinkClick,
  tCats,
  tCommon,
  setRef,
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentCat = searchParams.get('category');
  const currentSub = searchParams.get('subcategory');
  const currentType = searchParams.get('type')?.trim();

  const hasSub = category.subcategories && Object.keys(category.subcategories).length > 0;
  const isCatActive = currentCat === catKey;

  const iconMap = {
    fragrance: FragranceIcon,
    makeup: MakeupIcon,
    skincare: SkincareIcon,
    bathBody: BathBodyIcon,
    hair: HairIcon,
    nail: NailIcon,
    accessories: AccessoriesIcon,
    collection: CollectionIcon,
  };

  const IconComponent = iconMap[catKey];

  return (
    <div ref={(el) => setRef(catKey, el)}>
      <ListItemButton
        sx={{ pl: 4, borderColor: 'divider' }}
        onClick={() => {
          if (hasSub) {
            onToggle(catKey);
          } else {
            router.push(`/shop?category=${catKey}`);
            onLinkClick();
          }
        }}
      >
        {IconComponent && (
          <IconComponent sx={{ mr: 1, color: isCatActive ? 'var(--active-color)' : 'inherit' }} />
        )}
        <ListItemText
          primary={tCats.has(catKey) ? tCats(catKey) : category.label}
          primaryTypographyProps={{
            sx: { color: isCatActive ? 'var(--active-color)' : 'inherit' },
            // fontWeight: isCatActive ? 'bold' : 'normal',
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
              onClick={() => {
                router.push(`/shop?category=${catKey}`);
                onLinkClick();
              }}
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
                  <Box
                    onClick={() => {
                      router.push(`/shop?category=${catKey}&subcategory=${subKey}`);
                      onLinkClick();
                    }}
                    sx={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}
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
                  </Box>

                  {subCat.types &&
                    subCat.types.map((type) => {
                      // Active if matches type
                      const isTypeActive =
                        currentCat === catKey && currentSub === subKey && currentType === type;
                      return (
                        <Box
                          key={type}
                          onClick={() => {
                            router.push(
                              `/shop?category=${catKey}&subcategory=${subKey}&type=${encodeURIComponent(type)}`,
                            );
                            onLinkClick();
                          }}
                          sx={{
                            cursor: 'pointer',
                            display: 'block',
                            py: 1, // Increased spacing
                            color: isTypeActive ? 'var(--active-color)' : 'text.secondary',
                            // fontWeight: isTypeActive ? 'bold' : 'normal',
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
    </div>
  );
};

function Navbar({ locale }) {
  const t = useTranslations('Navigation');
  const tCats = useTranslations('CategoryNames');
  const tCategories = useTranslations('Categories');
  const tCommon = useTranslations('Common'); // Assuming "All Items" or similar is common
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { categories } = useCategories();
  const { activeMobileMenu, toggleMenu, closeMobileMenus, toggleCart, isCartOpen } = useUI();
  const { getCartCount } = useShop();

  const mobileOpen = activeMobileMenu === 'nav';
  const mobileUserMenuOpen = activeMobileMenu === 'user';

  const [anchorElUser, setAnchorElUser] = useState(null);
  const [langOpen, setLangOpen] = useState(false);

  // Mobile Category State
  const [mobileExpandedCat, setMobileExpandedCat] = useState(null); // Track expanded categories
  const categoryRefs = React.useRef({}); // Map of category keys to DOM nodes

  const handleMobileCatToggle = (key) => {
    // If clicking the same one, just close it immediately.
    if (mobileExpandedCat === key) {
      setMobileExpandedCat(null);
      return;
    }

    const performOpen = () => {
      const element = categoryRefs.current[key];
      if (element) {
        const scrollContainer = element.closest('.MuiDrawer-paper');
        if (scrollContainer) {
          const containerRect = scrollContainer.getBoundingClientRect();
          const nodeRect = element.getBoundingClientRect();
          const currentScrollTop = scrollContainer.scrollTop;

          // Calculate distance to move to align to top
          const diff = nodeRect.top - containerRect.top;

          // Scroll instantly to avoid "overshoot" or delays
          scrollContainer.scrollTop = currentScrollTop + diff;
        }
      }
      setMobileExpandedCat(key);
    };

    if (mobileExpandedCat) {
      // If another is open, close it first
      setMobileExpandedCat(null);
      // Wait for collapse animation (MUI default ~300ms)
      // Standardize wait to ensure layout is stable
      setTimeout(() => {
        performOpen();
      }, 300);
    } else {
      // Nothing open, just open the new one
      performOpen();
    }
  };

  const handleDrawerToggle = (event) => {
    event?.stopPropagation();
    toggleMenu('nav');
  };

  const handleLinkClick = () => {
    closeMobileMenus();
    setMobileExpandedCat(null); // Reset category expansion
    if (anchorElUser) setAnchorElUser(null);
  };

  const handleOpenUserMenu = (event) => {
    event?.stopPropagation();
    if (isMobile) {
      toggleMenu('user');
    } else {
      closeMobileMenus(); // Ensure other drawers (like cart) are closed
      setAnchorElUser(event.currentTarget);
      setLangOpen(false);
    }
  };

  const handleCartToggle = (event) => {
    event?.stopPropagation();
    toggleCart();
  };

  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
    closeMobileMenus();
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

  const generalIconMap = {
    shop: StoreOutlinedIcon,
    sale: LocalOfferOutlinedIcon,
    'gift cards': CardGiftcardOutlinedIcon,
    about: InfoOutlinedIcon,
  };

  // Content for Navigation Drawer
  const drawer = (
    <Box sx={{ width: '100%', maxWidth: '100%', bgcolor: 'background.paper' }}>
      <List component="nav" aria-labelledby="nested-list-subheader">
        <ListItemText
          primary={tCommon('general') || 'General'}
          primaryTypographyProps={{ fontWeight: 'bold' }}
          sx={{ mx: 2, pt: '10px', borderColor: 'divider' }}
        />

        {navItems.map((item) => {
          const path = getPath(item);
          const isActive = pathname === path;
          const IconComponent = generalIconMap[item];
          return (
            <ListItemButton
              key={item}
              component={Link}
              href={path}
              onClick={handleLinkClick}
              // sx={{ borderBottom: '1px solid', borderColor: 'divider', mx: 2 }}
              sx={{ mx: 2, py: '5px' }}
            >
              {IconComponent && (
                <IconComponent
                  sx={{ mr: 1, fontSize: '20px', color: isActive ? 'var(--active-color)' : 'inherit' }}
                />
              )}
              <ListItemText
                primary={t(item)}
                primaryTypographyProps={{
                  color: isActive ? 'var(--active-color)' : 'inherit',
                  textTransform: 'capitalize',
                  // fontWeight: 500,
                }}
              />
            </ListItemButton>
          );
        })}

        {/* All Categories Section (Desktop Mega Menu equivalent) */}
        <ListItemText
          primary={tCategories('title') || 'All Categories'}
          primaryTypographyProps={{ fontWeight: 'bold' }}
          sx={{ mx: 2, pt: '15px', borderTop: '1px solid', borderColor: 'divider' }}
        />
        {/* </ListItemButton> */}
        <List component="div" disablePadding>
          {/* Dynamically Loaded Categories */}
          {Object.keys(categories).map((catKey) => (
            <MobileCategoryItem
              key={catKey}
              catKey={catKey}
              category={categories[catKey]}
              isExpanded={mobileExpandedCat === catKey}
              onToggle={handleMobileCatToggle}
              onLinkClick={handleLinkClick}
              tCats={tCats}
              tCommon={tCommon}
              setRef={(key, el) => (categoryRefs.current[key] = el)}
            />
          ))}
        </List>
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
      onClick={() => closeMobileMenus()}
      sx={{
        bgcolor: 'background.paper',
        boxShadow: (theme) =>
          theme.palette.mode === 'dark' ? '0 2px 12px rgba(0,0,0,0.35)' : '0 2px 12px rgba(0,0,0,0.06)',

        top: 0,
        zIndex: (theme) => theme.zIndex.drawer + 1, // Ensure AppBar is above Drawer
      }}
    >
      <Toolbar sx={{ px: { xs: '10px', sm: '20px' } }} disableGutters>
        {/* Mobile Menu Icon */}
        <Box sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none' } }}>
          <IconButton
            size="large"
            aria-label="account of current user"
            aria-controls="menu-appbar"
            aria-haspopup="true"
            onClick={handleDrawerToggle}
            color="inherit"
            sx={{ p: '5px' }}
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
                onClick={handleLinkClick}
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
          <IconButton sx={{ ml: 1 }} onClick={handleCartToggle}>
            <Badge badgeContent={getCartCount()} color="error">
              <ShoppingBasketIcon color="#000" size="24" />
            </Badge>
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
