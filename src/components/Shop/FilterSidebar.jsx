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
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
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

const MobileFilterDrawer = ({
  open,
  onClose,
  title,
  options = [],
  selectedValues = [],
  onSelectionChange,
  searchPlaceholder,
  noResultsText,
  applyText,
}) => {
  const [search, setSearch] = useState('');

  // Reset search when opening
  useEffect(() => {
    if (open) setSearch('');
  }, [open]);

  const filteredOptions = options.filter((opt) =>
    String(opt).toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      sx={{
        zIndex: (theme) => theme.zIndex.modal + 1,
        '& .MuiDrawer-paper': {
          height: 'calc(100% - 16px)',
          m: 1,
          borderRadius: 4,
          overflow: 'hidden',
          // Ensure it doesn't touch edges fully
          width: 'calc(100% - 16px)',
          maxWidth: '100%',
        },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" fontWeight="bold">
            {title}
          </Typography>
          <IconButton onClick={onClose} edge="end">
            <CloseIcon />
          </IconButton>
        </Box>

        <TextField
          fullWidth
          variant="outlined"
          placeholder={searchPlaceholder || 'Search...'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            sx: { borderRadius: 3, height: 45 },
          }}
          sx={{ mb: 2 }}
        />

        <List sx={{ flexGrow: 1, overflowY: 'auto', mb: 2 }}>
          {filteredOptions.map((opt) => {
            const checked = selectedValues.includes(opt);
            return (
              <ListItem
                key={opt}
                disablePadding
                secondaryAction={
                  <Checkbox
                    edge="end"
                    checked={checked}
                    onChange={() => {
                      const newValues = checked
                        ? selectedValues.filter((v) => v !== opt)
                        : [...selectedValues, opt];
                      onSelectionChange(newValues);
                    }}
                    sx={{
                      color: 'text.secondary',
                      '&.Mui-checked': { color: 'var(--active-color)' },
                    }}
                  />
                }
              >
                <ListItemButton
                  onClick={() => {
                    const newValues = checked
                      ? selectedValues.filter((v) => v !== opt)
                      : [...selectedValues, opt];
                    onSelectionChange(newValues);
                  }}
                >
                  <ListItemText primary={opt} />
                </ListItemButton>
              </ListItem>
            );
          })}
          {filteredOptions.length === 0 && (
            <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 3 }}>
              {noResultsText || 'No results found'}
            </Typography>
          )}
        </List>

        <Button
          variant="contained"
          fullWidth
          size="small"
          sx={{
            py: 1.5,
            bgcolor: 'var(--active-color)',
            color: '#fff',
            fontWeight: 'bold',
            borderRadius: 3,
            '&:hover': { bgcolor: 'var(--active-color)', opacity: 0.9 },
          }}
          onClick={onClose}
        >
          {applyText || 'Apply'}
        </Button>
      </Box>
    </Drawer>
  );
};;

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

  // Mobile Drawer States
  const [brandsDrawerOpen, setBrandsDrawerOpen] = useState(false);
  const [sizesDrawerOpen, setSizesDrawerOpen] = useState(false);
  const [notesDrawerOpen, setNotesDrawerOpen] = useState(false);

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
                {/* 1. "All Items" option */}
                <FormControlLabel
                  control={
                    <Radio
                      checked={!localFilters.subcategories || localFilters.subcategories.length === 0}
                      onChange={() => setLocalFilters({ ...localFilters, subcategories: [], types: [] })}
                      size="small"
                      sx={{
                        color: 'text.secondary',
                        '&.Mui-checked': { color: 'var(--active-color)' },
                        py: 0.5,
                      }}
                    />
                  }
                  label={
                    <Typography
                      variant="body1"
                      sx={{
                        mt: '1px',
                        fontWeight:
                          !localFilters.subcategories || localFilters.subcategories.length === 0
                            ? 'bold'
                            : 'normal',
                      }}
                    >
                      {t('all')}
                    </Typography>
                  }
                  sx={{ display: 'flex', width: '100%', alignItems: 'flex-start', mb: 1 }}
                />

                {/* 2. Actual Subcategories */}
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
                  startIcon={<NavigateNextIcon sx={{ transform: 'rotate(180deg)' }} />}
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
              <Box>
                {Object.entries(categories).map(([key, val]) => (
                  <Box
                    key={key}
                    onClick={() => handleCategoryClick(key)}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      py: 1,
                      borderBottom: '1px dashed #eee',
                      '&:last-child': { borderBottom: 'none' },
                      '&:hover': { bgcolor: 'action.hover', borderRadius: 1, px: 1, mx: -1 },
                      transition: '0.2s',
                    }}
                  >
                    <Typography variant="body1">{tCats.has(key) ? tCats(key) : val.label || key}</Typography>
                    <NavigateNextIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                  </Box>
                ))}
              </Box>
            )}
          </AccordionDetails>
        </Accordion>

        <Divider sx={{ my: 1 }} />

        {/* Type Filter - Only if types available */}
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

        {/* Brands Autocomplete */}
        <Box sx={{ mb: 2, mt: 2 }} ref={brandRef}>
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            {t('brands')}
          </Typography>
          {isMobile ? (
            <>
              <TextField
                variant="outlined"
                size="small"
                fullWidth
                placeholder={localFilters.brands?.length > 0 ? '' : t('select_brands')}
                onClick={() => setBrandsDrawerOpen(true)}
                InputProps={{
                  readOnly: true,
                  startAdornment: (
                    <Box
                      sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 0.5,
                        maxWidth: '100%',
                        overflow: 'hidden',
                      }}
                    >
                      {(localFilters.brands || []).slice(0, 3).map((brand) => (
                        <Chip
                          key={brand}
                          label={brand}
                          size="small"
                          onDelete={(e) => {
                            e.stopPropagation();
                            const newBrands = localFilters.brands.filter((b) => b !== brand);
                            updateFilter('brands', newBrands);
                          }}
                          sx={{
                            bgcolor: 'rgba(244, 67, 54, 0.08)',
                            color: 'var(--active-color)',
                            '& .MuiChip-deleteIcon': { color: 'var(--active-color)' },
                          }}
                        />
                      ))}
                      {(localFilters.brands?.length || 0) > 3 && (
                        <Chip label={`+${localFilters.brands.length - 3}`} size="small" />
                      )}
                    </Box>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    cursor: 'pointer',
                    borderRadius: 3,
                    minHeight: 40,
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    paddingTop: localFilters.brands?.length > 0 ? 0.5 : 0,
                    paddingBottom: localFilters.brands?.length > 0 ? 0.5 : 0,
                    '& fieldset': { borderColor: 'rgba(0,0,0,0.23)' },
                    '&:hover fieldset': { borderColor: 'text.primary' },
                  },
                }}
              />

              <MobileFilterDrawer
                open={brandsDrawerOpen}
                onClose={() => setBrandsDrawerOpen(false)}
                title={t('brands')}
                options={brandOptions}
                selectedValues={localFilters.brands || []}
                onSelectionChange={(newVal) => updateFilter('brands', newVal)}
                searchPlaceholder={t('search_placeholder')}
                applyText={t('apply_filters')}
              />
            </>
          ) : (
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
          )}
        </Box>

        {/* Size Autocomplete */}
        <Box sx={{ mb: 3 }} ref={sizeRef}>
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            {t('size')}
          </Typography>
          {isMobile ? (
            <>
              <TextField
                variant="outlined"
                size="small"
                fullWidth
                placeholder={localFilters.sizes?.length > 0 ? '' : t('select_size')}
                onClick={() => setSizesDrawerOpen(true)}
                InputProps={{
                  readOnly: true,
                  startAdornment: (
                    <Box
                      sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 0.5,
                        maxWidth: '100%',
                        overflow: 'hidden',
                      }}
                    >
                      {(localFilters.sizes || []).slice(0, 3).map((size) => (
                        <Chip
                          key={size}
                          label={size}
                          size="small"
                          onDelete={(e) => {
                            e.stopPropagation();
                            const newSizes = localFilters.sizes.filter((s) => s !== size);
                            updateFilter('sizes', newSizes);
                          }}
                          sx={{
                            bgcolor: 'rgba(244, 67, 54, 0.08)',
                            color: 'var(--active-color)',
                            '& .MuiChip-deleteIcon': { color: 'var(--active-color)' },
                          }}
                        />
                      ))}
                      {(localFilters.sizes?.length || 0) > 3 && (
                        <Chip label={`+${localFilters.sizes.length - 3}`} size="small" />
                      )}
                    </Box>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    cursor: 'pointer',
                    borderRadius: 3,
                    minHeight: 40,
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    paddingTop: localFilters.sizes?.length > 0 ? 0.5 : 0,
                    paddingBottom: localFilters.sizes?.length > 0 ? 0.5 : 0,
                    '& fieldset': { borderColor: 'rgba(0,0,0,0.23)' },
                    '&:hover fieldset': { borderColor: 'text.primary' },
                  },
                }}
              />

              <MobileFilterDrawer
                open={sizesDrawerOpen}
                onClose={() => setSizesDrawerOpen(false)}
                title={t('size')}
                options={sizeOptions}
                selectedValues={localFilters.sizes || []}
                onSelectionChange={(newVal) => updateFilter('sizes', newVal)}
                searchPlaceholder={t('search_placeholder')}
                applyText={t('apply_filters')}
              />
            </>
          ) : (
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
          )}
        </Box>

        {activeCategoryKey === 'fragrance' && perfumeNotes.length > 0 && (
          <Box sx={{ mb: 3 }} ref={notesRef}>
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
              {t('notes')}
            </Typography>
            {isMobile ? (
              <>
                <TextField
                  variant="outlined"
                  size="small"
                  fullWidth
                  placeholder={localFilters.notes?.length > 0 ? '' : t('select_notes') || 'Select notes'}
                  onClick={() => setNotesDrawerOpen(true)}
                  InputProps={{
                    readOnly: true,
                    startAdornment: (
                      <Box
                        sx={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 0.5,
                          maxWidth: '100%',
                          overflow: 'hidden',
                        }}
                      >
                        {(localFilters.notes || []).slice(0, 3).map((note) => (
                          <Chip
                            key={note}
                            label={note}
                            size="small"
                            onDelete={(e) => {
                              e.stopPropagation();
                              const newNotes = localFilters.notes.filter((n) => n !== note);
                              updateFilter('notes', newNotes);
                            }}
                            sx={{
                              bgcolor: 'rgba(244, 67, 54, 0.08)',
                              color: 'var(--active-color)',
                              '& .MuiChip-deleteIcon': { color: 'var(--active-color)' },
                            }}
                          />
                        ))}
                        {(localFilters.notes?.length || 0) > 3 && (
                          <Chip label={`+${localFilters.notes.length - 3}`} size="small" />
                        )}
                      </Box>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      cursor: 'pointer',
                      borderRadius: 3,
                      minHeight: 40,
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      paddingTop: localFilters.notes?.length > 0 ? 0.5 : 0,
                      paddingBottom: localFilters.notes?.length > 0 ? 0.5 : 0,
                      '& fieldset': { borderColor: 'rgba(0,0,0,0.23)' },
                      '&:hover fieldset': { borderColor: 'text.primary' },
                    },
                  }}
                />

                <MobileFilterDrawer
                  open={notesDrawerOpen}
                  onClose={() => setNotesDrawerOpen(false)}
                  title={t('notes')}
                  options={perfumeNotes}
                  selectedValues={localFilters.notes || []}
                  onSelectionChange={(newVal) => updateFilter('notes', newVal)}
                  searchPlaceholder={t('search_placeholder')}
                  applyText={t('apply_filters')}
                />
              </>
            ) : (
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
            )}
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
