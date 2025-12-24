import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

export default function IssuePage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState([]);
  const navigate = useNavigate();

  async function load() {
    setLoading(true);
    try {
      const params = {};
      if (q) params.search = q;
      const { data } = await api.get("/products/", { params });
      const arr = Array.isArray(data) ? data : (data.results ?? []);
      setItems(arr);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [q]);

  const addPick = (p) => {
    if (picked.some(x => x.id === p.id)) return;
    setPicked(prev => [...prev, { id: p.id, code: p.code, name: p.name, stock: p.stock, qty: 1 }]);
  };

  const setQty = (id, v) => {
    setPicked(prev => prev.map(x => x.id === id ? { ...x, qty: v } : x));
  };

  const removePick = (id) => setPicked(prev => prev.filter(x => x.id !== id));

  const canSubmit = useMemo(() => {
    if (picked.length === 0) return false;
    return picked.every(x => Number.isInteger(Number(x.qty)) && Number(x.qty) > 0 && Number(x.qty) <= Number(x.stock));
  }, [picked]);

  const totalItems = useMemo(() => {
    return picked.reduce((sum, x) => sum + Number(x.qty), 0);
  }, [picked]);

  const submit = async () => {
    if (!canSubmit) return;
    const payload = { items: picked.map(x => ({ product: x.id, qty: Number(x.qty) })) };
    try {
      // ✅ เปลี่ยนจาก /stock/issue/ เป็น /inventory/issue-products/
      await api.post("/issue-products/", payload);
      alert("เบิกสินค้าสำเร็จ!");
      navigate("/products");
    } catch (err) {
      const s = err?.response?.status;
      const d = err?.response?.data;
      alert(`เบิกไม่สำเร็จ: ${s ?? ""} ${d ? JSON.stringify(d) : ""}`);
    }
  };

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/stock")}
            className="w-10 h-10 bg-white border rounded-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">เบิกสินค้าออกจากสต็อก</h1>
            <p className="text-sm text-gray-500 mt-1">เลือกสินค้าและระบุจำนวนที่ต้องการเบิก</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-medium text-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            เลือกแล้ว: <span className="font-bold">{picked.length}</span> รายการ
          </div>
          <button
            onClick={submit}
            disabled={!canSubmit}
            className={`px-6 py-2.5 rounded-lg text-white font-medium text-sm flex items-center gap-2 shadow-sm transition-colors ${
              !canSubmit 
                ? "bg-gray-300 cursor-not-allowed" 
                : "bg-rose-600 hover:bg-rose-700"
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            ยืนยันเบิก ({totalItems} ชิ้น)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Product List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            {/* Search */}
            <div className="px-6 py-4 border-b bg-gradient-to-r from-slate-50 to-gray-50">
              <div className="flex items-center gap-3 mb-3">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <h2 className="text-base font-semibold text-gray-800">สินค้าในสต็อก</h2>
              </div>
              <div className="relative">
                <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="ค้นหารหัส หรือ ชื่อสินค้า..."
                  className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto" style={{ maxHeight: "600px", overflowY: "auto" }}>
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">รหัส</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">ชื่อสินค้า</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">คงเหลือ</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">หน่วย</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700 w-28">เลือก</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-16 text-center">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                          <p className="text-gray-500 font-medium">กำลังโหลดข้อมูล...</p>
                        </div>
                      </td>
                    </tr>
                  ) : items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-16 text-center">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-gray-500 font-medium">ไม่พบสินค้า</p>
                            <p className="text-sm text-gray-400 mt-1">ลองเปลี่ยนคำค้นหา</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    items.map(p => {
                      const isSelected = picked.some(x => x.id === p.id);
                      const stock = Number(p.stock);
                      return (
                        <tr key={p.id} className={`hover:bg-slate-50 transition-colors ${isSelected ? 'bg-blue-50' : ''}`}>
                          <td className="px-4 py-3">
                            <span className="font-mono font-semibold text-gray-700">{p.code}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-medium text-gray-800">{p.name}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-lg font-bold ${
                              stock === 0 ? 'text-rose-600' :
                              stock < 5 ? 'text-amber-600' :
                              'text-emerald-600'
                            }`}>
                              {stock}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-gray-600">{p.unit}</td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => addPick(p)}
                              disabled={isSelected || stock === 0}
                              className={`px-4 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                                isSelected 
                                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                  : stock === 0
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                              }`}
                            >
                              {isSelected ? 'เลือกแล้ว' : stock === 0 ? 'หมด' : 'เลือก'}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Cart */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden sticky top-6">
            <div className="px-6 py-4 border-b bg-gradient-to-r from-rose-50 to-pink-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-rose-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-800">ตะกร้าเบิก</h2>
                    <p className="text-xs text-gray-500">{picked.length} รายการ</p>
                  </div>
                </div>
                {picked.length > 0 && (
                  <button
                    onClick={() => setPicked([])}
                    className="text-xs text-rose-600 hover:text-rose-700 font-medium"
                  >
                    ล้างทั้งหมด
                  </button>
                )}
              </div>
            </div>

            <div className="p-4" style={{ maxHeight: "500px", overflowY: "auto" }}>
              {picked.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 font-medium">ยังไม่ได้เลือกสินค้า</p>
                  <p className="text-sm text-gray-400 mt-1">เลือกสินค้าจากรายการด้านซ้าย</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {picked.map(x => {
                    const isValid = Number(x.qty) > 0 && Number(x.qty) <= Number(x.stock);
                    return (
                      <div key={x.id} className={`p-3 rounded-lg border-2 transition-colors ${
                        isValid ? 'border-gray-200 bg-white' : 'border-red-200 bg-red-50'
                      }`}>
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <p className="font-semibold text-gray-800 text-sm">{x.name}</p>
                            <p className="text-xs text-gray-500">รหัส: {x.code}</p>
                          </div>
                          <button
                            onClick={() => removePick(x.id)}
                            className="text-rose-600 hover:text-rose-700 p-1"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <label className="text-xs text-gray-600 block mb-1">จำนวน</label>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setQty(x.id, Math.max(1, Number(x.qty) - 1))}
                                className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                </svg>
                              </button>
                              <input
                                type="number"
                                min={1}
                                max={x.stock}
                                value={x.qty}
                                onChange={(e) => setQty(x.id, Number(e.target.value))}
                                className={`flex-1 border rounded-lg px-3 py-2 text-center font-bold text-sm ${
                                  isValid ? 'border-gray-300' : 'border-red-300 bg-red-50'
                                }`}
                              />
                              <button
                                onClick={() => setQty(x.id, Math.min(Number(x.stock), Number(x.qty) + 1))}
                                className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                              </button>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500 mb-1">คงเหลือ</p>
                            <p className={`text-lg font-bold ${
                              Number(x.stock) < 5 ? 'text-amber-600' : 'text-emerald-600'
                            }`}>
                              {x.stock}
                            </p>
                          </div>
                        </div>

                        {!isValid && (
                          <p className="text-xs text-red-600 mt-2">
                            ⚠️ จำนวนไม่ถูกต้อง (ต้อง 1-{x.stock})
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {picked.length > 0 && (
              <div className="px-6 py-4 border-t bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-600">รวมทั้งหมด</span>
                  <span className="text-2xl font-bold text-gray-800">{totalItems}</span>
                </div>
                <button
                  onClick={submit}
                  disabled={!canSubmit}
                  className={`w-full py-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${
                    !canSubmit
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-rose-600 text-white hover:bg-rose-700 shadow-lg'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  ยืนยันเบิกสินค้า
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}