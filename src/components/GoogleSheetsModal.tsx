import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  FolderOpen,
  Mail,
  Lock,
  ArrowRight,
  Database,
  Layers,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  UploadCloud,
} from 'lucide-react';
import { MerchantRecord } from '../types';
import {
  DEFAULT_SPREADSHEET_ID,
  DEFAULT_SPREADSHEET_URL,
  extractSpreadsheetId,
  fetchGoogleSpreadsheetData,
  GoogleDriveFile,
  GoogleUser,
  listGoogleDriveSpreadsheets,
  requestGoogleAccessToken,
  googleSignOut,
  onGoogleAuthStateChanged,
} from '../services/googleSheetsService';

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataSynced: (records: MerchantRecord[], mode: 'replace' | 'append', meta: { title: string; id: string }) => void;
  currentConnectedSheetId?: string;
  currentConnectedSheetTitle?: string;
  currentUser?: GoogleUser | null;
  onUserUpdate: (user: GoogleUser | null, token: string | null) => void;
  existingToken: string | null;
  onOpenImportModal?: () => void;
  sheetConfig?: import('../types').ConnectedSheetConfig | null;
  onUpdateSheetConfig?: (config: import('../types').ConnectedSheetConfig | null) => void;
  onDisconnectSheet?: () => void;
}

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({
  isOpen,
  onClose,
  onDataSynced,
  currentConnectedSheetId,
  currentConnectedSheetTitle,
  currentUser,
  onUserUpdate,
  existingToken,
  onOpenImportModal,
  sheetConfig,
  onUpdateSheetConfig,
  onDisconnectSheet,
}) => {
  const [token, setToken] = useState<string | null>(existingToken);
  const [user, setUser] = useState<GoogleUser | null>(currentUser || null);
  const [sheetUrlOrId, setSheetUrlOrId] = useState<string>(() => {
    if (sheetConfig?.sheetUrlOrId) return sheetConfig.sheetUrlOrId;
    if (currentConnectedSheetId) return `https://docs.google.com/spreadsheets/d/${currentConnectedSheetId}/edit`;
    return DEFAULT_SPREADSHEET_URL;
  });
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');
  const [showGuide, setShowGuide] = useState(false);
  const feedbackRef = useRef<HTMLDivElement>(null);

  // Auto-sync configuration state
  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(sheetConfig?.autoSyncEnabled ?? true);
  const [syncIntervalSeconds, setSyncIntervalSeconds] = useState<number>(sheetConfig?.syncIntervalSeconds ?? 3600);
  const [syncOnFocus, setSyncOnFocus] = useState<boolean>(sheetConfig?.syncOnFocus ?? true);

  // Sync state with props
  useEffect(() => {
    if (sheetConfig) {
      if (sheetConfig.sheetUrlOrId) setSheetUrlOrId(sheetConfig.sheetUrlOrId);
      setAutoSyncEnabled(sheetConfig.autoSyncEnabled);
      setSyncIntervalSeconds(sheetConfig.syncIntervalSeconds);
      setSyncOnFocus(sheetConfig.syncOnFocus);
    }
  }, [sheetConfig]);

  // Loading & error states
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(false);
  const [progressMsg, setProgressMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Drive files
  const [driveFiles, setDriveFiles] = useState<GoogleDriveFile[]>([]);
  const [isLoadingDriveFiles, setIsLoadingDriveFiles] = useState(false);

  useEffect(() => {
    setToken(existingToken);
  }, [existingToken]);

  useEffect(() => {
    setUser(currentUser || null);
  }, [currentUser]);

  // Auto-subscribe to Firebase Google Auth state
  useEffect(() => {
    const unsubscribe = onGoogleAuthStateChanged((newUser, newToken) => {
      if (newUser && newToken) {
        setUser(newUser);
        setToken(newToken);
        onUserUpdate(newUser, newToken);
      }
    });
    return () => unsubscribe();
  }, [onUserUpdate]);

  // When token becomes available, auto-load recent Drive spreadsheets
  useEffect(() => {
    if (token) {
      loadDriveFiles(token);
    }
  }, [token]);

  const loadDriveFiles = async (authToken: string) => {
    setIsLoadingDriveFiles(true);
    try {
      const files = await listGoogleDriveSpreadsheets(authToken);
      setDriveFiles(files);
    } catch (err: unknown) {
      console.warn('Could not load Drive spreadsheets:', err);
    } finally {
      setIsLoadingDriveFiles(false);
    }
  };

  const handleConnectGoogle = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsAuthenticating(true);
    try {
      const { accessToken, user: gUser } = await requestGoogleAccessToken('uthein1969@gmail.com');
      setToken(accessToken);
      const updatedUser = gUser || { email: 'uthein1969@gmail.com', name: 'Google Account' };
      setUser(updatedUser);
      onUserUpdate(updatedUser, accessToken);
      setSuccessMsg('Successfully connected to Google Workspace account.');
      await loadDriveFiles(accessToken);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google authentication failed';
      setErrorMsg(msg);
      setShowGuide(true);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleDisconnect = async () => {
    await googleSignOut();
    setToken(null);
    setUser(null);
    onUserUpdate(null, null);
    setDriveFiles([]);
    setSuccessMsg('Disconnected from Google account.');
  };

  const handleSyncSpreadsheet = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanId = extractSpreadsheetId(sheetUrlOrId);
    if (!cleanId) {
      setErrorMsg('Please enter a valid Google Sheet URL or ID.');
      return;
    }

    setIsFetchingData(true);
    setProgressMsg('Connecting to Google Sheet...');

    try {
      // Direct Link Sync: uses token if logged in, or direct public link parsing if shared
      const result = await fetchGoogleSpreadsheetData(
        cleanId,
        token,
        (msg) => setProgressMsg(msg),
        sheetUrlOrId
      );

      if (result.records.length === 0) {
        throw new Error('No merchant rows found. Please check that the sheet has data and matching columns.');
      }

      onDataSynced(result.records, importMode, {
        title: result.title,
        id: result.spreadsheetId,
      });

      // Save persistent configuration so the user never has to reconnect again
      if (onUpdateSheetConfig) {
        onUpdateSheetConfig({
          sheetUrlOrId: sheetUrlOrId.trim(),
          sheetId: result.spreadsheetId,
          title: result.title,
          autoSyncEnabled,
          syncIntervalSeconds,
          syncOnFocus,
          lastSyncedAt: Date.now(),
          lastRecordCount: result.totalRecords,
        });
      }

      setSuccessMsg(
        `Successfully synced ${result.totalRecords} records across ${result.sheetNames.length} sheet tab(s) from "${result.title}". Link has been permanently saved for auto-sync.`
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch Google Sheet data.';
      setErrorMsg(message);
      setShowGuide(true);
    } finally {
      setIsFetchingData(false);
      setProgressMsg('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        id="google-sheets-modal"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                Connect Google Sheets
              </h2>
              <p className="text-xs text-slate-500">
                Directly sync KYC merchant data from your shared Google Sheet
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm text-slate-700">
          {/* Account Connection Status */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/90 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Google Workspace Account
              </span>
              {token ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-200 text-slate-700">
                  <Lock className="w-3 h-3" />
                  Not Connected
                </span>
              )}
            </div>

            {token && user ? (
              <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200">
                <div className="flex items-center gap-3">
                  {user.picture ? (
                    <img src={user.picture} alt="Avatar" className="w-9 h-9 rounded-full" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center text-sm">
                      {user.email ? user.email.charAt(0).toUpperCase() : 'G'}
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-semibold text-slate-900">{user.name || 'Google User'}</p>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <Mail className="w-3 h-3 text-slate-400" />
                      {user.email || 'uthein1969@gmail.com'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="text-xs text-slate-500 hover:text-red-600 px-2.5 py-1.5 rounded-md hover:bg-red-50 transition-colors cursor-pointer"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3.5 rounded-lg border border-slate-200">
                <div className="text-xs text-slate-600">
                  <p className="font-medium text-slate-800">Sign in with your Gmail account</p>
                  <p className="text-slate-500">
                    Target account: <span className="font-semibold text-slate-700">uthein1969@gmail.com</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleConnectGoogle}
                  disabled={isAuthenticating}
                  className="flex items-center gap-2.5 px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 hover:text-slate-900 disabled:opacity-60 rounded-lg font-medium text-xs shadow-sm transition-all cursor-pointer shrink-0"
                >
                  {isAuthenticating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                      </svg>
                      <span className="font-semibold text-slate-800">Sign In with Google</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Direct Link Information Banner */}
          <div className="bg-emerald-50/80 rounded-xl p-3.5 border border-emerald-200/80 text-xs text-emerald-900 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-semibold text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Google Sheet Link ဖြင့် တိုက်ရိုက် ချိတ်ဆက်ခြင်း (အကြံပြုထားသောနည်းလမ်း)</span>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(!showGuide)}
                className="text-emerald-700 hover:text-emerald-900 underline font-medium text-[11px] flex items-center gap-1 cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                {showGuide ? 'လမ်းညွှန် ပိတ်မည်' : 'လင့်ခ်ယူနည်း (၃ ဆင့်)'}
                {showGuide ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>
            <p className="text-[11px] leading-relaxed text-emerald-700">
              Google Sheet တွင် <strong>"Anyone with the link can view"</strong> ဟု ထားရှိပေးလိုက်ပါက Gmail Login ဝင်စရာမလိုဘဲ အောက်ပါ Box တွင် Sheet Link ထည့်ပြီး တိုက်ရိုက် Sync လုပ်နိုင်ပါသည်။
            </p>

            {/* Step-by-Step Burmese Guide */}
            {showGuide && (
              <div className="bg-white/90 border border-emerald-200 rounded-lg p-3 mt-2 space-y-2 text-slate-700 shadow-xs">
                <p className="font-bold text-emerald-900 text-xs flex items-center gap-1">
                  📋 Google Sheet တွင် "Share" ဖွင့်နည်း (၃ ဆင့် လမ်းညွှန်):
                </p>
                <ol className="space-y-1.5 text-[11px] list-none">
                  <li className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-emerald-700 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      ၁
                    </span>
                    <span>
                      မိမိ Google Sheet ကိုဖွင့်ပြီး အပေါ်ညာဘက်ရှိ အပြာရောင် <strong>"Share" (မျှဝေရန်)</strong> ခလုတ်ကို နှိပ်ပါ။
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-emerald-700 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      ၂
                    </span>
                    <span>
                      "General access" အောက်တွင် "Restricted" အစား <strong>"Anyone with the link" (လင့်ခ်ရှိသူ မည်သူမဆို)</strong> သို့ ရွေးပေးပါ။ (ညာဘက်တွင် <strong>Viewer / ကြည့်ရှုသူ</strong> ဖြစ်နေပါစေ)။
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-emerald-700 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      ၃
                    </span>
                    <span>
                      အောက်ဘက်ရှိ <strong>"Copy link" (လင့်ခ်ကူးယူရန်)</strong> ကို နှိပ်ပြီး အောက်ပါ Box တွင် Paste လုပ်ကာ <strong>"Fetch & Sync Google Sheet"</strong> ကို နှိပ်လိုက်ပါ။
                    </span>
                  </li>
                </ol>
              </div>
            )}
          </div>

          {/* Google Sheet URL or ID input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="input-sheet-url" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                Google Sheet Link / Spreadsheet ID
              </label>
              <button
                type="button"
                onClick={() => setSheetUrlOrId(DEFAULT_SPREADSHEET_URL)}
                className="text-[11px] text-emerald-700 hover:text-emerald-800 underline font-medium cursor-pointer"
              >
                Use "All Merchant KYC" Default
              </button>
            </div>

            <div className="relative">
              <input
                id="input-sheet-url"
                type="text"
                value={sheetUrlOrId}
                onChange={(e) => setSheetUrlOrId(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/... or Spreadsheet ID"
                className="w-full text-xs font-mono px-3 py-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-800 placeholder:text-slate-400"
              />
            </div>
            <p className="text-[11px] text-slate-500 flex items-center justify-between">
              <span>Paste full URL or spreadsheet ID. Supports all tabs automatically.</span>
              <a
                href={sheetUrlOrId.startsWith('http') ? sheetUrlOrId : `https://docs.google.com/spreadsheets/d/${sheetUrlOrId}/edit`}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-700 hover:underline inline-flex items-center gap-0.5"
              >
                Open in Google Sheets <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </p>
          </div>

          {/* Auto-Sync Configuration Section */}
          <div className="bg-emerald-50/60 rounded-xl p-4 border border-emerald-200/90 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-emerald-700 shrink-0" />
                <div>
                  <h3 className="text-xs font-bold text-emerald-950">
                    Auto-Sync Settings (အလိုအလျောက် Sync စနစ်)
                  </h3>
                  <p className="text-[11px] text-emerald-700">
                    Google Sheet အချက်အလက်များ ပြောင်းလဲပါက အလိုအလျောက် Update လုပ်ပေးမည်
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSyncEnabled}
                  onChange={(e) => {
                    const enabled = e.target.checked;
                    setAutoSyncEnabled(enabled);
                    if (sheetConfig && onUpdateSheetConfig) {
                      onUpdateSheetConfig({ ...sheetConfig, autoSyncEnabled: enabled });
                    }
                  }}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                <span className="ml-2 text-xs font-semibold text-emerald-900">
                  {autoSyncEnabled ? 'ဖွင့်ထားသည်' : 'ပိတ်ထားသည်'}
                </span>
              </label>
            </div>

            {autoSyncEnabled && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-emerald-200/60">
                {/* Interval Frequency */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-emerald-900 block">
                    Sync အကြိမ်ရေ (Interval)
                  </label>
                  <select
                    value={syncIntervalSeconds}
                    onChange={(e) => {
                      const sec = Number(e.target.value);
                      setSyncIntervalSeconds(sec);
                      if (sheetConfig && onUpdateSheetConfig) {
                        onUpdateSheetConfig({ ...sheetConfig, syncIntervalSeconds: sec });
                      }
                    }}
                    className="w-full text-xs bg-white border border-emerald-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:ring-1 focus:ring-emerald-500 focus:outline-none font-medium"
                  >
                    <option value={3600}>၁ နာရီတစ်ကြိမ် (1 Hour - ပုံမှန်အကြံပြု)</option>
                    <option value={7200}>၂ နာရီတစ်ကြိမ် (2 Hours)</option>
                    <option value={1800}>မိနစ် ၃၀ တစ်ကြိမ် (30 Minutes)</option>
                    <option value={900}>၁၅ မိနစ်တစ်ကြိမ် (15 Minutes)</option>
                    <option value={300}>၅ မိနစ်တစ်ကြိမ် (5 Minutes)</option>
                    <option value={60}>၁ မိနစ်တစ်ကြိမ် (1 Minute)</option>
                    <option value={30}>စက္ကန့် ၃၀ တစ်ကြိမ် (30 Seconds)</option>
                  </select>
                </div>

                {/* Tab Focus Sync */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-emerald-900 block">
                    Tab Focus Sync
                  </label>
                  <label className="flex items-center gap-2 p-1.5 bg-white rounded-lg border border-emerald-300 cursor-pointer text-[11px] text-slate-700">
                    <input
                      type="checkbox"
                      checked={syncOnFocus}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setSyncOnFocus(val);
                        if (sheetConfig && onUpdateSheetConfig) {
                          onUpdateSheetConfig({ ...sheetConfig, syncOnFocus: val });
                        }
                      }}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Tab သို့ ပြန်ရောက်တိုင်း Sync မည်</span>
                  </label>
                </div>
              </div>
            )}

            {/* Persistent Link Saved Notice */}
            <div className="flex items-center justify-between text-[11px] text-emerald-800 bg-white/80 p-2 rounded-lg border border-emerald-200">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Link ကို Browser တွင် အမြဲသိမ်းဆည်းထားပြီး App ဖွင့်တိုင်း ထပ်ချိတ်စရာမလိုပါ။</span>
              </span>
              {sheetConfig && onDisconnectSheet && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('သိမ်းဆည်းထားသော Google Sheet Link ကို ဖြုတ်မည်မှာ သေချာပါသလား?')) {
                      onDisconnectSheet();
                      setSuccessMsg('Saved Google Sheet Link disconnected.');
                    }
                  }}
                  className="text-red-600 hover:text-red-700 font-medium hover:underline text-[11px] cursor-pointer ml-2 shrink-0"
                >
                  လင့်ခ်ဖျက်မည်
                </button>
              )}
            </div>
          </div>

          {/* Quick Select from Drive files */}
          {token && driveFiles.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <FolderOpen className="w-3.5 h-3.5 text-slate-500" />
                Select from your Google Drive / Shared Sheets
              </span>
              <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 bg-white">
                {driveFiles.map((file) => {
                  const isSelected = extractSpreadsheetId(sheetUrlOrId) === file.id;
                  return (
                    <button
                      key={file.id}
                      type="button"
                      onClick={() => setSheetUrlOrId(`https://docs.google.com/spreadsheets/d/${file.id}/edit`)}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${
                        isSelected ? 'bg-emerald-50 text-emerald-900 font-medium' : 'text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate mr-2">
                        <FileSpreadsheet className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-emerald-600' : 'text-slate-400'}`} />
                        <span className="truncate">{file.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString() : ''}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Import Mode Options */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
            <span className="text-xs font-semibold text-slate-700 block">
              Sync Mode
            </span>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                  importMode === 'replace'
                    ? 'border-emerald-600 bg-white shadow-xs text-emerald-900'
                    : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="sync-mode"
                  checked={importMode === 'replace'}
                  onChange={() => setImportMode('replace')}
                  className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <p className="text-xs font-semibold">Replace Existing Data</p>
                  <p className="text-[11px] text-slate-500">Overwrites current list with fresh Google Sheet data</p>
                </div>
              </label>

              <label
                className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                  importMode === 'append'
                    ? 'border-emerald-600 bg-white shadow-xs text-emerald-900'
                    : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="sync-mode"
                  checked={importMode === 'append'}
                  onChange={() => setImportMode('append')}
                  className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <p className="text-xs font-semibold">Append to Existing</p>
                  <p className="text-[11px] text-slate-500">Keeps existing records and adds new rows</p>
                </div>
              </label>
            </div>
          </div>

          {/* Feedback messages */}
          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="space-y-1.5 flex-1">
                <p className="font-semibold">Error connecting to Google Sheet</p>
                <p className="text-[12px] leading-relaxed whitespace-pre-line">{errorMsg}</p>
                <div className="pt-1 border-t border-red-200/80 text-[11px] text-red-700 space-y-1">
                  <p className="font-medium">အဆင်ပြေစေမည့် နည်းလမ်းများ (Quick Tips):</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    <li>
                      <strong>Link ဖြင့် တိုက်ရိုက်ချိတ်ဆက်ရန်:</strong> Google Sheet တွင် <strong>Share</strong> ကိုနှိပ်ပြီး General access တွင် <strong>"Anyone with the link can view"</strong> ဟု ပြောင်းလဲပေးလိုက်ပါက Sign-In မလိုဘဲ တိုက်ရိုက် Sync လုပ်နိုင်ပါသည်။
                    </li>
                    <li>
                      <strong>Google Account ဖြင့် ချိတ်ဆက်ရန်:</strong> အထက်ပါ "Sign In with Google" ခလုတ်ကို နှိပ်ပြီး <strong>uthein1969@gmail.com</strong> ဖြင့် ဝင်ရောက်အသုံးပြုပါ။
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <div>
                <p className="font-semibold">Success</p>
                <p>{successMsg}</p>
              </div>
            </div>
          )}

          {isFetchingData && progressMsg && (
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2.5">
              <RefreshCw className="w-4 h-4 text-emerald-600 animate-spin shrink-0" />
              <span className="font-medium">{progressMsg}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            {onOpenImportModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenImportModal();
                }}
                className="text-xs text-emerald-700 hover:text-emerald-900 hover:underline flex items-center gap-1 font-medium cursor-pointer"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                Upload Excel (.xlsx) Instead
              </button>
            )}
          </div>

          <button
            id="btn-sync-google-sheet"
            type="button"
            onClick={handleSyncSpreadsheet}
            disabled={isFetchingData || isAuthenticating || !sheetUrlOrId.trim()}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-600 disabled:bg-slate-300 text-white rounded-lg font-semibold text-xs shadow-md transition-colors cursor-pointer"
          >
            {isFetchingData ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Syncing Sheets...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Fetch & Sync Google Sheet</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
