export default async function ProductPage({ params, searchParams }) {
  // Await params and searchParams before using them to respect Next.js 15 async access patterns
  const { id } = await params;
  const { variant } = await searchParams;

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Product Page</h1>
      <p>Product ID: {id}</p>
      <p>Variant ID: {variant}</p>
    </div>
  );
}
