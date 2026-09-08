import React, { useState, useRef } from 'react';
import { parseExcelFile, parsePastedData } from '../utils/sheetParser';
import { MerchantRecord } from '../types';
import { X, UploadCloud, FileSpreadsheet, ClipboardPaste, CheckCircle2, AlertCircle, Link2 } from 'lucide-react';
import { fetchGoogleSpreadsheetData } from '../services/googleSheetsService';

interface ImportModalProps {
  onClose: () => void;
  onImport: (newRecords: MerchantRecord[], mode: 'append' | 'replace') => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({ onClose, onImport }) => {
  const [activeTab, setActiveTab] = useState<'file' | 'paste'>('file');
  const [pastedText, setPastedText] = useState('');
  const [sheetNameInput, setSheetNameInput] = useState('Google Sheet Import');
  const [mode, setMode] = useState<'append' | 'replace'>('append');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsProcessing(true);

    try {
      const buffer = await file.arrayBuffer();
      const result = parseExcelFile(buffer, file.name);

      if (result.records.length === 0) {
        throw new Error('No valid merchant records could be extracted from this file. Please check column headers.');
      }

      setSuccessMsg(result.summary);
      setTimeout(() => {
        onImport(result.records, mode);
        onClose();
      }, 700);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to parse file.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePastedSubmit = async () => {
    if (!pastedText.trim()) {
      setErrorMsg('Please paste table rows or a Google Sheet link.');
      return;
    }
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsProcessing(true);

    try {
      if (pastedText.trim().includes('docs.google.com/spreadsheets')) {
        const syncRes = await fetchGoogleSpreadsheetData(pastedText.trim(), null, undefined, pastedText.trim());
        if (syncRes.records.length === 0) {
          throw new Error('No valid merchant rows found in the Google Sheet link.');
        }
        setSuccessMsg(`Successfully imported ${syncRes.totalRecords} records from Google Sheet.`);
        setTimeout(() => {
          onImport(syncRes.records, mode);
          onClose();
        }, 700);
      } else {
        const result = parsePastedData(pastedText, sheetNameInput || 'Google Sheet Import');
        if (result.records.length === 0) {
          throw new Error('No valid records found in the pasted data.');
        }
        setSuccessMsg(result.summary);
        setTimeout(() => {
          onImport(result.records, mode);
          onClose();
        }, 700);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to process data.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-emerald-800 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="w-5 h-5 text-emerald-300" />
            <div>
              <h2 className="text-base font-bold">Import Multi-Sheet Merchant KYC</h2>
              <p className="text-[11px] text-emerald-200">Import from Excel (.xlsx, .xls) or Google Sheet export</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-emerald-200 hover:text-white rounded-md hover:bg-emerald-700/60 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-gray-200 bg-gray-50 text-xs font-semibold">
          <button
            onClick={() => {
              setActiveTab('file');
              setErrorMsg(null);
            }}
            className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'file'
                ? 'border-emerald-600 text-emerald-800 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload File (.xlsx / .csv)</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('paste');
              setErrorMsg(null);
            }}
            className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'paste'
                ? 'border-emerald-600 text-emerald-800 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <ClipboardPaste className="w-4 h-4" />
            <span>Paste from Google Sheet</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {/* Mode Selector */}
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex items-center justify-between text-xs">
            <span className="text-gray-700 font-medium">Import Mode:</span>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 cursor-pointer text-gray-700">
                <input
                  type="radio"
                  name="importMode"
                  checked={mode === 'append'}
                  onChange={() => setMode('append')}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <span>Add to Existing</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-gray-700">
                <input
                  type="radio"
                  name="importMode"
                  checked={mode === 'replace'}
                  onChange={() => setMode('replace')}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <span>Replace All</span>
              </label>
            </div>
          </div>

          {/* Feedback messages */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {activeTab === 'file' ? (
            /* File Upload Zone */
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileUpload(e.dataTransfer.files[0]);
                }
              }}
              className="border-2 border-dashed border-gray-300 hover:border-emerald-500 hover:bg-emerald-50/20 rounded-xl p-8 text-center cursor-pointer transition-colors"
            >
              <input
                type="file"
                ref={fileInputRef}
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
              />
              <UploadCloud className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
              <p className="text-sm font-bold text-gray-800 mb-1">
                Drop your Excel or CSV file here, or browse
              </p>
              <p className="text-xs text-gray-500 mb-3">
                Supports Multi-Sheet .xlsx files directly exported from Google Sheets
              </p>
              <span className="inline-block px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg shadow-xs">
                Select .xlsx / .csv File
              </span>
            </div>
          ) : (
            /* Paste Zone */
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Sheet Name:
                </label>
                <input
                  type="text"
                  value={sheetNameInput}
                  onChange={(e) => setSheetNameInput(e.target.value)}
                  placeholder="e.g. Zapp Cashier Merchant List"
                  className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-800 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Paste rows copied from Google Sheets OR paste direct Google Sheet Link:
                </label>
                <textarea
                  rows={7}
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder={`Option 1 - Direct Link: https://docs.google.com/spreadsheets/d/...\n\nOption 2 - Copied Rows (Ctrl + V):\nBUSINESS NAME\tMERCHANT CODE\tNATURE OF BUSINESS\tOWNER/DIRECTOR\tNRC\tPH\tBANK ACC\nFAMILY -2\t20500312\tFOOD AND BEVERAGE\tU AUNG KHAING NYEIN\t5/WALANA(N)105885\t95154867\t23210199916742700`}
                  className="w-full p-2.5 text-xs font-mono border border-gray-200 rounded-lg bg-gray-50 focus:bg-white text-gray-800 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <button
                type="button"
                disabled={isProcessing}
                onClick={handlePastedSubmit}
                className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors shadow-xs cursor-pointer disabled:opacity-60"
              >
                {isProcessing ? 'Processing Data...' : 'Import Pasted Data'}
              </button>
            </div>
          )}

          {/* Expected Columns Note */}
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200/80 text-[11px] text-gray-500 space-y-1">
            <p className="font-semibold text-gray-700">Supported Column Headers:</p>
            <p>
              <code className="bg-white px-1 py-0.5 rounded border border-gray-200">BUSINESS NAME</code>,{' '}
              <code className="bg-white px-1 py-0.5 rounded border border-gray-200">NRC</code>,{' '}
              <code className="bg-white px-1 py-0.5 rounded border border-gray-200">PH</code>,{' '}
              <code className="bg-white px-1 py-0.5 rounded border border-gray-200">MERCHANT CODE</code>,{' '}
              <code className="bg-white px-1 py-0.5 rounded border border-gray-200">OWNER/DIRECTOR</code>,{' '}
              <code className="bg-white px-1 py-0.5 rounded border border-gray-200">BANK ACC</code>
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-800 cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
