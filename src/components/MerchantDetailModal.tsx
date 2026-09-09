import React, { useState } from 'react';
import { MerchantRecord } from '../types';
import { formatNrcParts } from '../utils/searchHelper';
import {
  X,
  Copy,
  Check,
  Phone,
  Store,
  User,
  CreditCard,
  Building2,
  Calendar,
  FileSpreadsheet,
  ShieldCheck,
  MapPin,
  Building,
  FileCheck,
} from 'lucide-react';

interface MerchantDetailModalProps {
  merchant: MerchantRecord | null;
  onClose: () => void;
}

export const MerchantDetailModal: React.FC<MerchantDetailModalProps> = ({ merchant, onClose }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!merchant) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const nrcParts = formatNrcParts(merchant.nrc);
  const srDisplay = merchant.sr !== undefined ? merchant.sr : '-';
  const openDateDisplay = merchant.openDate || merchant.date || '-';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="bg-emerald-800 text-white px-6 py-4 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 bg-emerald-700 text-emerald-100 rounded-full inline-flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Sheet: {merchant.sheetName}
              </span>
              <span className="text-[11px] font-bold px-2.5 py-0.5 bg-amber-400 text-amber-950 rounded-full inline-flex items-center gap-1">
                SR #{srDisplay}
              </span>
              {merchant.merchantPortalStatus && (
                <span className="text-[11px] font-semibold px-2 py-0.5 bg-emerald-900/80 text-emerald-200 rounded-full">
                  {merchant.merchantPortalStatus}
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <Store className="w-5 h-5 text-emerald-300 shrink-0" />
              <span>{merchant.businessName || 'Unnamed Business'}</span>
            </h2>
          </div>
          <button
            id="btn-close-merchant-modal"
            onClick={onClose}
            className="p-1 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-700/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Key Identification Cards: NRC & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* NRC Box */}
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 space-y-1 relative">
              <div className="flex items-center justify-between text-xs font-semibold text-emerald-900">
                <span className="flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-700" />
                  <span>NRC / PASSPORT NO</span>
                </span>
                <button
                  onClick={() => copyToClipboard(merchant.nrc, 'nrc')}
                  className="p-1 text-emerald-700 hover:text-emerald-900 rounded hover:bg-emerald-100 cursor-pointer"
                  title="Copy full NRC"
                >
                  {copiedKey === 'nrc' ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="pt-1">
                {nrcParts.last6 ? (
                  <div className="flex items-baseline flex-wrap gap-1 font-mono text-sm">
                    <span className="text-gray-700">{nrcParts.prefix}</span>
                    <span className="bg-emerald-700 text-white px-1.5 py-0.5 rounded font-bold text-xs tracking-wider shadow-xs">
                      {nrcParts.last6}
                    </span>
                  </div>
                ) : (
                  <p className="font-mono text-sm font-semibold text-gray-800">{merchant.nrc || '-'}</p>
                )}
                {merchant.nrcLast6 && (
                  <p className="text-[11px] text-emerald-800 font-medium mt-1">
                    Last 6 Digits: <strong className="font-mono text-emerald-900">{merchant.nrcLast6}</strong>
                  </p>
                )}
              </div>
            </div>

            {/* Merchant Mobile Number Box */}
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 space-y-1 relative">
              <div className="flex items-center justify-between text-xs font-semibold text-emerald-900">
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-emerald-700" />
                  <span>MERCHANT MOBILE NUMBER</span>
                </span>
                <button
                  onClick={() => copyToClipboard(merchant.phone, 'phone')}
                  className="p-1 text-emerald-700 hover:text-emerald-900 rounded hover:bg-emerald-100 cursor-pointer"
                  title="Copy Merchant Mobile Number"
                >
                  {copiedKey === 'phone' ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="pt-1">
                <p className="font-mono text-base font-bold text-gray-900">{merchant.phone || '-'}</p>
                {merchant.phone && (
                  <a
                    href={`tel:${merchant.phone}`}
                    className="inline-flex items-center gap-1 text-[11px] text-emerald-700 hover:text-emerald-900 font-medium hover:underline mt-1"
                  >
                    <Phone className="w-3 h-3" /> Direct Call
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* 14 Columns Full KYC Profile */}
          <div className="rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100 text-xs">
            {/* Section 1: Business Profile */}
            <div className="bg-gray-100/70 px-3.5 py-2 font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-emerald-700" />
              <span>Business Profile</span>
            </div>

            {/* OPEN DATE */}
            <div className="flex items-center justify-between p-3 bg-white">
              <span className="font-medium text-gray-500 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                OPEN DATE
              </span>
              <span className="font-mono font-bold text-gray-900">{openDateDisplay}</span>
            </div>

            {/* MERCHANT BUSINESS NAME */}
            <div className="flex items-center justify-between p-3 bg-gray-50/50">
              <span className="font-medium text-gray-500 flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-gray-400" />
                MERCHANT BUSINESS NAME
              </span>
              <span className="font-bold text-emerald-950 text-right">{merchant.businessName || '-'}</span>
            </div>

            {/* NATURE OF BUSINESS */}
            <div className="flex items-center justify-between p-3 bg-white">
              <span className="font-medium text-gray-500 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-gray-400" />
                NATURE OF BUSINESS
              </span>
              <span className="font-medium text-gray-800 text-right">{merchant.natureOfBusiness || '-'}</span>
            </div>

            {/* Business License Types */}
            <div className="flex items-center justify-between p-3 bg-gray-50/50">
              <span className="font-medium text-gray-500 flex items-center gap-1.5">
                <FileCheck className="w-3.5 h-3.5 text-gray-400" />
                BUSINESS LICENSE TYPES
              </span>
              <span className="font-medium text-gray-800 text-right">{merchant.businessLicenseTypes || '-'}</span>
            </div>

            {/* Section 2: Personal KYC Details */}
            <div className="bg-gray-100/70 px-3.5 py-2 font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-700" />
              <span>Personal & Owner KYC Details</span>
            </div>

            {/* LEGAL PERSONAL NAME */}
            <div className="flex items-center justify-between p-3 bg-white">
              <span className="font-medium text-gray-500 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-gray-400" />
                LEGAL PERSONAL NAME
              </span>
              <span className="font-bold text-gray-900 text-right">
                {merchant.legalPersonalName || merchant.ownerDirector || '-'}
              </span>
            </div>

            {/* FATHER NAME */}
            <div className="flex items-center justify-between p-3 bg-gray-50/50">
              <span className="font-medium text-gray-500 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-gray-400" />
                FATHER NAME
              </span>
              <span className="font-semibold text-gray-800 text-right">{merchant.fatherName || '-'}</span>
            </div>

            {/* DATE OF BIRTH & GENDER */}
            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-100 bg-white">
              <div className="flex items-center justify-between p-3">
                <span className="font-medium text-gray-500 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  DATE OF BIRTH
                </span>
                <span className="font-mono font-semibold text-gray-900">{merchant.dateOfBirth || '-'}</span>
              </div>
              <div className="flex items-center justify-between p-3">
                <span className="font-medium text-gray-500">GENDER</span>
                <span className="font-semibold text-gray-900">{merchant.gender || '-'}</span>
              </div>
            </div>

            {/* Section 3: Financial & Location */}
            <div className="bg-gray-100/70 px-3.5 py-2 font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-emerald-700" />
              <span>Banking & Location Details</span>
            </div>

            {/* BANK ACC NO */}
            <div className="flex items-center justify-between p-3 bg-white">
              <span className="font-medium text-gray-500 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-gray-400" />
                BANK ACC NO
              </span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-gray-900 text-xs sm:text-sm">{merchant.bankAcc || '-'}</span>
                {merchant.bankAcc && (
                  <button
                    onClick={() => copyToClipboard(merchant.bankAcc, 'bank')}
                    className="p-1 text-gray-400 hover:text-gray-700 cursor-pointer"
                  >
                    {copiedKey === 'bank' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  </button>
                )}
              </div>
            </div>

            {/* TOWNSHIP & WARD */}
            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-100 bg-gray-50/50">
              <div className="flex items-center justify-between p-3">
                <span className="font-medium text-gray-500 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-emerald-600" />
                  TOWNSHIP
                </span>
                <span className="font-bold text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded">
                  {merchant.township || '-'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3">
                <span className="font-medium text-gray-500 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-600" />
                  WARD
                </span>
                <span className="font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded">
                  {merchant.ward || '-'}
                </span>
              </div>
            </div>

            {/* BUSINESS / COMPANY DETAIL ADDRESS */}
            <div className="p-3 bg-white space-y-1">
              <span className="font-medium text-gray-500 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                BUSINESS / COMPANY DETAIL ADDRESS
              </span>
              <p className="text-gray-800 font-medium pl-5">{merchant.detailAddress || '-'}</p>
            </div>

            {/* MERCHANT CODE & SYSTEM ID */}
            {merchant.merchantCode && (
              <div className="flex items-center justify-between p-3 bg-gray-50/50">
                <span className="font-medium text-gray-500 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-gray-400" />
                  MERCHANT CODE
                </span>
                <span className="font-mono font-bold text-gray-800">{merchant.merchantCode}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 flex items-center justify-between">
          <span className="text-[11px] text-gray-400 font-mono">ID: {merchant.id}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
