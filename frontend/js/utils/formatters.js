export const formatCurrency = (value) => {
  if (typeof value !== 'number') {
    value = 0;
  }
  return `PHP ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};