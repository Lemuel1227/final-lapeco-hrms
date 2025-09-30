// src/hooks/useReportGenerator.js (UPDATED)

import { useState } from 'react';
import { createPdfDoc, addHeader } from '../utils/pdfUtils';
import { generateChartAsImage } from '../utils/chartGenerator';
import reportGenerators from '../reports'; // Import the registry

const useReportGenerator = () => {
  const [pdfDataUri, setPdfDataUri] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const generateReport = async (reportId, params, dataSources) => {
    setIsLoading(true);
    setError(null);
    setPdfDataUri('');

    try {
      const generator = reportGenerators[reportId];
      if (!generator) {
        throw new Error(`Report generator for ID "${reportId}" not found.`);
      }

      // 1. Initialize Document
      const { doc, pageWidth, margin } = createPdfDoc();
      
      // 2. Add Header (except for payslip which has a custom layout)
      let startY = margin;
      if (reportId !== 'payslip') {
        // Dynamically import config to avoid issues if it's not available server-side
        const reportConfigModule = await import('../config/reports.config.js');
        const reportConfig = reportConfigModule.reportsConfig;
        const title = reportConfig.find(r => r.id === reportId)?.title || "Report";
        startY = addHeader(doc, title, { pageWidth, margin });
      }

      // 3. Create a helper function to pass to generators that need charts
      const addChartAndTitle = async (title, chartConfig) => {
        const chartImage = await generateChartAsImage(chartConfig);
        const chartHeight = 150;
        if (startY + chartHeight + 35 > doc.internal.pageSize.getHeight()) {
            doc.addPage();
            startY = margin;
        }
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text(title, margin, startY);
        startY += 15;
        doc.addImage(chartImage, 'PNG', margin, startY, pageWidth - (margin * 2), chartHeight);
        startY += chartHeight + 20;
        return startY;
      };

      // 4. Delegate to the specific report generator
      const finalParams = { ...params, startY, pageWidth, margin };
      await generator(doc, finalParams, dataSources, addChartAndTitle);

      // 5. Finalize and set state
      const pdfBlob = doc.output('blob');
      setPdfDataUri(URL.createObjectURL(pdfBlob));

    } catch (e) {
      console.error("Error generating report:", e);
      setError(e.message);
    } finally {
      // THE FIX: Ensure isLoading is always reset
      setIsLoading(false);
    }
  };

  return { generateReport, pdfDataUri, isLoading, error, setPdfDataUri };
};

export default useReportGenerator;