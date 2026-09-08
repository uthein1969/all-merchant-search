import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut as fbSignOut,
} from 'firebase/auth';
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
        'Firebase domain unauthorized: "all-merchant-search.vercel.app" is not added to Firebase Console Authorized Domains. Fix: In Firebase Console -> Authentication -> Settings -> Authorized Domains, add "all-merchant-search.vercel.app". OR share your Google Sheet as "Anyone with the link can view" to sync directly without signing in!'
      );
    }
    if (error.code === 'auth/popup-closed-by-user') {
      throw new Error('Sign-in popup was closed before completing. Please click Sign In again.');
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
      const clean = (h || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      const cleanP = pattern.toLowerCase().replace(/[^a-z0-9]/g, '');
      return clean === cleanP || clean.includes(cleanP);
    });
    if (idx !== -1) return idx;
  }
  return -1;
}

function detectColumnIndices(headerRow: string[]): ColumnIndexMap {
  return {
    sr: matchHeaderIndex(headerRow, ['sr', 'srno', 'no', 'serial']),
    businessName: matchHeaderIndex(headerRow, ['businessname', 'business', 'shopname', 'merchantname', 'shop', 'name']),
    date: matchHeaderIndex(headerRow, ['date', 'regdate', 'createddate']),
    merchantCode: matchHeaderIndex(headerRow, ['merchantcode', 'code', 'mid', 'merchantid']),
    natureOfBusiness: matchHeaderIndex(headerRow, ['natureofbusiness', 'nature', 'businesstype', 'category']),
    ownerDirector: matchHeaderIndex(headerRow, ['ownerdirector', 'owner', 'director', 'proprietor']),
    nrc: matchHeaderIndex(headerRow, ['nrc', 'nationalid', 'nrcno', 'idcard', 'nrcnumber']),
    phone: matchHeaderIndex(headerRow, ['ph', 'phone', 'phonenumber', 'tel', 'mobile', 'contact']),
    bankAcc: matchHeaderIndex(headerRow, ['bankacc', 'bankaccount', 'accno', 'accountno', 'bank']),
    status: matchHeaderIndex(headerRow, ['status', 'merchantportal', 'merchantportalstatus', 'remark']),
  };
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
 * without requiring OAuth login. Uses Google Visualization API and HTML views.
 */
export async function fetchPublicSpreadsheetData(
  spreadsheetId: string,
  rawUrl?: string,
  onProgress?: (status: string) => void
): Promise<GoogleSyncResult> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  if (!cleanId) {
    throw new Error('Please provide a valid Google Spreadsheet ID or URL.');
  }

  const specificGid = rawUrl ? extractGid(rawUrl) : null;
  onProgress?.('Accessing Google Sheet directly via link...');

  let discoveredSheetNames: string[] = [];
  let spreadsheetTitle = 'Google Sheet KYC';

  // 1. Try to discover sheet tab names from htmlview
  try {
    const htmlRes = await fetch(`https://docs.google.com/spreadsheets/d/${cleanId}/htmlview`);
    if (htmlRes.ok) {
      const htmlText = await htmlRes.text();

      const titleMatch = htmlText.match(/<title>(.*?)<\/title>/i);
      if (titleMatch && titleMatch[1]) {
        spreadsheetTitle = titleMatch[1].replace(/- Google Sheets/i, '').trim();
      }

      // Match sheet buttons: <li id="sheet-button-...">...<a>SheetName</a>...
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

  onProgress?.(`Found ${discoveredSheetNames.length} sheet tab(s). Loading rows...`);

  const allRecords: MerchantRecord[] = [];
  const validSheets: string[] = [];

  // 2. Fetch each tab with gviz/tq
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
      const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]+)\);?$/m);
      if (!match || !match[1]) continue;

      const gvizData = JSON.parse(match[1]);
      if (!gvizData.table) continue;

      const cols = gvizData.table.cols || [];
      const rows = gvizData.table.rows || [];

      // Determine headers
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

        if (!bName && !nrc && !phone && !mCode) continue;

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

  // 3. Fallback: If no records from gviz, try direct CSV export
  if (allRecords.length === 0) {
    onProgress?.('Reading via Google Sheets export format...');
    const csvUrl = specificGid
      ? `https://docs.google.com/spreadsheets/d/${cleanId}/export?format=csv&gid=${specificGid}`
      : `https://docs.google.com/spreadsheets/d/${cleanId}/export?format=csv`;

    try {
      const csvRes = await fetch(csvUrl);
      if (csvRes.ok) {
        const csvText = await csvRes.text();
        if (!csvText.includes('<!DOCTYPE html')) {
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
              if (!bName && !nrc && !phone && !mCode) continue;
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

  if (allRecords.length === 0) {
    throw new Error(
      'Could not read data from this Google Sheet. Please make sure the sheet is shared as "Anyone with the link can view", or sign in with your Google account.'
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
