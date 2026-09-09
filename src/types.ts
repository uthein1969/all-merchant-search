export interface MerchantRecord {
  id: string;
  sheetName: string;
  rowNumber?: number | string;
  sr?: string | number;
  openDate?: string;
  date?: string;
  businessName: string;
  merchantCode: string;
  phone: string;
  normalizedPhone: string;
  legalPersonalName?: string;
  ownerDirector: string;
  nrc: string;
  nrcLast6: string;
  fatherName?: string;
  dateOfBirth?: string;
  gender?: string;
  bankAcc: string;
  businessLicenseTypes?: string;
  natureOfBusiness: string;
  detailAddress?: string;
  ward?: string;
  township?: string;
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
  township: string;
  ward: string;
  groupBy: 'none' | 'township' | 'ward';
}

export interface SheetMeta {
  name: string;
  count: number;
}

export interface LocationMeta {
  name: string;
  count: number;
}
