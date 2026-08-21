import React, { useState } from 'react';
import { Download, Check } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface PDFExportButtonProps {
  elementId?: string;
  filename: string;
  title: string;
  data?: any[];
  headers?: string[];
  keys?: string[];
}

export const PDFExportButton: React.FC<PDFExportButtonProps> = ({ 
  elementId, filename, title, data, headers, keys 
}) => {
  const [exporting, setExporting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      if (elementId) {
        // Export HTML element snapshot
        const element = document.getElementById(elementId);
        if (element) {
          const canvas = await html2canvas(element, { scale: 2, useCORS: true });
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF('p', 'mm', 'a4');
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
          
          pdf.setFontSize(16);
          pdf.text(`PasadaGuide LGU Official Audit Report`, 14, 15);
          pdf.setFontSize(10);
          pdf.text(`Generated: ${new Date().toLocaleString()} | Bauang Municipality`, 14, 22);
          pdf.addImage(imgData, 'PNG', 10, 28, pdfWidth - 20, pdfHeight);
          pdf.save(`${filename}.pdf`);
        }
      } else if (data && headers && keys) {
        // Export structured table text data
        const pdf = new jsPDF('p', 'mm', 'a4');
        pdf.setFontSize(16);
        pdf.text(`PasadaGuide — ${title}`, 14, 16);
        pdf.setFontSize(9);
        pdf.text(`LGU Administrative Export • ${new Date().toLocaleString()}`, 14, 22);
        
        let yPos = 32;
        pdf.setFontSize(10);
        pdf.text(headers.join('  |  '), 14, yPos);
        pdf.line(14, yPos + 2, 196, yPos + 2);
        yPos += 8;

        data.forEach((item) => {
          if (yPos > 270) {
            pdf.addPage();
            yPos = 20;
          }
          const rowText = keys.map(k => {
            const val = k.includes('.') 
              ? k.split('.').reduce((acc, part) => acc && acc[part], item) 
              : item[k];
            return String(val ?? '');
          }).join('  |  ');
          pdf.setFontSize(9);
          pdf.text(rowText.slice(0, 95), 14, yPos);
          yPos += 7;
        });

        pdf.save(`${filename}.pdf`);
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to export PDF:', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      className="btn btn-secondary btn-sm"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
    >
      {success ? (
        <>
          <Check size={14} color="var(--success)" /> Exported PDF
        </>
      ) : (
        <>
          <Download size={14} /> {exporting ? 'Generating PDF...' : 'Export PDF Report'}
        </>
      )}
    </button>
  );
};
