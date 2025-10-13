// src/hooks/useReportGenerator.js

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

      // For the special case of viewing an attachment, the generator returns a blob directly.
      if (reportId === 'attachment_viewer') {
        const pdfBlob = await generator(null, params);
        setPdfDataUri(URL.createObjectURL(pdfBlob));
        setIsLoading(false);
        return;
      }

      // 1. Initialize Document for all other reports
      const { doc, pageWidth, margin } = createPdfDoc();
      
      // 2. Add Header (except for payslip which has a custom layout)
      let startY = margin;
      if (reportId !== 'payslip') {
        const reportConfigModule = await import('../config/reports.config.js');
        const reportConfig = reportConfigModule.reportsConfig;
        const title = reportConfig.find(r => r.id === reportId)?.title || "Report";
        startY = addHeader(doc, title, { pageWidth, margin });
      }

      // 3. Create a helper function to pass to generators that need charts
      const addChartAndTitle = async (title, chartConfig, currentY = startY) => {
        const chartImage = await generateChartAsImage(chartConfig);
        const chartHeight = 150;
        let finalY = currentY;
        if (finalY + chartHeight + 35 > doc.internal.pageSize.getHeight()) {
            doc.addPage();
            finalY = margin;
        }
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text(title, margin, finalY);
        finalY += 15;
        doc.addImage(chartImage, 'PNG', margin, finalY, pageWidth - (margin * 2), chartHeight);
        finalY += chartHeight + 20;
        return finalY;
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
      setIsLoading(false);
    }
  };

  return { generateReport, pdfDataUri, isLoading, error, setPdfDataUri };
};

export default useReportGenerator;