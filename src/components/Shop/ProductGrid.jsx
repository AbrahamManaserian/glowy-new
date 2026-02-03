'use client';

import React, { useState, memo } from 'react';
import { Box, Card, CardMedia, Typography, Button, Rating, IconButton, Menu, MenuItem } from '@mui/material';
import Grid from '@mui/material/Grid';
import { useRouter } from '../../i18n/navigation';
import { useTranslations } from 'next-intl';
import { ShoppingBasketIcon } from '../ShoppingBasketIcon';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { CustomPagination } from '../CustomPagination';

// Component for individual Product Card to handle local state (selected variant)
// Wrapped in memo to prevent unnecessary re-renders when parent grid updates
const ProductCard = memo(({ product, t, tCats }) => {
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState(null);

  // ... implementation ...

  // Helper to safely translate or return original
  const safeTranslate = (key, translator) => {
    if (!key) return '';
    const lowerKey = key.toString().toLowerCase();
    if (translator === t) {
      return t.rich ? t(lowerKey) : t(lowerKey) === lowerKey ? key : t(lowerKey); // Rough check
    }
    return translator(key);
  };

  const trOption = (key) => {
    if (!key) return '';
    const lower = key.toLowerCase();
    return t(lower);
  };

  const trType = (key) => {
    if (!key) return '';
    return tCats(key);
  };

  // 1. Determine the "Primary" Option to display (First defined option group)
  const primaryOption = product.options && product.options.length > 0 ? product.options[0] : null;

  // State for the currently selected variant overrides
  const [selectedVariant, setSelectedVariant] = useState(null);

  // 2. Derived Display Values
  const displayName = product.name;

  // Image & Price & Discount Logic
  // Fallback to defaults
  const currentVariant =
    selectedVariant ||
    (product.variants &&
      product.variants.find(
        (v) => v.attributes && v.attributes[primaryOption?.name] === primaryOption?.values?.[0],
      )) ||
    {};

  const displayImage =
    selectedVariant?.image || currentVariant?.image || product.mainImage || 'https://placehold.co/400';

  // Price Logic (Fixed: Price is BASE, Discount is PERCENT)
  const basePrice = selectedVariant?.price || currentVariant?.price || product.price || 0;

  // Discount Logic utilizing 'discount' percent field
  const discountPercent = selectedVariant?.discount || currentVariant?.discount || product.discount || 0;
  const hasDiscount = discountPercent > 0;

  // Calculate final selling price
  // Formula: Final = Base * (1 - discount/100)
  const finalPrice =
    hasDiscount && basePrice ? Math.round(basePrice * (1 - discountPercent / 100)) : basePrice;

  // Display values
  const displayPrice = finalPrice; // The one shown in bold
  const originalPrice = basePrice; // The one crossed out

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

  // Navigation Handler
  const handleNavigate = () => {
    // If explicit variant selected, use it.
    // If not, use the implicit default variant (currentVariant) to ensure consistent state.
    const targetId = selectedVariant?.id || currentVariant?.id;
    const query = targetId ? `?variant=${targetId}` : '';
    router.push(`/product/${product.id}${query}`);
  };

  const hasOptions = primaryOption && primaryOption.values.length > 0;
  const optionCount = primaryOption?.values?.length || 0;

  // Translation helpers implementation usage
  const translatedUnit = product.unit ? trOption(product.unit) : '';

  // Logic to ONLY show size/unit if it truly represents a size.
  // We check if:
  // 1. primaryOption name is explicitly "size" (case insensitive)
  // 2. OR if current option is NOT size (e.g. Color), does product have a static size?
  const isVariationSize = primaryOption?.name && primaryOption.name.toLowerCase() === 'size';

  // Compute what to show next to Brand
  let displaySizeAndUnit = '';

  if (isVariationSize) {
    // If the variation itself IS the size (e.g. 50ml, 100ml selection)
    displaySizeAndUnit = currentOptionValue ? `${currentOptionValue}${translatedUnit}` : '';
  } else {
    // If variation is NOT size (e.g. Colors), ONLY show if product has static size/unit
    // Do NOT show the color name here.
    if (product.size || product.unit) {
      displaySizeAndUnit = `${product.size || ''}${translatedUnit}`;
    }
  }

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
        onClick={handleNavigate}
        sx={{
          position: 'relative',
          pt: '100%',
          mb: 1.5,
          borderRadius: 4,
          overflow: 'hidden',
          bgcolor: 'white',
          border: '1px solid',
          borderColor: 'rgba(0,0,0,0.05)',
          cursor: 'pointer',
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
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            left: 8,
            bgcolor: 'error.main',
            color: 'white',
            px: 1,
            py: 0.25,
            borderRadius: 1,
            zIndex: 2,
            fontSize: '0.75rem',
            fontWeight: 'bold',
          }}
        >
          -{product.id}%
        </Box>
        {/* Discount Badge */}
        {hasDiscount && (
          <Box
            sx={{
              position: 'absolute',
              top: 8,
              left: 8,
              bgcolor: 'error.main',
              color: 'white',
              px: 1,
              py: 0.25,
              borderRadius: 1,
              zIndex: 2,
              fontSize: '0.75rem',
              fontWeight: 'bold',
            }}
          >
            -{discountPercent}%
          </Box>
        )}
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
          {displaySizeAndUnit && (
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
              {/* If it's a size variation, we already have it in displaySizeAndUnit. 
                  If it's NOT (e.g. Color), we must show the current value here because displaySizeAndUnit is empty/static. */}
              {isVariationSize ? displaySizeAndUnit : currentOptionValue}
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
        <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', mb: 0.5, flexWrap: 'wrap', gap: 1 }}>
          <Typography
            variant="subtitle1"
            fontWeight="bold"
            color={hasDiscount ? 'error.main' : 'text.primary'}
          >
            {typeof displayPrice === 'number' ? displayPrice.toLocaleString() : displayPrice} ֏
          </Typography>
          {hasDiscount && (
            <Typography
              variant="caption"
              sx={{ textDecoration: 'line-through', color: 'text.secondary', fontSize: '0.8rem' }}
            >
              {typeof originalPrice === 'number' ? originalPrice.toLocaleString() : originalPrice} ֏
            </Typography>
          )}
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
});

ProductCard.displayName = 'ProductCard';

export default function ProductGrid({ products }) {
  const t = useTranslations('Shop');
  const tCats = useTranslations('CategoryNames');

  // Guard clause for null products
  const displayProducts = products || [];

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Grid container spacing={2} columnSpacing={{ xs: 1, sm: 2 }}>
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
