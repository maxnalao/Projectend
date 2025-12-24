// src/pages/StockPage.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import AddProductModal from "../components/AddProductModal";

export default function StockPage() {
  const [items, setItems] = useState([]);
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalInventoryValue, setTotalInventoryValue] = useState(0);  // ✅ เพิ่ม state
  
  // Basic Search
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [status, setStatus] = useState("");
  
  // Advanced Search
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [stockMin, setStockMin] = useState("");
  const [stockMax, setStockMax] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState("name-asc");
  
  // Modal
  const [openAdd, setOpenAdd] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (q) params.search = q;

      const { data } = await api.get("/products/", { params });
      const arr = Array.isArray(data) ? data : (data.results ?? []);
      setItems(arr);
    } catch (e) {
      console.error("load stock error:", e?.response || e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCats = async () => {
    try {
      const { data } = await api.get("/categories/");
      setCats(Array.isArray(data) ? data : (data.results ?? []));
    } catch {
      setCats([]);
    }
  };

  // ✅ เพิ่ม Effect เพื่อคำนวณมูลค่ารวม
  useEffect(() => {
    const calculateTotal = async () => {
      try {
        const { data: productsData } = await api.get("/products/?show_empty=1");
        const total = productsData.reduce((sum, p) => {
          // ✅ FIXED: ใช้ selling_price (ราคาขาย) ไม่ใช้ cost_price
          const price = parseFloat(p.selling_price) || 0;
          return sum + (price * p.stock);
        }, 0);
        setTotalInventoryValue(total);
      } catch (err) {
        console.error("Error calculating total inventory value:", err);
        setTotalInventoryValue(0);
      }
    };
    calculateTotal();
  }, []);

  useEffect(() => { loadCats(); }, []);
  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [q]);

  // ✅ Advanced Filter & Sort
  const filteredItems = useMemo(() => {
    let result = [...items];

    // Filter หมวดหมู่
    if (cat) {
      result = result.filter(item => {
        const itemCatId = item.category?.id || item.category;
        return String(itemCatId) === String(cat);
      });
    }

    // Filter สถานะสต็อก
    if (status === "ok") {
      result = result.filter(item => Number(item.stock) >= 5);
    } else if (status === "low") {
      result = result.filter(item => Number(item.stock) < 5 && Number(item.stock) > 0);
    } else if (status === "out") {
      result = result.filter(item => Number(item.stock) === 0);
    }

    // ✅ Filter ราคา - FIXED: use selling_price
    if (priceMin) {
      result = result.filter(item => Number(item.selling_price) >= Number(priceMin));
    }
    if (priceMax) {
      result = result.filter(item => Number(item.selling_price) <= Number(priceMax));
    }

    // Filter จำนวนสต็อก
    if (stockMin) {
      result = result.filter(item => Number(item.stock) >= Number(stockMin));
    }
    if (stockMax) {
      result = result.filter(item => Number(item.stock) <= Number(stockMax));
    }

    // Filter วันที่
    if (dateFrom) {
      result = result.filter(item => {
        const itemDate = new Date(item.created_at);
        return itemDate >= new Date(dateFrom);
      });
    }
    if (dateTo) {
      result = result.filter(item => {
        const itemDate = new Date(item.created_at);
        return itemDate <= new Date(dateTo + "T23:59:59");
      });
    }

    // Sort
    const [sortField, sortOrder] = sortBy.split("-");
    
    result.sort((a, b) => {
      let compareA, compareB;

      switch (sortField) {
        case "name":
          compareA = (a.name || "").toLowerCase();
          compareB = (b.name || "").toLowerCase();
          break;
        case "price":
          // ✅ FIXED: use selling_price for sorting
          compareA = Number(a.selling_price || 0);
          compareB = Number(b.selling_price || 0);
          break;
        case "stock":
          compareA = Number(a.stock || 0);
          compareB = Number(b.stock || 0);
          break;
        case "date":
          compareA = new Date(a.created_at || 0);
          compareB = new Date(b.created_at || 0);
          break;
        default:
          return 0;
      }

      if (sortOrder === "asc") {
        return compareA > compareB ? 1 : compareA < compareB ? -1 : 0;
      } else {
        return compareA < compareB ? 1 : compareA > compareB ? -1 : 0;
      }
    });

    return result;
  }, [items, cat, status, priceMin, priceMax, stockMin, stockMax, dateFrom, dateTo, sortBy]);

  const handleClearFilters = () => {
    setQ("");
    setCat("");
    setStatus("");
    setPriceMin("");
    setPriceMax("");
    setStockMin("");
    setStockMax("");
    setDateFrom("");
    setDateTo("");
    setSortBy("name-asc");
  };

  const handleSaved = async () => {
    await load();
    setOpenAdd(false);
  };

  const activeFiltersCount = [
    cat, status, priceMin, priceMax, stockMin, stockMax, dateFrom, dateTo
  ].filter(Boolean).length;

  // Stats
  const statsOk = items.filter(x => Number(x.stock) >= 5).length;
  const statsLow = items.filter(x => Number(x.stock) < 5 && Number(x.stock) > 0).length;
  const statsOut = items.filter(x => Number(x.stock) === 0).length;

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">สต็อกสินค้า</h1>
          <p className="text-sm text-gray-500 mt-1">จัดการและติดตามสต็อคสินค้าในคลัง</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setOpenAdd(true)}
            className="bg-emerald-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2 shadow-sm transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            เพิ่มสินค้า
          </button>
          <Link
            to="/stock/issue"
            className="bg-rose-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-rose-700 flex items-center gap-2 shadow-sm transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            เบิกออก
          </Link>
        </div>
      </div>

      {/* ✅ Total Inventory Value - Text Only */}
      <div className="text-center">
        <p className="text-gray-600 text-sm font-medium">รวมมูลค่าสต๊อก</p>
        <p className="text-gray-800 text-2xl font-bold mt-1">฿{totalInventoryValue.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
      </div>

      {/* Main Content Card */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        {/* Filter Section */}
        <div className="px-6 py-5 border-b bg-gradient-to-r from-slate-50 to-gray-50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <h2 className="text-base font-semibold text-gray-800">ค้นหาและกรองสินค้า</h2>
              {activeFiltersCount > 0 && (
                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                  {activeFiltersCount} ตัวกรอง
                </span>
              )}
            </div>
            
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              {showAdvanced ? "ซ่อนตัวกรองขั้นสูง" : "แสดงตัวกรองขั้นสูง"}
            </button>
          </div>

          {/* Basic Search */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative">
              <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ค้นหารหัส หรือ ชื่อสินค้า..."
                className="border border-gray-300 rounded-lg pl-10 pr-4 py-2.5 text-sm w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            <select
              className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              value={cat}
              onChange={(e) => setCat(e.target.value)}
            >
              <option value="">ทุกหมวดหมู่</option>
              {cats.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <select
              className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">ทุกสถานะ</option>
              <option value="ok">✓ มีของ (≥5)</option>
              <option value="low">⚠ ใกล้หมด (&lt;5)</option>
              <option value="out">✕ หมดสต็อก</option>
            </select>

            <select
              className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="name-asc">ชื่อ (A-Z)</option>
              <option value="name-desc">ชื่อ (Z-A)</option>
              <option value="price-asc">ราคา (ต่ำ-สูง)</option>
              <option value="price-desc">ราคา (สูง-ต่ำ)</option>
              <option value="stock-asc">สต็อก (น้อย-มาก)</option>
              <option value="stock-desc">สต็อก (มาก-น้อย)</option>
              <option value="date-desc">วันที่ (ใหม่-เก่า)</option>
              <option value="date-asc">วันที่ (เก่า-ใหม่)</option>
            </select>
          </div>

          {/* Advanced Search */}
          {showAdvanced && (
            <div className="mt-4 pt-4 border-t space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* ราคา */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">ช่วงราคา (฿)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={priceMin}
                      onChange={(e) => setPriceMin(e.target.value)}
                      placeholder="ต่ำสุด"
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <span className="text-gray-500">-</span>
                    <input
                      type="number"
                      value={priceMax}
                      onChange={(e) => setPriceMax(e.target.value)}
                      placeholder="สูงสุด"
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                {/* จำนวนสต็อก */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">ช่วงจำนวนสต็อก</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={stockMin}
                      onChange={(e) => setStockMin(e.target.value)}
                      placeholder="ต่ำสุด"
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <span className="text-gray-500">-</span>
                    <input
                      type="number"
                      value={stockMax}
                      onChange={(e) => setStockMax(e.target.value)}
                      placeholder="สูงสุด"
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                {/* วันที่เพิ่ม */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">ช่วงวันที่เพิ่ม</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <span className="text-gray-500">-</span>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Clear Filters */}
              {activeFiltersCount > 0 && (
                <div className="flex justify-end">
                  <button
                    onClick={handleClearFilters}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    ล้างตัวกรองทั้งหมด
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Table Header Info */}
        <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="font-semibold text-gray-800 text-sm">รายการสินค้า</h3>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">
              แสดง <span className="font-semibold text-gray-800">{filteredItems.length}</span> / <span className="text-gray-500">{items.length}</span> รายการ
            </div>
            {/* Quick Stats */}
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="text-gray-600">มี: {statsOk}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span className="text-gray-600">ใกล้หมด: {statsLow}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                <span className="text-gray-600">หมด: {statsOut}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-6 py-4 text-left font-semibold text-gray-700">รหัสสินค้า</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-700">ชื่อสินค้า</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-700">หมวดหมู่</th>
                <th className="px-6 py-4 text-center font-semibold text-gray-700">คงเหลือ</th>
                <th className="px-6 py-4 text-center font-semibold text-gray-700">หน่วย</th>
                <th className="px-6 py-4 text-right font-semibold text-gray-700">ราคา</th>
                <th className="px-6 py-4 text-center font-semibold text-gray-700">วันที่เพิ่ม</th>
                <th className="px-6 py-4 text-center font-semibold text-gray-700">สถานะ</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-gray-500 font-medium">กำลังโหลดข้อมูล...</p>
                    </div>
                  </td>
                </tr>
              )}

              {!loading && filteredItems.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-gray-500 font-medium">
                          {items.length === 0 ? "ไม่พบสินค้า" : "ไม่พบสินค้าที่ตรงกับเงื่อนไข"}
                        </p>
                        <p className="text-sm text-gray-400 mt-1">
                          {items.length === 0 ? "ลองเปลี่ยนเงื่อนไขการค้นหา หรือเพิ่มสินค้าใหม่" : "ลองปรับเงื่อนไขการค้นหาใหม่"}
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}

              {!loading &&
                filteredItems.map((it) => {
                  const stock = Number(it.stock);

                  let badge = (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 px-3 py-1.5 text-xs font-semibold">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      มีของ
                    </span>
                  );

                  if (stock === 0) {
                    badge = (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 text-rose-700 px-3 py-1.5 text-xs font-semibold">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        หมด
                      </span>
                    );
                  } else if (stock < 5) {
                    badge = (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 px-3 py-1.5 text-xs font-semibold">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        ใกล้หมด
                      </span>
                    );
                  }

                  return (
                    <tr key={it.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-mono font-semibold text-gray-700">{it.code}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-gray-800">{it.name}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium">
                          {it.category_name ?? it.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`text-lg font-bold ${
                          stock === 0 ? 'text-rose-600' : 
                          stock < 5 ? 'text-amber-600' : 
                          'text-emerald-600'
                        }`}>
                          {stock}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-gray-600">{it.unit}</td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-semibold text-gray-800">
                          {Number(it.selling_price ?? 0).toFixed(2)}
                        </span>
                        <span className="text-gray-500 text-xs ml-1">฿</span>
                      </td>
                      <td className="px-6 py-4 text-center text-gray-600 text-xs">
                        {it.created_at?.slice?.(0, 10) ?? "-"}
                      </td>
                      <td className="px-6 py-4 text-center">{badge}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {openAdd && (
        <AddProductModal
          open={openAdd}
          onClose={() => setOpenAdd(false)}
          onSaved={handleSaved}
        />
      )}
    </section>
  );
}