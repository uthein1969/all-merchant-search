export interface MerchantRecord {
  id: string;
  sheetName: string;
  rowNumber?: number | string;
  sr?: string | number;
  businessName: string;
  date?: string;
  merchantCode: string;
  natureOfBusiness: string;
  ownerDirector: string;
  nrc: string;
  nrcLast6: string;
  phone: string;
  normalizedPhone: string;
  bankAcc: string;
  merchantPortalStatus?: string;
}

export interface SearchFilters {
  globalQuery: string;
  businessName: string;
  nrc: string;
  nrcLast6Only: boolean;
  phone: string;
  sheetName: string;
  natureOfBusiness: string;
  merchantCode: string;
}

export interface SheetMeta {
  name: string;
  count: number;
}
