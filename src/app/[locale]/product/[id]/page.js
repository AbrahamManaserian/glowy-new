import { notFound } from 'next/navigation';

export default async function ProductPage({ params, searchParams }) {
  const { id: slug } = await params;
  const { variant } = await searchParams;

  // Strategy: Extract ID from the end of the slug
  // Example: "giorgio-armani-12345" -> "12345"
  // This allows for SEO-friendly URLs while keeping O(1) database lookups by ID
  const productId = slug.split('-').pop();

  if (!productId) {
    notFound();
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Product Page Preview</h1>
      <p>
        <strong>Slug:</strong> {slug}
      </p>
      <p>
        <strong>Extracted ID:</strong> {productId}
      </p>
      <p>
        <strong>Variant ID:</strong> {variant || 'Default'}
      </p>
      <p>
        <em>(Fetch product data using Extracted ID here)</em>
      </p>
    </div>
  );
}
