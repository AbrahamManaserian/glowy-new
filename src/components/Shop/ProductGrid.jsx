'use client';

import React, { useState, memo, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Box,
  Card,
  CardMedia,
  Typography,
  Button,
  Rating,
  IconButton,
  Menu,
  MenuItem,
  Badge,
} from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import Grid from '@mui/material/Grid';
import { useRouter } from '../../i18n/navigation';
import { useTranslations } from 'next-intl';
import { safeTranslate } from '../../i18n/utils';
import { useShop } from '../../context/ShopContext';
import { ShoppingBasketIcon } from '../ShoppingBasketIcon';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

// Component for individual Product Card to handle local state (selected variant)
// Wrapped in memo to prevent unnecessary re-renders when parent grid updates
const ProductCard = memo(({ product, t, tCats }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sort = searchParams.get('sort');
  const [anchorEl, setAnchorEl] = useState(null);

  const trOption = (key) => safeTranslate(key, t);
  const trType = (key) => safeTranslate(key, tCats);
  const { addToCart, addToWishlist, isInWishlist, cart } = useShop();

  // 1. Determine Options and Variants
  // We use the full list of variants and options definitions to handle all possibilities (Size, Color, etc.)
  const variants = product.variants || [];
  const options = product.options || [];

  // State for the currently selected variant overrides
  const [selectedVariant, setSelectedVariant] = useState(null);

  // 2. Derived Display Values
  const displayName = product.name;

  // Determine default variant based on sort order
  const defaultVariant = useMemo(() => {
    if (!variants || variants.length === 0) return {};
    if (sort === 'price-asc') {
      return variants.reduce(
        (prev, curr) => ((curr.price || 0) < (prev.price || 0) ? curr : prev),
        variants[0],
      );
    }
    if (sort === 'price-desc') {
      return variants.reduce(
        (prev, curr) => ((curr.price || 0) > (prev.price || 0) ? curr : prev),
        variants[0],
      );
    }
    return variants[0];
  }, [variants, sort]);

  // Image & Price & Discount Logic
  // Fallback to defaults. If no selection, use calculated default variant or empty object.
  const currentVariant = selectedVariant || defaultVariant || {};

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

  const handleOpenMenu = (event) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = (e) => {
    e?.stopPropagation();
    setAnchorEl(null);
  };

  const handleSelectVariant = (variant) => {
    if (variant) {
      setSelectedVariant(variant);
    }
    handleCloseMenu();
  };

  // Navigation Handler
  const handleNavigate = () => {
    // If explicit variant selected, use it.
    // If not, use the implicit default variant (currentVariant) to ensure consistent state.
    const targetId = selectedVariant?.id || currentVariant?.id;
    const query = targetId ? `?variant=${targetId}` : '';
    // Use slug for cleaner URLs, fallback to ID
    const urlSlug = product.slug || product.id;
    router.push(`/product/${urlSlug}${query}`);
  };

  const hasOptions = variants.length > 1;

  // Translation helpers implementation usage
  const translatedUnit = product.unit ? trOption(product.unit) : '';

  // Button Label: "options (Count)"

  const optionsLabel = t('options_count', { count: variants.length });

  // Helper to generate menu item label
  const getVariantLabel = (variant) => {
    if (!variant || !variant.attributes) return '';
    return options
      .map((opt) => {
        const val = variant.attributes[opt.name];
        if (!val) return null;
        const name = trOption(opt.name);
        // Requirement: "If option name is 'size' the value must also previewed with unit, else only value"
        const isSize = opt.name.toLowerCase() === 'size';
        const displayVal = isSize ? `${val}${translatedUnit}` : val;
        // Requirement: "The menu items preview must show option name and option value"
        return `${name}: ${displayVal}`;
      })
      .filter(Boolean)
      .join(', ');
  };

  // Logic to show size next to brand if available in current variant
  // Find a 'size' attribute in the current variant
  let displaySizeAndUnit = '';
  const sizeOption = options.find((o) => o.name.toLowerCase() === 'size');
  const sizeKey = sizeOption?.name;

  if (sizeKey && currentVariant.attributes?.[sizeKey]) {
    displaySizeAndUnit = `${currentVariant.attributes[sizeKey]}${translatedUnit}`;
  } else if (product.size || product.unit) {
    displaySizeAndUnit = `${product.size || ''}${translatedUnit}`;
  }

  const displayType = product.type ? trType(product.type) : '';

  const cartItem = cart.find(
    (item) => item.productId === product.id && item.variantId === (currentVariant.id || 'default'),
  );
  const qtyInCart = cartItem ? cartItem.quantity : 0;

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
              mb: 1,
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
              {optionsLabel}
            </Typography>

            {/* The Icon Part (Fixed) */}
            <KeyboardArrowDownIcon fontSize="small" sx={{ fontSize: 16, flexShrink: 0 }} />
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
              sx: { minWidth: anchorEl ? anchorEl.clientWidth : undefined, maxHeight: 300 },
            },
          }}
        >
          {variants.map((variant) => (
            <MenuItem
              key={variant.id}
              selected={variant.id === currentVariant.id}
              onClick={() => handleSelectVariant(variant)}
              dense
            >
              <Typography variant="body2">{getVariantLabel(variant)}</Typography>
            </MenuItem>
          ))}
        </Menu>

        {/* Price - Requirement: "Must have most flex grow" */}
        <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'flex-end', flexWrap: 'wrap', gap: 1 }}>
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
        <Box sx={{ display: 'flex', alignItems: 'center', mb: '5px' }}>
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
          onClick={() => addToCart(product, currentVariant)}
          disabled={currentVariant.quantity <= 0}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            color: 'text.primary',
            width: { xs: 32, md: 40 },
            height: { xs: 32, md: 40 },
            flexShrink: 0,
            '&:hover': { bgcolor: 'action.hover' },
            opacity: currentVariant.quantity <= 0 ? 0.5 : 1,
          }}
        >
          <Badge
            badgeContent={qtyInCart}
            sx={{
              '& .MuiBadge-badge': {
                bgcolor: '#f44336', // Global active color
                color: 'white',
                fontSize: '0.65rem',
                minWidth: '16px',
                height: '16px',
                padding: '0 4px',
              },
            }}
          >
            <ShoppingBasketIcon size={18} />
          </Badge>
        </IconButton>
        <IconButton
          size="small"
          onClick={() => addToWishlist(product)}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            width: { xs: 32, md: 40 },
            height: { xs: 32, md: 40 },
            flexShrink: 0,
            color: isInWishlist(product.id) ? 'error.main' : 'inherit',
          }}
        >
          {isInWishlist(product.id) ? (
            <FavoriteIcon fontSize="small" sx={{ fontSize: { xs: 18, md: 20 }, fill: 'currentColor' }} />
          ) : (
            <FavoriteBorderIcon fontSize="small" color="inherit" sx={{ fontSize: { xs: 18, md: 20 } }} />
          )}
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
