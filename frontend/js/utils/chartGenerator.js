import { Chart } from 'chart.js/auto';

export const generateChartAsImage = async (chartConfig, options = {}) => {
  const { width = 600, height = 300, backgroundColor = '#ffffff' } = options;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  const isDark = backgroundColor !== '#ffffff';
  const textColor = isDark ? '#f8f9fa' : '#212529';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

  const themedScales = {};
  if (chartConfig.options?.scales) {
    for (const key in chartConfig.options.scales) {
      themedScales[key] = {
        ...chartConfig.options.scales[key],
        ticks: { ...chartConfig.options.scales[key]?.ticks, color: textColor },
        grid: { ...chartConfig.options.scales[key]?.grid, color: gridColor },
        title: { ...chartConfig.options.scales[key]?.title, color: textColor }
      };
    }
  }

  const themedOptions = {
    ...chartConfig.options,
    animation: false,
    responsive: false,
    plugins: {
      ...chartConfig.options?.plugins,
      legend: {
        ...chartConfig.options?.plugins?.legend,
        labels: {
          ...chartConfig.options?.plugins?.legend?.labels,
          color: textColor
        }
      }
    },
    scales: themedScales
  };

  return new Promise((resolve, reject) => {
    try {
      new Chart(ctx, {
        ...chartConfig,
        options: themedOptions,
        plugins: [{
          id: 'custom_canvas_background',
          beforeDraw: (chart) => {
            const chartCtx = chart.canvas.getContext('2d');
            chartCtx.save();
            chartCtx.globalCompositeOperation = 'destination-over';
            chartCtx.fillStyle = backgroundColor;
            chartCtx.fillRect(0, 0, chart.width, chart.height);
            chartCtx.restore();
          }
        }, {
          id: 'resolve_chart_rendering',
          afterRender: (chart) => { resolve(chart.toBase64Image('image/png')); }
        }]
      });
    } catch (error) { reject(error); }
  });
};