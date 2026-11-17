import { Download } from 'lucide-react';
import { downloadRecordsAsCsv, type CsvColumn } from '../utils/csvExport';

interface ExportCsvButtonProps<T extends object> {
  rows: T[];
  columns: CsvColumn<T>[];
  filenamePrefix: string;
  label?: string;
}

export function ExportCsvButton<T extends object>({
  rows,
  columns,
  filenamePrefix,
  label = 'Export CSV',
}: ExportCsvButtonProps<T>) {
  return (
    <button
      type="button"
      disabled={rows.length === 0}
      onClick={() => downloadRecordsAsCsv(rows, columns, filenamePrefix)}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
      title={`Download ${rows.length} hourly records as CSV`}
    >
      <Download className="w-3.5 h-3.5 text-emerald-400" />
      <span>{label}</span>
    </button>
  );
}
