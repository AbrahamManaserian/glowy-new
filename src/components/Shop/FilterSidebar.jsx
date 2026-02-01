'use client';

import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import {
  Box,
  Typography,
  Slider,
  FormControlLabel,
  Checkbox,
  Switch,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  Divider,
  Autocomplete,
  TextField,
  Chip,
  useMediaQuery,
  Radio,
  InputAdornment,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { styled } from '@mui/material/styles';
import { useTranslations } from 'next-intl';
import { useCategories } from '../../context/CategoriesContext';
import { useRouter } from '../../i18n/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../firebase';

const IOSSwitch = styled(
  (props) => <Switch focusVisibleClassName=".Mui-focusVisible" disableRipple {...props} />,
  { shouldForwardProp: (prop) => prop !== 'checkedColor' },
)(({ theme, checkedColor }) => ({
  width: 42,
  height: 22,
  padding: 0,
  '& .MuiSwitch-switchBase': {
    padding: 0,
    margin: 2,
    transitionDuration: '300ms',
    '&.Mui-checked': {
      transform: 'translateX(16px)',
      color: '#fff',
      '& + .MuiSwitch-track': {
        backgroundColor: checkedColor || 'var(--active-color)',
        opacity: 1,
        border: 0,
      },
      '&.Mui-disabled + .MuiSwitch-track': {
        opacity: 0.5,
      },
    },
    '&.Mui-focusVisible .MuiSwitch-thumb': {
      color: '#33cf4d',
      border: '6px solid #fff',
    },
    '&.Mui-disabled .MuiSwitch-thumb': {
      color: theme.palette.mode === 'light' ? theme.palette.grey[100] : theme.palette.grey[600],
    },
    '&.Mui-disabled + .MuiSwitch-track': {
      opacity: theme.palette.mode === 'light' ? 0.7 : 0.3,
    },
  },
  '& .MuiSwitch-thumb': {
    boxSizing: 'border-box',
    width: 19,
    height: 19,
  },
  '& .MuiSwitch-track': {
    borderRadius: 26 / 2,
    backgroundColor: theme.palette.mode === 'light' ? '#E9E9EA' : '#39393D',
    opacity: 1,
    transition: theme.transitions.create(['background-color'], {
      duration: 500,
    }),
  },
}));

const CustomAccordionSummary = styled(AccordionSummary)(({ theme }) => ({
  '& .MuiAccordionSummary-expandIconWrapper.Mui-expanded': {
    transform: 'rotate(0deg)',
  },
}));



const FilterSidebar = forwardRef(({ currentFilters, onApplyFilters }, ref) => {
  const { categories, loading } = useCategories();
  const t = useTranslations('Shop');
  const tCats = useTranslations('CategoryNames');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Local state for sidebar inputs before applying
  const [localFilters, setLocalFilters] = useState(currentFilters);

  // Sync local state with props when they change (e.g. from URL)
  useEffect(() => {
    setLocalFilters(currentFilters);
  }, [currentFilters]);

  useImperativeHandle(
    ref,
    () => ({
      submit: () => {
        onApplyFilters(localFilters);
      },
    }),
    [localFilters, onApplyFilters],
  );

  const handlePriceChange = (event, newValue) => {
    setLocalFilters({ ...localFilters, priceRange: newValue });
  };

  const handleMinPriceChange = (e) => {
    const val = e.target.value === '' ? '' : Number(e.target.value);
    const max = localFilters.priceRange?.[1];
    setLocalFilters({ ...localFilters, priceRange: [val, max] });
  };

  const handleMaxPriceChange = (e) => {
    const val = e.target.value === '' ? '' : Number(e.target.value);
    const min = localFilters.priceRange?.[0] || 0;
    setLocalFilters({ ...localFilters, priceRange: [min, val] });
  };

  const updateFilter = (key, value) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleToggleChange = (field) => {
    updateFilter(field, !localFilters[field]);
  };

  const handleAutocompleteChange = (field, newValue) => {
    updateFilter(field, newValue);
    // Close keyboard on mobile on select
    if (typeof document !== 'undefined' && document.activeElement) {
      document.activeElement.blur();
    }
  };

  const handleCategoryClick = (key) => {
    // Single select: Replace entire array. Reset subcats and types.
    const isSelected = localFilters.categories?.includes(key);
    if (isSelected) {
      // Allow deselecting to go back to "No Category" state?
      // User said "We dont nead go back categories button remove it".
      // But if I uncheck the checkbox, it should probably clear.
      setLocalFilters((prev) => ({
        ...prev,
        categories: [], // Clear categories
        subcategories: [],
        types: [],
        brands: [],
        sizes: [],
        notes: [],
      }));
    } else {
      setLocalFilters((prev) => ({
        ...prev,
        categories: [key],
        subcategories: [], // Reset deeper levels on cat change
        types: [],
        brands: [],
        sizes: [],
        notes: [],
      }));
    }
  };

  const handleSubCategoryClick = (key) => {
    // Single select: Replace array. Reset types.
    const isSelected = localFilters.subcategories?.includes(key);
    if (isSelected) {
      // Allow deselect
      setLocalFilters((prev) => ({
        ...prev,
        subcategories: [],
        types: [],
      }));
    } else {
      setLocalFilters((prev) => ({
        ...prev,
        subcategories: [key],
        types: [],
      }));
    }
  };

  const handleTypeToggle = (type) => {
    const currentTypes = localFilters.types || [];
    const newTypes = currentTypes.includes(type)
      ? currentTypes.filter((t) => t !== type)
      : [...currentTypes, type];

    updateFilter('types', newTypes);
  };

  // Logic to determine what to show
  const activeCategoryKey = localFilters.categories?.[0];
  const activeSubCategoryKey = localFilters.subcategories?.[0];

  // Data lookup
  const activeCategoryData = activeCategoryKey ? categories[activeCategoryKey] : null;
  const subCategoriesList = activeCategoryData?.subcategories || {};

  const activeSubCategoryData =
    activeCategoryKey && activeSubCategoryKey && subCategoriesList
      ? subCategoriesList[activeSubCategoryKey]
      : null;

  const availableTypes = activeSubCategoryData?.types || [];

  const [brandOptions, setBrandOptions] = useState([]);
  const [sizeOptions, setSizeOptions] = useState([]);
  const [perfumeNotes, setPerfumeNotes] = useState([]);

  const brandRef = useRef(null);
  const sizeRef = useRef(null);
  const notesRef = useRef(null);

  const handleScrollToElement = (ref) => {
    if (isMobile && ref.current) {
      setTimeout(() => {
        ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  useEffect(() => {
    const fetchCategoryConfig = async () => {
      if (activeCategoryKey) {
        try {
          const docRef = doc(db, 'config', activeCategoryKey);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setBrandOptions(data.brands || []);
            const uniqueSizes = [...new Set((data.sizes || []).map(String))];
            setSizeOptions(uniqueSizes);
            setPerfumeNotes(data.perfumeNotes || []);
          } else {
            setBrandOptions([]);
            setSizeOptions([]);
            setPerfumeNotes([]);
          }
        } catch (err) {
          console.error('Error fetching config', err);
        }
      } else {
        setBrandOptions([]);
        setSizeOptions([]);
        setPerfumeNotes([]);
      }
    };
    fetchCategoryConfig();
  }, [activeCategoryKey]);

  if (loading) return <Box>Loading filters...</Box>;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', px: '15px' }}>
      {/* Filters Area */}
      <Box sx={{ pb: '300px' }}>
        {/* Price Filter */}
        <Box sx={{ mb: 3, boxSizing: 'border-box', p: '5px' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography gutterBottom variant="subtitle2" fontWeight="bold">
              {t('price')}
            </Typography>
            <Button
              size="small"
              onClick={() => handlePriceChange(null, [0, ''])}
              sx={{
                color: 'var(--active-color)',
                textTransform: 'none',
                minWidth: 'auto',
                p: 0,
                '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' },
              }}
            >
              {t('reset')}
            </Button>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
            <TextField
              label={t('min')}
              type="number"
              size="small"
              value={localFilters.priceRange?.[0] || ''}
              onChange={handleMinPriceChange}
              onWheel={(e) => e.target.blur()}
              InputProps={{
                startAdornment: <InputAdornment position="start">֏</InputAdornment>,
              }}
              sx={{
                '& input[type=number]': { MozAppearance: 'textfield' },
                '& input[type=number]::-webkit-outer-spin-button': { WebkitAppearance: 'none', margin: 0 },
                '& input[type=number]::-webkit-inner-spin-button': { WebkitAppearance: 'none', margin: 0 },
              }}
              fullWidth
            />
            <TextField
              label={t('max')}
              type="number"
              size="small"
              value={localFilters.priceRange?.[1] || ''}
              onChange={handleMaxPriceChange}
              onWheel={(e) => e.target.blur()}
              InputProps={{
                startAdornment: <InputAdornment position="start">֏</InputAdornment>,
              }}
              sx={{
                '& input[type=number]': { MozAppearance: 'textfield' },
                '& input[type=number]::-webkit-outer-spin-button': { WebkitAppearance: 'none', margin: 0 },
                '& input[type=number]::-webkit-inner-spin-button': { WebkitAppearance: 'none', margin: 0 },
              }}
              fullWidth
            />
          </Box>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Discounted Toggle */}
        <FormControlLabel
          control={
            <IOSSwitch
              checked={localFilters.discounted || false}
              onChange={() => handleToggleChange('discounted')}
              checkedColor="#4CAF50"
            />
          }
          label={
            <Box>
              <Typography variant="subtitle2" fontWeight="bold">
                {t('discounted')}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                {t('discounted_desc')}
              </Typography>
            </Box>
          }
          sx={{
            mb: 2,
            display: 'flex',
            width: '100%',
            ml: 0,
            alignItems: 'flex-start',
            gap: 1,
          }}
        />

        <Divider sx={{ mb: 2 }} />

        {/* Categories / Subcategories Accordion */}
        <Accordion defaultExpanded elevation={0} disableGutters sx={{ '&:before': { display: 'none' } }}>
          <CustomAccordionSummary
            sx={{ p: 0 }}
            expandIcon={
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 24,
                  height: 24,
                }}
              >
                <AddIcon sx={{ display: 'block', '.Mui-expanded &': { display: 'none' } }} />
                <RemoveIcon sx={{ p: 0, display: 'none', '.Mui-expanded &': { display: 'block' } }} />
              </Box>
            }
          >
            <Typography variant="subtitle2" fontWeight="bold">
              {activeCategoryData
                ? tCats.has(activeCategoryKey)
                  ? tCats(activeCategoryKey)
                  : activeCategoryData.label || activeCategoryKey
                : t('categories')}
            </Typography>
          </CustomAccordionSummary>
          <AccordionDetails>
            {activeCategoryKey ? (
              <>
                {/* Subcategories View */}
                {Object.entries(subCategoriesList).map(([key, val]) => (
                  <FormControlLabel
                    key={key}
                    control={
                      <Radio
                        checked={localFilters.subcategories?.includes(key) || false}
                        onChange={() => handleSubCategoryClick(key)}
                        size="small"
                        sx={{
                          color: 'text.secondary',
                          '&.Mui-checked': { color: 'var(--active-color)' },
                          py: 0.5,
                        }}
                      />
                    }
                    label={
                      <Typography variant="body1" sx={{ mt: '1px' }}>
                        {tCats.has(key) ? tCats(key) : val.label || key}
                      </Typography>
                    }
                    sx={{ display: 'flex', width: '100%', alignItems: 'flex-start', mb: 1 }}
                  />
                ))}
                <Button
                  size="small"
                  // color="success"
                  onClick={() =>
                    setLocalFilters({ ...localFilters, categories: [], subcategories: [], types: [] })
                  }
                  sx={{ mt: 1, textTransform: 'none', p: 0 }}
                >
                  {t('back_to_categories')}
                </Button>
              </>
            ) : (
              // Main Categories View
              Object.entries(categories).map(([key, val]) => (
                <FormControlLabel
                  key={key}
                  control={
                    <Radio
                      checked={localFilters.categories?.includes(key) || false}
                      onChange={() => handleCategoryClick(key)}
                      size="small"
                      sx={{
                        color: 'text.secondary',
                        '&.Mui-checked': { color: 'var(--active-color)' },
                        py: 0.5,
                      }}
                    />
                  }
                  label={
                    <Typography variant="body1" sx={{ mt: '1px' }}>
                      {tCats.has(key) ? tCats(key) : val.label || key}
                    </Typography>
                  }
                  sx={{ display: 'flex', width: '100%', alignItems: 'flex-start', mb: 1 }}
                />
              ))
            )}
          </AccordionDetails>
        </Accordion>

        <Divider sx={{ my: 1 }} />

        {/* Type Filter - Only if types available */}
        {availableTypes.length > 0 && (
          <>
            <Accordion defaultExpanded elevation={0} disableGutters sx={{ '&:before': { display: 'none' } }}>
              <CustomAccordionSummary
                sx={{ p: 0 }}
                expandIcon={
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 24,
                      height: 24,
                    }}
                  >
                    <AddIcon sx={{ display: 'block', '.Mui-expanded &': { display: 'none' } }} />
                    <RemoveIcon sx={{ display: 'none', '.Mui-expanded &': { display: 'block' } }} />
                  </Box>
                }
              >
                <Typography variant="subtitle2" fontWeight="bold">
                  {t('type')}
                </Typography>
              </CustomAccordionSummary>
              <AccordionDetails>
                {availableTypes.map((type) => (
                  <FormControlLabel
                    key={type}
                    control={
                      <Checkbox
                        checked={localFilters.types?.includes(type) || false}
                        size="small"
                        onChange={() => handleTypeToggle(type)}
                        sx={{
                          color: 'text.secondary',
                          '&.Mui-checked': { color: 'var(--active-color)' },
                          py: 0.5,
                        }}
                      />
                    }
                    label={
                      <Typography variant="body1" sx={{ mt: '1px' }}>
                        {tCats.has(type) ? tCats(type) : type}
                      </Typography>
                    }
                    sx={{ display: 'flex', width: '100%', alignItems: 'flex-start', mb: 1 }}
                  />
                ))}
              </AccordionDetails>
            </Accordion>
            <Divider sx={{ my: 1 }} />
          </>
        )}

        {/* Brands Autocomplete */}
        <Box sx={{ mb: 2, mt: 2 }} ref={brandRef}>
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            {t('brands')}
          </Typography>
          <Autocomplete
            multiple
            onOpen={() => handleScrollToElement(brandRef)}
            options={brandOptions}
            value={localFilters.brands || []}
            onChange={(e, val) => handleAutocompleteChange('brands', val)}
            renderInput={(params) => (
              <TextField
                {...params}
                inputProps={{
                  ...params.inputProps,
                  inputMode: isMobile ? 'none' : 'text',
                }}
                variant="outlined"
                size="small"
                placeholder={t('select_brands')}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '&.Mui-focused fieldset': {
                      borderColor: 'var(--active-color)',
                    },
                  },
                }}
              />
            )}
            ChipProps={{
              sx: {
                bgcolor: 'rgba(244, 67, 54, 0.08)',
                color: 'var(--active-color)',
                '& .MuiChip-deleteIcon': {
                  color: 'var(--active-color)',
                  '&:hover': {
                    color: 'var(--active-color)',
                    opacity: 0.7,
                  },
                },
              },
            }}
          />
        </Box>

        {/* Size Autocomplete */}
        <Box sx={{ mb: 3 }} ref={sizeRef}>
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            {t('size')}
          </Typography>
          <Autocomplete
            multiple
            onOpen={() => handleScrollToElement(sizeRef)}
            options={sizeOptions}
            value={localFilters.sizes || []}
            onChange={(e, val) => handleAutocompleteChange('sizes', val)}
            renderInput={(params) => (
              <TextField
                {...params}
                inputProps={{
                  ...params.inputProps,
                  inputMode: isMobile ? 'none' : 'text',
                }}
                variant="outlined"
                size="small"
                placeholder={t('select_size')}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '&.Mui-focused fieldset': {
                      borderColor: 'var(--active-color)',
                    },
                  },
                }}
              />
            )}
            ChipProps={{
              sx: {
                bgcolor: 'rgba(244, 67, 54, 0.08)',
                color: 'var(--active-color)',
                '& .MuiChip-deleteIcon': {
                  color: 'var(--active-color)',
                  '&:hover': {
                    color: 'var(--active-color)',
                    opacity: 0.7,
                  },
                },
              },
            }}
          />
        </Box>

        {activeCategoryKey === 'fragrance' && perfumeNotes.length > 0 && (
          <Box sx={{ mb: 3 }} ref={notesRef}>
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
              {t('notes')}
            </Typography>
            <Autocomplete
              multiple
              onOpen={() => handleScrollToElement(notesRef)}
              options={perfumeNotes}
              value={localFilters.notes || []}
              onChange={(e, val) => handleAutocompleteChange('notes', val)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  inputProps={{
                    ...params.inputProps,
                    inputMode: isMobile ? 'none' : 'text',
                  }}
                  variant="outlined"
                  size="small"
                  placeholder={t('select_notes')}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '&.Mui-focused fieldset': {
                        borderColor: 'var(--active-color)',
                      },
                    },
                  }}
                />
              )}
              ChipProps={{
                sx: {
                  bgcolor: 'rgba(244, 67, 54, 0.08)',
                  color: 'var(--active-color)',
                  '& .MuiChip-deleteIcon': {
                    color: 'var(--active-color)',
                    '&:hover': { color: 'var(--active-color)', opacity: 0.7 },
                  },
                },
              }}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => {
                  const { key, ...tagProps } = getTagProps({ index });
                  return <Chip key={key} size="small" label={option} {...tagProps} />;
                })
              }
            />
          </Box>
        )}

        <Divider sx={{ mb: 2 }} />

        {/* Other toggles */}
        <FormControlLabel
          control={
            <IOSSwitch
              checked={localFilters.originalBrand || false}
              onChange={() => handleToggleChange('originalBrand')}
              checkedColor="#2196F3"
            />
          }
          label={
            <Box>
              <Typography variant="subtitle2" fontWeight="bold">
                {t('original_brand')}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                {t('original_brand_desc')}
              </Typography>
            </Box>
          }
          sx={{
            mb: 2, // Changed from mb: 1 to match spacing
            display: 'flex',
            width: '100%',
            ml: 0,
            alignItems: 'flex-start',
            gap: 1,
          }}
        />
        <FormControlLabel
          control={
            <IOSSwitch
              checked={localFilters.onlyStock || false}
              onChange={() => handleToggleChange('onlyStock')}
              checkedColor="#4CAF50"
            />
          }
          label={
            <Box>
              <Typography variant="subtitle2" fontWeight="bold">
                {t('only_stock')}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                {t('only_stock_desc')}
              </Typography>
            </Box>
          }
          sx={{
            mb: 2,
            display: 'flex',
            width: '100%',
            ml: 0,
            alignItems: 'flex-start',
            gap: 1,
          }}
        />
      </Box>

      {/* Sticky Apply Button - Hide on mobile */}
      {!isMobile && (
        <Box sx={{ position: 'sticky', bottom: '10px', boxSizing: 'border-box' }}>
          <Button
            fullWidth
            variant="contained"
            color="primary"
            onClick={() => onApplyFilters(localFilters)}
            sx={{
              zIndex: 10,
              borderRadius: '15px',
            }}
          >
            {t('apply_filters')}
          </Button>
        </Box>
      )}
    </Box>
  );
});

export default FilterSidebar;
