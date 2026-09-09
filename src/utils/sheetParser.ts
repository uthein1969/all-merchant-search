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
  legalPersonalNameKey?: string;
  fatherNameKey?: string;
  dobKey?: string;
  genderKey?: string;
  bankKey?: string;
  licenseKey?: string;
  addressKey?: string;
  wardKey?: string;
  townshipKey?: string;
  srKey?: string;
  dateKey?: string;
  openDateKey?: string;
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
    businessNameKey: findMatchingKey(keys, ['merchantbusinessname', 'businessname', 'shopname', 'merchantname', 'business', 'shop', 'name']),
    nrcKey: findMatchingKey(keys, ['nrcpassportno', 'nrcpassport', 'nrc', 'nationalid', 'nrcno', 'idcard', 'nrcnumber', 'passport', 'passportno']),
    phoneKey: findMatchingKey(keys, ['merchantmobilenumber', 'mobilenumber', 'ph', 'phone', 'phonenumber', 'tel', 'mobile', 'contact']),
    legalPersonalNameKey: findMatchingKey(keys, ['legalpersonalname', 'legalname', 'personalname', 'ownerdirector', 'owner', 'director', 'proprietor', 'fullname', 'name']),
    ownerKey: findMatchingKey(keys, ['ownerdirector', 'owner', 'director', 'proprietor', 'legalpersonalname', 'name']),
    fatherNameKey: findMatchingKey(keys, ['fathername', 'father', 'fathersname', 'dadsname']),
    dobKey: findMatchingKey(keys, ['dateofbirth', 'dob', 'birthdate', 'birthday']),
    genderKey: findMatchingKey(keys, ['gender', 'sex']),
    merchantCodeKey: findMatchingKey(keys, ['merchantcode', 'code', 'mid', 'merchantid']),
    natureKey: findMatchingKey(keys, ['natureofbusiness', 'nature', 'businesstype', 'category', 'lineofbusiness']),
    bankKey: findMatchingKey(keys, ['bankaccno', 'bankacc', 'bankaccount', 'accno', 'accountno', 'bank']),
    licenseKey: findMatchingKey(keys, ['businesslicensetypes', 'businesslicensetype', 'licensetypes', 'licensetype', 'license', 'businesslicense']),
    addressKey: findMatchingKey(keys, ['businesscompanydetailaddress', 'companydetailaddress', 'businessaddress', 'detailaddress', 'address', 'companyaddress', 'streetaddress']),
    wardKey: findMatchingKey(keys, ['ward', 'wardname', 'quarter']),
    townshipKey: findMatchingKey(keys, ['township', 'townshipname', 'tsp', 'city', 'town']),
    srKey: findMatchingKey(keys, ['sr', 'srno', 'no', 'serial']),
    openDateKey: findMatchingKey(keys, ['opendate', 'date', 'regdate', 'createddate', 'entrydate']),
    dateKey: findMatchingKey(keys, ['opendate', 'date', 'regdate', 'createddate']),
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
      const legalName = headers.legalPersonalNameKey
        ? String(row[headers.legalPersonalNameKey] ?? '').trim()
        : headers.ownerKey
        ? String(row[headers.ownerKey] ?? '').trim()
        : '';
      const owner = headers.ownerKey ? String(row[headers.ownerKey] ?? '').trim() : legalName;
      const father = headers.fatherNameKey ? String(row[headers.fatherNameKey] ?? '').trim() : '';
      const dob = headers.dobKey ? String(row[headers.dobKey] ?? '').trim() : '';
      const gender = headers.genderKey ? String(row[headers.genderKey] ?? '').trim() : '';
      const bank = headers.bankKey ? String(row[headers.bankKey] ?? '').trim() : '';
      const license = headers.licenseKey ? String(row[headers.licenseKey] ?? '').trim() : '';
      const address = headers.addressKey ? String(row[headers.addressKey] ?? '').trim() : '';
      const ward = headers.wardKey ? String(row[headers.wardKey] ?? '').trim() : '';
      const township = headers.townshipKey ? String(row[headers.townshipKey] ?? '').trim() : '';
      const sr = headers.srKey ? String(row[headers.srKey] ?? '').trim() : idx + 1;
      const openDate = headers.openDateKey
        ? String(row[headers.openDateKey] ?? '').trim()
        : headers.dateKey
        ? String(row[headers.dateKey] ?? '').trim()
        : '';
      const date = headers.dateKey ? String(row[headers.dateKey] ?? '').trim() : openDate;
      const status = headers.statusKey ? String(row[headers.statusKey] ?? '').trim() : '';

      // Skip row if completely empty or missing both business name, NRC, and phone
      if (!bName && !nrc && !phone && !mCode) return;

      countInSheet++;
      allRecords.push({
        id: `imp-${sheetName.replace(/\s+/g, '_')}-${idx}-${Date.now()}`,
        sheetName: sheetName.trim() || 'Uploaded Sheet',
        rowNumber: idx + 2,
        sr: sr || idx + 1,
        openDate: openDate || date,
        date: date || openDate,
        businessName: bName,
        phone: phone,
        normalizedPhone: normalizePhone(phone),
        legalPersonalName: legalName || owner,
        ownerDirector: owner || legalName,
        nrc: nrc,
        nrcLast6: extractNrcLast6(nrc),
        fatherName: father,
        dateOfBirth: dob,
        gender: gender,
        bankAcc: bank,
        businessLicenseTypes: license,
        natureOfBusiness: nature,
        detailAddress: address,
        ward: ward,
        township: township,
        merchantCode: mCode,
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
    const legalName = headers.legalPersonalNameKey
      ? String(row[headers.legalPersonalNameKey] ?? '').trim()
      : headers.ownerKey
      ? String(row[headers.ownerKey] ?? '').trim()
      : '';
    const owner = headers.ownerKey ? String(row[headers.ownerKey] ?? '').trim() : legalName;
    const father = headers.fatherNameKey ? String(row[headers.fatherNameKey] ?? '').trim() : '';
    const dob = headers.dobKey ? String(row[headers.dobKey] ?? '').trim() : '';
    const gender = headers.genderKey ? String(row[headers.genderKey] ?? '').trim() : '';
    const bank = headers.bankKey ? String(row[headers.bankKey] ?? '').trim() : '';
    const license = headers.licenseKey ? String(row[headers.licenseKey] ?? '').trim() : '';
    const address = headers.addressKey ? String(row[headers.addressKey] ?? '').trim() : '';
    const ward = headers.wardKey ? String(row[headers.wardKey] ?? '').trim() : '';
    const township = headers.townshipKey ? String(row[headers.townshipKey] ?? '').trim() : '';
    const sr = headers.srKey ? String(row[headers.srKey] ?? '').trim() : idx + 1;
    const openDate = headers.openDateKey
      ? String(row[headers.openDateKey] ?? '').trim()
      : headers.dateKey
      ? String(row[headers.dateKey] ?? '').trim()
      : '';
    const date = headers.dateKey ? String(row[headers.dateKey] ?? '').trim() : openDate;
    const status = headers.statusKey ? String(row[headers.statusKey] ?? '').trim() : '';

    if (!bName && !nrc && !phone && !mCode) return;

    records.push({
      id: `paste-${idx}-${Date.now()}`,
      sheetName: targetSheetName.trim() || 'Pasted Sheet',
      sr: sr || idx + 1,
      openDate: openDate || date,
      date: date || openDate,
      businessName: bName,
      phone: phone,
      normalizedPhone: normalizePhone(phone),
      legalPersonalName: legalName || owner,
      ownerDirector: owner || legalName,
      nrc: nrc,
      nrcLast6: extractNrcLast6(nrc),
      fatherName: father,
      dateOfBirth: dob,
      gender: gender,
      bankAcc: bank,
      businessLicenseTypes: license,
      natureOfBusiness: nature,
      detailAddress: address,
      ward: ward,
      township: township,
      merchantCode: mCode,
      merchantPortalStatus: status,
    });
  });

  return {
    records,
    summary: `Successfully imported ${records.length} records into "${targetSheetName}".`,
  };
}

/**
 * Export merchant records to CSV or Excel with all 14 requested KYC columns
 */
export function exportToCSV(records: MerchantRecord[], fileName: string = 'Merchant_KYC_Export.csv'): void {
  const exportData = records.map((r, idx) => ({
    'SR': r.sr ?? idx + 1,
    'OPEN DATE': r.openDate || r.date || '',
    'MERCHANT BUSINESS NAME': r.businessName,
    'MERCHANT MOBILE NUMBER': r.phone,
    'LEGAL PERSONAL NAME': r.legalPersonalName || r.ownerDirector || '',
    'NRC / PASSPORT NO': r.nrc,
    'NRC LAST 6': r.nrcLast6,
    'FATHER NAME': r.fatherName || '',
    'DATE OF BIRTH': r.dateOfBirth || '',
    'GENDER': r.gender || '',
    'BANK ACC NO': r.bankAcc,
    'Business License Types': r.businessLicenseTypes || '',
    'NATURE OF BUSINESS': r.natureOfBusiness,
    'BUSINESS / COMPANY DETAIL ADDRESS': r.detailAddress || '',
    'WARD': r.ward || '',
    'TOWNSHIP': r.township || '',
    'SHEET NAME': r.sheetName,
    'MERCHANT CODE': r.merchantCode,
    'STATUS': r.merchantPortalStatus || '',
  }));

  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Merchants');
  XLSX.writeFile(wb, fileName);
}
