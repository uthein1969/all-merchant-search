import React from 'react';
import { Database, FileSpreadsheet, Download, RefreshCw, Upload, Cloud } from 'lucide-react';
import { GoogleUser } from '../services/googleSheetsService';

interface NavbarProps {
  totalMerchants: number;
  totalSheets: number;
  onOpenImport: () => void;
  onOpenGoogleSheets: () => void;
  onExport: () => void;
  onResetData: () => void;
  connectedSheetTitle?: string;
  currentUser?: GoogleUser | null;
  isGoogleConnected?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  totalMerchants,
  totalSheets,
  onOpenImport,
  onOpenGoogleSheets,
  onExport,
  onResetData,
  connectedSheetTitle,
  currentUser,
  isGoogleConnected,
}) => {
  return (
    <header id="main-header" className="bg-emerald-900 text-white border-b border-emerald-950 shadow-sm sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-800 border border-emerald-700/60 flex items-center justify-center text-emerald-200 shadow-inner shrink-0">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white">
                All Merchant KYC Search
              </h1>
              <span className="hidden sm:inline-block px-2 py-0.5 text-[11px] font-medium bg-emerald-800 text-emerald-200 rounded border border-emerald-700">
                Multi-Sheet
              </span>
            </div>
            <p className="text-xs text-emerald-200/80">
              Search merchant data across sheets by Business Name, NRC (Last 6 Digits), and Merchant Mobile Number
            </p>
          </div>
        </div>

        {/* Stats & Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Direct Google Sheets Connect Button */}
          <button
            id="btn-google-sheets-sync"
            onClick={onOpenGoogleSheets}
            className={`flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg transition-all shadow-sm cursor-pointer border ${
              isGoogleConnected
                ? 'bg-emerald-800 hover:bg-emerald-700 text-emerald-100 border-emerald-600'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 hover:border-emerald-400'
            }`}
            title="Connect & Sync directly from Google Sheet shared with your Gmail"
          >
            <Cloud className="w-4 h-4 text-emerald-200" />
            <div className="flex flex-col text-left leading-tight">
              <span>{isGoogleConnected ? 'Google Sheet Synced' : 'Connect Google Sheet'}</span>
              {connectedSheetTitle && (
                <span className="text-[10px] text-emerald-200 font-normal truncate max-w-[120px]">
                  {connectedSheetTitle}
                </span>
              )}
            </div>
          </button>

          {/* Counts */}
          <div className="flex items-center gap-2 bg-emerald-950/60 px-2.5 py-1.5 rounded-lg border border-emerald-800/80 text-xs">
            <Database className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
            <span className="text-emerald-300 font-medium">
              {totalMerchants} <span className="text-emerald-100 font-normal">Merchants</span>
            </span>
            <span className="text-emerald-500">•</span>
            <span className="text-emerald-300 font-medium">
              {totalSheets} <span className="text-emerald-100 font-normal">Sheets</span>
            </span>
          </div>

          {/* Import file / paste */}
          <button
            id="btn-import-sheet"
            onClick={onOpenImport}
            className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-2 bg-emerald-800/80 hover:bg-emerald-700 text-emerald-100 hover:text-white rounded-lg transition-colors border border-emerald-700 cursor-pointer"
            title="Import Excel or CSV file"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden md:inline">File / Paste</span>
          </button>

          {/* Export */}
          <button
            id="btn-export-csv"
            onClick={onExport}
            className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-2 bg-emerald-800/80 hover:bg-emerald-700 text-emerald-100 hover:text-white rounded-lg transition-colors border border-emerald-700 cursor-pointer"
            title="Export filtered records to CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>

          {/* Reset default */}
          <button
            id="btn-reset-default"
            onClick={onResetData}
            className="flex items-center gap-1 text-xs font-medium px-2 py-2 text-emerald-300 hover:text-white hover:bg-emerald-800/60 rounded-lg transition-colors cursor-pointer"
            title="Reset to default records"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Reset</span>
          </button>
        </div>
      </div>
    </header>
  );
};

