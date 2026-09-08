import * as XLSX from 'xlsx';
import { MerchantRecord } from '../types';
import { extractNrcLast6, normalizePhone } from './searchHelper';

interface HeaderMapping {
  businessNameKey?: string;
  nrcKey?: string;
  phoneKey?: string;
  merchantCodeKey?: string;
  natureKey?: string;
  ownerKey?: string;
  bankKey?: string;
  srKey?: string;
  dateKey?: string;
  statusKey?: string;
}

function findMatchingKey(keys: string[], patterns: string[]): string | undefined {
  for (const pattern of patterns) {
    const found = keys.find((k) => {
      const clean = k.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      const cleanPattern = pattern.toLowerCase().replace(/[^a-z0-9]/g, '');
      return clean === cleanPattern || clean.includes(cleanPattern);
    });
    if (found) return found;
  }
  return undefined;
}

function detectHeaders(rowObj: Record<string, unknown>): HeaderMapping {
  const keys = Object.keys(rowObj);
  return {
    businessNameKey: findMatchingKey(keys, ['businessname', 'shopname', 'merchantname', 'business', 'shop', 'name']),
    nrcKey: findMatchingKey(keys, ['nrc', 'nationalid', 'nrcno', 'idcard', 'nrcnumber']),
    phoneKey: findMatchingKey(keys, ['ph', 'phone', 'phonenumber', 'tel', 'mobile', 'contact']),
    merchantCodeKey: findMatchingKey(keys, ['merchantcode', 'code', 'mid', 'merchantid']),
    natureKey: findMatchingKey(keys, ['natureofbusiness', 'nature', 'businesstype', 'category']),
    ownerKey: findMatchingKey(keys, ['ownerdirector', 'owner', 'director', 'proprietor', 'name']),
    bankKey: findMatchingKey(keys, ['bankacc', 'bankaccount', 'accno', 'accountno', 'bank']),
    srKey: findMatchingKey(keys, ['sr', 'srno', 'no', 'serial']),
    dateKey: findMatchingKey(keys, ['date', 'regdate', 'createddate']),
    statusKey: findMatchingKey(keys, ['status', 'merchantportal', 'merchantportalstatus', 'remark']),
  };
}

/**
 * Parse an ArrayBuffer from Excel or CSV file
 */
export function parseExcelFile(
  data: ArrayBuffer,
  fileName: string
): { records: MerchantRecord[]; sheetNames: string[]; summary: string } {
  const workbook = XLSX.read(data, { type: 'array' });
  const allRecords: MerchantRecord[] = [];
  const validSheetNames: string[] = [];

  workbook.SheetNames.forEach((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    // Convert to JSON array of objects
    const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
      defval: '',
      blankrows: false,
    });

    if (!jsonData || jsonData.length === 0) return;

    // Detect headers from first non-empty row
    const headers = detectHeaders(jsonData[0]);

    let countInSheet = 0;
    jsonData.forEach((row, idx) => {
      const bName = headers.businessNameKey ? String(row[headers.businessNameKey] ?? '').trim() : '';
      const nrc = headers.nrcKey ? String(row[headers.nrcKey] ?? '').trim() : '';
      const phone = headers.phoneKey ? String(row[headers.phoneKey] ?? '').trim() : '';
      const mCode = headers.merchantCodeKey ? String(row[headers.merchantCodeKey] ?? '').trim() : '';
      const nature = headers.natureKey ? String(row[headers.natureKey] ?? '').trim() : '';
      const owner = headers.ownerKey ? String(row[headers.ownerKey] ?? '').trim() : '';
      const bank = headers.bankKey ? String(row[headers.bankKey] ?? '').trim() : '';
      const sr = headers.srKey ? String(row[headers.srKey] ?? '').trim() : idx + 1;
      const date = headers.dateKey ? String(row[headers.dateKey] ?? '').trim() : '';
      const status = headers.statusKey ? String(row[headers.statusKey] ?? '').trim() : '';

      // Skip row if completely empty or missing both business name, NRC, and phone
      if (!bName && !nrc && !phone && !mCode) return;

      countInSheet++;
      allRecords.push({
        id: `imp-${sheetName.replace(/\s+/g, '_')}-${idx}-${Date.now()}`,
        sheetName: sheetName.trim() || 'Uploaded Sheet',
        rowNumber: idx + 2,
        sr: sr || idx + 1,
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
    });

    if (countInSheet > 0) {
      validSheetNames.push(sheetName);
    }
  });

  return {
    records: allRecords,
    sheetNames: validSheetNames,
    summary: `Successfully parsed ${allRecords.length} merchants across ${validSheetNames.length} sheet(s) from "${fileName}".`,
  };
}

/**
 * Parse raw pasted TSV / CSV text (for example, directly copied from Google Sheets)
 */
export function parsePastedData(
  text: string,
  targetSheetName: string = 'Pasted Data'
): { records: MerchantRecord[]; summary: string } {
  const workbook = XLSX.read(text, { type: 'string' });
  const firstSheet = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheet];
  const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: '',
    blankrows: false,
  });

  if (!jsonData || jsonData.length === 0) {
    throw new Error('No valid tabular data found in the pasted content.');
  }

  const headers = detectHeaders(jsonData[0]);
  const records: MerchantRecord[] = [];

  jsonData.forEach((row, idx) => {
    const bName = headers.businessNameKey ? String(row[headers.businessNameKey] ?? '').trim() : '';
    const nrc = headers.nrcKey ? String(row[headers.nrcKey] ?? '').trim() : '';
    const phone = headers.phoneKey ? String(row[headers.phoneKey] ?? '').trim() : '';
    const mCode = headers.merchantCodeKey ? String(row[headers.merchantCodeKey] ?? '').trim() : '';
    const nature = headers.natureKey ? String(row[headers.natureKey] ?? '').trim() : '';
    const owner = headers.ownerKey ? String(row[headers.ownerKey] ?? '').trim() : '';
    const bank = headers.bankKey ? String(row[headers.bankKey] ?? '').trim() : '';
    const sr = headers.srKey ? String(row[headers.srKey] ?? '').trim() : idx + 1;
    const date = headers.dateKey ? String(row[headers.dateKey] ?? '').trim() : '';
    const status = headers.statusKey ? String(row[headers.statusKey] ?? '').trim() : '';

    if (!bName && !nrc && !phone && !mCode) return;

    records.push({
      id: `paste-${idx}-${Date.now()}`,
      sheetName: targetSheetName.trim() || 'Pasted Sheet',
      sr: sr || idx + 1,
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
  });

  return {
    records,
    summary: `Successfully imported ${records.length} records into "${targetSheetName}".`,
  };
}

/**
 * Export merchant records to CSV or Excel
 */
export function exportToCSV(records: MerchantRecord[], fileName: string = 'Merchant_KYC_Export.csv'): void {
  const exportData = records.map((r, idx) => ({
    'Sheet Name': r.sheetName,
    'SR': r.sr ?? idx + 1,
    'BUSINESS NAME': r.businessName,
    'DATE': r.date,
    'MERCHANT CODE': r.merchantCode,
    'NATURE OF BUSINESS': r.natureOfBusiness,
    'OWNER/DIRECTOR': r.ownerDirector,
    'NRC': r.nrc,
    'NRC LAST 6': r.nrcLast6,
    'MERCHANT MOBILE NUMBER': r.phone,
    'BANK ACC': r.bankAcc,
    'STATUS': r.merchantPortalStatus,
  }));

  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Merchants');
  XLSX.writeFile(wb, fileName);
}
