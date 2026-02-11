'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Button,
  Container,
  TextField,
  Radio,
  RadioGroup,
  FormControlLabel,
  Card,
  Divider,
  Checkbox,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useShop } from '../../context/ShopContext';
import { useAuth } from '../../context/AuthContext';
import { useCartCalculations } from '../../hooks/useCartCalculations';
import { useRouter } from '../../i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

// Steps Indicator
const CheckoutSteps = ({ activeStep = 1 }) => {
  const t = useTranslations('Cart');
  const steps = [t('steps_cart'), t('steps_details'), t('steps_complete')];

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
              align="center"
              sx={{ lineHeight: 1.2, mt: 0.5 }}
            >
              {label}
            </Typography>
          </Box>
          {index < steps.length - 1 && (
            <Box
              sx={{
                width: { xs: 50, sm: 100, md: 150 },
                height: 0,
                borderTop: '1px solid',
                borderColor: index < activeStep ? '#E65100' : '#eee',
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

export default function CheckoutClient() {
  const t = useTranslations('Checkout');
  const tCart = useTranslations('Cart');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { cart, clearCart } = useShop();
  const { user, updateUserData } = useAuth();
  
  const [shippingMethod, setShippingMethod] = useState('standard');
  const [paymentMethod, setPaymentMethod] = useState('cash'); // Default Cash
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [orderId, setOrderId] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    address: '',
    phone: '',
    email: '',
    note: '',
  });
  const [saveInfo, setSaveInfo] = useState(true);

  // Initialize form with user data
  useEffect(() => {
    if (user) {
      const names = user.displayName ? user.displayName.split(' ') : ['', ''];
      setFormData((prev) => ({
        ...prev,
        firstName: prev.firstName || names[0] || '',
        lastName: prev.lastName || names.slice(1).join(' ') || '',
        email: prev.email || user.email || '',
        phone: prev.phone || user.phone || prev.phone || '',
        address: prev.address || user.address || prev.address || '',
        note: prev.note || '',
      }));
    }
  }, [user]);

  // Handle Input Change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };


  // Get items from URL
  const itemsParam = searchParams.get('items');
  const selectedKeys = itemsParam ? itemsParam.split(',') : [];

  // Filter cart to only selected items
  // Note: We need to pass the FULL cart to calculation hook but tell it which keys are selected
  // OR we pass only the relevant items to the hook and say "all selected".
  // The hook supports selectedItemsKeys argument.

  const { subtotal, breakdown, shippingCost, total, totalSavings, bonusAmount, meta, itemCalculations } =
    useCartCalculations(cart, user, selectedKeys, shippingMethod);

  const { thresholds } = meta;

  const handlePlaceOrder = async () => {
    setLoading(true);
    setError('');

    try {
      // 1. Validate Inputs (Basic)
      if (!formData.firstName || !formData.lastName || !formData.address || !formData.phone) {
        throw new Error('Please fill in all required fields.');
      }

      // 2. Update User Data if Requested and Changed
      if (user && saveInfo) {
        const newData = {};
        const newFullName = `${formData.firstName} ${formData.lastName}`.trim();

        if (newFullName !== user.displayName) newData.displayName = newFullName;
        if (formData.phone !== user.phoneNumber && formData.phone !== user.phone)
          newData.phone = formData.phone;
        if (formData.address !== user.address) newData.address = formData.address;

        if (Object.keys(newData).length > 0) {
          await updateUserData(newData);
        }
      }

      // 3. Prepare Order Payload
      const orderPayload = {
        items: checkoutItems.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          price: item.price,
          discount: item.discount,
          name: item.name,
        })),
        shippingMethod,
        paymentMethod,
        deliveryAddress: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          address: formData.address,
          phone: formData.phone,
          email: formData.email,
          note: formData.note,
        },
        userId: user?.uid,
        userInfo: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          email: formData.email || user?.email,
        },
      };

      // 4. Send to API
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to place order');
      }

      // 5. Success      // Update local user state if first shop discount was used so it disappears from UI immediately
      if (user && breakdown.firstShopDiscount > 0) {
        await updateUserData({ firstShop: false });
      }
      setSuccess(true);
      setOrderId(result.orderId);
      clearCart();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };


  if (success) {
    return (
      <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
        <Box sx={{ mb: 4, color: '#4CAF50' }}>
          <CheckCircleOutlineIcon sx={{ fontSize: 80 }} />
        </Box>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Order Placed Successfully!
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Thank you for your order. Your order ID is <b>{orderId}</b>. We have sent a confirmation details to
          your email.
        </Typography>
        <Button variant="contained" sx={{ mt: 2, bgcolor: 'black' }} onClick={() => router.push('/shop')}>
          {tCart('continue_shopping_btn')}
        </Button>
      </Container>
    );
  }

  if (selectedKeys.length === 0) {
    // Handle empty state or redirect back to cart
    return (
      <Container sx={{ py: 4 }}>
        <Typography>{t('no_items_selected')}</Typography>
        <Button onClick={() => router.push('/cart')}>{t('back_to_cart')}</Button>
      </Container>
    );
  }

  // Filter cart items for display
  const checkoutItems = cart.filter((item) => selectedKeys.includes(`${item.productId}_${item.variantId}`));

  return (
    <Container maxWidth="lg" sx={{ p: '0 10px 60px 10px' }}>
      <CheckoutSteps activeStep={1} />

      <Grid container spacing={4}>
        {/* Left Column: Form */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Delivery Address */}
            <Card variant="outlined" sx={{ p: { xs: 1, sm: 3 }, borderRadius: 2 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                {t('shipping_address')}
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    required
                    fullWidth
                    label={t('labels.firstName')}
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    variant="filled"
                    sx={{
                      '& .MuiFilledInput-root': {
                        bgcolor: '#f5f5f5',
                        borderRadius: 2,
                        '&:before': { display: 'none' },
                        '&:after': { display: 'none' },
                      },
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    required
                    fullWidth
                    label={t('labels.lastName')}
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    variant="filled"
                    sx={{
                      '& .MuiFilledInput-root': {
                        bgcolor: '#f5f5f5',
                        borderRadius: 2,
                        '&:before': { display: 'none' },
                        '&:after': { display: 'none' },
                      },
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    required
                    fullWidth
                    label={t('labels.address')}
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    variant="filled"
                    sx={{
                      '& .MuiFilledInput-root': {
                        bgcolor: '#f5f5f5',
                        borderRadius: 2,
                        '&:before': { display: 'none' },
                        '&:after': { display: 'none' },
                      },
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    required
                    fullWidth
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    label={t('labels.phone')}
                    variant="filled"
                    sx={{
                      '& .MuiFilledInput-root': {
                        bgcolor: '#f5f5f5',
                        borderRadius: 2,
                        '&:before': { display: 'none' },
                        '&:after': { display: 'none' },
                      },
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    label={t('labels.email')}
                    variant="filled"
                    sx={{
                      '& .MuiFilledInput-root': {
                        bgcolor: '#f5f5f5',
                        borderRadius: 2,
                        '&:before': { display: 'none' },
                        '&:after': { display: 'none' },
                      },
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    multiline
                    name="note"
                    value={formData.note}
                    onChange={handleInputChange}
                    minRows={2}
                    label={t('labels.note')}
                    variant="filled"
                    sx={{
                      '& .MuiFilledInput-root': {
                        bgcolor: '#f5f5f5',
                        borderRadius: 2,
                        '&:before': { display: 'none' },
                        '&:after': { display: 'none' },
                      },
                    }}
                  />
                </Grid>
              </Grid>
              <Box sx={{ mt: 2 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={saveInfo}
                      onChange={(e) => setSaveInfo(e.target.checked)}
                      sx={{ color: '#E65100', '&.Mui-checked': { color: '#E65100' } }}
                    />
                  }
                  label={t('save_info')}
                />
              </Box>
            </Card>

            {/* Shipping Method */}
            <Card variant="outlined" sx={{ p: { xs: 1, sm: 3 }, borderRadius: 2 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                {t('shipping_method')}
              </Typography>
              <RadioGroup value={shippingMethod} onChange={(e) => setShippingMethod(e.target.value)}>
                <Box
                  sx={{
                    mb: 2,
                    border: '1px solid',
                    borderColor: shippingMethod === 'standard' ? '#E65100' : 'divider',
                    borderRadius: 2,
                    p: 1,
                  }}
                >
                  <FormControlLabel
                    value="standard"
                    control={<Radio sx={{ color: '#E65100', '&.Mui-checked': { color: '#E65100' } }} />}
                    label={
                      <Box sx={{ width: '100%' }}>
                        <Box
                          sx={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            width: '100%',
                            gap: 1,
                          }}
                        >
                          <Typography fontWeight="bold">{t('shipping_standard')}</Typography>
                          <Typography fontWeight="bold" sx={{ whiteSpace: 'nowrap' }}>
                            1000 ֏
                          </Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                          {t('shipping_standard_desc')}
                        </Typography>
                      </Box>
                    }
                    sx={{
                      width: '100%',
                      m: 0,
                      alignItems: 'flex-start',
                      py: 1,
                      '& .MuiFormControlLabel-label': { width: '100%' },
                    }}
                  />
                </Box>

                <Box
                  sx={{
                    border: '1px solid',
                    borderColor: shippingMethod === 'express' ? '#E65100' : 'divider',
                    borderRadius: 2,
                    p: 1,
                  }}
                >
                  <FormControlLabel
                    value="express"
                    control={<Radio sx={{ color: '#E65100', '&.Mui-checked': { color: '#E65100' } }} />}
                    label={
                      <Box sx={{ width: '100%' }}>
                        <Box
                          sx={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            width: '100%',
                            gap: 1,
                          }}
                        >
                          <Typography fontWeight="bold">{t('shipping_express')}</Typography>
                          <Typography fontWeight="bold" sx={{ whiteSpace: 'nowrap' }}>
                            {(3000).toLocaleString()} ֏
                          </Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                          {t('shipping_express_desc')}
                        </Typography>
                      </Box>
                    }
                    sx={{
                      width: '100%',
                      m: 0,
                      alignItems: 'flex-start',
                      py: 1,
                      '& .MuiFormControlLabel-label': { width: '100%' },
                    }}
                  />
                </Box>
              </RadioGroup>
            </Card>

            {/* Payment Method */}
            <Card variant="outlined" sx={{ p: { xs: 1, sm: 3 }, borderRadius: 2 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                {t('payment_method')}
              </Typography>
              <RadioGroup value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <FormControlLabel
                  value="card"
                  disabled
                  control={<Radio sx={{ color: '#E65100', '&.Mui-checked': { color: '#E65100' } }} />}
                  label={`${t('payment_card')} (Coming Soon)`}
                />
                <FormControlLabel
                  value="cash"
                  control={<Radio sx={{ color: '#E65100', '&.Mui-checked': { color: '#E65100' } }} />}
                  label={t('payment_cash')}
                />
                <FormControlLabel
                  value="idram"
                  disabled
                  control={<Radio sx={{ color: '#E65100', '&.Mui-checked': { color: '#E65100' } }} />}
                  label="Idram (Coming Soon)"
                />
              </RadioGroup>
            </Card>

            {/* REVIEW ITEMS (Compact) */}
            <Card variant="outlined" sx={{ p: { xs: 1, sm: 3 }, borderRadius: 2 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                {t('review_items')}
              </Typography>
              {checkoutItems.map((item) => {
                const key = `${item.productId}_${item.variantId}`;
                const calc = itemCalculations[key];
                return (
                  <Box
                    key={key}
                    sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, alignItems: 'center' }}
                  >
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                      <img
                        src={item.image || '/placeholder.png'}
                        alt={item.name}
                        style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 4 }}
                      />
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {item.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {t('item_variant_quantity', { quantity: item.quantity })}
                        </Typography>
                      </Box>
                    </Box>
                    <Typography fontWeight="medium">
                      {Math.round(calc.finalUnitPrice * item.quantity).toLocaleString()} ֏
                    </Typography>
                  </Box>
                );
              })}
            </Card>
          </Box>
        </Grid>

        {/* Right Column: Summary */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Box sx={{ position: { md: 'sticky' }, top: 75 }}>
            <Card variant="outlined" sx={{ p: { xs: 1, sm: 3 }, borderRadius: 3 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                {tCart('summary_title', { count: checkoutItems.reduce((a, b) => a + b.quantity, 0) })}
              </Typography>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography color="text.secondary">{tCart('subtotal')}</Typography>
                <Typography fontWeight="medium">{subtotal.toLocaleString()} ֏</Typography>
              </Box>

              {breakdown.productMarkdown > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, color: '#E65100' }}>
                  <Typography>{tCart('product_markdown')}</Typography>
                  <Typography fontWeight="medium">-{breakdown.productMarkdown.toLocaleString()} ֏</Typography>
                </Box>
              )}

              {breakdown.firstShopDiscount > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, color: '#E65100' }}>
                  <Typography>{tCart('first_shop_discount')}</Typography>
                  <Typography fontWeight="medium">
                    -{breakdown.firstShopDiscount.toLocaleString()} ֏
                  </Typography>
                </Box>
              )}

              {breakdown.extraDiscount > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, color: '#E65100' }}>
                  <Typography>
                    {tCart('extra_discount', { percent: thresholds.targetDiscountPercent })}
                  </Typography>
                  <Typography fontWeight="medium">-{breakdown.extraDiscount.toLocaleString()} ֏</Typography>
                </Box>
              )}

              <Divider sx={{ my: 1, borderStyle: 'dashed' }} />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography color="text.secondary">{tCart('shipping')}</Typography>
                <Typography fontWeight="medium">
                  {shippingCost === 0 ? tCart('free') : `${shippingCost.toLocaleString()} ֏`}
                </Typography>
              </Box>

              {totalSavings > 0 && (
                <Box
                  sx={{
                    mt: 2,
                    mb: 2,
                    p: 2,
                    bgcolor: '#FFF3E0',
                    borderRadius: 2,
                    border: '1px dashed #E65100',
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', color: '#E65100' }}>
                    <Typography fontWeight="bold">{tCart('total_savings')}</Typography>
                    <Typography fontWeight="bold">{totalSavings.toLocaleString()} ֏</Typography>
                  </Box>
                </Box>
              )}

              <Divider sx={{ my: 2 }} />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h6" fontWeight="bold">
                  {tCart('order_total')}
                </Typography>
                <Typography variant="h6" fontWeight="bold">
                  {total.toLocaleString()} ֏
                </Typography>
              </Box>

              <Box sx={{ bgcolor: '#E3F2FD', p: 2, borderRadius: 2, mb: 3, display: 'flex', gap: 1 }}>
                <Box sx={{ color: '#1976D2', pt: 0.5 }}>🎁</Box>
                <Typography variant="body2" color="text.secondary">
                  {tCart.rich('bonus_hint', {
                    amount: bonusAmount,
                    bold: (chunks) => (
                      <Box component="span" fontWeight="bold">
                        {chunks}
                      </Box>
                    ),
                  })}
                </Typography>
              </Box>

              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              <Button
                variant="contained"
                fullWidth
                size="medium"
                disabled={loading}
                sx={{ bgcolor: '#2D3436', '&:hover': { bgcolor: 'black' }, mb: 2 }}
                onClick={handlePlaceOrder}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : t('place_order')}
              </Button>
              <Button
                variant="contained"
                fullWidth
                size="medium"
                sx={{ bgcolor: '#E65100', color: 'white', '&:hover': { bgcolor: '#EF6C00' } }}
                onClick={() => router.push('/cart')}
              >
                {t('back_to_cart')}
              </Button>
            </Card>
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
}
