export interface CsvColumn<T> {
  key: keyof T;
  header: string;
}

/**
 * Serializes an array of typed objects to RFC-4180 compliant CSV and triggers
 * a client-side file download with a UTC date-stamped filename.
 */
export function downloadRecordsAsCsv<T extends object>(
  rows: T[],
  columns: CsvColumn<T>[],
  filenamePrefix: string
): void {
  if (rows.length === 0) return;

  const escapeCell = (val: unknown): string => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerLine = columns.map((col) => escapeCell(col.header)).join(',');
  const dataLines = rows.map((row) =>
    columns.map((col) => escapeCell(row[col.key])).join(',')
  );

  const csvContent = [headerLine, ...dataLines].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const dateStamp = new Date().toISOString().slice(0, 10);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${filenamePrefix}_${dateStamp}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
