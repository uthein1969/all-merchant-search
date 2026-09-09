import React from 'react';
import { Database, FileSpreadsheet, Download, RefreshCw, Upload, Cloud, Check, AlertCircle } from 'lucide-react';
import { GoogleUser } from '../services/googleSheetsService';
import { ConnectedSheetConfig, SyncState } from '../types';

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
  sheetConfig?: ConnectedSheetConfig | null;
  syncState?: SyncState;
  onTriggerSync?: () => void;
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
  sheetConfig,
  syncState = 'idle',
  onTriggerSync,
}) => {
  const isSyncing = syncState === 'syncing';

  // Format relative last sync time
  const formatLastSync = (timestamp?: number): string => {
    if (!timestamp) return 'Never';
    const diffSec = Math.floor((Date.now() - timestamp) / 1000);
    if (diffSec < 30) return 'Just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    return `${diffHours}h ago`;
  };

  // Format interval seconds into human readable text (e.g. 1h, 30m, 60s)
  const formatInterval = (sec: number): string => {
    if (sec >= 3600) {
      const hours = sec / 3600;
      return Number.isInteger(hours) ? `${hours}h` : `${hours.toFixed(1)}h`;
    }
    if (sec >= 60) {
      const mins = sec / 60;
      return Number.isInteger(mins) ? `${mins}m` : `${mins.toFixed(1)}m`;
    }
    return `${sec}s`;
  };

  return (
    <header id="main-header" className="bg-emerald-900 text-white border-b border-emerald-950 shadow-sm sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
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
              {sheetConfig?.autoSyncEnabled && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-emerald-800/90 text-emerald-300 rounded-full border border-emerald-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Auto-Sync: {formatInterval(sheetConfig.syncIntervalSeconds)}
                </span>
              )}
            </div>
            <p className="text-xs text-emerald-200/80">
              Direct Google Sheets Auto-Sync • Search by Business Name, NRC (Last 6 Digits) & Phone
            </p>
          </div>
        </div>

        {/* Stats & Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick Sync Now Button (Single-Click Sync) */}
          {sheetConfig && onTriggerSync && (
            <button
              id="btn-sync-now-navbar"
              onClick={onTriggerSync}
              disabled={isSyncing}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition-all shadow-sm cursor-pointer border ${
                isSyncing
                  ? 'bg-amber-600/90 text-amber-100 border-amber-500 cursor-wait'
                  : 'bg-emerald-700 hover:bg-emerald-600 text-white border-emerald-500 hover:border-emerald-400'
              }`}
              title="Click to check Google Sheet immediately for new/updated rows"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-200' : 'text-emerald-200'}`} />
              <div className="flex flex-col text-left leading-tight">
                <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
                {sheetConfig.lastSyncedAt && (
                  <span className="text-[9px] text-emerald-200 font-normal">
                    {formatLastSync(sheetConfig.lastSyncedAt)}
                  </span>
                )}
              </div>
            </button>
          )}

          {/* Direct Google Sheets Connect / Config Button */}
          <button
            id="btn-google-sheets-sync"
            onClick={onOpenGoogleSheets}
            className={`flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg transition-all shadow-sm cursor-pointer border ${
              isGoogleConnected || sheetConfig
                ? 'bg-emerald-800 hover:bg-emerald-700 text-emerald-100 border-emerald-600'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 hover:border-emerald-400'
            }`}
            title="Google Sheet Link Settings & Auto-Sync Configuration"
          >
            <Cloud className="w-4 h-4 text-emerald-200" />
            <div className="flex flex-col text-left leading-tight">
              <span>{sheetConfig?.title || connectedSheetTitle || 'Connect Google Sheet'}</span>
              <span className="text-[10px] text-emerald-300 font-normal">
                {sheetConfig?.autoSyncEnabled ? `Auto-Sync: ${formatInterval(sheetConfig.syncIntervalSeconds)}` : 'Link Saved'}
              </span>
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

