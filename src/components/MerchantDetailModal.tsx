import React, { useState } from 'react';
import { MerchantRecord } from '../types';
import { formatNrcParts } from '../utils/searchHelper';
import { X, Copy, Check, Phone, Store, User, CreditCard, Building2, Calendar, FileSpreadsheet, ShieldCheck } from 'lucide-react';

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200"
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
        <div className="p-6 space-y-4 max-h-[78vh] overflow-y-auto">
          {/* Spreadsheet Source Location Banner */}
          <div className="bg-amber-50/80 border border-amber-200/90 rounded-xl p-3.5 flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center shrink-0 border border-amber-200">
                <FileSpreadsheet className="w-5 h-5 text-amber-800" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                  Spreadsheet Location (Sheet & SR)
                </span>
                <span className="text-xs font-bold text-slate-900">
                  Sheet: <span className="text-emerald-800 font-semibold">{merchant.sheetName}</span>
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="px-3 py-1 rounded-lg font-mono font-black text-xs bg-amber-200/90 text-amber-950 border border-amber-300 shadow-2xs">
                SR #{srDisplay}
              </span>
            </div>
          </div>
          {/* Key Identification Cards: NRC & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* NRC Box */}
            <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3.5 space-y-1 relative">
              <div className="flex items-center justify-between text-xs font-semibold text-emerald-900">
                <span className="flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-700" />
                  <span>NRC NUMBER</span>
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
            <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3.5 space-y-1 relative">
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

          {/* Details Table */}
          <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 overflow-hidden text-sm">
            {/* Owner / Director */}
            <div className="flex items-center justify-between p-3 bg-white">
              <span className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-gray-400" />
                OWNER / DIRECTOR
              </span>
              <span className="font-semibold text-gray-900 text-right">{merchant.ownerDirector || '-'}</span>
            </div>

            {/* Merchant Code */}
            <div className="flex items-center justify-between p-3 bg-gray-50/60">
              <span className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-gray-400" />
                MERCHANT CODE
              </span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-gray-800">{merchant.merchantCode || '-'}</span>
                {merchant.merchantCode && (
                  <button
                    onClick={() => copyToClipboard(merchant.merchantCode, 'code')}
                    className="p-1 text-gray-400 hover:text-gray-700 cursor-pointer"
                  >
                    {copiedKey === 'code' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  </button>
                )}
              </div>
            </div>

            {/* Nature of Business */}
            <div className="flex items-center justify-between p-3 bg-white">
              <span className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-gray-400" />
                NATURE OF BUSINESS
              </span>
              <span className="font-medium text-gray-800 text-right">{merchant.natureOfBusiness || '-'}</span>
            </div>

            {/* Bank Account */}
            <div className="flex items-center justify-between p-3 bg-gray-50/60">
              <span className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-gray-400" />
                BANK ACC
              </span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-medium text-gray-800 text-xs sm:text-sm">{merchant.bankAcc || '-'}</span>
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

            {/* SR & Date */}
            <div className="flex items-center justify-between p-3 bg-white">
              <span className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                SR / REGISTRATION DATE
              </span>
              <span className="text-xs text-gray-700">
                SR #{merchant.sr ?? '-'} {merchant.date ? `• Date: ${merchant.date}` : ''}
              </span>
            </div>
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
