import React, { useState, useMemo } from 'react';
import { MerchantRecord } from '../types';
import { formatNrcParts } from '../utils/searchHelper';
import {
  Copy,
  Check,
  Phone,
  Store,
  CreditCard,
  ChevronRight,
  ChevronDown,
  FileSpreadsheet,
  Calendar,
  User,
  MapPin,
  Building,
  Briefcase,
  FileCheck,
} from 'lucide-react';

interface MerchantTableProps {
  merchants: MerchantRecord[];
  onSelectMerchant: (merchant: MerchantRecord) => void;
  activeNrcSearch?: string;
  activePhoneSearch?: string;
  activeBusinessSearch?: string;
  groupBy?: 'none' | 'township' | 'ward' | 'sheet';
}

export const MerchantTable: React.FC<MerchantTableProps> = ({
  merchants,
  onSelectMerchant,
  activeNrcSearch = '',
  activePhoneSearch = '',
  activeBusinessSearch = '',
  groupBy = 'none',
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (groupKey: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  const copyText = (e: React.MouseEvent, text: string, key: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Highlight matching substring
  const renderHighlighted = (text: string | undefined, query: string) => {
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

  // Grouping logic
  const groupedData = useMemo(() => {
    if (!groupBy || groupBy === 'none') {
      return [{ groupKey: 'all', title: 'All Records', records: merchants }];
    }

    const map = new Map<string, MerchantRecord[]>();

    merchants.forEach((m) => {
      let key = 'Unspecified';
      if (groupBy === 'township') {
        key = m.township?.trim() || 'Unspecified Township';
      } else if (groupBy === 'ward') {
        key = m.ward?.trim() || 'Unspecified Ward';
      } else if (groupBy === 'sheet') {
        key = m.sheetName?.trim() || 'Default Sheet';
      }

      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(m);
    });

    return Array.from(map.entries()).map(([key, records]) => ({
      groupKey: key,
      title: key,
      records,
    }));
  }, [merchants, groupBy]);

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
          Try adjusting your Business Name, NRC last 6 digits, Merchant Mobile Number, Township, or Ward filters.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
      {/* Table Action Bar */}
      <div className="bg-gray-50/90 px-4 py-2.5 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-gray-700">
          <span className="font-semibold text-gray-900">Total Displayed:</span>
          <span className="bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-full font-bold">
            {merchants.length} Records
          </span>
          {groupBy !== 'none' && (
            <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full font-medium">
              Grouped by {groupBy.toUpperCase()} ({groupedData.length} groups)
            </span>
          )}
        </div>
        <div className="text-[11px] text-gray-500">
          Scroll horizontally ➔ to view all 14 requested columns • Click any row for full KYC details
        </div>
      </div>

      <div className="overflow-x-auto max-w-full">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-gray-100/90 border-b border-gray-200 text-[11px] font-bold text-gray-700 uppercase tracking-wider sticky top-0 z-10 whitespace-nowrap">
              <th className="py-3 px-3 w-12 text-center bg-gray-100">SR</th>
              <th className="py-3 px-3 min-w-[110px]">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-gray-500" />
                  <span>OPEN DATE</span>
                </div>
              </th>
              <th className="py-3 px-4 min-w-[200px]">
                <div className="flex items-center gap-1 text-emerald-900 font-bold">
                  <Store className="w-3.5 h-3.5 text-emerald-700" />
                  <span>MERCHANT BUSINESS NAME</span>
                </div>
              </th>
              <th className="py-3 px-4 min-w-[180px]">
                <div className="flex items-center gap-1 text-emerald-900 font-bold">
                  <Phone className="w-3.5 h-3.5 text-emerald-700" />
                  <span>MERCHANT MOBILE NUMBER</span>
                </div>
              </th>
              <th className="py-3 px-4 min-w-[170px]">
                <div className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-gray-500" />
                  <span>LEGAL PERSONAL NAME</span>
                </div>
              </th>
              <th className="py-3 px-4 min-w-[190px]">
                <div className="flex items-center gap-1 text-emerald-900 font-bold">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-700" />
                  <span>NRC / PASSPORT NO</span>
                </div>
              </th>
              <th className="py-3 px-4 min-w-[150px]">FATHER NAME</th>
              <th className="py-3 px-3 min-w-[120px]">DATE OF BIRTH</th>
              <th className="py-3 px-3 min-w-[90px]">GENDER</th>
              <th className="py-3 px-4 min-w-[180px]">
                <div className="flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5 text-gray-500" />
                  <span>BANK ACC NO</span>
                </div>
              </th>
              <th className="py-3 px-4 min-w-[180px]">
                <div className="flex items-center gap-1">
                  <FileCheck className="w-3.5 h-3.5 text-gray-500" />
                  <span>BUSINESS LICENSE TYPES</span>
                </div>
              </th>
              <th className="py-3 px-4 min-w-[160px]">
                <div className="flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5 text-gray-500" />
                  <span>NATURE OF BUSINESS</span>
                </div>
              </th>
              <th className="py-3 px-4 min-w-[240px]">
                <div className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-gray-500" />
                  <span>BUSINESS / COMPANY DETAIL ADDRESS</span>
                </div>
              </th>
              <th className="py-3 px-3 min-w-[120px] bg-amber-50/50">
                <div className="flex items-center gap-1 text-amber-900 font-bold">
                  <MapPin className="w-3.5 h-3.5 text-amber-700" />
                  <span>WARD</span>
                </div>
              </th>
              <th className="py-3 px-3 min-w-[130px] bg-emerald-50/50">
                <div className="flex items-center gap-1 text-emerald-900 font-bold">
                  <Building className="w-3.5 h-3.5 text-emerald-700" />
                  <span>TOWNSHIP</span>
                </div>
              </th>
              <th className="py-3 px-3 min-w-[150px] bg-gray-50">SHEET SOURCE</th>
              <th className="py-3 px-3 text-right w-16 sticky right-0 bg-gray-100 shadow-xs">VIEW</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-sans">
            {groupedData.map((group) => {
              const isCollapsed = Boolean(collapsedGroups[group.groupKey]);
              const showGroupHeader = groupBy !== 'none';

              return (
                <React.Fragment key={group.groupKey}>
                  {/* Group Header Row */}
                  {showGroupHeader && (
                    <tr
                      onClick={() => toggleGroup(group.groupKey)}
                      className="bg-emerald-50/70 hover:bg-emerald-100/70 cursor-pointer border-t border-b border-emerald-200 transition-colors"
                    >
                      <td colSpan={17} className="py-2.5 px-4 font-bold text-emerald-950 text-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {isCollapsed ? (
                              <ChevronRight className="w-4 h-4 text-emerald-700" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-emerald-700" />
                            )}
                            <span className="uppercase tracking-wide">
                              {groupBy.toUpperCase()}: {group.title}
                            </span>
                            <span className="bg-emerald-200 text-emerald-900 text-[11px] font-mono px-2 py-0.5 rounded-full">
                              {group.records.length} records
                            </span>
                          </div>
                          <span className="text-[11px] font-normal text-emerald-800">
                            {isCollapsed ? 'Click to expand' : 'Click to collapse'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* Merchant Rows */}
                  {!isCollapsed &&
                    group.records.map((m, idx) => {
                      const nrcParts = formatNrcParts(m.nrc);
                      const isNrcMatch =
                        activeNrcSearch &&
                        m.nrcLast6.toLowerCase().includes(activeNrcSearch.trim().toLowerCase());
                      const srDisplay = m.sr ?? idx + 1;
                      const openDateDisplay = m.openDate || m.date || '-';

                      return (
                        <tr
                          key={m.id}
                          onClick={() => onSelectMerchant(m)}
                          className="hover:bg-emerald-50/40 transition-colors cursor-pointer group"
                        >
                          {/* 1. SR */}
                          <td className="py-3 px-3 text-center text-gray-500 font-mono text-[11px] bg-gray-50/40">
                            {srDisplay}
                          </td>

                          {/* 2. OPEN DATE */}
                          <td className="py-3 px-3 text-gray-700 font-mono whitespace-nowrap text-[11px]">
                            {openDateDisplay}
                          </td>

                          {/* 3. MERCHANT BUSINESS NAME */}
                          <td className="py-3 px-4 font-semibold text-gray-900">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 text-xs font-bold">
                                {(m.businessName || 'S').charAt(0).toUpperCase()}
                              </div>
                              <span className="font-bold text-gray-900 max-w-[240px] truncate">
                                {renderHighlighted(m.businessName, activeBusinessSearch)}
                              </span>
                            </div>
                          </td>

                          {/* 4. MERCHANT MOBILE NUMBER */}
                          <td className="py-3 px-4 font-mono text-gray-900 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-emerald-950">
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

                          {/* 5. LEGAL PERSONAL NAME */}
                          <td className="py-3 px-4 text-gray-800 font-medium whitespace-nowrap">
                            {m.legalPersonalName || m.ownerDirector || '-'}
                          </td>

                          {/* 6. NRC / PASSPORT NO (Highlight Last 6 Digits) */}
                          <td className="py-3 px-4 font-mono text-gray-800 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
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

                          {/* 7. FATHER NAME */}
                          <td className="py-3 px-4 text-gray-700 whitespace-nowrap">
                            {m.fatherName || '-'}
                          </td>

                          {/* 8. DATE OF BIRTH */}
                          <td className="py-3 px-3 text-gray-600 font-mono whitespace-nowrap text-[11px]">
                            {m.dateOfBirth || '-'}
                          </td>

                          {/* 9. GENDER */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            {m.gender ? (
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                  m.gender.toLowerCase() === 'female'
                                    ? 'bg-pink-100 text-pink-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}
                              >
                                {m.gender}
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>

                          {/* 10. BANK ACC NO */}
                          <td className="py-3 px-4 font-mono text-gray-800 whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <span>{m.bankAcc || '-'}</span>
                              {m.bankAcc && (
                                <button
                                  onClick={(e) => copyText(e, m.bankAcc, `bank-${m.id}`)}
                                  className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-emerald-700 transition-opacity rounded hover:bg-gray-100"
                                  title="Copy Bank Account"
                                >
                                  {copiedKey === `bank-${m.id}` ? (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              )}
                            </div>
                          </td>

                          {/* 11. Business License Types */}
                          <td className="py-3 px-4 text-gray-700 whitespace-nowrap">
                            {m.businessLicenseTypes ? (
                              <span className="inline-block px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-[10px] font-medium border border-gray-200">
                                {m.businessLicenseTypes}
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>

                          {/* 12. NATURE OF BUSINESS */}
                          <td className="py-3 px-4 text-gray-600 whitespace-nowrap">
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                              {m.natureOfBusiness || 'General'}
                            </span>
                          </td>

                          {/* 13. BUSINESS / COMPANY DETAIL ADDRESS */}
                          <td className="py-3 px-4 text-gray-700 max-w-[280px]">
                            <span className="truncate block" title={m.detailAddress}>
                              {m.detailAddress || '-'}
                            </span>
                          </td>

                          {/* 14. WARD */}
                          <td className="py-3 px-3 bg-amber-50/30 font-medium text-amber-950 whitespace-nowrap">
                            {m.ward ? (
                              <span className="px-2 py-0.5 rounded bg-amber-100/90 text-amber-900 border border-amber-200 font-semibold text-[11px]">
                                {m.ward}
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>

                          {/* 15. TOWNSHIP */}
                          <td className="py-3 px-3 bg-emerald-50/30 font-bold text-emerald-950 whitespace-nowrap">
                            {m.township ? (
                              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-200 font-bold text-[11px]">
                                {m.township}
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>

                          {/* SHEET SOURCE */}
                          <td className="py-3 px-3 bg-gray-50/60 whitespace-nowrap">
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-700 border border-gray-200 max-w-[140px] truncate"
                              title={m.sheetName}
                            >
                              <FileSpreadsheet className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span className="truncate">{m.sheetName}</span>
                            </span>
                          </td>

                          {/* VIEW ACTION */}
                          <td className="py-3 px-3 text-right sticky right-0 bg-white group-hover:bg-emerald-50/40 shadow-xs">
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
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      <div className="bg-gray-50/80 px-4 py-2.5 border-t border-gray-200 text-xs text-gray-500 flex flex-wrap items-center justify-between gap-2">
        <span>Displaying {merchants.length} records</span>
        <span className="text-[11px] text-gray-400">All 14 columns rendered • Open Date, Legal Name, NRC, Bank Acc, License, Nature, Address, Ward, Township</span>
      </div>
    </div>
  );
};
