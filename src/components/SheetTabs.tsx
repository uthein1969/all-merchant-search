import React from 'react';
import { SheetMeta } from '../types';
import { FileSpreadsheet, Layers } from 'lucide-react';

interface SheetTabsProps {
  sheets: SheetMeta[];
  selectedSheet: string;
  totalCount: number;
  onSelectSheet: (sheetName: string) => void;
}

export const SheetTabs: React.FC<SheetTabsProps> = ({
  sheets,
  selectedSheet,
  totalCount,
  onSelectSheet,
}) => {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
      {/* All Sheets Tab */}
      <button
        id="tab-all-sheets"
        onClick={() => onSelectSheet('ALL')}
        className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-all shrink-0 cursor-pointer ${
          selectedSheet === 'ALL' || !selectedSheet
            ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs'
            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:text-gray-900'
        }`}
      >
        <Layers className="w-3.5 h-3.5" />
        <span>All Sheets</span>
        <span
          className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
            selectedSheet === 'ALL' || !selectedSheet
              ? 'bg-emerald-900/60 text-emerald-100'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          {totalCount}
        </span>
      </button>

      {/* Individual Sheet Tabs */}
      {sheets.map((sheet) => {
        const isSelected = selectedSheet === sheet.name;
        return (
          <button
            key={sheet.name}
            id={`tab-sheet-${sheet.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`}
            onClick={() => onSelectSheet(sheet.name)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-all shrink-0 cursor-pointer ${
              isSelected
                ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs font-semibold'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <FileSpreadsheet className={`w-3.5 h-3.5 ${isSelected ? 'text-emerald-200' : 'text-emerald-600'}`} />
            <span className="truncate max-w-[200px]">{sheet.name}</span>
            <span
              className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                isSelected
                  ? 'bg-emerald-900/60 text-emerald-100'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {sheet.count}
            </span>
          </button>
        );
      })}
    </div>
  );
};
