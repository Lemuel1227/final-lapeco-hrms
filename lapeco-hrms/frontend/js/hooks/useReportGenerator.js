import { useState } from 'react';
import { PdfLayoutManager } from '../utils/pdfLayoutManager';
import reportGenerators from '../reports';

const useReportGenerator = (theme = 'light') => {
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

      if (reportId === 'attachment_viewer') {
        const pdfBlob = await generator(null, params);
        setPdfDataUri(URL.createObjectURL(pdfBlob));
        setIsLoading(false);
        return;
      }
      
      const reportConfigModule = await import('../config/reports.config.js');
      const reportConfig = reportConfigModule.reportsConfig;
      const title = reportConfig.find(r => r.id === reportId)?.title || "Report";

      const isPayslip = reportId === 'payslip';

      const layoutManager = new PdfLayoutManager(
        'portrait', 
        title, 
        theme, 
        { skipHeader: isPayslip, skipFooter: isPayslip }
      );
      
      await generator(layoutManager, dataSources, params);
      
      const pdfBlob = layoutManager.getOutput('blob');
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