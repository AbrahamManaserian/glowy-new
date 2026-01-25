'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Grid,
  Typography,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  FormControlLabel,
  Checkbox,
  Button,
  Stack,
  Divider,
  Autocomplete,
  IconButton,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import Resizer from 'react-image-file-resizer';

const categoriesObj = {
  fragrance: {
    label: 'Fragrance',
    subcategories: {
      fragrance: { label: 'Fragrance', types: ['Men', 'Women', 'Uni'] },
      carFresheners: { label: 'Car Air Fresheners', types: [] },
      homeFresheners: { label: 'Home Air Fresheners', types: [] },
      deodorant: { label: 'Deodorant', types: [] },
    },
  },
  makeup: {
    label: 'Makeup',
    subcategories: {
      face: {
        label: 'Face',
        types: [
          'Foundation',
          'Highlighter',
          'Face Primer',
          'Powder & Setting Spray',
          'Contour',
          'Blush',
          'Concealer',
          'BB & CC cream',
        ],
      },
      eye: { label: 'Eye', types: ['Brow Gel', 'Eye Palettes', 'Eyebrow Pencil', 'Eyeliner', 'Pencil'] },
      lip: {
        label: 'Lip',
        types: ['Lipstick', 'Liquid Lipstick', 'Lip Balm & Treatment', 'Lip Gloss', 'Lip Liner', 'Lip Oil'],
      },
    },
  },
  skincare: {
    label: 'Skincare',
    subcategories: {
      cleansers: {
        label: 'Cleansers',
        types: ['Cleansers', 'Exfoliation', 'Face Wash', 'Makeup Removers', 'Toners & Lotions'],
      },
      eyeCare: { label: 'Eye Care', types: ['Dark Circles', 'Eye Patches', 'Lifting/Anti-age Eye Creams'] },
      masks: { label: 'Masks', types: ['Anti-age', 'Eye Patches', 'Face Masks', 'Hydrating'] },
      moisturizers: {
        label: 'Moisturizers',
        types: [
          'Face Serums',
          'Face Creams',
          'Face Oils',
          'Mists',
          'Moisturizers',
          'Night Creams',
          'Anti-Aging',
          'Dark Spots',
          'Lifting',
        ],
      },
    },
  },
  bathBody: {
    label: 'Bath & Body',
    subcategories: {
      bathShower: {
        label: 'Bath & Shower',
        types: ['Gel', 'Hand Wash & Soap', 'Scrub & Exfoliation', 'Shampoo & Conditioner'],
      },
      bodyCare: {
        label: 'Body Care',
        types: [
          'Antiperspirants',
          'Body Lotion & Body Oils',
          'Body Moisturizers',
          'Cellulite & Stretch Marks',
          'Hand Cream & Foot Cream',
          'Masks & Special Treatment',
        ],
      },
    },
  },
  hair: {
    label: 'Hair',
    subcategories: {
      hairStyling: {
        label: 'Hair Styling',
        types: ['Gel', 'Hair Treatments', 'Styling Products', 'Shampoo & Conditioner'],
      },
    },
  },
  nail: {
    label: 'Nail',
    subcategories: {
      nail: { label: 'Nail', types: ['Cuticle care', 'Nail care', 'Nail color', 'Nail polish removers'] },
    },
  },
  accessories: { label: 'Accessories', subcategories: { accessories: { label: 'Accessories', types: [] } } },
  collection: {
    label: 'Collection',
    subcategories: { collection: { label: 'Collection', types: ['Fragrance', 'Makeup', 'Skincare'] } },
  },
};

const units = ['ml', 'g', 'kg', 'l', 'pcs'];

const initialFormState = {
  category: '',
  subcategory: '',
  type: '',
  brand: '',
  model: '',
  size: '',
  unit: '',
  price: '',
  previousPrice: '',
  quantity: 1,
  images: [],
  mainImage: '',
  descriptionAm: '',
  descriptionEn: '',
  descriptionRu: '',
  inStock: true,
  original: true,
  customFields: [],
  productOptions: [],
  variants: [],
};

const generateVariants = (options, existingVariants, basePrice, baseQuantity) => {
  const validOptions = options.filter((o) => o.values.length > 0);
  if (validOptions.length === 0) return [];

  const cartesian = (sets) => {
    return sets.reduce(
      (acc, curr) => {
        return acc.flatMap((x) => curr.map((y) => [...x, y]));
      },
      [[]],
    );
  };

  const optionValues = validOptions.map((o) => o.values);
  const combinations = cartesian(optionValues);

  return combinations.map((combination) => {
    const attributes = {};
    const nameParts = [];

    validOptions.forEach((option, index) => {
      attributes[option.name] = combination[index];
      nameParts.push(combination[index]);
    });

    const uniqueKey = nameParts.join(' / ');

    const existing = existingVariants.find((v) => v.name === uniqueKey);

    if (existing) return existing;

    return {
      name: uniqueKey,
      attributes,
      price: basePrice || '',
      quantity: baseQuantity || '',
      sku: '',
    };
  });
};

export default function AddProductPage() {
  const [formData, setFormData] = useState(initialFormState);
  const [availableSubcategories, setAvailableSubcategories] = useState({});
  const [availableTypes, setAvailableTypes] = useState([]);
  const [brands, setBrands] = useState([]);
  console.log(formData);
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: checked,
    }));
  };

  const handleCategoryChange = (e) => {
    const categoryValue = e.target.value;
    const categoryData = categoriesObj[categoryValue];

    setFormData((prev) => ({
      ...prev,
      category: categoryValue,
      subcategory: '',
      type: '',
    }));

    setAvailableSubcategories(categoryData ? categoryData.subcategories : {});
    setAvailableTypes([]);
  };

  const handleSubcategoryChange = (e) => {
    const subcategoryValue = e.target.value;
    const subcategoryData = availableSubcategories[subcategoryValue];

    setFormData((prev) => ({
      ...prev,
      subcategory: subcategoryValue,
      type: '',
    }));

    setAvailableTypes(subcategoryData ? subcategoryData.types || [] : []);
  };

  const handleAutocompleteChange = (event, newValue) => {
    setFormData((prev) => ({
      ...prev,
      brand: newValue || '',
    }));
  };

  const handleImageUpload = async (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      // Check limit (max 6 images)
      if (formData.images.length + files.length > 6) {
        alert('You can only upload a maximum of 6 images.');
        return;
      }

      const newImages = [];
      const processes = Array.from(files).map(async (file) => {
        try {
          // Read dimensions first for % resizing
          const img = document.createElement('img');
          const objectUrl = URL.createObjectURL(file);

          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = objectUrl;
          });

          const targetWidth = Math.max(10, Math.floor(img.width * 0.2));
          const targetHeight = Math.max(10, Math.floor(img.height * 0.2));

          URL.revokeObjectURL(objectUrl);

          // Resize
          const resizedImage = await new Promise((resolve) => {
            Resizer.imageFileResizer(
              file,
              targetWidth,
              targetHeight,
              'JPEG',
              80, // quality
              0, // rotation
              (uri) => {
                resolve(uri);
              },
              'base64',
            );
          });
          return resizedImage;
        } catch (err) {
          console.error('Error resizing image', err);
          return null;
        }
      });

      const results = await Promise.all(processes);
      const successfulImages = results.filter((img) => img !== null);

      setFormData((prev) => {
        const updatedImages = [...prev.images, ...successfulImages];
        // Set main image to the first one if not set
        const mainImage = prev.mainImage || (updatedImages.length > 0 ? updatedImages[0] : '');
        return {
          ...prev,
          images: updatedImages,
          mainImage,
        };
      });
    }
  };

  const handleDeleteImage = (index) => {
    setFormData((prev) => {
      const imageToDelete = prev.images[index];
      const updatedImages = prev.images.filter((_, i) => i !== index);
      let newMainImage = prev.mainImage;

      // If we deleted the main image, set a new main image (first available)
      if (imageToDelete === prev.mainImage) {
        newMainImage = updatedImages.length > 0 ? updatedImages[0] : '';
      }

      return {
        ...prev,
        images: updatedImages,
        mainImage: newMainImage,
      };
    });
  };

  const handleSetMainImage = (image) => {
    setFormData((prev) => ({
      ...prev,
      mainImage: image,
    }));
  };

  const handleAddCustomField = () => {
    setFormData((prev) => ({
      ...prev,
      customFields: [...prev.customFields, { name: '', value: '' }],
    }));
  };

  const handleCustomFieldChange = (index, field, value) => {
    const updated = [...formData.customFields];
    updated[index][field] = value;
    setFormData((prev) => ({ ...prev, customFields: updated }));
  };

  const handleDeleteCustomField = (index) => {
    const updated = formData.customFields.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, customFields: updated }));
  };

  const handleAddOption = () => {
    setFormData((prev) => ({
      ...prev,
      productOptions: [...prev.productOptions, { name: '', values: [], currentValue: '' }],
    }));
  };

  const handleDeleteOption = (index) => {
    const updated = formData.productOptions.filter((_, i) => i !== index);
    const newVariants = generateVariants(updated, formData.variants, formData.price, formData.quantity);
    setFormData((prev) => ({ ...prev, productOptions: updated, variants: newVariants }));
  };

  const handleOptionNameChange = (index, value) => {
    const updated = [...formData.productOptions];
    updated[index].name = value;

    // Smart helper: If user types "Size" and has basic details Size filled, auto-add it
    if (
      value.trim().toLowerCase() === 'size' &&
      formData.size &&
      !updated[index].values.includes(formData.size)
    ) {
      updated[index].values.push(formData.size);
    }

    // For simplicity, we regenerate.
    const newVariants = generateVariants(updated, formData.variants, formData.price, formData.quantity);
    setFormData((prev) => ({ ...prev, productOptions: updated, variants: newVariants }));
  };

  const handleOptionValueInputChange = (index, value) => {
    const updated = [...formData.productOptions];
    updated[index].currentValue = value;
    setFormData((prev) => ({ ...prev, productOptions: updated }));
  };

  const handleAddOptionValue = (index) => {
    const updated = [...formData.productOptions];
    const val = updated[index].currentValue.trim();
    if (val && !updated[index].values.includes(val)) {
      updated[index].values.push(val);
      updated[index].currentValue = '';

      const newVariants = generateVariants(updated, formData.variants, formData.price, formData.quantity);
      setFormData((prev) => ({ ...prev, productOptions: updated, variants: newVariants }));
    }
  };

  const handleDeleteOptionValue = (optionIndex, valueToDelete) => {
    const updated = [...formData.productOptions];
    updated[optionIndex].values = updated[optionIndex].values.filter((v) => v !== valueToDelete);

    const newVariants = generateVariants(updated, formData.variants, formData.price, formData.quantity);
    setFormData((prev) => ({ ...prev, productOptions: updated, variants: newVariants }));
  };

  const handleVariantChange = (index, field, value) => {
    const updated = [...formData.variants];
    updated[index][field] = value;
    setFormData((prev) => ({ ...prev, variants: updated }));
  };

  const handleSave = () => {
    // 1. Basic Validation
    if (!formData.category || !formData.brand || !formData.price) {
      alert('Please fill in required fields (Category, Brand, Price)');
      return;
    }

    // 2. Prepare Variants with Unique IDs & Smart SKUs
    let finalVariants = [];

    // Helper to clean strings for SKU: " Dior Sauvage " -> "DIOR-SAUVAGE"
    const cleanForSku = (str) =>
      (str || '')
        .toString()
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '-');
    const baseSkuPart = `${cleanForSku(formData.brand)}-${cleanForSku(formData.model)}`;

    if (formData.variants.length > 0) {
      finalVariants = formData.variants.map((v, index) => {
        // Generate automatic SKU if empty
        // logic: BRAND-MODEL-ATTR1-ATTR2...
        // e.g. DIOR-SAUVAGE-100ML-RED
        const attrPart = Object.values(v.attributes).map(cleanForSku).join('-');
        const autoSku = `${baseSkuPart}-${attrPart}`;

        return {
          id: crypto.randomUUID(),
          sku: v.sku ? cleanForSku(v.sku) : autoSku,
          price: parseFloat(v.price) || 0,
          quantity: parseInt(v.quantity, 10) || 0,
          attributes: v.attributes,
          name: v.name,
        };
      });
    } else {
      // Simple product (no options)
      finalVariants.push({
        id: crypto.randomUUID(),
        sku: `${baseSkuPart}-DEFAULT`, // or just baseSkuPart
        price: parseFloat(formData.price) || 0,
        quantity: parseInt(formData.quantity, 10) || 0,
        attributes: {},
        name: 'Default',
      });
    }

    // 3. Calculate Price Range for Sorting
    // Important: We need min/max to sort products by "Starts from $50"
    const prices = finalVariants.map((v) => v.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const totalStock = finalVariants.reduce((sum, v) => sum + v.quantity, 0);

    // 4. Construct the Database Object
    const productDataToSave = {
      // Classification
      category: formData.category,
      subcategory: formData.subcategory,
      type: formData.type,

      // Basic Info
      brand: formData.brand,
      model: formData.model,
      size: formData.size,
      unit: formData.unit,

      // Flags
      inStock: totalStock > 0, // Auto-calculate based on variants
      original: formData.original,

      // Media
      images: formData.images,
      mainImage: formData.mainImage,

      // Content
      description: {
        am: formData.descriptionAm,
        en: formData.descriptionEn,
        ru: formData.descriptionRu,
      },

      // Metadata for UI
      options: formData.productOptions.map((opt) => ({
        name: opt.name,
        values: opt.values,
      })),

      // The Variants
      variants: finalVariants,

      // CRITICAL FOR SORTING:
      price: minPrice, // Default sort price (cheapest option)
      minPrice: minPrice, // For filtering "Price > X"
      maxPrice: maxPrice, // For display "$50 - $100"

      // Additional
      customFields: formData.customFields.reduce((acc, curr) => {
        if (curr.name) acc[curr.name] = curr.value;
        return acc;
      }, {}),

      createdAt: new Date().toISOString(),
    };

    console.log('FINAL DB OBJECT:', productDataToSave);
    // Here you would call: await addDoc(collection(db, 'products'), productDataToSave);
    alert('Product ready to save! Check console for object structure.');
  };

  return (
    <Box sx={{ p: 0 }}>
      <Typography variant="h4" gutterBottom>
        Add New Product
      </Typography>

      <Grid container spacing={3}>
        {/* Classification Section */}
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: { xs: 2, md: 3 } }}>
            <Typography variant="h6" gutterBottom>
              Classification
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 4 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Category</InputLabel>
                  <Select
                    name="category"
                    label="Category"
                    value={formData.category}
                    onChange={handleCategoryChange}
                  >
                    {Object.keys(categoriesObj).map((key) => (
                      <MenuItem key={key} value={key}>
                        {categoriesObj[key].label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <FormControl fullWidth size="small" disabled={!formData.category}>
                  <InputLabel>Subcategory</InputLabel>
                  <Select
                    name="subcategory"
                    label="Subcategory"
                    value={formData.subcategory}
                    onChange={handleSubcategoryChange}
                  >
                    {Object.keys(availableSubcategories).map((key) => (
                      <MenuItem key={key} value={key}>
                        {availableSubcategories[key].label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <FormControl
                  fullWidth
                  size="small"
                  disabled={!formData.subcategory || availableTypes.length === 0}
                >
                  <InputLabel>Type</InputLabel>
                  <Select name="type" label="Type" value={formData.type} onChange={handleChange}>
                    {availableTypes.map((type) => (
                      <MenuItem key={type} value={type}>
                        {type}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Basic Details Section */}
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: { xs: 2, md: 3 } }}>
            <Typography variant="h6" gutterBottom>
              Basic Details
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Autocomplete
                  freeSolo
                  options={brands}
                  size="small"
                  value={formData.brand}
                  onChange={handleAutocompleteChange}
                  onInputChange={(event, newInputValue) => {
                    setFormData((prev) => ({
                      ...prev,
                      brand: newInputValue,
                    }));
                  }}
                  renderInput={(params) => (
                    <TextField {...params} label="Brand" size="small" fullWidth name="brand" />
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Model"
                  name="model"
                  value={formData.model}
                  onChange={handleChange}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Size"
                  name="size"
                  type="number"
                  value={formData.size}
                  onChange={handleChange}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Unit</InputLabel>
                  <Select name="unit" label="Unit" value={formData.unit} onChange={handleChange}>
                    {units.map((u) => (
                      <MenuItem key={u} value={u}>
                        {u}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Quantity"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleChange}
                  inputProps={{ min: 0 }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Price"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  inputProps={{ min: 0, step: 0.01 }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Previous Price"
                  name="previousPrice"
                  value={formData.previousPrice}
                  onChange={handleChange}
                  inputProps={{ min: 0, step: 0.01 }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControlLabel
                  control={
                    <Checkbox checked={formData.inStock} onChange={handleCheckboxChange} name="inStock" />
                  }
                  label="In Stock"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControlLabel
                  control={
                    <Checkbox checked={formData.original} onChange={handleCheckboxChange} name="original" />
                  }
                  label="Original Product"
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Descriptions Section */}
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: { xs: 2, md: 3 } }}>
            <Typography variant="h6" gutterBottom>
              Description
            </Typography>
            <Stack spacing={2}>
              <TextField
                fullWidth
                size="small"
                multiline
                rows={3}
                label="Description (Armenian)"
                name="descriptionAm"
                value={formData.descriptionAm}
                onChange={handleChange}
              />
              <TextField
                fullWidth
                size="small"
                multiline
                rows={3}
                label="Description (English)"
                name="descriptionEn"
                value={formData.descriptionEn}
                onChange={handleChange}
              />
              <TextField
                fullWidth
                size="small"
                multiline
                rows={3}
                label="Description (Russian)"
                name="descriptionRu"
                value={formData.descriptionRu}
                onChange={handleChange}
              />
            </Stack>
          </Paper>
        </Grid>

        {/* Custom Fields Section */}
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: { xs: 2, md: 3 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Custom Fields</Typography>
              <Button startIcon={<AddIcon />} onClick={handleAddCustomField} variant="outlined" size="small">
                Add Field
              </Button>
            </Box>
            <Stack spacing={2}>
              {formData.customFields.map((field, index) => (
                <Grid container spacing={2} key={index} alignItems="center">
                  <Grid size={{ xs: 5 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Field Name"
                      value={field.name}
                      onChange={(e) => handleCustomFieldChange(index, 'name', e.target.value)}
                    />
                  </Grid>
                  <Grid size={{ xs: 5 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Value"
                      value={field.value}
                      onChange={(e) => handleCustomFieldChange(index, 'value', e.target.value)}
                    />
                  </Grid>
                  <Grid size={{ xs: 2 }}>
                    <IconButton onClick={() => handleDeleteCustomField(index)} color="error" size="small">
                      <DeleteIcon />
                    </IconButton>
                  </Grid>
                </Grid>
              ))}
              {formData.customFields.length === 0 && (
                <Typography variant="body2" color="textSecondary" sx={{ fontStyle: 'italic' }}>
                  No custom fields added.
                </Typography>
              )}
            </Stack>
          </Paper>
        </Grid>

        {/* Available Options Section */}
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: { xs: 2, md: 3 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Available Options</Typography>
              <Button startIcon={<AddIcon />} onClick={handleAddOption} variant="outlined" size="small">
                Add Option Group
              </Button>
            </Box>
            <Stack spacing={3}>
              {formData.productOptions.map((option, index) => (
                <Box key={index} sx={{ border: '1px solid #eee', p: 2, borderRadius: 1 }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid size={{ xs: 10, md: 4 }}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Option Name (e.g., Color)"
                        value={option.name}
                        onChange={(e) => handleOptionNameChange(index, e.target.value)}
                      />
                    </Grid>
                    <Grid size={{ xs: 2, md: 1 }} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <IconButton onClick={() => handleDeleteOption(index)} color="error" size="small">
                        <DeleteIcon />
                      </IconButton>
                    </Grid>
                    <Grid size={{ xs: 12, md: 7 }}>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <TextField
                          size="small"
                          label="Add Value"
                          value={option.currentValue || ''}
                          onChange={(e) => handleOptionValueInputChange(index, e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddOptionValue(index);
                            }
                          }}
                          sx={{ flexGrow: 1 }}
                        />
                        <Button variant="contained" size="small" onClick={() => handleAddOptionValue(index)}>
                          Add
                        </Button>
                      </Box>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                        {option.values.map((val, vIndex) => (
                          <Chip
                            key={vIndex}
                            label={val}
                            onDelete={() => handleDeleteOptionValue(index, val)}
                            size="small"
                          />
                        ))}
                      </Box>
                    </Grid>
                  </Grid>
                </Box>
              ))}
              {formData.productOptions.length === 0 && (
                <Typography variant="body2" color="textSecondary" sx={{ fontStyle: 'italic' }}>
                  No options created.
                </Typography>
              )}
            </Stack>
          </Paper>
        </Grid>

        {/* Product Variants Table (Generated) */}
        {formData.variants && formData.variants.length > 0 && (
          <Grid size={{ xs: 12 }}>
            <Paper sx={{ p: { xs: 2, md: 3 } }}>
              <Typography variant="h6" gutterBottom>
                Product Variants
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Variant</TableCell>
                      <TableCell width="20%">Price</TableCell>
                      <TableCell width="20%">Quantity</TableCell>
                      <TableCell width="25%">SKU</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {formData.variants.map((variant, index) => (
                      <TableRow key={index}>
                        <TableCell>{variant.name}</TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            type="number"
                            fullWidth
                            value={variant.price}
                            onChange={(e) => handleVariantChange(index, 'price', e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            type="number"
                            fullWidth
                            value={variant.quantity}
                            onChange={(e) => handleVariantChange(index, 'quantity', e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            fullWidth
                            value={variant.sku}
                            onChange={(e) => handleVariantChange(index, 'sku', e.target.value)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        )}

        {/* Images Placeholder */}
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: { xs: 2, md: 3 } }}>
            <Typography variant="h6" gutterBottom>
              Images
            </Typography>
            <Box
              component="label"
              sx={{
                border: '2px dashed #ccc',
                borderRadius: 2,
                p: 4,
                textAlign: 'center',
                cursor: 'pointer',
                bgcolor: '#fafafa',
                display: 'block',
              }}
            >
              <input type="file" hidden multiple accept="image/*" onChange={handleImageUpload} />
              <CloudUploadIcon sx={{ fontSize: 48, color: '#ccc' }} />
              <Typography variant="body1" color="textSecondary" sx={{ mt: 1 }}>
                Click to upload product images
              </Typography>
            </Box>

            {/* Image Preview Grid */}
            <Grid container spacing={2} sx={{ mt: 2 }}>
              {formData.images.map((image, index) => (
                <Grid size={{ xs: 6, sm: 4, md: 3 }} key={index}>
                  <Box
                    sx={{
                      position: 'relative',
                      border: formData.mainImage === image ? '2px solid #1976d2' : '1px solid #eee',
                      borderRadius: 1,
                      overflow: 'hidden',
                    }}
                  >
                    <Box
                      component="img"
                      src={image}
                      alt={`Product ${index}`}
                      sx={{ width: '100%', display: 'block' }}
                      onClick={() => handleSetMainImage(image)}
                    />
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 2,
                        right: 2,
                        bgcolor: 'rgba(255,255,255,0.7)',
                        borderRadius: '50%',
                      }}
                    >
                      <IconButton size="small" onClick={() => handleDeleteImage(index)}>
                        <DeleteIcon fontSize="small" color="error" />
                      </IconButton>
                    </Box>
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 2,
                        left: 2,
                        cursor: 'pointer',
                      }}
                      onClick={() => handleSetMainImage(image)}
                    >
                      {formData.mainImage === image ? (
                        <StarIcon color="primary" />
                      ) : (
                        <StarBorderIcon color="action" />
                      )}
                    </Box>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>

        {/* Action Buttons */}
        <Grid size={{ xs: 12 }}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button variant="outlined" color="secondary">
              Cancel
            </Button>
            <Button variant="contained" color="primary" onClick={handleSave} size="large">
              Save Product
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
