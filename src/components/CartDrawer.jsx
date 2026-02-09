'use client';

import React from 'react';
import { Box, Drawer, Typography, IconButton, Button, Divider, Avatar } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useUI } from '../context/UIContext';
import { useShop } from '../context/ShopContext';
import { useRouter } from '../i18n/navigation';
import { useTranslations } from 'next-intl';
import { safeTranslate } from '../i18n/utils';

export default function CartDrawer() {
  const { isCartOpen, toggleCart } = useUI();
  const { cart, removeFromCart, updateCartQuantity } = useShop();
  const router = useRouter();
  const t = useTranslations('Shop'); // Assumptions on translations

  const totalAmount = cart.reduce((total, item) => {
    const price = item.price || 0;
    const discount = item.discount || 0;
    const finalPrice = discount > 0 ? price * (1 - discount / 100) : price;
    return total + finalPrice * item.quantity;
  }, 0);

  const handleCheckout = () => {
    toggleCart();
    router.push('/checkout');
  };

  const handleViewCart = () => {
    toggleCart();
    router.push('/cart');
  };

  return (
    <Drawer
      anchor="right"
      open={isCartOpen}
      onClose={toggleCart}
      sx={{
        zIndex: (theme) => theme.zIndex.drawer,
        '& .MuiDrawer-paper': {
          top: { xs: '56px', sm: '64px' },
          height: { xs: 'calc(100% - 56px)', sm: 'calc(100% - 64px)' },
          boxShadow: 'none',
          borderLeft: '1px solid',
          borderColor: 'divider',
        },
        '& .MuiBackdrop-root': {
          top: { xs: '56px', sm: '64px' },
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        },
      }}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 400 },
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
          position: 'sticky',
          top: 0,
          bgcolor: 'background.paper',
          zIndex: 1,
        }}
      >
        <Typography variant="h6" fontWeight="bold">
          {t('cart_title')} ({cart.reduce((acc, item) => acc + item.quantity, 0)})
        </Typography>
        <IconButton onClick={toggleCart}>
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Cart Items */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
        {cart.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <Typography variant="body1" color="text.secondary">
              {t('cart_empty')}
            </Typography>
          </Box>
        ) : (
          cart.map((item) => {
            const finalPrice =
              item.discount > 0 ? Math.round(item.price * (1 - item.discount / 100)) : item.price;

            // Format Attributes usually stored as { Size: 'M', Color: 'Red' }
            // or we used component logic previously to key them.
            // Let's assume attributes is an object.
            const variantText = Object.entries(item.attributes || {})
              .map(([key, value]) => `${safeTranslate(key, t)}: ${value}`)
              .join(' • ');

            return (
              <Box
                key={`${item.productId}_${item.variantId}`}
                sx={{
                  display: 'flex',
                  gap: 2,
                  mb: 3,
                  pb: 3,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                }}
              >
                {/* Image - Click to Navigate */}
                <Box
                  onClick={() => {
                    const slug = item.slug || item.productId;
                    router.push(`/product/${slug}?variant=${item.variantId}`);
                    toggleCart(); // Close drawer on navigation
                  }}
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: 2,
                    overflow: 'hidden',
                    flexShrink: 0,
                    border: '1px solid',
                    borderColor: 'divider',
                    cursor: 'pointer',
                  }}
                >
                  <img
                    src={item.image || 'https://placehold.co/100'}
                    alt={item.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </Box>

                {/* Details */}
                <Box sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Typography
                      variant="subtitle2"
                      fontWeight="bold"
                      sx={{ mr: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}
                    >
                      {item.name}
                    </Typography>
                    {/* Price */}
                    <Box
                      sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}
                    >
                      {item.discount > 0 && (
                        <Typography
                          variant="caption"
                          sx={{ textDecoration: 'line-through', color: 'text.secondary' }}
                        >
                          {item.price.toLocaleString()} ֏
                        </Typography>
                      )}
                      <Typography
                        variant="subtitle2"
                        fontWeight="bold"
                        sx={{
                          whiteSpace: 'nowrap',
                          color: item.discount > 0 ? 'error.main' : 'inherit',
                        }}
                      >
                        {finalPrice.toLocaleString()} ֏
                      </Typography>
                    </Box>
                  </Box>

                  {/* Variant info */}
                  {variantText && (
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                      {variantText}
                    </Typography>
                  )}

                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
                    {/* Quantity Controls */}
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                      }}
                    >
                      <IconButton
                        size="small"
                        onClick={() => updateCartQuantity(item.productId, item.variantId, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                      >
                        <RemoveIcon fontSize="small" />
                      </IconButton>
                      <Typography variant="body2" sx={{ px: 1 }}>
                        {item.quantity}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => updateCartQuantity(item.productId, item.variantId, item.quantity + 1)}
                      >
                        <AddIcon fontSize="small" />
                      </IconButton>
                    </Box>

                    {/* Delete */}
                    <IconButton
                      color="error"
                      size="small"
                      onClick={() => removeFromCart(item.productId, item.variantId)}
                    >
                      <DeleteOutlineIcon fontSize="medium" />
                    </IconButton>
                  </Box>
                </Box>
              </Box>
            );
          })
        )}
      </Box>

      {/* Footer */}
      <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="subtitle1" fontWeight="bold">
            {t('subtotal')}
          </Typography>
          <Typography variant="subtitle1" fontWeight="bold">
            {Math.round(totalAmount).toLocaleString()} ֏
          </Typography>
        </Box>
        <Button
          variant="contained"
          fullWidth
          size="large"
          sx={{
            mb: 1.5,
            bgcolor: '#2D3436',
            color: 'white',
            '&:hover': { bgcolor: 'black' },
          }}
          onClick={handleCheckout}
          disabled={cart.length === 0}
        >
          {t('checkout')}
        </Button>
        <Button
          variant="outlined"
          fullWidth
          size="large"
          color="inherit"
          onClick={handleViewCart}
          disabled={cart.length === 0}
        >
          {t('view_cart')}
        </Button>
      </Box>
    </Drawer>
  );
}
