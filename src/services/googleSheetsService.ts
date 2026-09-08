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

/**
 * Fetch and parse all sheets directly from Google Sheets API
 */
export async function fetchGoogleSpreadsheetData(
  spreadsheetId: string,
  accessToken: string,
  onProgress?: (status: string) => void
): Promise<GoogleSyncResult> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  if (!cleanId) {
    throw new Error('Please provide a valid Google Spreadsheet ID or URL.');
  }

  onProgress?.('Fetching spreadsheet metadata...');

  // 1. Get spreadsheet metadata & sheet tab names
  const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}?fields=properties.title,sheets.properties(sheetId,title)`;
  const metaRes = await fetch(metaUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!metaRes.ok) {
    if (metaRes.status === 401) {
      throw new Error('Google authorization expired. Please sign in again.');
    }
    if (metaRes.status === 403) {
      throw new Error(
        'Access denied (403). Make sure this Google Sheet is shared with your account (uthein1969@gmail.com) with at least Viewer permissions.'
      );
    }
    if (metaRes.status === 404) {
      throw new Error('Spreadsheet not found (404). Please verify the Google Sheet URL or ID.');
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
  // Build ranges like 'Sheet1'!A1:Z5000
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

    // Fallback: If headers couldn't be detected by name, use default column order from sample sheet:
    // [0: SR, 1: BUSINESS NAME, 2: DATE, 3: MERCHANT CODE, 4: NATURE OF BUSINESS, 5: OWNER/DIRECTOR, 6: NRC, 7: PH, 8: BANK ACC, 9: STATUS]
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

      // Skip row if completely empty or missing primary identifiers
      if (!bName && !nrc && !phone && !mCode) continue;

      sheetRecordsCount++;
      allRecords.push({
        id: `gsheet-${cleanId.slice(0, 6)}-${sheetIdx}-${i}-${sheetRecordsCount}`,
        sheetName: sheetName.trim(),
        rowNumber: i + 1,
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
}
