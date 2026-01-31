import { db } from '../../firebase';
import { collection, getDocs, query, where, orderBy, limit, startAfter, Timestamp } from 'firebase/firestore';
import { unstable_cache } from 'next/cache';

// Helper to serialize Firestore data to plain JSON
const serializeData = (doc) => {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : data.createdAt || Date.now(),
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : data.updatedAt || Date.now(),
  };
};

// Internal fetch function to be wrapped
const fetchProducts = async (filters) => {
  try {
    let q = collection(db, 'products');
    const constraints = [];

    // 1. Sorting
    const sort = filters.sort || 'default';
    if (sort === 'price-asc') {
      constraints.push(orderBy('price', 'asc'));
    } else if (sort === 'price-desc') {
      constraints.push(orderBy('price', 'desc'));
    } else if (sort === 'newest') {
      constraints.push(orderBy('createdAt', 'desc'));
    } else if (sort === 'oldest') {
      constraints.push(orderBy('createdAt', 'asc'));
    }

    // 2. Price Range
    if (filters.minPrice > 0) {
      constraints.push(where('price', '>=', filters.minPrice));
    }
    if (filters.maxPrice < 1000) {
      constraints.push(where('price', '<=', filters.maxPrice));
    }

    // 3. Other Filter Fields
    if (filters.originalBrand) {
      constraints.push(where('isOriginal', '==', true));
    }

    if (filters.onlyStock) {
      constraints.push(where('stock', '>', 0));
    }

    if (filters.discounted) {
      constraints.push(where('discount', '>', 0));
    }

    // Array Filters (Using 'in' or 'array-contains-any')
    // Note: Firestore supports only ONE 'in'/'array-contains-any' clause per query.
    // If multiple are present, this will throw an error effectively requiring the user to only usage one at a time
    // or relying on composite OR queries if supported/implemented.
    // We add them all as requested.

    if (filters.categories && filters.categories.length > 0) {
      constraints.push(where('category', 'in', filters.categories.slice(0, 10)));
    }

    if (filters.subcategories && filters.subcategories.length > 0) {
      constraints.push(where('subcategory', 'in', filters.subcategories.slice(0, 10)));
    }

    if (filters.types && filters.types.length > 0) {
      constraints.push(where('type', 'in', filters.types.slice(0, 10)));
    }

    if (filters.brands && filters.brands.length > 0) {
      constraints.push(where('brand', 'in', filters.brands.slice(0, 10)));
    }

    // For array fields in document (e.g. sizes, notes), we usage array-contains-any
    if (filters.sizes && filters.sizes.length > 0) {
      constraints.push(where('sizes', 'array-contains-any', filters.sizes.slice(0, 10)));
    }

    if (filters.notes && filters.notes.length > 0) {
      constraints.push(where('perfumeNotes', 'array-contains-any', filters.notes.slice(0, 10)));
    }

    // Apply constraints
    if (constraints.length > 0) {
      q = query(q, ...constraints);
    }

    const querySnapshot = await getDocs(q);

    // We modify serializeData to not be inside fetchProducts scope if it's outside in the file
    // Assuming serializeData is defined in module scope
    let products = querySnapshot.docs.map(serializeData);

    return products;
  } catch (error) {
    console.error('Error fetching products:', error);
    // Return empty array on error (e.g. index missing or too many IN clauses)
    return [];
  }
};

export const getCachedProducts = async (filters) => {
  const filterKey = JSON.stringify(filters);
  return unstable_cache(async () => fetchProducts(filters), [`products-${filterKey}`], {
    revalidate: 2,
    tags: ['products'],
  })();
};
