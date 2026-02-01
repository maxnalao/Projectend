// src/pages/ProductsPage.jsx
import { useEffect, useState, useMemo } from "react";
import api from "../api";
import EditListingModal from "../components/EditListingModal";

export default function ProductsPage() {
  const [items, setItems] = useState([]);
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalInventoryValue, setTotalInventoryValue] = useState(0);  // ✅ เพิ่ม state
  
  // Basic Search
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  
  // Advanced Search
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [stockStatus, setStockStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState("name-asc");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  
  // Modal
  const [openEdit, setOpenEdit] = useState(false);
  const [selected, setSelected] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const params = { active: 1 };
      if (q) params.search = q;
      if (cat) params.category = cat;

      const { data } = await api.get("/listings/", { params });
      setItems(data.results ?? data ?? []);
      setCurrentPage(1); // รีเซ็ตหน้าเมื่อค้นหาใหม่
    } catch (err) {
      console.error("load listings error:", err);
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

  // ✅ เพิ่ม Effect เพื่อคำนวณมูลค่าสต๊อก จากข้อมูล items เท่านั้น
  useEffect(() => {
    const total = items.reduce((sum, p) => {
      // ✅ FIXED: ใช้ selling_price (ราคาขาย) และ quantity
      const price = parseFloat(p.selling_price) || 0;
      const qty = parseFloat(p.quantity) || 0;
      console.log(`${p.product_code}: price=${price}, qty=${qty}, total=${price * qty}`);
      return sum + (price * qty);
    }, 0);
    console.log("Total inventory value:", total);
    setTotalInventoryValue(total);
  }, [items]);

  useEffect(() => { loadCats(); }, []);
  useEffect(() => { 
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [q, cat]);

  // ✅ Advanced Filter & Sort
  const filteredItems = useMemo(() => {
    let result = [...items];

    // ✅ FIXED: Filter ราคา - use selling_price
    if (priceMin) {
      result = result.filter(item => Number(item.selling_price || item.sale_price || item.price || 0) >= Number(priceMin));
    }
    if (priceMax) {
      result = result.filter(item => Number(item.selling_price || item.sale_price || item.price || 0) <= Number(priceMax));
    }

    // Filter สถานะสต็อก
    if (stockStatus === "in-stock") {
      result = result.filter(item => Number(item.quantity) > 0);
    } else if (stockStatus === "low-stock") {
      result = result.filter(item => Number(item.quantity) > 0 && Number(item.quantity) < 5);
    } else if (stockStatus === "out-of-stock") {
      result = result.filter(item => Number(item.quantity) === 0);
    }

    // Filter วันที่
    if (dateFrom) {
      result = result.filter(item => {
        const itemDate = new Date(item.created_at || item.updated_at);
        return itemDate >= new Date(dateFrom);
      });
    }
    if (dateTo) {
      result = result.filter(item => {
        const itemDate = new Date(item.created_at || item.updated_at);
        return itemDate <= new Date(dateTo + "T23:59:59");
      });
    }

    // Sort
    const [sortField, sortOrder] = sortBy.split("-");
    
    result.sort((a, b) => {
      let compareA, compareB;

      switch (sortField) {
        case "name":
          compareA = (a.product_name || a.title || a.name || "").toLowerCase();
          compareB = (b.product_name || b.title || b.name || "").toLowerCase();
          break;
        case "price":
          // ✅ FIXED: Sort ราคา - use selling_price
          compareA = Number(a.selling_price || a.sale_price || a.price || 0);
          compareB = Number(b.selling_price || b.sale_price || b.price || 0);
          break;
        case "stock":
          compareA = Number(a.quantity || 0);
          compareB = Number(b.quantity || 0);
          break;
        case "date":
          compareA = new Date(a.created_at || a.updated_at || 0);
          compareB = new Date(b.created_at || b.updated_at || 0);
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
  }, [items, priceMin, priceMax, stockStatus, dateFrom, dateTo, sortBy]);

  // ✅ Pagination
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  
  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  const goToPreviousPage = () => {
    if (canGoPrevious) {
      setCurrentPage(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goToNextPage = () => {
    if (canGoNext) {
      setCurrentPage(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleClearFilters = () => {
    setQ("");
    setCat("");
    setPriceMin("");
    setPriceMax("");
    setStockStatus("");
    setDateFrom("");
    setDateTo("");
    setSortBy("name-asc");
  };

  const onEdit = (row) => { setSelected(row); setOpenEdit(true); };
  const onEdited = async () => { setOpenEdit(false); setSelected(null); await load(); };

  const onDeleteListing = async (row) => {
    const displayName = row.product_name || row.title || row.name || "รายการนี้";
    if (!window.confirm(`ต้องการลบ "${displayName}" ออกจากรายการสินค้าใช่หรือไม่?`)) return;
    try {
      const res = await api.delete(`/listings/${row.id}/`);
      if (res.status === 204) {
        setItems((prev) => prev.filter((x) => x.id !== row.id));
        alert("ลบสินค้าสำเร็จ");
      } else {
        alert(`ลบไม่สำเร็จ (${res.status})`);
      }
    } catch (err) {
      alert(`ลบไม่สำเร็จ: ${err.response?.data?.detail || "เกิดข้อผิดพลาด"}`);
    }
  };

  const activeFiltersCount = [
    priceMin, priceMax, stockStatus, dateFrom, dateTo
  ].filter(Boolean).length;

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">รายการสินค้า</h1>
          <p className="text-sm text-gray-500 mt-1">สินค้าที่พร้อมจำหน่ายและจัดการ</p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-medium">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            แสดง: <span className="font-bold">{paginatedItems.length}</span> / {filteredItems.length}
          </span>
        </div>
      </div>

      {/* ✅ Total Inventory Value - Text Only */}
      <div className="text-center">
        <p className="text-gray-600 text-sm font-medium">รวมมูลค่าสินค้า</p>
        <p className="text-gray-800 text-2xl font-bold mt-1">฿{totalInventoryValue.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
      </div>

      {/* Main Content Card */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        {/* Basic Filter Section */}
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                <div className="md:col-span-1">
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

                {/* สถานะสต็อก */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">สถานะสต็อก</label>
                  <select
                    value={stockStatus}
                    onChange={(e) => setStockStatus(e.target.value)}
                    className="border border-gray-300 rounded-lg px-4 py-2 text-sm w-full focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">ทุกสถานะ</option>
                    <option value="in-stock">✓ มีสินค้า</option>
                    <option value="low-stock">⚠ ใกล้หมด (&lt;5)</option>
                    <option value="out-of-stock">✕ หมดสต็อก</option>
                  </select>
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <h3 className="font-semibold text-gray-800 text-sm">รายการสินค้าพร้อมจำหน่าย</h3>
          </div>
          <div className="text-sm text-gray-600">
            แสดง <span className="font-semibold text-gray-800">{paginatedItems.length}</span> รายการ
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-6 py-4 text-left font-semibold text-gray-700 w-32">รหัสสินค้า</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-700 w-20">รูป</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-700">ชื่อสินค้า</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-700">หมวดหมู่</th>
                <th className="px-6 py-4 text-right font-semibold text-gray-700">ราคาต่อหน่วย</th>
                <th className="px-6 py-4 text-center font-semibold text-gray-700">หน่วย</th>
                <th className="px-6 py-4 text-center font-semibold text-gray-700">คงเหลือ</th>
                <th className="px-6 py-4 text-center font-semibold text-gray-700 w-40">จัดการ</th>
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
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-gray-500 font-medium">
                          {items.length === 0 ? "ยังไม่มีสินค้า" : "ไม่พบสินค้าที่ตรงกับเงื่อนไข"}
                        </p>
                        <p className="text-sm text-gray-400 mt-1">
                          {items.length === 0 ? 
                            'กรุณาเบิกสินค้าจากหน้า "สต็อคสินค้า" ก่อน' : 
                            'ลองปรับเงื่อนไขการค้นหาใหม่'}
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}

              {!loading && paginatedItems.map((it) => (
                <tr key={it.id} className="hover:bg-slate-50 transition-colors">
                  {/* ✅ รหัสสินค้า */}
                  <td className="px-6 py-4">
                    <span className="font-mono font-semibold text-gray-700">
                      {it.product_code || it.code || "-"}
                    </span>
                  </td>
                  
                  {/* ✅ รูป */}
                  <td className="px-6 py-4">
                    {it.image_url ? (
                      <img 
                        src={it.image_url} 
                        alt={it.product_name || it.title || it.name}
                        className="h-14 w-14 object-cover rounded-lg border-2 border-gray-200 shadow-sm" 
                      />
                    ) : (
                      <div className="h-14 w-14 bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg border-2 border-gray-200 flex items-center justify-center">
                        <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </td>
                  
                  {/* ✅ ชื่อสินค้า */}
                  <td className="px-6 py-4">
                    <span className="font-medium text-gray-800">
                      {it.title || it.product_name || it.name || "-"}
                    </span>
                  </td>
                  
                  {/* ✅ หมวดหมู่ */}
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium">
                      {it.category_name || "-"}
                    </span>
                  </td>
                  
                  {/* ✅ ราคา - FIXED: use selling_price */}
                  <td className="px-6 py-4 text-right">
                    <span className="font-semibold text-gray-800">
                      {Number(it.sale_price || it.selling_price || it.price || 0).toFixed(2)}
                    </span>
                    <span className="text-gray-500 text-xs ml-1">฿</span>
                  </td>
                  
                  {/* ✅ หน่วย */}
                  <td className="px-6 py-4 text-center">
                    <span className="text-gray-600">{it.unit || "-"}</span>
                  </td>
                  
                  {/* ✅ คงเหลือ */}
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center justify-center min-w-[60px] px-3 py-1.5 rounded-full font-bold text-sm ${
                      Number(it.quantity || 0) === 0 ? 'bg-rose-100 text-rose-700' :
                      Number(it.quantity || 0) < 5 ? 'bg-amber-100 text-amber-700' :
                      'bg-emerald-100 text-emerald-700'
                    }`}>
                      {it.quantity || 0}
                    </span>
                  </td>
                  
                  {/* ✅ จัดการ */}
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => onEdit(it)}
                        className="px-4 py-2 text-sm rounded-lg bg-amber-500 text-white hover:bg-amber-600 font-medium flex items-center gap-1.5 transition-colors shadow-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        แก้ไข
                      </button>
                      <button
                        onClick={() => onDeleteListing(it)}
                        className="px-4 py-2 text-sm rounded-lg bg-rose-600 text-white hover:bg-rose-700 font-medium flex items-center gap-1.5 transition-colors shadow-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        ลบ
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ✅ Pagination Footer */}
        {!loading && filteredItems.length > 0 && (
          <div className="px-6 py-4 bg-slate-50 border-t">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                แสดง <span className="font-semibold text-gray-800">{paginatedItems.length}</span> รายการ 
                จากทั้งหมด <span className="font-semibold text-gray-800">{filteredItems.length}</span> รายการ
              </p>
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center gap-3">
                  <div className="text-sm text-gray-600">
                    หน้า <span className="font-semibold text-gray-800">{currentPage}</span> / <span className="font-semibold text-gray-800">{totalPages}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={goToPreviousPage}
                      disabled={!canGoPrevious}
                      className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      ก่อนหน้า
                    </button>
                    <button
                      onClick={goToNextPage}
                      disabled={!canGoNext}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2 transition-colors"
                    >
                      ถัดไป
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {openEdit && (
        <EditListingModal
          open={openEdit}
          listing={selected}
          onClose={() => { setOpenEdit(false); setSelected(null); }}
          onSaved={onEdited}
        />
      )}
    </section>
  );
}