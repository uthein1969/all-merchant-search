import React from 'react';
import {
  Search,
  X,
  Store,
  CreditCard,
  Phone,
  Layers,
  Tag,
  HelpCircle,
  CheckSquare,
  Square,
  MapPin,
  Building,
  ListFilter,
} from 'lucide-react';
import { SearchFilters, SheetMeta } from '../types';

interface SearchControlsProps {
  filters: SearchFilters;
  onChangeFilters: (newFilters: SearchFilters) => void;
  sheets: SheetMeta[];
  natures: string[];
  townships: string[];
  wards: string[];
  totalResults: number;
  totalRecords: number;
}

export const SearchControls: React.FC<SearchControlsProps> = ({
  filters,
  onChangeFilters,
  sheets,
  natures,
  townships,
  wards,
  totalResults,
  totalRecords,
}) => {
  const update = (patch: Partial<SearchFilters>) => {
    onChangeFilters({ ...filters, ...patch });
  };

  const hasActiveFilters = Boolean(
    filters.globalQuery ||
    filters.businessName ||
    filters.nrc ||
    filters.phone ||
    (filters.sheetName && filters.sheetName !== 'ALL') ||
    (filters.township && filters.township !== 'ALL') ||
    (filters.ward && filters.ward !== 'ALL') ||
    (filters.groupBy && filters.groupBy !== 'none') ||
    filters.natureOfBusiness ||
    filters.merchantCode
  );

  const clearAllFilters = () => {
    onChangeFilters({
      globalQuery: '',
      businessName: '',
      nrc: '',
      nrcLast6Only: true, // Default to true as user specifically requested NRC နောက် ၆ လုံး
      phone: '',
      sheetName: 'ALL',
      township: 'ALL',
      ward: 'ALL',
      groupBy: 'none',
      natureOfBusiness: '',
      merchantCode: '',
    });
  };

  // Quick sample buttons for user testing
  const sampleNrcLast6 = ['105885', '025179', '145700', '044074', '110037', '199784'];

  return (
    <section id="search-controls-container" className="bg-white rounded-xl shadow-xs border border-gray-200/90 p-4 sm:p-5 transition-all space-y-4">
      {/* Top Bar: General Instant Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between pb-3 border-b border-gray-100">
        <div className="relative flex-1">
          <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            id="input-global-search"
            type="text"
            value={filters.globalQuery}
            onChange={(e) => update({ globalQuery: e.target.value })}
            placeholder="Quick search across all fields (Business Name, NRC, Mobile, Legal Name, Township, Ward)..."
            className="w-full pl-10.5 pr-9 py-2.5 bg-gray-50/80 hover:bg-gray-50 focus:bg-white text-gray-900 placeholder-gray-400 text-sm rounded-lg border border-gray-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
          />
          {filters.globalQuery && (
            <button
              onClick={() => update({ globalQuery: '' })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer p-0.5"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Results Counter & Reset */}
        <div className="flex items-center justify-between sm:justify-end gap-3 text-sm">
          <span className="text-gray-600">
            Results: <strong className="text-emerald-700 font-semibold">{totalResults}</strong> / {totalRecords}
          </span>
          {hasActiveFilters && (
            <button
              id="btn-clear-all-filters"
              onClick={clearAllFilters}
              className="text-xs text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100/80 px-2.5 py-1.5 rounded-md font-medium flex items-center gap-1 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Targeted Criteria Grid: BUSINESS NAME, NRC (Last 6 Digits), PH */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* Criteria 1: BUSINESS NAME */}
        <div className="space-y-1.5">
          <label htmlFor="input-business-name" className="flex items-center justify-between text-xs font-semibold text-gray-700">
            <span className="flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-emerald-600" />
              <span>MERCHANT BUSINESS NAME</span>
            </span>
            {filters.businessName && (
              <button
                onClick={() => update({ businessName: '' })}
                className="text-gray-400 hover:text-gray-600 text-[11px]"
              >
                Clear
              </button>
            )}
          </label>
          <div className="relative">
            <input
              id="input-business-name"
              type="text"
              value={filters.businessName}
              onChange={(e) => update({ businessName: e.target.value })}
              placeholder="e.g. FAMILY, OK SHOP, CLINIC..."
              className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
            />
          </div>
          <p className="text-[11px] text-gray-400">Search by shop, merchant, or company name</p>
        </div>

        {/* Criteria 2: NRC (Last 6 Digits) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-700">
            <label htmlFor="input-nrc" className="flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
              <span>NRC / PASSPORT NO</span>
            </label>

            {/* Toggle: NRC Last 6 Digits Only */}
            <button
              type="button"
              id="btn-toggle-nrc-last6"
              onClick={() => update({ nrcLast6Only: !filters.nrcLast6Only })}
              className={`inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                filters.nrcLast6Only
                  ? 'bg-emerald-100 text-emerald-800 font-medium'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title="Click to toggle between matching only the last 6 digits vs full NRC"
            >
              {filters.nrcLast6Only ? (
                <CheckSquare className="w-3 h-3 text-emerald-700" />
              ) : (
                <Square className="w-3 h-3 text-gray-400" />
              )}
              <span>Last 6 Digits</span>
            </button>
          </div>

          <div className="relative">
            <input
              id="input-nrc"
              type="text"
              value={filters.nrc}
              onChange={(e) => update({ nrc: e.target.value })}
              placeholder={filters.nrcLast6Only ? "e.g. 105885, 025179, 145700..." : "e.g. 5/WALANA, 105885..."}
              className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 font-mono"
            />
            {filters.nrc && (
              <button
                onClick={() => update({ nrc: '' })}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick chip suggestions */}
          <div className="flex items-center gap-1 flex-wrap pt-0.5 text-[11px]">
            <span className="text-gray-400">Samples:</span>
            {sampleNrcLast6.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => update({ nrc: code, nrcLast6Only: true })}
                className="px-1.5 py-0.5 bg-gray-100 hover:bg-emerald-50 hover:text-emerald-700 text-gray-600 rounded text-[10px] font-mono transition-colors cursor-pointer"
              >
                {code}
              </button>
            ))}
          </div>
        </div>

        {/* Criteria 3: MERCHANT MOBILE NUMBER */}
        <div className="space-y-1.5">
          <label htmlFor="input-phone" className="flex items-center justify-between text-xs font-semibold text-gray-700">
            <span className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-emerald-600" />
              <span>MERCHANT MOBILE NUMBER</span>
            </span>
            {filters.phone && (
              <button
                onClick={() => update({ phone: '' })}
                className="text-gray-400 hover:text-gray-600 text-[11px]"
              >
                Clear
              </button>
            )}
          </label>
          <div className="relative">
            <input
              id="input-phone"
              type="text"
              value={filters.phone}
              onChange={(e) => update({ phone: e.target.value })}
              placeholder="e.g. 95154867, 0943162010..."
              className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 font-mono"
            />
          </div>
          <p className="text-[11px] text-gray-400">Search by phone / mobile number (supports 09 prefix)</p>
        </div>
      </div>

      {/* Location Filter & Grouping Section: TOWNSHIP, WARD, and GROUP BY DROPDOWNS */}
      <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
            <MapPin className="w-3.5 h-3.5 text-emerald-700" />
            <span>WARD & TOWNSHIP DROPDOWN FILTERS & GROUPING</span>
          </div>
          {(filters.township && filters.township !== 'ALL' || filters.ward && filters.ward !== 'ALL') && (
            <button
              onClick={() => update({ township: 'ALL', ward: 'ALL' })}
              className="text-[11px] text-emerald-700 hover:text-emerald-900 hover:underline cursor-pointer"
            >
              Reset Location Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* TOWNSHIP Dropdown */}
          <div className="space-y-1">
            <label htmlFor="select-township-filter" className="flex items-center justify-between text-[11px] font-semibold text-gray-700">
              <span className="flex items-center gap-1">
                <Building className="w-3 h-3 text-emerald-600" />
                <span>TOWNSHIP (မြို့နယ်)</span>
              </span>
              {filters.township && filters.township !== 'ALL' && (
                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.2 rounded">
                  Selected
                </span>
              )}
            </label>
            <select
              id="select-township-filter"
              value={filters.township || 'ALL'}
              onChange={(e) => update({ township: e.target.value })}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-emerald-200 rounded-md text-gray-900 font-medium focus:outline-hidden focus:ring-1 focus:ring-emerald-500 cursor-pointer shadow-2xs"
            >
              <option value="ALL">All Townships (မြို့နယ်အားလုံး)</option>
              {townships.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* WARD Dropdown */}
          <div className="space-y-1">
            <label htmlFor="select-ward-filter" className="flex items-center justify-between text-[11px] font-semibold text-gray-700">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-emerald-600" />
                <span>WARD (ရပ်ကွက်)</span>
              </span>
              {filters.ward && filters.ward !== 'ALL' && (
                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.2 rounded">
                  Selected
                </span>
              )}
            </label>
            <select
              id="select-ward-filter"
              value={filters.ward || 'ALL'}
              onChange={(e) => update({ ward: e.target.value })}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-emerald-200 rounded-md text-gray-900 font-medium focus:outline-hidden focus:ring-1 focus:ring-emerald-500 cursor-pointer shadow-2xs"
            >
              <option value="ALL">All Wards (ရပ်ကွက်အားလုံး)</option>
              {wards.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </div>

          {/* GROUP BY Dropdown List */}
          <div className="space-y-1">
            <label htmlFor="select-group-by" className="flex items-center justify-between text-[11px] font-semibold text-gray-700">
              <span className="flex items-center gap-1">
                <ListFilter className="w-3 h-3 text-emerald-700" />
                <span>GROUP TABLE BY (အုပ်စုခွဲ၍ကြည့်ရန်)</span>
              </span>
              {filters.groupBy && filters.groupBy !== 'none' && (
                <span className="text-[10px] text-amber-800 font-bold bg-amber-100 px-1.5 py-0.2 rounded">
                  Grouped
                </span>
              )}
            </label>
            <select
              id="select-group-by"
              value={filters.groupBy || 'none'}
              onChange={(e) => update({ groupBy: e.target.value as 'none' | 'township' | 'ward' | 'sheet' })}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-amber-300 rounded-md text-gray-900 font-semibold focus:outline-hidden focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-2xs"
            >
              <option value="none">No Grouping (Flat Table List)</option>
              <option value="township">Group by TOWNSHIP (မြို့နယ်အလိုက်ခွဲကြည့်မည်)</option>
              <option value="ward">Group by WARD (ရပ်ကွက်အလိုက်ခွဲကြည့်မည်)</option>
              <option value="sheet">Group by SHEET TAB (Sheet အလိုက်ခွဲကြည့်မည်)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Secondary Row: Multi-Sheet Selector, Business Nature, Merchant Code */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-gray-100">
        {/* Sheet Selector */}
        <div className="space-y-1">
          <label htmlFor="select-sheet-filter" className="flex items-center gap-1 text-[11px] font-semibold text-gray-600">
            <Layers className="w-3 h-3 text-emerald-600" />
            <span>Select Sheet Tab:</span>
          </label>
          <select
            id="select-sheet-filter"
            value={filters.sheetName}
            onChange={(e) => update({ sheetName: e.target.value })}
            className="w-full px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-md text-gray-800 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="ALL">All Sheets ({totalRecords} total records)</option>
            {sheets.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name} ({s.count})
              </option>
            ))}
          </select>
        </div>

        {/* Nature of Business Selector */}
        <div className="space-y-1">
          <label htmlFor="select-nature-filter" className="flex items-center gap-1 text-[11px] font-semibold text-gray-600">
            <Tag className="w-3 h-3 text-emerald-600" />
            <span>Nature of Business:</span>
          </label>
          <select
            id="select-nature-filter"
            value={filters.natureOfBusiness}
            onChange={(e) => update({ natureOfBusiness: e.target.value })}
            className="w-full px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-md text-gray-800 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="">All Categories</option>
            {natures.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        {/* Merchant Code */}
        <div className="space-y-1">
          <label htmlFor="input-merchant-code" className="flex items-center gap-1 text-[11px] font-semibold text-gray-600">
            <HelpCircle className="w-3 h-3 text-emerald-600" />
            <span>Merchant Code:</span>
          </label>
          <input
            id="input-merchant-code"
            type="text"
            value={filters.merchantCode}
            onChange={(e) => update({ merchantCode: e.target.value })}
            placeholder="e.g. 20500312..."
            className="w-full px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-md text-gray-800 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 font-mono"
          />
        </div>
      </div>
    </section>
  );
};
