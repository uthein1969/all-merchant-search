import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { initialMerchants } from './data/initialMerchants';
import {
  MerchantRecord,
  SearchFilters,
  SheetMeta,
  LocationMeta,
  ConnectedSheetConfig,
  SyncState,
} from './types';
import { filterMerchants, areMerchantRecordsEqual } from './utils/searchHelper';
import { exportToCSV } from './utils/sheetParser';
import { Navbar } from './components/Navbar';
import { SearchControls } from './components/SearchControls';
import { SheetTabs } from './components/SheetTabs';
import { MerchantTable } from './components/MerchantTable';
import { MerchantDetailModal } from './components/MerchantDetailModal';
import { ImportModal } from './components/ImportModal';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';
import {
  GoogleUser,
  fetchGoogleSpreadsheetData,
  extractSpreadsheetId,
  DEFAULT_SPREADSHEET_URL,
} from './services/googleSheetsService';
import { CheckCircle2 } from 'lucide-react';

const STORAGE_KEY = 'merchant_kyc_data_v2';
const SHEET_META_KEY = 'connected_sheet_meta_v1';
const SHEET_CONFIG_KEY = 'merchant_connected_sheet_config_v2';

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

  // Persistent Google Sheet Configuration (so the user never has to reconnect again)
  const [sheetConfig, setSheetConfig] = useState<ConnectedSheetConfig | null>(() => {
    try {
      const saved = localStorage.getItem(SHEET_CONFIG_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Ensure 1 hour interval (3600s) default per user request
        if (!parsed.syncIntervalSeconds || parsed.syncIntervalSeconds === 60) {
          parsed.syncIntervalSeconds = 3600;
        }
        return parsed;
      }

      const oldMeta = localStorage.getItem(SHEET_META_KEY);
      if (oldMeta) {
        const parsed = JSON.parse(oldMeta);
        return {
          sheetUrlOrId: `https://docs.google.com/spreadsheets/d/${parsed.id}/edit`,
          sheetId: parsed.id,
          title: parsed.title || 'All Merchant KYC',
          autoSyncEnabled: true,
          syncIntervalSeconds: 3600,
          syncOnFocus: true,
          lastSyncedAt: Date.now(),
        };
      }

      // Default persistent connection to All Merchant KYC
      return {
        sheetUrlOrId: DEFAULT_SPREADSHEET_URL,
        sheetId: extractSpreadsheetId(DEFAULT_SPREADSHEET_URL),
        title: 'All Merchant KYC',
        autoSyncEnabled: true,
        syncIntervalSeconds: 3600,
        syncOnFocus: true,
      };
    } catch {
      return null;
    }
  });

  // Sync state: idle | syncing | success | error
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const isSyncingRef = useRef(false);

  // Save sheetConfig to localStorage
  useEffect(() => {
    try {
      if (sheetConfig) {
        localStorage.setItem(SHEET_CONFIG_KEY, JSON.stringify(sheetConfig));
        localStorage.setItem(
          SHEET_META_KEY,
          JSON.stringify({ id: sheetConfig.sheetId, title: sheetConfig.title })
        );
      } else {
        localStorage.removeItem(SHEET_CONFIG_KEY);
        localStorage.removeItem(SHEET_META_KEY);
      }
    } catch {
      // ignore
    }
  }, [sheetConfig]);

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

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  // Sync Engine: Silent background fetch and smart diff
  const performSync = useCallback(
    async (isSilent = false) => {
      if (!sheetConfig || !sheetConfig.sheetUrlOrId || isSyncingRef.current) return;
      isSyncingRef.current = true;
      setSyncState('syncing');

      try {
        const cleanId = extractSpreadsheetId(sheetConfig.sheetUrlOrId);
        const result = await fetchGoogleSpreadsheetData(
          cleanId,
          googleToken,
          () => {}, // silent progress
          sheetConfig.sheetUrlOrId
        );

        if (result.records && result.records.length > 0) {
          setMerchants((prev) => {
            const hasChanged = !areMerchantRecordsEqual(prev, result.records);
            if (hasChanged) {
              showToast(
                `Google Sheet အသစ် ပြောင်းလဲမှုများကို Auto Sync လုပ်ဆောင်ပြီးပါပြီ (${result.totalRecords} records).`
              );
              return result.records;
            } else {
              if (!isSilent) {
                showToast(`Google Sheet အချက်အလက်များ နောက်ဆုံးအတိုင်း ဖြစ်နေပါသည် (${result.totalRecords} records).`);
              }
              return prev;
            }
          });

          setSheetConfig((prev) =>
            prev
              ? {
                  ...prev,
                  title: result.title || prev.title,
                  lastSyncedAt: Date.now(),
                  lastRecordCount: result.totalRecords,
                  lastErrorMessage: undefined,
                }
              : null
          );
          setSyncState('success');
        }
      } catch (err) {
        console.warn('Auto sync check failed:', err);
        setSyncState('error');
        if (!isSilent) {
          showToast('Google Sheet sync မအောင်မြင်ပါ (လင့်ခ်ကို စစ်ဆေးပေးပါ)။');
        }
      } finally {
        isSyncingRef.current = false;
        setTimeout(() => {
          setSyncState('idle');
        }, 2000);
      }
    },
    [sheetConfig, googleToken, showToast]
  );

  // 1. Auto-sync on startup
  useEffect(() => {
    if (sheetConfig && sheetConfig.autoSyncEnabled) {
      const timer = setTimeout(() => {
        performSync(true);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 2. Periodic background auto-sync timer
  useEffect(() => {
    if (!sheetConfig || !sheetConfig.autoSyncEnabled) return;
    const intervalSec = Math.max(15, sheetConfig.syncIntervalSeconds || 60);
    const intervalId = setInterval(() => {
      performSync(true);
    }, intervalSec * 1000);

    return () => clearInterval(intervalId);
  }, [sheetConfig?.autoSyncEnabled, sheetConfig?.syncIntervalSeconds, performSync]);

  // 3. Tab focus auto-sync: when user switches back from Google Sheet tab
  useEffect(() => {
    if (!sheetConfig || !sheetConfig.autoSyncEnabled || !sheetConfig.syncOnFocus) return;

    let lastFocusSync = 0;
    const handleFocus = () => {
      const now = Date.now();
      if (now - lastFocusSync > 15000) {
        lastFocusSync = now;
        performSync(true);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [sheetConfig?.autoSyncEnabled, sheetConfig?.syncOnFocus, performSync]);

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

  // Compute unique townships with counts
  const townships = useMemo<LocationMeta[]>(() => {
    const map = new Map<string, number>();
    merchants.forEach((m) => {
      const t = m.township?.trim();
      if (t) {
        map.set(t, (map.get(t) || 0) + 1);
      }
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [merchants]);

  // Compute unique wards with counts (optionally filtered by currently selected township)
  const wards = useMemo<LocationMeta[]>(() => {
    const map = new Map<string, number>();
    merchants.forEach((m) => {
      if (filters.township && filters.township !== 'ALL') {
        if (m.township?.trim().toLowerCase() === filters.township.trim().toLowerCase()) {
          const w = m.ward?.trim();
          if (w) map.set(w, (map.get(w) || 0) + 1);
        }
      } else {
        const w = m.ward?.trim();
        if (w) map.set(w, (map.get(w) || 0) + 1);
      }
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [merchants, filters.township]);

  // 6. Filter merchants based on current criteria
  const filteredMerchants = useMemo(() => {
    return filterMerchants(merchants, filters);
  }, [merchants, filters]);

  // 7. Actions
  const handleResetData = () => {
    if (window.confirm('Reset to default sample merchant records?')) {
      setMerchants(initialMerchants);
      setSheetConfig(null);
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(SHEET_META_KEY);
      localStorage.removeItem(SHEET_CONFIG_KEY);
      showToast('Merchant data restored to default records.');
    }
  };

  const handleDisconnectSheet = () => {
    setSheetConfig(null);
    localStorage.removeItem(SHEET_CONFIG_KEY);
    localStorage.removeItem(SHEET_META_KEY);
    showToast('Google Sheet link has been disconnected.');
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
    setSheetConfig((prev) => ({
      sheetUrlOrId: prev?.sheetUrlOrId || `https://docs.google.com/spreadsheets/d/${meta.id}/edit`,
      sheetId: meta.id,
      title: meta.title,
      autoSyncEnabled: prev?.autoSyncEnabled ?? true,
      syncIntervalSeconds: prev?.syncIntervalSeconds ?? 3600,
      syncOnFocus: prev?.syncOnFocus ?? true,
      lastSyncedAt: Date.now(),
      lastRecordCount: newRecords.length,
    }));
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
        connectedSheetTitle={sheetConfig?.title}
        currentUser={googleUser}
        isGoogleConnected={!!googleToken || !!sheetConfig}
        sheetConfig={sheetConfig}
        syncState={syncState}
        onTriggerSync={() => performSync(false)}
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
          All Merchant KYC Search Application • Direct Google Sheets Auto-Sync with Business Name, NRC (Last 6 Digits) & Phone Search
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
        currentConnectedSheetId={sheetConfig?.sheetId}
        currentConnectedSheetTitle={sheetConfig?.title}
        currentUser={googleUser}
        existingToken={googleToken}
        onOpenImportModal={() => setIsImportOpen(true)}
        sheetConfig={sheetConfig}
        onUpdateSheetConfig={setSheetConfig}
        onDisconnectSheet={handleDisconnectSheet}
        onUserUpdate={(user, token) => {
          setGoogleUser(user);
          setGoogleToken(token);
        }}
      />
    </div>
  );
}
