import { MerchantRecord } from '../types';
import { extractNrcLast6, normalizePhone } from '../utils/searchHelper';

interface RawMerchant {
  sheetName: string;
  sr?: string | number;
  openDate?: string;
  businessName: string;
  date?: string;
  merchantCode: string;
  natureOfBusiness: string;
  ownerDirector: string;
  legalPersonalName?: string;
  nrc: string;
  fatherName?: string;
  dateOfBirth?: string;
  gender?: string;
  phone: string;
  bankAcc: string;
  businessLicenseTypes?: string;
  detailAddress?: string;
  ward?: string;
  township?: string;
  merchantPortalStatus?: string;
}

const rawList: RawMerchant[] = [
  // Sheet 1: Zapp Cashier Merchant List (Direct from screenshot)
  {
    sheetName: 'Zapp Cashier Merchant List',
    sr: 8,
    businessName: 'FAMILY -2',
    date: '12,8,24',
    merchantCode: '20500312',
    natureOfBusiness: 'FOOD AND BEVERAGE',
    ownerDirector: 'U AUNG KHAING NYEIN',
    nrc: '5/WALANA(N)105885',
    phone: '95154867',
    bankAcc: '23210199916742700',
    merchantPortalStatus: 'SAME',
  },
  {
    sheetName: 'Zapp Cashier Merchant List',
    sr: 25,
    businessName: 'OK SHOP',
    date: '2,9,24',
    merchantCode: '20500329',
    natureOfBusiness: 'ICE CREAM SHOP',
    ownerDirector: 'U WIN MYINT AUNG',
    nrc: '12/DAGANA(N)025179',
    phone: '0943162010',
    bankAcc: '25630125600550501',
    merchantPortalStatus: 'SAME',
  },
  {
    sheetName: 'Zapp Cashier Merchant List',
    sr: 51,
    businessName: 'U NGWE WIN SHOP',
    date: '7,10,24',
    merchantCode: '20500355',
    natureOfBusiness: 'STORE',
    ownerDirector: 'U NGWE WIN',
    nrc: '12/OUKAMA(N)145700',
    phone: '09405315909',
    bankAcc: '25630125600555801',
    merchantPortalStatus: 'SAME',
  },
  {
    sheetName: 'Zapp Cashier Merchant List',
    sr: 68,
    businessName: 'LINN MYITTAR(2)',
    date: '4,11,24',
    merchantCode: '20500372',
    natureOfBusiness: 'PHARMACY',
    ownerDirector: 'U NAY LIN AUNG',
    nrc: '5/PALANA(N)044074',
    phone: '09459090500',
    bankAcc: '25630106002687201',
    merchantPortalStatus: 'SAME',
  },
  {
    sheetName: 'Zapp Cashier Merchant List',
    sr: 84,
    businessName: 'MOBILE PARAGU',
    date: '3,12,24',
    merchantCode: '20500388',
    natureOfBusiness: 'SHOP',
    ownerDirector: 'DAW EI PHYO THANT',
    nrc: '5/DAPAYA(N)110037',
    phone: '09400448035',
    bankAcc: '11630199943786901',
    merchantPortalStatus: 'SAME',
  },
  {
    sheetName: 'Zapp Cashier Merchant List',
    sr: 130,
    businessName: 'STAR AKARI',
    date: '3.1.25',
    merchantCode: '205003134',
    natureOfBusiness: 'BEAUTY SALON',
    ownerDirector: 'MA SOE SOE',
    nrc: '14/MAAHPA(N)199784',
    phone: '9786610046',
    bankAcc: '13630199951462401',
    merchantPortalStatus: '',
  },
  {
    sheetName: 'Zapp Cashier Merchant List',
    sr: 184,
    businessName: 'PYAE SONE SHIN',
    date: '',
    merchantCode: '205003188',
    natureOfBusiness: 'SHOP',
    ownerDirector: 'THEIN HLA TUN',
    nrc: '14/WAKHAMA(N)171528',
    phone: '09250039494',
    bankAcc: '25630100402805301',
    merchantPortalStatus: '',
  },
  {
    sheetName: 'Zapp Cashier Merchant List',
    sr: 205,
    businessName: 'THAR HTET SAN SHOP',
    date: '',
    merchantCode: '205003209',
    natureOfBusiness: 'SHOP',
    ownerDirector: 'MA THIN THIN OO',
    nrc: '12/TAKANA(N)131701',
    phone: '09427291500',
    bankAcc: '06830106801047201',
    merchantPortalStatus: '',
  },
  {
    sheetName: 'Zapp Cashier Merchant List',
    sr: 9,
    businessName: 'EUGENIA CAFÉ',
    date: '12,8,24',
    merchantCode: '20500313',
    natureOfBusiness: 'FOOD AND BEVERAGE',
    ownerDirector: 'U MYINT SWE MYINT',
    nrc: '10/THAHTANA(N)000214',
    phone: '943200739',
    bankAcc: '23413799903026601',
    merchantPortalStatus: 'SAME',
  },
  {
    sheetName: 'Zapp Cashier Merchant List',
    sr: 26,
    businessName: 'TUN CLINIC',
    date: '2,9,24',
    merchantCode: '20500330',
    natureOfBusiness: 'GENERAL CLINIC',
    ownerDirector: 'DR MIN KO KO',
    nrc: '6/TATHAYA(N)045840',
    phone: '0943030590',
    bankAcc: '27230199940819801',
    merchantPortalStatus: 'SAME',
  },
  {
    sheetName: 'Zapp Cashier Merchant List',
    sr: 52,
    businessName: 'AUNG MYAY COMPUTER SERVICES',
    date: '11,10,24',
    merchantCode: '20500356',
    natureOfBusiness: 'COMPUTER COPY SERVICES',
    ownerDirector: 'U SI THU',
    nrc: '12/OUKATA(N)151066',
    phone: '09420026607',
    bankAcc: '18930118900550002',
    merchantPortalStatus: 'SAME',
  },
  {
    sheetName: 'Zapp Cashier Merchant List',
    sr: 69,
    businessName: 'HLWAN MOE AUNG',
    date: '5,11,24',
    merchantCode: '20500373',
    natureOfBusiness: 'CAR ACCESSORIES SHOP',
    ownerDirector: 'KO HLWAN MOE',
    nrc: '7/KAWANA(N)112469',
    phone: '09793353577',
    bankAcc: '25630118900184101',
    merchantPortalStatus: 'SAME',
  },
  {
    sheetName: 'Zapp Cashier Merchant List',
    sr: 85,
    businessName: 'MOBILE BANK',
    date: '3,12,24',
    merchantCode: '20500389',
    natureOfBusiness: 'SHOP',
    ownerDirector: 'HAN TUN AUNG',
    nrc: '14/LAPATA(N)115995',
    phone: '095194148',
    bankAcc: '27730127700116401',
    merchantPortalStatus: 'SAME',
  },

  // Sheet 2: Zapp Partner (ZC to ZP Merchant List)
  {
    sheetName: 'Zapp Partner (ZC to ZP Merchant List)',
    sr: 1,
    businessName: 'SHWE MANDALAR STORE',
    date: '15,8,24',
    merchantCode: '20600101',
    natureOfBusiness: 'GROCERY & MINI MART',
    ownerDirector: 'DAW HNIN WAI',
    nrc: '9/MAHAMA(N)089234',
    phone: '092019482',
    bankAcc: '10230199928341901',
    merchantPortalStatus: 'MIGRATED',
  },
  {
    sheetName: 'Zapp Partner (ZC to ZP Merchant List)',
    sr: 2,
    businessName: 'EVER GREEN TEA & RESTAURANT',
    date: '20,8,24',
    merchantCode: '20600102',
    natureOfBusiness: 'FOOD AND BEVERAGE',
    ownerDirector: 'U KYAW ZIN LAT',
    nrc: '12/YAKANA(N)184029',
    phone: '09450099231',
    bankAcc: '25630112984012001',
    merchantPortalStatus: 'ACTIVE',
  },
  {
    sheetName: 'Zapp Partner (ZC to ZP Merchant List)',
    sr: 3,
    businessName: 'ROYAL PHARMACY & HEALTHCARE',
    date: '02,9,24',
    merchantCode: '20600103',
    natureOfBusiness: 'PHARMACY',
    ownerDirector: 'DAW MOE MOE SAN',
    nrc: '5/KATHANA(N)052194',
    phone: '09798012345',
    bankAcc: '13630199920194801',
    merchantPortalStatus: 'ACTIVE',
  },
  {
    sheetName: 'Zapp Partner (ZC to ZP Merchant List)',
    sr: 4,
    businessName: 'GOLDEN CITY ELECTRONICS',
    date: '10,9,24',
    merchantCode: '20600104',
    natureOfBusiness: 'ELECTRONICS SHOP',
    ownerDirector: 'U THEIN ZAW OO',
    nrc: '7/THAKANA(N)194820',
    phone: '09420088192',
    bankAcc: '23210199939281702',
    merchantPortalStatus: 'ACTIVE',
  },

  // Sheet 3: Zapp Partner (H2P Merchant List)
  {
    sheetName: 'Zapp Partner (H2P Merchant List)',
    sr: 101,
    businessName: 'YANGON BAKERY & SWEETS',
    date: '05,10,24',
    merchantCode: '20700201',
    natureOfBusiness: 'BAKERY & CAFE',
    ownerDirector: 'DAW THIDA AUNG',
    nrc: '12/KAMAYA(N)078123',
    phone: '09440192837',
    bankAcc: '25630109981273901',
    merchantPortalStatus: 'APPROVED',
  },
  {
    sheetName: 'Zapp Partner (H2P Merchant List)',
    sr: 102,
    businessName: 'SMART MOBILE & GADGETS',
    date: '12,10,24',
    merchantCode: '20700202',
    natureOfBusiness: 'MOBILE SALES & SERVICE',
    ownerDirector: 'KO ZAW MIN HTET',
    nrc: '9/NATHANA(N)145028',
    phone: '09789123049',
    bankAcc: '06830106802938401',
    merchantPortalStatus: 'APPROVED',
  },
  {
    sheetName: 'Zapp Partner (H2P Merchant List)',
    sr: 103,
    businessName: 'SEIN GAY HAR CLOTHING',
    date: '18,10,24',
    merchantCode: '20700203',
    natureOfBusiness: 'FASHION & APPAREL',
    ownerDirector: 'DAW CHO CHO WIN',
    nrc: '14/DANAPA(N)093847',
    phone: '09251829384',
    bankAcc: '27730127709384701',
    merchantPortalStatus: 'APPROVED',
  },

  // Sheet 4: Thuriya Tun Tauk (Merchant List)
  {
    sheetName: 'Thuriya Tun Tauk (Merchant List)',
    sr: 301,
    businessName: 'THURIYA TUN TAUK PETROL & LUBE',
    date: '01,11,24',
    merchantCode: '20800301',
    natureOfBusiness: 'FUEL STATION',
    ownerDirector: 'U TUN TAUK NAING',
    nrc: '12/AHLANA(N)049182',
    phone: '095018293',
    bankAcc: '23413799918273601',
    merchantPortalStatus: 'ACTIVE',
  },
  {
    sheetName: 'Thuriya Tun Tauk (Merchant List)',
    sr: 302,
    businessName: 'THURIYA AGRI MACHINERY',
    date: '15,11,24',
    merchantCode: '20800302',
    natureOfBusiness: 'AGRICULTURAL MACHINERY',
    ownerDirector: 'U SEIN THURA',
    nrc: '5/SAKANA(N)182736',
    phone: '0943019284',
    bankAcc: '25630125609384702',
    merchantPortalStatus: 'ACTIVE',
  },
  {
    sheetName: 'Thuriya Tun Tauk (Merchant List)',
    sr: 303,
    businessName: 'THURIYA EXPRESS LOGISTICS',
    date: '28,11,24',
    merchantCode: '20800303',
    natureOfBusiness: 'LOGISTICS & CARGO',
    ownerDirector: 'DAW NAN MOE KHAM',
    nrc: '13/TAYANA(N)201948',
    phone: '09791029384',
    bankAcc: '18930118909384701',
    merchantPortalStatus: 'ACTIVE',
  },
];

const sampleTownships = ['Hlaing', 'Kamayut', 'Bahan', 'Kyauktada', 'Sanchaung', 'Dagon', 'Mayangone', 'Tamwe'];
const sampleWards = ['Ward (1)', 'Ward (2)', 'Ward (3)', 'Ward (4)', 'Ward (5)', 'Ward (10)', 'Ward (12)'];
const sampleFathers = ['U MYINT THEIN', 'U AUNG MYO', 'U TIN TUN', 'U KYAW LWIN', 'U WIN TIN', 'U SAN LWIN'];
const sampleDobs = ['15/04/1985', '22/08/1990', '03/11/1982', '19/01/1995', '30/06/1988', '12/12/1979'];
const sampleLicenses = ['Municipal Trade License (YCDC)', 'Company Registration (DICA)', 'SME Registration Card', 'Shop License'];

export function buildMerchantRecord(raw: RawMerchant, index: number): MerchantRecord {
  const computedRow = typeof raw.sr === 'number' ? raw.sr + 1 : index + 2;
  const owner = (raw.ownerDirector || raw.legalPersonalName || '').trim();
  const isFemale = owner.toUpperCase().startsWith('DAW');
  const gender = raw.gender || (isFemale ? 'Female' : 'Male');
  const township = raw.township || sampleTownships[index % sampleTownships.length];
  const ward = raw.ward || sampleWards[(index * 2) % sampleWards.length];
  const fatherName = raw.fatherName || sampleFathers[index % sampleFathers.length];
  const dob = raw.dateOfBirth || sampleDobs[index % sampleDobs.length];
  const license = raw.businessLicenseTypes || sampleLicenses[index % sampleLicenses.length];
  const openDate = raw.openDate || raw.date || '01/08/2024';
  const address = raw.detailAddress || `No. (${(index + 1) * 12}), Bogyoke Road, ${ward}, ${township}, Yangon`;

  return {
    id: `m-${index + 1}-${raw.merchantCode || Math.random().toString(36).substring(2, 7)}`,
    sheetName: raw.sheetName || 'Default Sheet',
    rowNumber: computedRow,
    sr: raw.sr ?? index + 1,
    openDate: openDate,
    businessName: (raw.businessName || '').trim(),
    phone: (raw.phone || '').trim(),
    normalizedPhone: normalizePhone(raw.phone || ''),
    legalPersonalName: raw.legalPersonalName || owner,
    nrc: (raw.nrc || '').trim(),
    nrcLast6: extractNrcLast6(raw.nrc || ''),
    fatherName: fatherName,
    dateOfBirth: dob,
    gender: gender,
    bankAcc: (raw.bankAcc || '').trim(),
    businessLicenseTypes: license,
    natureOfBusiness: (raw.natureOfBusiness || '').trim(),
    detailAddress: address,
    ward: ward,
    township: township,
    date: (raw.date || openDate).trim(),
    merchantCode: (raw.merchantCode || '').trim(),
    ownerDirector: owner,
    merchantPortalStatus: (raw.merchantPortalStatus || '').trim(),
  };
}

export const initialMerchants: MerchantRecord[] = rawList.map((r, i) => buildMerchantRecord(r, i));
