export const CustomPagination = ({ curentPage, currentPage, totalPages, handlePageChange }) => {
  // accept both `curentPage` (existing prop in codebase) and `currentPage`
  const current = typeof currentPage === 'number' ? currentPage : curentPage;

  const buildCompactPagination = (cur, total) => {
    if (!total || total <= 1) return [1];

    // Build a set of page numbers to show: 1, total, current, current-1, current+1 (when valid)
    const pagesSet = new Set([1, total, cur]);
    if (cur - 1 >= 2) pagesSet.add(cur - 1);
    if (cur + 1 <= total - 1) pagesSet.add(cur + 1);

    const nums = Array.from(pagesSet)
      .filter((n) => typeof n === 'number' && Number.isFinite(n))
      .sort((a, b) => a - b);

    // Insert '...' where there are numeric gaps
    const result = [];
    for (let i = 0; i < nums.length; i++) {
      const n = nums[i];
      if (i === 0) {
        result.push(n);
        continue;
      }
      const prev = nums[i - 1];
      if (n === prev + 1) {
        result.push(n);
      } else {
        result.push('...');
        result.push(n);
      }
    }

    return result;
  };

  const items = buildCompactPagination(current, totalPages);

  return (
    <nav
      aria-label="Pagination"
      style={{ display: 'flex', gap: 8, width: '100%', justifyContent: 'center', margin: '30px 0' }}
    >
      {items.map((p, i) => {
        if (p === '...') {
          return (
            <span key={`dots-${i}`} style={{ padding: '6px 10px', color: '#666' }} aria-hidden>
              …
            </span>
          );
        }

        const isActive = p === current;

        return (
          <button
            key={`page-${p}-${i}`}
            type="button"
            onClick={(e) => handlePageChange(e, p)}
            aria-current={isActive ? 'page' : undefined}
            aria-label={isActive ? `Page ${p}, current` : `Go to page ${p}`}
            style={{
              WebkitTapHighlightColor: 'rgba(182, 212, 238, 0.69)',
              display: 'inline-flex',
              justifyContent: 'center',
              alignItems: 'center',
              width: 30,
              height: 30,
              borderRadius: '50%',
              border: isActive ? '1px solid #1976d2' : '1px solid #ddd',
              background: isActive ? '#1976d2' : 'white',
              color: isActive ? 'white' : '#1976d2',
              cursor: 'pointer',
            }}
          >
            {p}
          </button>
        );
      })}
    </nav>
  );
};
