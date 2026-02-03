'use client';

import React, { useState } from 'react';
import { Box, Card, CardMedia, Typography, Button, Rating, IconButton, Menu, MenuItem } from '@mui/material';
import Grid from '@mui/material/Grid';
import { useRouter } from '../../i18n/navigation';
import { useTranslations } from 'next-intl';
import { ShoppingBasketIcon } from '../ShoppingBasketIcon';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

// Component for individual Product Card to handle local state (selected variant)
const ProductCard = ({ product, t, tCats }) => {
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState(null);

  // Helper to safely translate or return original
  const safeTranslate = (key, translator) => {
    if (!key) return '';
    // If it's a simple string, try to translate.
    // Keys like "ml", "size" are lowercase in our JSON usually, but let's try direct first then lower.
    // However, for "Lipstick", it is PascalCase in JSON "Lipstick".
    // For "size", it is "size".
    // We try exact match first, then lowercase match?
    // User data might be "Color" or "color".

    // Attempt 1: Exact
    // Note: next-intl t() returns the key if strict is false and key missing?
    // Or we can't easily check existence without error/warning in some setups.
    // Assuming standard behavior: returns key if missing.
    // But to be cleaner, let's just use it. If the translation file has it, good.

    // We need to handle case sensitivity.
    // JSON keys: "size", "color", "ml" (lowercase). "Lipstick" (Pascal).

    const lowerKey = key.toString().toLowerCase();

    // Unit/Option check (using t -> Shop)
    // We added "size", "color" (lowercase) to JSON.
    // If input is "Color", lowerKey is "color".
    if (translator === t) {
      // Try lowercase for Shop keys
      return t.rich ? t(lowerKey) : t(lowerKey) === lowerKey ? key : t(lowerKey); // Rough check
    }

    return translator(key); // Default behavior
  };
  // Simplified Logic:
  // We will try to translate `key.toLowerCase()` for options/units.
  // We will try to translate `key` (exact) for Categories (Types).

  const trOption = (key) => {
    if (!key) return '';
    const lower = key.toLowerCase();
    // If translation returns key (meaning missing), we return original key to keep casing or just original.
    // next-intl doesn't expose `has` easily in the hook function usually unless configured.
    // We will just try `t(lower)`. If it returns text different from key, use it.
    // Limitation: If translation is same as key (e.g. "Color" -> "Color"), it works.
    // But if missing, t('foo') -> 'foo'.
    return t(lower);
  };

  const trType = (key) => {
    if (!key) return '';
    // Categories are PascalCase e.g. "Lipstick". Product data might be "Lipstick".
    return tCats(key);
  };

  // 1. Determine the "Primary" Option to display (First defined option group)
  const primaryOption = product.options && product.options.length > 0 ? product.options[0] : null;

  // State for the currently selected variant overrides
  const [selectedVariant, setSelectedVariant] = useState(null);

  // 2. Derived Display Values
  // Requirement: "Display Name must be with product type"
  const displayName = product.name;

  // Image: Variant image > Root specific image (main/small) > Placeholder
  const displayImage = selectedVariant?.image || product.mainImage || 'https://placehold.co/400';

  // Price: Variant price > Root price
  const displayPrice = selectedVariant?.price || product.price;

  // Attribute Display
  const defaultOptionValue = primaryOption?.values?.[0];
  const currentOptionValue = selectedVariant?.attributes?.[primaryOption?.name] || defaultOptionValue;

  const handleOpenMenu = (event) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = (e) => {
    e?.stopPropagation();
    setAnchorEl(null);
  };

  const handleSelectOption = (value) => {
    if (!product.variants) return;
    const uniqueVariant = product.variants.find(
      (v) => v.attributes && v.attributes[primaryOption.name] === value,
    );
    if (uniqueVariant) {
      setSelectedVariant(uniqueVariant);
    }
    handleCloseMenu();
  };

  const hasOptions = primaryOption && primaryOption.values.length > 0;
  const optionCount = primaryOption?.values?.length || 0;

  // Translation helpers implementation usage
  const translatedUnit = product.unit ? trOption(product.unit) : '';
  const translatedSize = product.size || '';
  // Note: Option VALUES (e.g. "Red", "Small") are dynamic. We usually don't translate them unless we have a specific map.
  // But KEYS (name="Color") and UNITS ("ml") we can.

  const displaySizeAndUnit = currentOptionValue
    ? `${currentOptionValue}${translatedUnit}`
    : product.size
      ? `${product.size}${translatedUnit}`
      : '';

  const displayType = product.type ? trType(product.type) : '';

  return (
    <Card
      elevation={0}
      sx={{
        border: 'none',
        borderRadius: 0,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s',
        bgcolor: 'transparent',
      }}
    >
      {/* Image Area */}
      <Box
        sx={{
          position: 'relative',
          pt: '100%',
          mb: 1.5,
          borderRadius: 4,
          overflow: 'hidden',
          bgcolor: 'white',
          border: '1px solid',
          borderColor: 'rgba(0,0,0,0.05)',
        }}
      >
        <CardMedia
          component="img"
          image={displayImage}
          alt={displayName}
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
          }}
        />
      </Box>

      {/* Content Area */}
      <Box
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          px: 0.5,
        }}
      >
        {/* Brand + Size/Unit (Always Shown if exists) */}
        <Box
          sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 0.5, width: '100%', flexWrap: 'wrap' }}
        >
          <Typography variant="subtitle2" fontWeight="bold" sx={{ fontSize: '0.95rem' }}>
            {product.brand}
          </Typography>
          {(product.size || product.unit) && (
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
              {displaySizeAndUnit}
            </Typography>
          )}
        </Box>

        {/* Name (Root + Type) */}
        <Typography
          variant="body2"
          sx={{
            mb: 1,
            fontWeight: 400,
            fontSize: '0.9rem',
            lineHeight: '1.4em',
          }}
        >
          {displayName} {displayType}
        </Typography>

        {/* Dynamic Option Selector / Size Display */}
        {hasOptions && (
          <Box
            onClick={handleOpenMenu}
            sx={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              mb: 1.5,
              width: '100%', // Full width
              color: 'text.secondary',
              fontSize: '0.8rem',
              '&:hover': { color: 'primary.main' },
              // NOTE: Box is a flex container now
            }}
          >
            {/* The Label Part (Flex 1, truncate) */}
            <Typography
              variant="caption"
              color="inherit"
              sx={{
                fontSize: '0.8rem',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                flex: 1, // Take remaining space
                mr: 0.5,
              }}
            >
              {trOption(primaryOption.name)} {optionCount > 1 ? `(${optionCount})` : ''} :{' '}
              {displaySizeAndUnit}
            </Typography>

            {/* The Icon Part (Fixed) */}
            {optionCount > 1 && (
              <KeyboardArrowDownIcon fontSize="small" sx={{ fontSize: 16, flexShrink: 0 }} />
            )}
          </Box>
        )}

        {/* Helper Menu for Options */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleCloseMenu}
          onClick={(e) => e.stopPropagation()}
          slotProps={{
            paper: {
              sx: { minWidth: anchorEl ? anchorEl.clientWidth : undefined },
            },
          }}
        >
          {primaryOption?.values.map((val) => (
            <MenuItem
              key={val}
              selected={val === currentOptionValue}
              onClick={() => handleSelectOption(val)}
              dense
            >
              {val} {translatedUnit}
            </MenuItem>
          ))}
        </Menu>

        {/* Price - Requirement: "Must have most flex grow" */}
        <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'flex-end', mb: 0.5 }}>
          <Typography variant="subtitle1" fontWeight="bold">
            {typeof displayPrice === 'number' ? displayPrice.toLocaleString() : displayPrice} ֏
          </Typography>
        </Box>

        {/* Rating */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Rating
            value={Number(product.rating) || 0}
            precision={0.5}
            size="small"
            readOnly
            sx={{ color: '#FFB400', fontSize: '1rem' }}
          />
          {(product.reviewCount > 0 || product.reviews > 0) && (
            <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
              ({product.reviewCount || product.reviews})
            </Typography>
          )}
        </Box>
      </Box>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: { xs: 0.5, md: 1 }, width: '100%', mt: 'auto' }}>
        <IconButton
          size="small"
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            color: 'text.primary',
            width: { xs: 32, md: 40 },
            height: { xs: 32, md: 40 },
            flexShrink: 0,
          }}
        >
          <ShoppingBasketIcon size={18} />
        </IconButton>
        <IconButton
          size="small"
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            width: { xs: 32, md: 40 },
            height: { xs: 32, md: 40 },
            flexShrink: 0,
          }}
        >
          <FavoriteBorderIcon fontSize="small" color="inherit" sx={{ fontSize: { xs: 18, md: 20 } }} />
        </IconButton>
        <Button
          variant="contained"
          fullWidth
          disableElevation
          sx={{
            bgcolor: '#2D3436',
            color: 'white',
            textTransform: 'none',
            borderRadius: 2,
            fontWeight: 500,
            fontSize: { xs: '0.8rem', md: '0.9rem' },
            height: { xs: 32, md: 40 },
            minWidth: 0,
            px: 1,
            '&:hover': { bgcolor: 'black' },
          }}
        >
          {t('order')}
        </Button>
      </Box>
    </Card>
  );
};

export default function ProductGrid({ products, filters, sortBy }) {
  const t = useTranslations('Shop');
  const tCats = useTranslations('CategoryNames');

  // Guard clause for null products
  const displayProducts = products || [];

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Grid container spacing={2}>
        {displayProducts.map((product) => (
          <Grid size={{ xs: 6, sm: 6, md: 4, lg: 3 }} key={product.id}>
            <ProductCard product={product} t={t} tCats={tCats} />
          </Grid>
        ))}
      </Grid>

      {displayProducts.length === 0 && (
        <Box sx={{ py: 10, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            No products found
          </Typography>
        </Box>
      )}
    </Box>
  );
}
