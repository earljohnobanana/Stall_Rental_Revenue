export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined || amount === '') return '—';
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(Number(amount));
};

export const formatNumber = (num) => {
  if (!num) return '0.00';
  return Number(num).toLocaleString('en-PH', { minimumFractionDigits: 2 });
};
