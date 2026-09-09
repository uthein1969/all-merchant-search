import { useState, useMemo, useEffect } from 'react';
import { initialMerchants } from './data/initialMerchants';
import { MerchantRecord, SearchFilters, SheetMeta } from './types';
import { filterMerchants } from './utils/searchHelper';
import { exportToCSV } from './utils/sheetParser';
import { Navbar } from './components/Navbar';
import { SearchControls } from './components/SearchControls';
import { SheetTabs } from './components/SheetTabs';
import { MerchantTable } from './components/MerchantTable';
import { MerchantDetailModal } from './components/MerchantDetailModal';
import { ImportModal } from './components/ImportModal';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';
import { GoogleUser } from './services/googleSheetsService';
import { CheckCircle2 } from 'lucide-react';

const STORAGE_KEY = 'merchant_kyc_data_v2';
const SHEET_META_KEY = 'connected_sheet_meta_v1';

export default function App() {
  // 1. Merchant Data State (persisted in localStorage)
  const [merchants, setMerchants] = useState<MerchantRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return initialMerchants;
  });

  // Save to localStorage when merchants change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merchants));
    } catch {
      // storage error
    }
  }, [merchants]);

  // Connected Google Sheet Metadata
  const [connectedSheetMeta, setConnectedSheetMeta] = useState<{ id: string; title: string } | null>(() => {
    try {
      const saved = localStorage.getItem(SHEET_META_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return null;
  });

  // Google OAuth User and Token
  const [googleUser, setGoogleUser] = useState<GoogleUser | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);

  // 2. Search Filters State
  const [filters, setFilters] = useState<SearchFilters>({
    globalQuery: '',
    businessName: '',
    nrc: '',
    nrcLast6Only: true, // Default to true as user requested NRC (Match last 6 digits)
    phone: '',
    sheetName: 'ALL',
    township: 'ALL',
    ward: 'ALL',
    groupBy: 'none',
    natureOfBusiness: '',
    merchantCode: '',
  });

  // 3. Modals and Toast
  const [selectedMerchant, setSelectedMerchant] = useState<MerchantRecord | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 4. Compute unique sheet names and counts
  const sheetsMeta = useMemo<SheetMeta[]>(() => {
    const map = new Map<string, number>();
    merchants.forEach((m) => {
      const name = m.sheetName || 'Default Sheet';
      map.set(name, (map.get(name) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [merchants]);

  // 5. Compute unique natures of business
  const naturesOfBusiness = useMemo<string[]>(() => {
    const set = new Set<string>();
    merchants.forEach((m) => {
      if (m.natureOfBusiness) set.add(m.natureOfBusiness);
    });
    return Array.from(set).sort();
  }, [merchants]);

  // Compute unique townships
  const townships = useMemo<string[]>(() => {
    const set = new Set<string>();
    merchants.forEach((m) => {
      if (m.township?.trim()) set.add(m.township.trim());
    });
    return Array.from(set).sort();
  }, [merchants]);

  // Compute unique wards (optionally filtered by currently selected township)
  const wards = useMemo<string[]>(() => {
    const set = new Set<string>();
    merchants.forEach((m) => {
      if (filters.township && filters.township !== 'ALL') {
        if (m.township?.trim().toLowerCase() === filters.township.trim().toLowerCase()) {
          if (m.ward?.trim()) set.add(m.ward.trim());
        }
      } else {
        if (m.ward?.trim()) set.add(m.ward.trim());
      }
    });
    return Array.from(set).sort();
  }, [merchants, filters.township]);

  // 6. Filter merchants based on current criteria
  const filteredMerchants = useMemo(() => {
    return filterMerchants(merchants, filters);
  }, [merchants, filters]);

  // 7. Actions
  const handleResetData = () => {
    if (window.confirm('Reset to default sample merchant records?')) {
      setMerchants(initialMerchants);
      setConnectedSheetMeta(null);
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(SHEET_META_KEY);
      showToast('Merchant data restored to default records.');
    }
  };

  const handleExport = () => {
    if (filteredMerchants.length === 0) {
      alert('No merchant records to export.');
      return;
    }
    const filename = `Merchant_KYC_${filters.sheetName !== 'ALL' ? filters.sheetName.replace(/\s+/g, '_') : 'All_Sheets'}.csv`;
    exportToCSV(filteredMerchants, filename);
    showToast(`Exported ${filteredMerchants.length} records to CSV.`);
  };

  const handleImportData = (newRecords: MerchantRecord[], mode: 'append' | 'replace') => {
    if (mode === 'replace') {
      setMerchants(newRecords);
      showToast(`Replaced data with ${newRecords.length} records.`);
    } else {
      setMerchants((prev) => [...prev, ...newRecords]);
      showToast(`Added ${newRecords.length} new records.`);
    }
  };

  const handleSyncGoogleData = (
    newRecords: MerchantRecord[],
    mode: 'replace' | 'append',
    meta: { title: string; id: string }
  ) => {
    if (mode === 'replace') {
      setMerchants(newRecords);
    } else {
      setMerchants((prev) => [...prev, ...newRecords]);
    }
    setConnectedSheetMeta(meta);
    try {
      localStorage.setItem(SHEET_META_KEY, JSON.stringify(meta));
    } catch {
      // ignore
    }
    showToast(`Synced ${newRecords.length} records from Google Sheet "${meta.title}".`);
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col font-sans antialiased selection:bg-emerald-100 selection:text-emerald-900">
      {/* Header */}
      <Navbar
        totalMerchants={merchants.length}
        totalSheets={sheetsMeta.length}
        onOpenImport={() => setIsImportOpen(true)}
        onOpenGoogleSheets={() => setIsGoogleModalOpen(true)}
        onExport={handleExport}
        onResetData={handleResetData}
        connectedSheetTitle={connectedSheetMeta?.title}
        currentUser={googleUser}
        isGoogleConnected={!!googleToken || !!connectedSheetMeta}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Toast Alert */}
        {toastMessage && (
          <div className="fixed top-18 right-6 z-50 bg-emerald-900 text-white text-xs px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-medium">{toastMessage}</span>
          </div>
        )}

        {/* Search & Filter Controls */}
        <SearchControls
          filters={filters}
          onChangeFilters={setFilters}
          sheets={sheetsMeta}
          natures={naturesOfBusiness}
          townships={townships}
          wards={wards}
          totalResults={filteredMerchants.length}
          totalRecords={merchants.length}
        />

        {/* Multi-Sheet Tabs Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-gray-500 px-1">
            <span className="font-medium">Google Sheet Tabs:</span>
            <span className="text-[11px]">Click a tab to view only that sheet</span>
          </div>
          <SheetTabs
            sheets={sheetsMeta}
            selectedSheet={filters.sheetName}
            totalCount={merchants.length}
            onSelectSheet={(sheetName) => setFilters((prev) => ({ ...prev, sheetName }))}
          />
        </div>

        {/* Merchant Table Results */}
        <MerchantTable
          merchants={filteredMerchants}
          onSelectMerchant={setSelectedMerchant}
          activeNrcSearch={filters.nrc}
          activePhoneSearch={filters.phone}
          activeBusinessSearch={filters.businessName}
          groupBy={filters.groupBy}
        />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-4 px-6 text-center text-xs text-gray-500">
        <p>
          All Merchant KYC Search Application • Direct Google Sheets Sync with Business Name, NRC (Last 6 Digits) & Phone Search
        </p>
      </footer>

      {/* Merchant Detail Modal */}
      {selectedMerchant && (
        <MerchantDetailModal
          merchant={selectedMerchant}
          onClose={() => setSelectedMerchant(null)}
        />
      )}

      {/* Import Modal */}
      {isImportOpen && (
        <ImportModal
          onClose={() => setIsImportOpen(false)}
          onImport={handleImportData}
        />
      )}

      {/* Google Sheets Direct Sync Modal */}
      <GoogleSheetsModal
        isOpen={isGoogleModalOpen}
        onClose={() => setIsGoogleModalOpen(false)}
        onDataSynced={handleSyncGoogleData}
        currentConnectedSheetId={connectedSheetMeta?.id}
        currentConnectedSheetTitle={connectedSheetMeta?.title}
        currentUser={googleUser}
        existingToken={googleToken}
        onOpenImportModal={() => setIsImportOpen(true)}
        onUserUpdate={(user, token) => {
          setGoogleUser(user);
          setGoogleToken(token);
        }}
      />
    </div>
  );
}
