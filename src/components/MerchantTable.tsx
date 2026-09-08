import React, { useState } from 'react';
import { MerchantRecord } from '../types';
import { formatNrcParts } from '../utils/searchHelper';
import { Copy, Check, Eye, Phone, Store, CreditCard, ChevronRight, FileSpreadsheet } from 'lucide-react';

interface MerchantTableProps {
  merchants: MerchantRecord[];
  onSelectMerchant: (merchant: MerchantRecord) => void;
  activeNrcSearch?: string;
  activePhoneSearch?: string;
  activeBusinessSearch?: string;
}

export const MerchantTable: React.FC<MerchantTableProps> = ({
  merchants,
  onSelectMerchant,
  activeNrcSearch = '',
  activePhoneSearch = '',
  activeBusinessSearch = '',
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyText = (e: React.MouseEvent, text: string, key: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Highlight matching substring
  const renderHighlighted = (text: string, query: string) => {
    if (!text) return '-';
    if (!query.trim()) return text;
    const q = query.trim().toLowerCase();
    const idx = text.toLowerCase().indexOf(q);
    if (idx === -1) return text;

    const before = text.slice(0, idx);
    const match = text.slice(idx, idx + q.length);
    const after = text.slice(idx + q.length);

    return (
      <>
        {before}
        <mark className="bg-amber-200 text-amber-950 font-bold px-0.5 rounded-xs">{match}</mark>
        {after}
      </>
    );
  };

  if (merchants.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-xs">
        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
          <Store className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-gray-800 mb-1">
          No matching merchant records found
        </h3>
        <p className="text-xs text-gray-500 max-w-md mx-auto mb-4">
          Try adjusting your Business Name, NRC last 6 digits, or Merchant Mobile Number filters.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50/90 border-b border-gray-200 text-[11px] font-bold text-gray-600 uppercase tracking-wider">
              <th className="py-3 px-3 w-12 text-center">SR</th>
              <th className="py-3 px-4 min-w-[190px]">BUSINESS NAME</th>
              <th className="py-3 px-4 min-w-[180px]">
                <div className="flex items-center gap-1 text-emerald-800">
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>NRC (LAST 6 DIGITS)</span>
                </div>
              </th>
              <th className="py-3 px-4 min-w-[190px]">
                <div className="flex items-center gap-1 text-emerald-800">
                  <Phone className="w-3.5 h-3.5" />
                  <span>MERCHANT MOBILE NUMBER</span>
                </div>
              </th>
              <th className="py-3 px-4 min-w-[210px] bg-emerald-50/40">
                <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                  <span>SHEET NAME & SR NO</span>
                </div>
              </th>
              <th className="py-3 px-3 min-w-[110px]">CODE</th>
              <th className="py-3 px-4 min-w-[150px]">OWNER / DIRECTOR</th>
              <th className="py-3 px-4 min-w-[150px]">NATURE OF BUSINESS</th>
              <th className="py-3 px-3 text-right w-16">VIEW</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-sans">
            {merchants.map((m, idx) => {
              const nrcParts = formatNrcParts(m.nrc);
              const isNrcMatch =
                activeNrcSearch &&
                m.nrcLast6.toLowerCase().includes(activeNrcSearch.trim().toLowerCase());
              const srDisplay = m.sr ?? idx + 1;

              return (
                <tr
                  key={m.id}
                  onClick={() => onSelectMerchant(m)}
                  className="hover:bg-emerald-50/40 transition-colors cursor-pointer group"
                >
                  {/* SR */}
                  <td className="py-3 px-3 text-center text-gray-500 font-mono text-[11px]">
                    {m.sr ?? idx + 1}
                  </td>

                  {/* Business Name */}
                  <td className="py-3 px-4 font-semibold text-gray-900">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 text-xs font-bold">
                        {(m.businessName || 'S').charAt(0).toUpperCase()}
                      </div>
                      <span className="truncate max-w-[220px]">
                        {renderHighlighted(m.businessName, activeBusinessSearch)}
                      </span>
                    </div>
                  </td>

                  {/* NRC with Highlighted Last 6 Digits */}
                  <td className="py-3 px-4 font-mono text-gray-800">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {nrcParts.last6 ? (
                        <div className="flex items-baseline">
                          <span className="text-gray-500 text-[11px]">{nrcParts.prefix}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded font-bold text-xs tracking-wider border ${
                              isNrcMatch
                                ? 'bg-amber-300 text-amber-950 border-amber-400 ring-2 ring-amber-400/40'
                                : 'bg-emerald-100/90 text-emerald-900 border-emerald-300/80'
                            }`}
                            title="NRC Last 6 Digits (မှတ်ပုံတင် နောက် ၆ လုံး)"
                          >
                            {nrcParts.last6}
                          </span>
                        </div>
                      ) : (
                        <span>{m.nrc || '-'}</span>
                      )}

                      {m.nrc && (
                        <button
                          onClick={(e) => copyText(e, m.nrc, `nrc-${m.id}`)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-emerald-700 transition-opacity rounded hover:bg-gray-100"
                          title="Copy NRC"
                        >
                          {copiedKey === `nrc-${m.id}` ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      )}
                    </div>
                  </td>

                  {/* Phone */}
                  <td className="py-3 px-4 font-mono text-gray-900">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold">
                        {renderHighlighted(m.phone, activePhoneSearch)}
                      </span>
                      {m.phone && (
                        <button
                          onClick={(e) => copyText(e, m.phone, `phone-${m.id}`)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-emerald-700 transition-opacity rounded hover:bg-gray-100"
                          title="Copy Merchant Mobile Number"
                        >
                          {copiedKey === `phone-${m.id}` ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      )}
                    </div>
                  </td>

                  {/* Sheet Name & SR No */}
                  <td className="py-3 px-4 bg-emerald-50/20">
                    <div className="flex flex-col gap-1 items-start">
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100/80 text-emerald-900 border border-emerald-200 max-w-[210px] truncate"
                        title={`Sheet: ${m.sheetName}`}
                      >
                        <FileSpreadsheet className="w-3 h-3 text-emerald-700 shrink-0" />
                        <span className="truncate">{m.sheetName}</span>
                      </span>
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded font-mono font-bold text-[11px] bg-amber-100 text-amber-950 border border-amber-300 shadow-2xs"
                        title={`SR Number: ${srDisplay}`}
                      >
                        SR #{srDisplay}
                      </span>
                    </div>
                  </td>

                  {/* Merchant Code */}
                  <td className="py-3 px-3 font-mono text-gray-600 text-[11px]">
                    {m.merchantCode || '-'}
                  </td>

                  {/* Owner / Director */}
                  <td className="py-3 px-4 text-gray-700">
                    <span className="truncate block max-w-[150px]">{m.ownerDirector || '-'}</span>
                  </td>

                  {/* Nature of Business */}
                  <td className="py-3 px-4 text-gray-600">
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-700 border border-gray-200">
                      {m.natureOfBusiness || 'General'}
                    </span>
                  </td>

                  {/* Action View */}
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectMerchant(m);
                      }}
                      className="p-1.5 text-gray-400 group-hover:text-emerald-700 hover:bg-emerald-100 rounded-md transition-colors cursor-pointer"
                      title="View full merchant details"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      <div className="bg-gray-50/80 px-4 py-2.5 border-t border-gray-200 text-xs text-gray-500 flex items-center justify-between">
        <span>Showing {merchants.length} records</span>
        <span className="text-[11px] text-gray-400">Click any row to view complete KYC details</span>
      </div>
    </div>
  );
};
