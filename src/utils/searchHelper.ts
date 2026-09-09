import { MerchantRecord, SearchFilters } from '../types';

/**
 * Convert Myanmar numerals (၀-၉) to standard ASCII numerals (0-9)
 */
export function convertMyanmarDigitsToEnglish(input: string): string {
  if (!input) return '';
  const myanmarDigits = ['၀', '၁', '၂', '၃', '၄', '၅', '၆', '၇', '၈', '၉'];
  let result = input;
  for (let i = 0; i < myanmarDigits.length; i++) {
    result = result.replaceAll(myanmarDigits[i], String(i));
  }
  return result;
}

/**
 * Extract the trailing digits of an NRC (usually last 6 digits in Myanmar NRCs)
 */
export function extractNrcLast6(nrc: string): string {
  if (!nrc) return '';
  const converted = convertMyanmarDigitsToEnglish(nrc);
  // Match the consecutive digits at the end of the string
  const match = converted.match(/(\d{5,7})\s*$/);
  if (match) {
    return match[1].slice(-6);
  }
  // Fallback: extract all digits and take last 6
  const allDigits = converted.replace(/\D/g, '');
  if (allDigits.length >= 6) {
    return allDigits.slice(-6);
  }
  return allDigits;
}

/**
 * Normalize phone numbers for easy flexible matching
 * Handles: +959..., 09..., 9..., spaces, dashes, parentheses
 */
export function normalizePhone(phone: string): string {
  if (!phone) return '';
  let digits = convertMyanmarDigitsToEnglish(phone).replace(/\D/g, '');
  // Remove international prefix 95 or 0095 if present at start
  if (digits.startsWith('0095')) {
    digits = digits.slice(4);
  } else if (digits.startsWith('95') && digits.length >= 9) {
    digits = digits.slice(2);
  }
  // Strip leading zero for unified comparison (e.g. 0943162010 -> 943162010)
  if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  return digits;
}

/**
 * Filter merchant records based on user search criteria
 */
export function filterMerchants(
  records: MerchantRecord[],
  filters: SearchFilters
): MerchantRecord[] {
  const globalQ = convertMyanmarDigitsToEnglish(filters.globalQuery.trim().toLowerCase());
  const bNameQ = filters.businessName.trim().toLowerCase();
  const nrcQ = convertMyanmarDigitsToEnglish(filters.nrc.trim().toLowerCase());
  const phoneQ = normalizePhone(filters.phone.trim());
  const mCodeQ = convertMyanmarDigitsToEnglish(filters.merchantCode.trim().toLowerCase());
  const natureQ = filters.natureOfBusiness.trim().toLowerCase();
  const targetSheet = filters.sheetName.trim();

  return records.filter((m) => {
    // Sheet filter
    if (targetSheet && targetSheet !== 'ALL' && m.sheetName !== targetSheet) {
      return false;
    }

    // Nature of business filter
    if (natureQ && !m.natureOfBusiness.toLowerCase().includes(natureQ)) {
      return false;
    }

    // Business Name specific filter
    if (bNameQ && !m.businessName.toLowerCase().includes(bNameQ)) {
      return false;
    }

    // NRC specific filter (supports last 6 digits or full search)
    if (nrcQ) {
      const cleanNrc = m.nrc.toLowerCase();
      const nrcDigits = convertMyanmarDigitsToEnglish(m.nrc).replace(/\D/g, '');
      const last6 = m.nrcLast6;

      if (filters.nrcLast6Only) {
        // Strict or partial match on the last 6 digits
        if (!last6.includes(nrcQ)) {
          return false;
        }
      } else {
        // Match either in full NRC string OR in NRC digits OR in last 6 digits
        const matchesFull = cleanNrc.includes(nrcQ);
        const matchesDigits = nrcDigits.includes(nrcQ);
        const matchesLast6 = last6.includes(nrcQ);
        if (!matchesFull && !matchesDigits && !matchesLast6) {
          return false;
        }
      }
    }

    // Phone specific filter
    if (phoneQ) {
      const normPhone = m.normalizedPhone;
      const rawPhone = convertMyanmarDigitsToEnglish(m.phone).replace(/\D/g, '');
      if (!normPhone.includes(phoneQ) && !rawPhone.includes(phoneQ)) {
        return false;
      }
    }

    // Merchant Code specific filter
    if (mCodeQ && !m.merchantCode.toLowerCase().includes(mCodeQ)) {
      return false;
    }

    // Township specific filter
    if (filters.township && filters.township !== 'ALL') {
      const tQ = filters.township.trim().toLowerCase();
      const mTsp = (m.township || '').trim().toLowerCase();
      if (mTsp !== tQ) {
        return false;
      }
    }

    // Ward specific filter
    if (filters.ward && filters.ward !== 'ALL') {
      const wQ = filters.ward.trim().toLowerCase();
      const mWard = (m.ward || '').trim().toLowerCase();
      if (mWard !== wQ) {
        return false;
      }
    }

    // Global Query filter (searches across all 14 fields)
    if (globalQ) {
      const inBusiness = m.businessName.toLowerCase().includes(globalQ);
      const inNrc = m.nrc.toLowerCase().includes(globalQ) || m.nrcLast6.includes(globalQ);
      const inPhone = m.normalizedPhone.includes(normalizePhone(globalQ)) || m.phone.toLowerCase().includes(globalQ);
      const inOwner = (m.legalPersonalName || m.ownerDirector || '').toLowerCase().includes(globalQ);
      const inFather = (m.fatherName || '').toLowerCase().includes(globalQ);
      const inDob = (m.dateOfBirth || '').toLowerCase().includes(globalQ);
      const inCode = m.merchantCode.toLowerCase().includes(globalQ);
      const inBank = m.bankAcc.toLowerCase().includes(globalQ);
      const inLicense = (m.businessLicenseTypes || '').toLowerCase().includes(globalQ);
      const inNature = m.natureOfBusiness.toLowerCase().includes(globalQ);
      const inAddress = (m.detailAddress || '').toLowerCase().includes(globalQ);
      const inWard = (m.ward || '').toLowerCase().includes(globalQ);
      const inTownship = (m.township || '').toLowerCase().includes(globalQ);
      const inSheet = m.sheetName.toLowerCase().includes(globalQ);
      const inOpenDate = (m.openDate || m.date || '').toLowerCase().includes(globalQ);

      if (
        !inBusiness &&
        !inNrc &&
        !inPhone &&
        !inOwner &&
        !inFather &&
        !inDob &&
        !inCode &&
        !inBank &&
        !inLicense &&
        !inNature &&
        !inAddress &&
        !inWard &&
        !inTownship &&
        !inSheet &&
        !inOpenDate
      ) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Format NRC by splitting into prefix and last 6 digits for visual clarity
 */
export function formatNrcParts(nrc: string): { prefix: string; last6: string } {
  if (!nrc) return { prefix: '', last6: '' };
  const last6 = extractNrcLast6(nrc);
  if (last6 && nrc.endsWith(last6)) {
    return {
      prefix: nrc.slice(0, -last6.length),
      last6: last6,
    };
  }
  return { prefix: nrc, last6: '' };
}
