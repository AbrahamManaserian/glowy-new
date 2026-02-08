'use client';

import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Button,
  IconButton,
  Divider,
  Checkbox,
  Card,
  Container,
  Alert,
  Snackbar,
  CircularProgress,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { useShop } from '../../context/ShopContext';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from '../../i18n/navigation';
import { validateCartItems } from '../../services/cartService';
import Link from 'next/link';

// Steps Indicator Component
const CartSteps = ({ activeStep = 0 }) => {
  const steps = ['Shopping Cart', 'Checkout Details', 'Complete Order'];
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mb: 6, mt: 4 }}>
      {steps.map((label, index) => (
        <Box key={label} sx={{ display: 'flex', alignItems: 'center' }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              position: 'relative',
              zIndex: 1,
            }}
          >
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                bgcolor: index <= activeStep ? '#E65100' : '#f5f5f5',
                color: index <= activeStep ? 'white' : 'text.disabled',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                mb: 1,
              }}
            >
              {index + 1}
            </Box>
            <Typography
              variant="caption"
              color={index <= activeStep ? 'text.primary' : 'text.disabled'}
              fontWeight={index === activeStep ? 'bold' : 'normal'}
            >
              {label}
            </Typography>
          </Box>
          {index < steps.length - 1 && (
            <Box
              sx={{
                width: { xs: 50, sm: 100, md: 150 },
                height: 1,
                bgcolor: '#eee',
                mx: 1,
                mt: -2.5,
              }}
            />
          )}
        </Box>
      ))}
    </Box>
  );
};

export default function CartClient() {
  const router = useRouter();
  const { cart, removeFromCart, updateCartQuantity, clearCart, updateCartItems } = useShop();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState([]);

  // Sync state
  useEffect(() => {
    let active = true;

    const refreshCart = async () => {
      if (cart.length === 0) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const updates = await validateCartItems(cart);

      if (active) {
        if (updates.length > 0) {
          updateCartItems(updates);
        }
        setLoading(false);
        // Default select all available items
        setSelectedItems(
          cart.filter((item) => item.inStock === true).map((i) => `${i.productId}_${i.variantId}`),
        );
      }
    };

    refreshCart();

    return () => {
      active = false;
    };
  }, [cart.length]); // Run once on mount (or when count changes drastically) - careful with loops

  // Discount Logic
  // 1. Guest: "Sign in and get 20% discount"
  // 2. User & First Shop: 20% applied
  // 3. User & Not First Shop: Standard
  // 4. User & Not Verified: "Verify email"

  const isFirstShop = user?.firstShop === true;
  const isGuest = !user;
  const isVerified = user?.emailVerified;

  // Calculate totals
  const subtotal = cart.reduce((acc, item) => {
    const key = `${item.productId}_${item.variantId}`;
    if (!selectedItems.includes(key)) return acc;

    // Use item's logic for final price
    const price = item.price || 0;
    const discount = item.discount || 0;
    const itemPrice = discount > 0 ? Math.round(price * (1 - discount / 100)) : price;
    return acc + itemPrice * item.quantity;
  }, 0);

  // Example shipping logic
  const FREE_SHIPPING_THRESHOLD = 5000;
  const SHIPPING_COST = subtotal > FREE_SHIPPING_THRESHOLD ? 0 : 1000;

  // Extra Discount Logic (First Shop)
  const FIRST_SHOP_DISCOUNT_PERCENT = 20;
  const EXTRA_DISCOUNT_THRESHOLD = 20000;
  let extraDiscountAmount = 0;

  if (isFirstShop && isVerified) {
    extraDiscountAmount = Math.round(subtotal * (FIRST_SHOP_DISCOUNT_PERCENT / 100));
  }

  // Calculate extra discount from threshold if applicable (implementation logic to be added if needed, currently just banner text)
  const remainingForExtraDiscount = Math.max(0, EXTRA_DISCOUNT_THRESHOLD - subtotal);

  const total = subtotal + SHIPPING_COST - extraDiscountAmount;

  // Handlers
  const handleToggleSelect = (id) => {
    setSelectedItems((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleCheckout = () => {
    const selectedParams = selectedItems.join(',');
    router.push(`/checkout?items=${selectedParams}`);
  };

  const hasOutOfStock = cart.some((item) => item.inStock === false);

  if (cart.length === 0 && !loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>
          Your cart is empty
        </Typography>
        <Button variant="contained" onClick={() => router.push('/shop')} sx={{ mt: 2, bgcolor: 'black' }}>
          Go to Shop
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ pb: 8 }}>
      <CartSteps activeStep={0} />

      {/* Auth / Discount Banner */}
      {isGuest && (
        <Box
          sx={{
            bgcolor: 'white',
            p: 3,
            mb: 4,
            borderRadius: 2,
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ color: '#E65100' }}>
              <InfoOutlinedIcon />
            </Box>
            <Typography fontWeight="medium">Sign in and get 20% discount for your first shopping.</Typography>
          </Box>
          <Button
            variant="contained"
            sx={{ bgcolor: '#E65100', '&:hover': { bgcolor: '#EF6C00' }, borderRadius: '20px' }}
            onClick={() => router.push('/signin?from=/cart')}
          >
            Sign In / Sign Up
          </Button>
        </Box>
      )}

      {user && !isVerified && (
        <Alert severity="warning" sx={{ mb: 4 }}>
          Please verify your email address to unlock special discounts and checkout.
        </Alert>
      )}

      {/* Stock Warning */}
      {hasOutOfStock && (
        <Alert severity="warning" sx={{ mb: 4, bgcolor: '#FFF3E0', color: '#E65100' }}>
          Some items in your cart are out of stock
        </Alert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight="bold">
          Shopping Cart ({cart.reduce((acc, i) => acc + i.quantity, 0)})
        </Typography>
        <Button color="error" startIcon={<DeleteOutlineIcon />} onClick={clearCart}>
          Clear Cart
        </Button>
      </Box>

      <Grid container spacing={4}>
        {/* Left Col: Items */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {cart.map((item) => {
              const isActive = item.inStock === true;
              const finalPrice =
                item.discount > 0 ? Math.round(item.price * (1 - item.discount / 100)) : item.price;
              const key = `${item.productId}_${item.variantId}`;

              return (
                <Card
                  key={key}
                  elevation={0}
                  sx={{
                    p: 2,
                    position: 'relative',
                    border: '1px solid',
                    borderColor: 'divider',
                    opacity: isActive ? 1 : 0.7,
                  }}
                >
                  {/* Checkbox - Absolute Positioned */}
                  <Box sx={{ position: 'absolute', top: 0, left: 0, zIndex: 10 }}>
                    <Checkbox
                      checked={selectedItems.includes(key)}
                      onChange={() => handleToggleSelect(key)}
                      disabled={!isActive}
                      sx={{ color: '#E65100', '&.Mui-checked': { color: '#E65100' } }}
                    />
                  </Box>

                  <Grid container spacing={2} alignItems="flex-start">
                    {/* Image & Controls Column (Mobile Layout Optimized) */}
                    <Grid size="auto">
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 1,
                          ml: { xs: 2, sm: 0 },
                          mt: { xs: 1, sm: 0 },
                        }}
                      >
                        <Box
                          sx={{
                            width: { xs: 80, sm: 100 },
                            height: { xs: 100, sm: 120 },
                            bgcolor: '#f5f5f5',
                            borderRadius: 1,
                            overflow: 'hidden',
                            cursor: 'pointer',
                          }}
                          onClick={() =>
                            router.push(`/product/${item.slug || item.productId}?variant=${item.variantId}`)
                          }
                        >
                          <img
                            src={item.image}
                            alt={item.name}
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                          />
                        </Box>

                        {/* Mobile Controls: Quantity & Delete under Image */}
                        <Box
                          sx={{
                            display: { xs: 'flex', sm: 'none' },
                            alignItems: 'center',
                            gap: 1,
                            width: '100%',
                            justifyContent: 'center',
                          }}
                        >
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              border: '1px solid #ddd',
                              borderRadius: 1,
                            }}
                          >
                            <IconButton
                              size="small"
                              disabled={item.quantity <= 1 || !isActive}
                              onClick={() =>
                                updateCartQuantity(item.productId, item.variantId, item.quantity - 1)
                              }
                              sx={{ p: 0.5 }}
                            >
                              <RemoveIcon fontSize="small" sx={{ fontSize: 16 }} />
                            </IconButton>
                            <Typography sx={{ px: 1, fontSize: '0.9rem', minWidth: 20, textAlign: 'center' }}>
                              {item.quantity}
                            </Typography>
                            <IconButton
                              size="small"
                              disabled={!isActive}
                              onClick={() =>
                                updateCartQuantity(item.productId, item.variantId, item.quantity + 1)
                              }
                              sx={{ p: 0.5 }}
                            >
                              <AddIcon fontSize="small" sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Box>
                          <IconButton
                            size="small"
                            onClick={() => removeFromCart(item.productId, item.variantId)}
                            color="default"
                            sx={{ p: 0.5, border: '1px solid #ddd', borderRadius: 1 }}
                          >
                            <DeleteOutlineIcon fontSize="small" sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Box>
                      </Box>
                    </Grid>

                    {/* Info Column (Right Side) */}
                    <Grid size="grow">
                      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography
                            variant="subtitle2"
                            fontWeight="bold"
                            sx={{ fontSize: { xs: '0.95rem', sm: '1rem' }, lineHeight: 1.3, mb: 0.5 }}
                          >
                            {item.name}
                          </Typography>
                          {item.attributes &&
                            Object.entries(item.attributes).map(([k, v]) => (
                              <Typography key={k} variant="caption" color="text.secondary" display="block">
                                {k}: {v}
                              </Typography>
                            ))}

                          {!isActive && (
                            <Box sx={{ mt: 1 }}>
                              <Typography variant="caption" color="error" fontWeight="bold">
                                Out of stock
                              </Typography>
                            </Box>
                          )}
                        </Box>

                        {/* Price at bottom of info col for consistency */}
                        <Typography
                          variant="h6"
                          fontWeight="bold"
                          sx={{ mt: 1, fontSize: { xs: '1rem', sm: '1.25rem' } }}
                        >
                          {finalPrice.toLocaleString()} ֏
                        </Typography>
                      </Box>
                    </Grid>

                    {/* Desktop Quantity (Right Side) */}
                    <Grid size="auto" sx={{ display: { xs: 'none', sm: 'block' } }}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          border: '1px solid #ddd',
                          borderRadius: 1,
                        }}
                      >
                        <IconButton
                          size="small"
                          disabled={item.quantity <= 1 || !isActive}
                          onClick={() =>
                            updateCartQuantity(item.productId, item.variantId, item.quantity - 1)
                          }
                        >
                          <RemoveIcon fontSize="small" />
                        </IconButton>
                        <Typography sx={{ px: 2 }}>{item.quantity}</Typography>
                        <IconButton
                          size="small"
                          disabled={!isActive}
                          onClick={() =>
                            updateCartQuantity(item.productId, item.variantId, item.quantity + 1)
                          }
                        >
                          <AddIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Grid>

                    {/* Desktop Delete (Right Side) */}
                    <Grid size="auto" sx={{ display: { xs: 'none', sm: 'block' } }}>
                      <IconButton onClick={() => removeFromCart(item.productId, item.variantId)}>
                        <DeleteOutlineIcon />
                      </IconButton>
                    </Grid>
                  </Grid>
                </Card>
              );
            })}
          </Box>

          {/* Promo Banner */}
          <Box
            sx={{
              mt: 4,
              p: 2,
              border: '1px dashed #E65100',
              bgcolor: '#FFF3E0',
              borderRadius: 2,
              color: '#E65100',
              textAlign: 'center',
              fontWeight: 'medium',
            }}
          >
            {remainingForExtraDiscount > 0
              ? `🔥 Add items worth ${remainingForExtraDiscount.toLocaleString()} ֏ more to get 10% extra discount!`
              : '🎉 You have unlocked 10% extra discount!'}
          </Box>
        </Grid>

        {/* Right Col: Summary */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Card variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Summary (
              {cart
                .filter((item) => selectedItems.includes(`${item.productId}_${item.variantId}`))
                .reduce((a, b) => a + b.quantity, 0)}{' '}
              items)
            </Typography>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography color="text.secondary">Subtotal</Typography>
              <Typography fontWeight="medium">{subtotal.toLocaleString()} ֏</Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography color="text.secondary">Shipping</Typography>
              <Typography fontWeight="medium">
                {SHIPPING_COST === 0 ? 'Free' : `${SHIPPING_COST.toLocaleString()} ֏`}
              </Typography>
            </Box>

            {extraDiscountAmount > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, color: 'success.main' }}>
                <Typography>First Shop Discount (20%)</Typography>
                <Typography fontWeight="medium">-{extraDiscountAmount.toLocaleString()} ֏</Typography>
              </Box>
            )}

            {SHIPPING_COST > 0 && (
              <Typography
                variant="caption"
                color="info.main"
                display="block"
                sx={{ mb: 2, fontWeight: 'medium' }}
              >
                Add items worth {(FREE_SHIPPING_THRESHOLD - subtotal).toLocaleString()} ֏ to get free shipping
              </Typography>
            )}

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="h6" fontWeight="bold">
                Order Total
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                {total.toLocaleString()} ֏
              </Typography>
            </Box>

            {/* Bonus Hint */}
            <Box sx={{ bgcolor: '#E3F2FD', p: 2, borderRadius: 2, mb: 3, display: 'flex', gap: 1 }}>
              <Box sx={{ color: '#1976D2', pt: 0.5 }}>🎁</Box>
              <Typography variant="body2" color="text.secondary">
                By confirming this order, you will earn{' '}
                <Box component="span" fontWeight="bold">
                  {(total * 0.03).toFixed(0)} bonus (3%)
                </Box>{' '}
                that can be used for future orders.
              </Typography>
            </Box>

            <Button
              variant="contained"
              fullWidth
              size="large"
              sx={{ bgcolor: '#2D3436', '&:hover': { bgcolor: 'black' }, mb: 2, py: 1.5 }}
              onClick={handleCheckout}
              disabled={hasOutOfStock || (user && !isVerified)}
            >
              Continue
            </Button>

            <Button
              variant="outlined"
              fullWidth
              size="large"
              color="inherit"
              onClick={() => router.push('/shop')}
              sx={{ py: 1.5 }}
            >
              Continue Shopping
            </Button>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}
