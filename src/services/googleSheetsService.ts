import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut as fbSignOut,
} from 'firebase/auth';
import * as XLSX from 'xlsx';
import firebaseConfig from '../config/firebaseConfig';
import { MerchantRecord } from '../types';
import { extractNrcLast6, normalizePhone } from '../utils/searchHelper';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Configure Google Provider with Workspace scopes
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/spreadsheets.readonly');
googleProvider.addScope('https://www.googleapis.com/auth/drive.readonly');
googleProvider.setCustomParameters({
  login_hint: 'uthein1969@gmail.com',
  prompt: 'select_account',
});

export const GOOGLE_CLIENT_ID = firebaseConfig.oAuthClientId;

// Default spreadsheet ID from the user's shared KYC sheet
export const DEFAULT_SPREADSHEET_ID = '1KpFz5P3QWbzp57jTtl9rmSxKoeULw_0LdlqurYHiNfI';
export const DEFAULT_SPREADSHEET_URL = `https://docs.google.com/spreadsheets/d/${DEFAULT_SPREADSHEET_ID}/edit`;

export interface GoogleDriveFile {
  id: string;
  name: string;
  modifiedTime?: string;
  sharedWithMeTime?: string;
  owners?: Array<{ displayName?: string; emailAddress?: string }>;
}

export interface GoogleSyncResult {
  spreadsheetId: string;
  title: string;
  sheetNames: string[];
  records: MerchantRecord[];
  totalRecords: number;
}

export interface GoogleUser {
  email?: string;
  name?: string;
  picture?: string;
}

// In-memory token cache (per guidelines, do not persist tokens in localStorage)
let cachedAccessToken: string | null = null;

/**
 * Extract Spreadsheet ID from standard Google Sheets URL or return raw ID
 */
export function extractSpreadsheetId(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  // Matching: https://docs.google.com/spreadsheets/d/{id}/...
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  // If it's already a clean alphanumeric ID
  if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) {
    return trimmed;
  }
  return trimmed;
}

/**
 * Extract GID (sheet tab id) from URL if present
 */
export function extractGid(input: string): string | null {
  if (!input) return null;
  const match = input.match(/[#?&]gid=([0-9]+)/);
  return match ? match[1] : null;
}

/**
 * Sign in with Google using Firebase Auth popup (officially provisioned OAuth)
 */
export async function googleSignIn(): Promise<{ accessToken: string; user: GoogleUser }> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Google Sign-in succeeded, but no access token was returned for Google Sheets.');
    }
    cachedAccessToken = credential.accessToken;
    const user: GoogleUser = {
      email: result.user.email || undefined,
      name: result.user.displayName || undefined,
      picture: result.user.photoURL || undefined,
    };
    return { accessToken: cachedAccessToken, user };
  } catch (error: any) {
    console.error('Sign-in error:', error);
    if (error.code === 'auth/unauthorized-domain') {
      throw new Error(
        'Gmail Sign-in Box ပေါ်ပြီး ချက်ချင်း ပျောက်သွားရခြင်းမှာ Vercel Domain ("all-merchant-search.vercel.app") ကို Firebase Authentication ၏ Authorized Domains စာရင်းထဲ မထည့်ရသေးသောကြောင့် ဖြစ်ပါသည်။\n\n' +
        '👉 အလွယ်ကူဆုံး ဖြေရှင်းနည်း: Google Sheet တွင် "Anyone with the link can view" ဟု Share ပြောင်းပေးလိုက်ပါက Sign-In မလိုဘဲ အောက်ပါ Box တွင် Link ထည့်ပြီး "Fetch & Sync Google Sheet" ဖြင့် တိုက်ရိုက် ရယူနိုင်ပါသည်။'
      );
    }
    if (error.code === 'auth/popup-closed-by-user') {
      throw new Error(
        'Sign-in Box ပေါ်ပြီး ချက်ချင်း ပျောက်သွားပါက Domain ကန့်သတ်ချက် (Authorized Domain) သို့မဟုတ် Browser Popup ပိတ်ထားခြင်းကြောင့် ဖြစ်နိုင်ပါသည်။\n\n' +
        '👉 Google Sheet တွင် "Anyone with the link can view" ဟု Share လုပ်ထားပါက Gmail Sign In လုပ်စရာမလိုဘဲ အောက်ပါ "Direct Google Sheet Link" ဖြင့် တိုက်ရိုက် Sync ပြုလုပ်နိုင်ပါသည်။'
      );
    }
    if (error.code === 'auth/cancelled-popup-request') {
      throw new Error('Popup request was cancelled. Please retry.');
    }
    if (error.code === 'auth/popup-blocked') {
      throw new Error('Popup was blocked by your browser. Please allow popups for this site and try again.');
    }
    throw new Error(error.message || 'Google authentication failed.');
  }
}

/**
 * Request Google Access Token (wraps Firebase Auth popup)
 */
export async function requestGoogleAccessToken(
  _userHint?: string
): Promise<{ accessToken: string; user?: GoogleUser }> {
  return googleSignIn();
}

/**
 * Sign out and clear in-memory token
 */
export async function googleSignOut(): Promise<void> {
  await fbSignOut(auth);
  cachedAccessToken = null;
}

/**
 * Listen for Firebase Auth state changes
 */
export function onGoogleAuthStateChanged(
  callback: (user: GoogleUser | null, token: string | null) => void
) {
  return onAuthStateChanged(auth, (user: User | null) => {
    if (user && cachedAccessToken) {
      callback(
        {
          email: user.email || undefined,
          name: user.displayName || undefined,
          picture: user.photoURL || undefined,
        },
        cachedAccessToken
      );
    } else {
      callback(null, null);
    }
  });
}

/**
 * List spreadsheets available in user's Google Drive (including shared sheets)
 */
export async function listGoogleDriveSpreadsheets(accessToken: string): Promise<GoogleDriveFile[]> {
  const query = encodeURIComponent("mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false");
  const fields = encodeURIComponent('files(id,name,modifiedTime,owners,sharedWithMeTime)');
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&pageSize=25&orderBy=modifiedTime desc`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to load Google Drive spreadsheets (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.files || [];
}

/**
 * Column mapping helper for Google Sheets row arrays
 */
interface ColumnIndexMap {
  sr: number;
  businessName: number;
  date: number;
  merchantCode: number;
  natureOfBusiness: number;
  ownerDirector: number;
  nrc: number;
  phone: number;
  bankAcc: number;
  status: number;
}

function matchHeaderIndex(headers: string[], patterns: string[]): number {
  for (const pattern of patterns) {
    const idx = headers.findIndex((h) => {
      const clean = (h || '').trim().toLowerCase().replace(/[\s_\-./\\(),]/g, '');
      const cleanP = pattern.toLowerCase().replace(/[\s_\-./\\(),]/g, '');
      return clean === cleanP || clean.includes(cleanP);
    });
    if (idx !== -1) return idx;
  }
  return -1;
}

function detectColumnIndices(headerRow: string[]): ColumnIndexMap {
  return {
    sr: matchHeaderIndex(headerRow, ['sr', 'srno', 'no', 'serial', 'စဉ်', 'စဥ်']),
    businessName: matchHeaderIndex(headerRow, [
      'businessname',
      'business',
      'shopname',
      'merchantname',
      'shop',
      'name',
      'tradename',
      'ဆိုင်အမည်',
      'လုပ်ငန်းအမည်',
      'အမည်',
    ]),
    date: matchHeaderIndex(headerRow, ['date', 'regdate', 'createddate', 'entrydate', 'ရက်စွဲ']),
    merchantCode: matchHeaderIndex(headerRow, ['merchantcode', 'code', 'mid', 'merchantid', 'id', 'ကုဒ်']),
    natureOfBusiness: matchHeaderIndex(headerRow, [
      'natureofbusiness',
      'nature',
      'businesstype',
      'category',
      'type',
      'လုပ်ငန်းအမျိုးအစား',
      'အမျိုးအစား',
    ]),
    ownerDirector: matchHeaderIndex(headerRow, ['ownerdirector', 'owner', 'director', 'proprietor', 'ပိုင်ရှင်', 'ဒါရိုက်တာ']),
    nrc: matchHeaderIndex(headerRow, ['nrc', 'nationalid', 'nrcno', 'idcard', 'nrcnumber', 'မှတ်ပုံတင်', 'မှတ်ပုံတင်အမှတ်']),
    phone: matchHeaderIndex(headerRow, ['ph', 'phone', 'phonenumber', 'tel', 'mobile', 'contact', 'ဖုန်း', 'ဖုန်းနံပါတ်']),
    bankAcc: matchHeaderIndex(headerRow, ['bankacc', 'bankaccount', 'accno', 'accountno', 'bank', 'ဘဏ်စာရင်း', 'အကောင့်']),
    status: matchHeaderIndex(headerRow, ['status', 'merchantportal', 'merchantportalstatus', 'remark', 'portalstatus', 'အခြေအနေ']),
  };
}

/**
 * Strict validator to guarantee that no HTML script/tags or error pages can ever be mistaken for merchant records
 */
function isValidMerchantRecord(rec: {
  businessName?: string;
  nrc?: string;
  phone?: string;
  merchantCode?: string;
}): boolean {
  const name = (rec.businessName || '').trim();
  const phone = (rec.phone || '').trim();
  const nrc = (rec.nrc || '').trim();
  const code = (rec.merchantCode || '').trim();

  // Guard against HTML / Javascript leaking into fields
  const combined = `${name} ${phone} ${nrc} ${code}`.toLowerCase();
  if (
    combined.includes('<html') ||
    combined.includes('<!doctype') ||
    combined.includes('<script') ||
    combined.includes('<div') ||
    combined.includes('<meta') ||
    combined.includes('google drive') ||
    combined.includes('page not found') ||
    combined.includes('unable to open') ||
    combined.includes('function(') ||
    combined.includes('window[') ||
    combined.includes('var ') ||
    combined.includes('self.') ||
    combined.includes('servicelogin')
  ) {
    return false;
  }

  // Must have at least one valid merchant attribute:
  // 1. Phone number with 5+ digits
  const hasValidPhone = /\d{5,}/.test(phone);
  // 2. NRC with '/' or '(N)' or 5+ digits
  const hasValidNrc = nrc.length >= 5 && (nrc.includes('/') || nrc.includes('(') || /\d{5,}/.test(nrc));
  // 3. Merchant code with 3+ characters (e.g. 20500312)
  const hasValidCode = code.length >= 3 && !code.includes(' ');
  // 4. Meaningful business name (at least 2 letters, not code brackets)
  const hasValidName = name.length >= 2 && !name.includes('{') && !name.includes(';') && !name.includes('=');

  // Must have at least a name + (phone or nrc or code), OR valid code/phone/nrc
  return Boolean(hasValidPhone || hasValidNrc || hasValidCode || (hasValidName && (hasValidPhone || hasValidNrc || hasValidCode)));
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

/**
 * Fetch and parse data from a public Google Sheet (shared as "Anyone with the link can view")
 * without requiring OAuth login. Uses direct XLSX export, Google Visualization API, and CSV fallback.
 */
export async function fetchPublicSpreadsheetData(
  spreadsheetId: string,
  rawUrl?: string,
  onProgress?: (status: string) => void
): Promise<GoogleSyncResult> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  if (!cleanId) {
    throw new Error('Google Spreadsheet Link သို့မဟုတ် ID မမှန်ကန်ပါ။ ကျေးဇူးပြု၍ ပြန်လည်စစ်ဆေးပေးပါ။');
  }

  const specificGid = rawUrl ? extractGid(rawUrl) : null;
  onProgress?.('Google Sheet သို့ တိုက်ရိုက်ချိတ်ဆက်နေပါသည်...');

  let spreadsheetTitle = 'Google Sheet KYC';
  const allRecords: MerchantRecord[] = [];
  const validSheets: string[] = [];

  // ==========================================
  // METHOD 1: Direct XLSX Export (Google Docs)
  // ==========================================
  try {
    onProgress?.('Google Sheet အချက်အလက်များကို ဒေါင်းလုဒ်ရယူနေပါသည် (Excel Format)...');
    const xlsxUrl = `https://docs.google.com/spreadsheets/d/${cleanId}/export?format=xlsx`;
    const xlsxRes = await fetch(xlsxUrl, { credentials: 'omit' });

    if (xlsxRes.ok) {
      const buffer = await xlsxRes.arrayBuffer();
      const uint8 = new Uint8Array(buffer);
      // Verify PK zip signature (0x50, 0x4B) for a genuine XLSX binary file
      if (uint8.length > 100 && uint8[0] === 0x50 && uint8[1] === 0x4B) {
        const workbook = XLSX.read(uint8, { type: 'array' });
        if (workbook.SheetNames && workbook.SheetNames.length > 0) {
          spreadsheetTitle = 'Google Sheet (Direct Link)';
          for (let sIdx = 0; sIdx < workbook.SheetNames.length; sIdx++) {
            const sName = workbook.SheetNames[sIdx];
            const sheetObj = workbook.Sheets[sName];
            if (!sheetObj) continue;

            const rows: any[][] = XLSX.utils.sheet_to_json(sheetObj, { header: 1, defval: '' });
            if (rows.length < 2) continue;

            // Search first 10 rows to detect the true header row
            let headerRowIdx = 0;
            for (let r = 0; r < Math.min(rows.length, 10); r++) {
              const rowStr = (rows[r] || []).join(' ').toLowerCase();
              if (
                rowStr.includes('business') ||
                rowStr.includes('merchant') ||
                rowStr.includes('code') ||
                rowStr.includes('nrc') ||
                rowStr.includes('phone') ||
                rowStr.includes('ph') ||
                rowStr.includes('ဆိုင်') ||
                rowStr.includes('အမည်')
              ) {
                headerRowIdx = r;
                break;
              }
            }

            const headerRow = (rows[headerRowIdx] || []).map((c: any) => String(c ?? '').trim());
            const colMap = detectColumnIndices(headerRow);
            if (colMap.businessName === -1 && colMap.nrc === -1 && colMap.phone === -1) {
              colMap.sr = 0;
              colMap.businessName = 1;
              colMap.date = 2;
              colMap.merchantCode = 3;
              colMap.natureOfBusiness = 4;
              colMap.ownerDirector = 5;
              colMap.nrc = 6;
              colMap.phone = 7;
              colMap.bankAcc = 8;
              colMap.status = 9;
            }

            let tabCount = 0;
            for (let rIdx = headerRowIdx + 1; rIdx < rows.length; rIdx++) {
              const row = rows[rIdx] || [];
              if (row.length === 0) continue;

              const getVal = (idx: number) => (idx >= 0 && idx < row.length ? String(row[idx] ?? '').trim() : '');
              const bName = getVal(colMap.businessName);
              const nrc = getVal(colMap.nrc);
              const phone = getVal(colMap.phone);
              const mCode = getVal(colMap.merchantCode);
              const nature = getVal(colMap.natureOfBusiness);
              const owner = getVal(colMap.ownerDirector);
              const bank = getVal(colMap.bankAcc);
              const sr = getVal(colMap.sr) || tabCount + 1;
              const date = getVal(colMap.date);
              const status = getVal(colMap.status);

              const candidate = { businessName: bName, nrc, phone, merchantCode: mCode };
              if (!isValidMerchantRecord(candidate)) continue;

              tabCount++;
              allRecords.push({
                id: `gsheet-xlsx-${cleanId.slice(0, 6)}-${sIdx}-${rIdx}-${tabCount}`,
                sheetName: sName,
                sr: sr,
                businessName: bName,
                date: date,
                merchantCode: mCode,
                natureOfBusiness: nature,
                ownerDirector: owner,
                nrc: nrc,
                nrcLast6: extractNrcLast6(nrc),
                phone: phone,
                normalizedPhone: normalizePhone(phone),
                bankAcc: bank,
                merchantPortalStatus: status,
              });
            }

            if (tabCount > 0) {
              validSheets.push(sName);
            }
          }
        }
      }
    }
  } catch (xlsxErr) {
    console.warn('Direct XLSX export attempt failed or CORS blocked:', xlsxErr);
  }

  // If XLSX produced valid records, return immediately!
  if (allRecords.length > 0) {
    return {
      spreadsheetId: cleanId,
      title: spreadsheetTitle,
      sheetNames: validSheets.length > 0 ? validSheets : ['Sheet1'],
      records: allRecords,
      totalRecords: allRecords.length,
    };
  }

  // ==========================================
  // METHOD 2: Google Visualization API (gviz/tq)
  // ==========================================
  onProgress?.('Google Visualization API ဖြင့် စစ်ဆေးဖတ်ရှုနေပါသည်...');
  let discoveredSheetNames: string[] = [];

  try {
    const htmlRes = await fetch(`https://docs.google.com/spreadsheets/d/${cleanId}/htmlview`);
    if (htmlRes.ok) {
      const htmlText = await htmlRes.text();
      const titleMatch = htmlText.match(/<title>(.*?)<\/title>/i);
      if (titleMatch && titleMatch[1]) {
        const rawT = titleMatch[1].replace(/- Google Sheets/i, '').replace(/- Google Drive/i, '').trim();
        if (rawT && !rawT.toLowerCase().includes('page not found') && !rawT.toLowerCase().includes('sign in')) {
          spreadsheetTitle = rawT;
        }
      }

      const tabRegex = /<li id="sheet-button-[^"]*"[^>]*><a[^>]*>([^<]+)<\/a>/gi;
      let m;
      while ((m = tabRegex.exec(htmlText)) !== null) {
        if (m[1] && m[1].trim()) {
          discoveredSheetNames.push(m[1].trim());
        }
      }
    }
  } catch (err) {
    console.warn('Could not read htmlview metadata:', err);
  }

  if (discoveredSheetNames.length === 0) {
    discoveredSheetNames = ['Sheet1'];
  }

  for (let sIdx = 0; sIdx < discoveredSheetNames.length; sIdx++) {
    const sName = discoveredSheetNames[sIdx];
    try {
      const queryUrl =
        specificGid && discoveredSheetNames.length === 1
          ? `https://docs.google.com/spreadsheets/d/${cleanId}/gviz/tq?tqx=out:json&gid=${specificGid}`
          : `https://docs.google.com/spreadsheets/d/${cleanId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sName)}`;

      const res = await fetch(queryUrl);
      if (!res.ok) continue;

      const text = await res.text();
      if (text.toLowerCase().includes('<html') || text.toLowerCase().includes('<!doctype')) {
        continue; // Discard HTML error responses
      }

      const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]+)\);?$/m);
      if (!match || !match[1]) continue;

      const gvizData = JSON.parse(match[1]);
      if (gvizData.status !== 'ok' || !gvizData.table) continue;

      const cols = gvizData.table.cols || [];
      const rows = gvizData.table.rows || [];

      let headerRow: string[] = cols.map((c: { label?: string }) => c?.label || '');
      const hasLabels = headerRow.some((h) => h.trim().length > 0);

      let startRowIdx = 0;
      if (!hasLabels && rows.length > 0) {
        headerRow = (rows[0]?.c || []).map((cell: { f?: string; v?: any } | null) =>
          cell?.f || (cell?.v !== undefined && cell?.v !== null ? String(cell.v) : '')
        );
        startRowIdx = 1;
      }

      const colMap = detectColumnIndices(headerRow);
      if (colMap.businessName === -1 && colMap.nrc === -1 && colMap.phone === -1) {
        colMap.sr = 0;
        colMap.businessName = 1;
        colMap.date = 2;
        colMap.merchantCode = 3;
        colMap.natureOfBusiness = 4;
        colMap.ownerDirector = 5;
        colMap.nrc = 6;
        colMap.phone = 7;
        colMap.bankAcc = 8;
        colMap.status = 9;
      }

      let count = 0;
      for (let rIdx = startRowIdx; rIdx < rows.length; rIdx++) {
        const cells = rows[rIdx]?.c || [];
        if (cells.length === 0) continue;

        const getVal = (colIdx: number) => {
          if (colIdx < 0 || colIdx >= cells.length) return '';
          const cell = cells[colIdx];
          if (!cell) return '';
          return String(cell.f ?? cell.v ?? '').trim();
        };

        const bName = getVal(colMap.businessName);
        const nrc = getVal(colMap.nrc);
        const phone = getVal(colMap.phone);
        const mCode = getVal(colMap.merchantCode);
        const nature = getVal(colMap.natureOfBusiness);
        const owner = getVal(colMap.ownerDirector);
        const bank = getVal(colMap.bankAcc);
        const sr = getVal(colMap.sr) || count + 1;
        const date = getVal(colMap.date);
        const status = getVal(colMap.status);

        const candidate = { businessName: bName, nrc, phone, merchantCode: mCode };
        if (!isValidMerchantRecord(candidate)) continue;

        count++;
        allRecords.push({
          id: `gsheet-pub-${cleanId.slice(0, 6)}-${sIdx}-${rIdx}-${count}`,
          sheetName: sName,
          sr: sr,
          businessName: bName,
          date: date,
          merchantCode: mCode,
          natureOfBusiness: nature,
          ownerDirector: owner,
          nrc: nrc,
          nrcLast6: extractNrcLast6(nrc),
          phone: phone,
          normalizedPhone: normalizePhone(phone),
          bankAcc: bank,
          merchantPortalStatus: status,
        });
      }

      if (count > 0) {
        validSheets.push(sName);
      }
    } catch (err) {
      console.warn(`Error reading tab ${sName}:`, err);
    }
  }

  // ==========================================
  // METHOD 3: Fallback CSV Export
  // ==========================================
  if (allRecords.length === 0) {
    onProgress?.('Google Sheets CSV ပုံစံဖြင့် ထပ်မံကြိုးစားနေပါသည်...');
    const csvUrl = specificGid
      ? `https://docs.google.com/spreadsheets/d/${cleanId}/export?format=csv&gid=${specificGid}`
      : `https://docs.google.com/spreadsheets/d/${cleanId}/export?format=csv`;

    try {
      const csvRes = await fetch(csvUrl);
      if (csvRes.ok) {
        const csvText = await csvRes.text();
        const lower = csvText.toLowerCase();
        // Strictly verify not an HTML error or Google login page
        if (
          !lower.includes('<html') &&
          !lower.includes('<!doctype') &&
          !lower.includes('<title>') &&
          !lower.includes('google drive') &&
          !lower.includes('page not found') &&
          !lower.includes('unable to open')
        ) {
          const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
          if (lines.length >= 2) {
            const rows = lines.map(parseCsvLine);
            const header = rows[0];
            const colMap = detectColumnIndices(header);
            if (colMap.businessName === -1 && colMap.nrc === -1 && colMap.phone === -1) {
              colMap.sr = 0;
              colMap.businessName = 1;
              colMap.date = 2;
              colMap.merchantCode = 3;
              colMap.natureOfBusiness = 4;
              colMap.ownerDirector = 5;
              colMap.nrc = 6;
              colMap.phone = 7;
              colMap.bankAcc = 8;
              colMap.status = 9;
            }
            let cnt = 0;
            for (let i = 1; i < rows.length; i++) {
              const row = rows[i];
              const getVal = (idx: number) => (idx >= 0 && idx < row.length ? row[idx].trim() : '');
              const bName = getVal(colMap.businessName);
              const nrc = getVal(colMap.nrc);
              const phone = getVal(colMap.phone);
              const mCode = getVal(colMap.merchantCode);

              const candidate = { businessName: bName, nrc, phone, merchantCode: mCode };
              if (!isValidMerchantRecord(candidate)) continue;

              cnt++;
              allRecords.push({
                id: `gsheet-csv-${cleanId.slice(0, 6)}-${i}-${cnt}`,
                sheetName: spreadsheetTitle || 'Google Sheet',
                sr: getVal(colMap.sr) || cnt,
                businessName: bName,
                date: getVal(colMap.date),
                merchantCode: mCode,
                natureOfBusiness: getVal(colMap.natureOfBusiness),
                ownerDirector: getVal(colMap.ownerDirector),
                nrc: nrc,
                nrcLast6: extractNrcLast6(nrc),
                phone: phone,
                normalizedPhone: normalizePhone(phone),
                bankAcc: getVal(colMap.bankAcc),
                merchantPortalStatus: getVal(colMap.status),
              });
            }
            if (cnt > 0) {
              validSheets.push(spreadsheetTitle || 'Google Sheet');
            }
          }
        }
      }
    } catch (csvErr) {
      console.warn('CSV export fetch failed:', csvErr);
    }
  }

  // If no records found after all attempts, throw comprehensive Burmese troubleshooting guide
  if (allRecords.length === 0) {
    throw new Error(
      'Google Sheet မှ Merchant Data များကို ဖတ်၍ မရနိုင်သေးပါ (သို့မဟုတ် Data မတွေ့ရှိပါ)။\n\n' +
      'အကြောင်းအရင်းများ -\n' +
      '၁။ Google Sheet သည် "Restricted" (ပိတ်ထားဆဲ) ဖြစ်နေနိုင်ပါသည်။\n' +
      '   👉 ဖြေရှင်းနည်း: မိမိ Google Sheet သို့သွားပြီး အပေါ်ညာဘက်ရှိ "Share" (မျှဝေရန်) ခလုတ်ကို နှိပ်ပါ။\n' +
      '   👉 "General access" တွင် "Restricted" အစား "Anyone with the link" (Viewer / ကြည့်ရှုသူ) သို့ ပြောင်းပါ။\n' +
      '   👉 ထို့နောက် "Copy link" ပြန်ယူပြီး ဤနေရာတွင် Link ထည့်ကာ "Fetch & Sync" ပြန်လုပ်ပါ။\n\n' +
      '၂။ သို့မဟုတ် ပိုမိုမြန်ဆန်လွယ်ကူစေရန် "File / Paste Import" ခလုတ်မှတစ်ဆင့် မိမိ Excel (.xlsx) ဖိုင်ကို တိုက်ရိုက် Upload တင်၍ ချက်ချင်း အသုံးပြုနိုင်ပါသည်။'
    );
  }

  return {
    spreadsheetId: cleanId,
    title: spreadsheetTitle,
    sheetNames: validSheets.length > 0 ? validSheets : ['Sheet1'],
    records: allRecords,
    totalRecords: allRecords.length,
  };
}

/**
 * Fetch and parse all sheets directly from Google Sheets API
 */
export async function fetchGoogleSpreadsheetData(
  spreadsheetId: string,
  accessToken?: string | null,
  onProgress?: (status: string) => void,
  rawUrl?: string
): Promise<GoogleSyncResult> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  if (!cleanId) {
    throw new Error('Please provide a valid Google Spreadsheet ID or URL.');
  }

  // If no accessToken provided, try direct public link fetching
  if (!accessToken) {
    return fetchPublicSpreadsheetData(cleanId, rawUrl || spreadsheetId, onProgress);
  }

  onProgress?.('Fetching spreadsheet metadata from Google API...');

  // 1. Get spreadsheet metadata & sheet tab names
  try {
    const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}?fields=properties.title,sheets.properties(sheetId,title)`;
    const metaRes = await fetch(metaUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!metaRes.ok) {
      if (metaRes.status === 401) {
        throw new Error('Google authorization expired. Please sign in again.');
      }
      // If permission denied via API, attempt public link fallback
      if (metaRes.status === 403 || metaRes.status === 404) {
        try {
          return await fetchPublicSpreadsheetData(cleanId, rawUrl || spreadsheetId, onProgress);
        } catch {
          throw new Error(
            'Access denied (403). Make sure this Google Sheet is shared with your account (uthein1969@gmail.com) with at least Viewer permissions, OR set sharing to "Anyone with the link can view".'
          );
        }
      }
      const errText = await metaRes.text();
      throw new Error(`Google Sheets API Error (${metaRes.status}): ${errText}`);
    }

    const metaData = await metaRes.json();
    const spreadsheetTitle: string = metaData.properties?.title || 'Google Sheet KYC';
    const sheets = metaData.sheets || [];

    if (sheets.length === 0) {
      throw new Error('No sheets found in this Google Spreadsheet.');
    }

    const sheetTitles: string[] = sheets.map((s: { properties?: { title?: string } }) => s.properties?.title || 'Sheet1');

    onProgress?.(`Found ${sheetTitles.length} sheets in "${spreadsheetTitle}". Fetching data...`);

    // 2. Fetch data from all sheets using batchGet
    const rangeParams = sheetTitles
      .map((title) => `ranges=${encodeURIComponent(`'${title}'!A1:Z`)}`)
      .join('&');

    const batchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values:batchGet?${rangeParams}&valueRenderOption=FORMATTED_VALUE`;
    const batchRes = await fetch(batchUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!batchRes.ok) {
      const err = await batchRes.text();
      throw new Error(`Failed to fetch spreadsheet rows (${batchRes.status}): ${err}`);
    }

    const batchData = await batchRes.json();
    const valueRanges = batchData.valueRanges || [];

    const allRecords: MerchantRecord[] = [];
    const validSheets: string[] = [];

    valueRanges.forEach((rangeObj: { range: string; values?: string[][] }, sheetIdx: number) => {
      const sheetName = sheetTitles[sheetIdx] || `Sheet ${sheetIdx + 1}`;
      const values: string[][] = rangeObj.values || [];

      if (values.length < 2) return; // Need at least header + 1 row

      // Find the header row (the row that contains BUSINESS NAME, NRC, or PH)
      let headerRowIdx = 0;
      for (let r = 0; r < Math.min(values.length, 5); r++) {
        const rowStr = values[r].join(' ').toLowerCase();
        if (rowStr.includes('business') || rowStr.includes('nrc') || rowStr.includes('merchant') || rowStr.includes('ph')) {
          headerRowIdx = r;
          break;
        }
      }

      const headerRow = values[headerRowIdx] || [];
      const colMap = detectColumnIndices(headerRow);

      if (colMap.businessName === -1 && colMap.nrc === -1 && colMap.phone === -1) {
        colMap.sr = 0;
        colMap.businessName = 1;
        colMap.date = 2;
        colMap.merchantCode = 3;
        colMap.natureOfBusiness = 4;
        colMap.ownerDirector = 5;
        colMap.nrc = 6;
        colMap.phone = 7;
        colMap.bankAcc = 8;
        colMap.status = 9;
      }

      let sheetRecordsCount = 0;

      for (let i = headerRowIdx + 1; i < values.length; i++) {
        const row = values[i];
        if (!row || row.length === 0) continue;

        const getVal = (colIdx: number) => (colIdx >= 0 && colIdx < row.length ? String(row[colIdx] ?? '').trim() : '');

        const bName = getVal(colMap.businessName);
        const nrc = getVal(colMap.nrc);
        const phone = getVal(colMap.phone);
        const mCode = getVal(colMap.merchantCode);
        const nature = getVal(colMap.natureOfBusiness);
        const owner = getVal(colMap.ownerDirector);
        const bank = getVal(colMap.bankAcc);
        const sr = getVal(colMap.sr) || sheetRecordsCount + 1;
        const date = getVal(colMap.date);
        const status = getVal(colMap.status);

        if (!bName && !nrc && !phone && !mCode) continue;

        sheetRecordsCount++;
        allRecords.push({
          id: `gsheet-${cleanId.slice(0, 6)}-${sheetIdx}-${i}-${sheetRecordsCount}`,
          sheetName: sheetName.trim(),
          sr: sr,
          businessName: bName,
          date: date,
          merchantCode: mCode,
          natureOfBusiness: nature,
          ownerDirector: owner,
          nrc: nrc,
          nrcLast6: extractNrcLast6(nrc),
          phone: phone,
          normalizedPhone: normalizePhone(phone),
          bankAcc: bank,
          merchantPortalStatus: status,
        });
      }

      if (sheetRecordsCount > 0) {
        validSheets.push(sheetName);
      }
    });

    return {
      spreadsheetId: cleanId,
      title: spreadsheetTitle,
      sheetNames: validSheets.length > 0 ? validSheets : sheetTitles,
      records: allRecords,
      totalRecords: allRecords.length,
    };
  } catch (apiErr: any) {
    // If API error occurs, attempt public link retrieval before giving up
    try {
      return await fetchPublicSpreadsheetData(cleanId, rawUrl || spreadsheetId, onProgress);
    } catch {
      throw apiErr;
    }
  }
}
