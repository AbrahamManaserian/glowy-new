'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';

const CategoriesContext = createContext();

export const useCategories = () => useContext(CategoriesContext);

// Defined order for categories and their subcategories
// This static configuration ensures consistent ordering across the app
const CATEGORY_ORDER = [
  'fragrance',
  'makeup',
  'skincare',
  'bathBody',
  'hair',
  'nail',
  'accessories',
  'collection',
];

const SUBCATEGORY_ORDER = {
  makeup: ['face', 'eye', 'lip'],
  fragrance: ['Women', 'Men', 'Uni'], // Assuming these might be used as subcategories based on data, adjust as needed
  skincare: ['cleansers', 'moisturizers', 'masks', 'eyeCare'],
  bathBody: ['bathShower', 'bodyCare', 'deodorant'],
  hair: ['hairStyling'], // Add others
  // Add other defined orders...
};

// Helper to sort object keys based on a predefined order array
const sortKeys = (obj, orderArray) => {
  if (!obj) return {};
  const keys = Object.keys(obj);
  // Sort keys: present in orderArray first (in order), then alphabetical for others
  const sortedKeys = keys.sort((a, b) => {
    const indexA = orderArray.indexOf(a);
    const indexB = orderArray.indexOf(b);

    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;

    // Fallback to alphabetical for known keys not in order list or unknown keys
    return a.localeCompare(b);
  });

  // Reconstruct object in order
  return sortedKeys.reduce((acc, key) => {
    acc[key] = obj[key];
    return acc;
  }, {});
};

export const CategoriesProvider = ({ children }) => {
  const [categories, setCategories] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const docRef = doc(db, 'config', 'categories');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const rawCategories = docSnap.data().categories || {};

          // Sort Categories
          const sortedCategories = sortKeys(rawCategories, CATEGORY_ORDER);

          // Sort Subcategories and Types within each Category
          Object.keys(sortedCategories).forEach((catKey) => {
            const cat = sortedCategories[catKey];
            if (cat.subcategories) {
              // Apply specific subcategory order if defined, otherwise alphabetical or default
              const order = SUBCATEGORY_ORDER[catKey] || [];
              // Sort subcategories logic could be complex if we want to sort the object itself
              // but since we iterate via keys in UI, we can just ensure internal structure if needed,
              // OR better, we just provide the sorted categories object.
              // Ideally, subcategories structure should also be sorted.
              cat.subcategories = sortKeys(cat.subcategories, order);

              // Sort Types inside subcategories (alphabetical usually fine, or custom)
              Object.values(cat.subcategories).forEach((subCat) => {
                if (subCat.types && Array.isArray(subCat.types)) {
                  subCat.types.sort(); // Alphabetical sort for types
                }
              });
            }
          });

          setCategories(sortedCategories);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  return <CategoriesContext.Provider value={{ categories, loading }}>{children}</CategoriesContext.Provider>;
};
