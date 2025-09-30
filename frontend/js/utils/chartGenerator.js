import { Chart } from 'chart.js/auto';

/**
 * Renders a Chart.js configuration to a base64 PNG image.
 * @param {object} chartConfig - The Chart.js configuration object.
 * @returns {Promise<string>} A promise that resolves with the base64 image string.
 */
export const generateChartAsImage = async (chartConfig) => {
  const canvas = document.createElement('canvas');
  canvas.width = 600; 
  canvas.height = 300;
  const ctx = canvas.getContext('2d');

  return new Promise((resolve, reject) => {
    try {
      new Chart(ctx, {
        ...chartConfig,
        options: { ...chartConfig.options, animation: false, responsive: false },
        plugins: [{
          id: 'custom_canvas_background',
          beforeDraw: (chart) => {
            const chartCtx = chart.canvas.getContext('2d');
            chartCtx.save();
            chartCtx.globalCompositeOperation = 'destination-over';
            chartCtx.fillStyle = 'white'; 
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