
import { Ticket, Asset } from './types';

export const generateId = (): string => Math.random().toString(36).substr(2, 9);

export const formatDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const exportToCSV = (data: any[], filename: string) => {
  if (!data || !data.length) return;
  const separator = ',';
  const keys = Object.keys(data[0]);
  const csvContent =
    keys.join(separator) +
    '\n' +
    data
      .map((row) => {
        return keys
          .map((k) => {
            let cell = row[k] === null || row[k] === undefined ? '' : row[k];
            cell = cell instanceof Date
              ? cell.toLocaleString()
              : cell.toString().replace(/"/g, '""');
            if (cell.search(/("|,|\n)/g) >= 0) {
              cell = `"${cell}"`;
            }
            return cell;
          })
          .join(separator);
      })
      .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export const exportToExcel = (data: any[], filename: string, reportTitle: string) => {
  if (!data || !data.length) return;

  const headers = Object.keys(data[0]);
  
  // Construct HTML for Excel with explicit styling for borders
  let tableHTML = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>${reportTitle}</x:Name>
              <x:WorksheetOptions>
                <x:DisplayGridlines/>
              </x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
      <style>
        body { font-family: Arial, sans-serif; }
        .header-section { margin-bottom: 20px; }
        .title { font-size: 20px; font-weight: bold; text-align: center; margin-bottom: 5px; color: #1e3a8a; }
        .timestamp { font-size: 12px; color: #555; text-align: center; margin-bottom: 15px; font-style: italic; }
        table { border-collapse: collapse; width: 100%; }
        th { 
          background-color: #f3f4f6; 
          color: #111827; 
          font-weight: bold; 
          border: 1px solid #000000; 
          padding: 10px; 
          text-transform: uppercase; 
          font-size: 12px;
          text-align: center;
        }
        td { 
          border: 1px solid #000000; 
          padding: 8px; 
          vertical-align: top; 
          font-size: 12px;
          color: #374151;
        }
        /* Zebra striping for readability */
        tr:nth-child(even) { background-color: #f9fafb; }
      </style>
    </head>
    <body>
      <div class="header-section">
        <div class="title">${reportTitle}</div>
        <div class="timestamp">Generated on ${new Date().toLocaleString()}</div>
      </div>
      <table border="1">
        <thead>
          <tr>
            ${headers.map(header => `<th>${header.replace(/_/g, ' ')}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${data.map(row => `
            <tr>
              ${headers.map(header => {
                const val = row[header];
                return `<td>${val !== null && val !== undefined ? val : ''}</td>`;
              }).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob([tableHTML], { type: 'application/vnd.ms-excel' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename.endsWith('.xls') ? filename : `${filename}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const parseCSV = (text: string): Record<string, string>[] => {
  const lines = text.split('\n');
  if (lines.length < 2) return [];

  // Parse headers (assume comma separated)
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  
  const result: Record<string, string>[] = [];
  
  // Simple CSV parser that respects quotes
  for(let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const row: Record<string, string> = {};
    let currentVal = '';
    let inQuotes = false;
    let headerIndex = 0;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        if (headerIndex < headers.length) {
          row[headers[headerIndex]] = currentVal.trim().replace(/^"|"$/g, '');
        }
        headerIndex++;
        currentVal = '';
      } else {
        currentVal += char;
      }
    }
    // Push last value
    if (headerIndex < headers.length) {
       row[headers[headerIndex]] = currentVal.trim().replace(/^"|"$/g, '');
    }
    
    result.push(row);
  }
  
  return result;
};

/**
 * Parses an imported file which could be a CSV or our custom HTML-Excel format.
 */
export const processImportFile = async (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return resolve([]);

      // 1. Try Parsing as HTML (The format we export as .xls)
      if (text.trim().startsWith('<html') || text.includes('<table')) {
        try {
          const parser = new DOMParser();
          const doc = parser.parseFromString(text, 'text/html');
          const table = doc.querySelector('table');
          
          if (table) {
            const rows = Array.from(table.querySelectorAll('tr'));
            if (rows.length >= 2) {
              // Extract headers from the first row (th or td)
              const headers = Array.from(rows[0].querySelectorAll('th, td')).map(cell => 
                (cell.textContent || '').trim()
              );

              const result = rows.slice(1).map(row => {
                const cells = Array.from(row.querySelectorAll('td'));
                const obj: Record<string, string> = {};
                headers.forEach((header, index) => {
                  if (header) {
                    obj[header] = (cells[index]?.textContent || '').trim();
                  }
                });
                return obj;
              });
              
              if (result.length > 0) return resolve(result);
            }
          }
        } catch (err) {
          console.warn("HTML parse failed, trying CSV...", err);
        }
      }

      // 2. Fallback to CSV
      try {
        const result = parseCSV(text);
        resolve(result);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsText(file);
  });
};

// Database JSON Export/Import Utilities
export const exportDatabaseToJSON = (data: any, filename: string) => {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
