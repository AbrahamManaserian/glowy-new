import React from 'react';
import { getCachedProducts } from '../../../services/products';
import ShopClient from './ShopClient';

export default async function ShopPage({ searchParams }) {
  // Await params if necessary (Next 15+ requires it, 14 doesn't but safe to await)
  const params = await searchParams;

  // Extract filters from params
  const filters = {
    minPrice: Number(params.minPrice) || 0,
    maxPrice: Number(params.maxPrice) || 0,
    discounted: params.discounted === 'true',
    categories: Array.isArray(params.category) ? params.category : params.category ? [params.category] : [],
    subcategories: Array.isArray(params.subcategory)
      ? params.subcategory
      : params.subcategory
        ? [params.subcategory]
        : [],
    types: Array.isArray(params.type) ? params.type : params.type ? [params.type] : [],
    brands: Array.isArray(params.brands) ? params.brands : params.brands ? [params.brands] : [],
    sizes: Array.isArray(params.sizes) ? params.sizes : params.sizes ? [params.sizes] : [],
    notes: Array.isArray(params.notes) ? params.notes : params.notes ? [params.notes] : [],
    originalBrand: params.originalBrand === 'true',
    onlyStock: params.onlyStock === 'true',
    sort: params.sort || 'default',
  };

  // Fetch data
  const page = Number(params.page) || 1;
  const LIMIT = 4; // User requested limit 4
  const cursorId = params.cursorId || null;
  const direction = params.direction || null;

  const { products, total, totalPages } = await getCachedProducts(filters, page, LIMIT, cursorId, direction);

  return (
    <ShopClient
      initialProducts={products}
      searchParams={params}
      pagination={{
        total,
        totalPages,
        currentPage: page,
      }}
    />
  );
}
