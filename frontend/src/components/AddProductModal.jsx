import { useEffect, useMemo, useRef, useState } from "react";
import api from "../api";

const DEFAULT_CATS = ["เครื่องดื่ม", "เครื่องปรุง", "อาหาร", "อื่นๆ"];
const UNIT_OPTIONS = ["ชิ้น", "ขวด", "กล่อง", "ซอง", "แพ็ค", "ถุง", "กระป๋อง", "ลัง"];

export default function AddProductModal({ open, onClose, onSaved }) {
  const dialogRef = useRef(null);

  const [mode, setMode] = useState("new");

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [sellingPrice, setSellingPrice] = useState(""); 
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("ชิ้น");
  const [categoryName, setCategoryName] = useState("");
  const [catMap, setCatMap] = useState({});
  const [imageFile, setImageFile] = useState(null);
  const [imageUrl, setImageUrl] = useState("");

  const [existingProducts, setExistingProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [addQty, setAddQty] = useState("");

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        // โหลดหมวดหมู่
        const { data: catData } = await api.get("/categories/");
        const arr = Array.isArray(catData) ? catData : (catData.results ?? []);
        const map = {};
        for (const c of arr) map[c.name] = c.id;
        setCatMap(map);

        const { data: prodData } = await api.get("/products/");
        const products = Array.isArray(prodData) ? prodData : (prodData.results ?? []);

        const sorted = products.sort((a, b) => Number(a.stock) - Number(b.stock));
        setExistingProducts(sorted);
      } catch {
        setCatMap({});
        setExistingProducts([]);
      }
    })();
  }, [open]);

  useEffect(() => {
    if (!imageFile) { setImageUrl(""); return; }
    const url = URL.createObjectURL(imageFile);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  useEffect(() => {
    if (!open) {
      setMode("new");
      setCode("");
      setName("");
      setSellingPrice("");  
      setQty("");
      setUnit("ชิ้น");
      setCategoryName("");
      setImageFile(null);
      setImageUrl("");
      setSelectedProductId("");
      setAddQty("");
      setSaving(false);
      setCatMap({});
      setExistingProducts([]);
    }
  }, [open]);

  const canSubmitNew = useMemo(
    () => name.trim() && categoryName && Number(sellingPrice) >= 0 && Number(qty) >= 0,  // ✅ CHANGED
    [name, categoryName, sellingPrice, qty]
  );

  const canSubmitExisting = useMemo(
    () => selectedProductId && Number(addQty) > 0,
    [selectedProductId, addQty]
  );

  async function getOrCreateCategoryId(name) {
    if (catMap[name]) return catMap[name];
    try {
      const { data: created } = await api.post("/categories/", { name });
      setCatMap(prev => ({ ...prev, [name]: created.id }));
      return created.id;
    } catch (err) {
      const { data } = await api.get("/categories/");
      const arr = Array.isArray(data) ? data : (data.results ?? []);
      const found = arr.find(c => c.name === name);
      if (found) {
        setCatMap(prev => ({ ...prev, [name]: found.id }));
        return found.id;
      }
      throw err;
    }
  }

  const submitNew = async (e) => {
    e.preventDefault();
    if (!canSubmitNew || saving) return;

    setSaving(true);
    try {
      const catId = await getOrCreateCategoryId(categoryName);

      const fd = new FormData();
      fd.append("code", code || `A${Date.now().toString().slice(-3)}`);
      fd.append("name", name);
      // ✅ CHANGED: Send cost_price and selling_price instead of price
      fd.append("cost_price", String(Number(sellingPrice) * 0.8));  // cost = 80% of selling
      fd.append("selling_price", String(sellingPrice));             // selling = user input
      fd.append("stock", String(qty));
      fd.append("unit", unit);
      fd.append("category", String(catId));
      if (imageFile) fd.append("image", imageFile);

      // ✅ แก้ไข: เพิ่ม headers เพื่อบอกว่าเป็น multipart/form-data
      await api.post("/products/", fd, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      
      alert("เพิ่มสินค้าใหม่สำเร็จ!");
      onSaved?.();
      onClose?.();
    } catch (err) {
      const status = err?.response?.status;
      const data = err?.response?.data;
      console.error("create product error:", status, data);
      alert(`บันทึกสินค้าไม่สำเร็จ (${status ?? "ERR"}) ${data ? JSON.stringify(data) : ""}`);
    } finally {
      setSaving(false);
    }
  };

  const submitExisting = async (e) => {
    e.preventDefault();
    if (!canSubmitExisting || saving) return;

    setSaving(true);
    try {
      const product = existingProducts.find(p => String(p.id) === String(selectedProductId));
      if (!product) throw new Error("ไม่พบสินค้า");

      const newStock = Number(product.stock) + Number(addQty);
      
      const fd = new FormData();
      fd.append("stock", String(newStock));
      
      await api.patch(`/products/${product.id}/`, fd, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      
      alert(`เพิ่มสต็อกสำเร็จ! ${product.name} จาก ${product.stock} เป็น ${newStock} ${product.unit}`);
      onSaved?.();
      onClose?.();
    } catch (err) {
      console.error("add stock error:", err);
      const status = err?.response?.status;
      const data = err?.response?.data;
      alert(`เพิ่มสต็อกไม่สำเร็จ (${status ?? "ERR"}) ${data ? JSON.stringify(data) : ""}`);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const selectedProduct = existingProducts.find(p => String(p.id) === String(selectedProductId));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      <div
        ref={dialogRef}
        className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl transform transition-all"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">เพิ่มสินค้า</h2>
                <p className="text-xs text-gray-500">
                  {mode === "new" ? "กรอกข้อมูลสินค้าใหม่" : "เลือกสินค้าที่ต้องการเพิ่มสต็อก"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Mode Toggle */}
          <div className="mt-4 flex items-center gap-2 bg-white rounded-lg p-1">
            <button
              type="button"
              onClick={() => setMode("new")}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === "new"
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              เพิ่มสินค้าใหม่
            </button>
            <button
              type="button"
              onClick={() => setMode("existing")}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === "existing"
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              เพิ่มสต็อกสินค้าเดิม
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="p-6">
          {mode === "new" ? (
            /* ฟอร์มเพิ่มสินค้าใหม่ */
            <form onSubmit={submitNew}>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      ข้อมูลพื้นฐาน
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          รหัสสินค้า
                          <span className="text-gray-400 font-normal text-xs ml-1">(ถ้าไม่ใส่จะสร้างอัตโนมัติ)</span>
                        </label>
                        <input
                          value={code}
                          onChange={(e) => setCode(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                          placeholder="เช่น A100"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          ชื่อสินค้า <span className="text-red-500">*</span>
                        </label>
                        <input
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                          placeholder="เช่น โค้ก 500 มล."
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      ราคาและจำนวน
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          ราคาขาย (฿) <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">฿</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={sellingPrice}
                            onChange={(e) => setSellingPrice(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            placeholder="0.00"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          จำนวนเริ่มต้น <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={qty}
                          onChange={(e) => setQty(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                          placeholder="0"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                      <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      หมวดหมู่และหน่วย
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          หมวดหมู่ <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={categoryName}
                          onChange={(e) => setCategoryName(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                          required
                        >
                          <option value="">เลือกหมวดหมู่</option>
                          {DEFAULT_CATS.map((n) => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          หน่วยสินค้า <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={unit}
                          onChange={(e) => setUnit(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        >
                          {UNIT_OPTIONS.map((u) => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-1">
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                      <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      รูปสินค้า
                    </h3>
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-blue-400 transition-colors">
                      {imageUrl ? (
                        <div className="space-y-3">
                          <img src={imageUrl} alt="preview" className="w-full h-48 object-contain rounded-lg" />
                          <button
                            type="button"
                            onClick={() => { setImageUrl(""); setImageFile(null); }}
                            className="text-xs text-red-600 hover:text-red-700 font-medium"
                          >
                            ลบรูปภาพ
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3 py-6">
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 font-medium">อัพโหลดรูปภาพ</p>
                            <p className="text-xs text-gray-400 mt-1">PNG, JPG, WEBP</p>
                          </div>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                        className="hidden"
                        id="modalImageInput"
                      />
                      {!imageUrl && (
                        <label
                          htmlFor="modalImageInput"
                          className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer text-sm font-medium transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          เลือกรูปภาพ
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={saving}
                  className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium text-sm transition-colors disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={!canSubmitNew || saving}
                  className={`px-6 py-2.5 rounded-lg text-white font-medium text-sm flex items-center gap-2 shadow-sm transition-colors ${
                    !canSubmitNew || saving ? 'bg-gray-300 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      กำลังบันทึก...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      เพิ่มสินค้า
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* ฟอร์มเพิ่มสต็อกสินค้าเดิม */
            <form onSubmit={submitExisting}>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    เลือกสินค้า <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    required
                  >
                    <option value="">-- เลือกสินค้าที่ต้องการเพิ่มสต็อก --</option>
                    {existingProducts.map((p) => {
                      const stock = Number(p.stock);
                      let badge = "";
                      if (stock === 0) badge = "❌ หมด";
                      else if (stock < 5) badge = "⚠️ ใกล้หมด";
                      else badge = "✅";
                      
                      return (
                        <option key={p.id} value={p.id}>
                          {badge} {p.code} - {p.name} (คงเหลือ: {p.stock} {p.unit})
                        </option>
                      );
                    })}
                  </select>
                </div>

                {selectedProduct && (
                  <>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">ข้อมูลสินค้า</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">รหัส:</span>
                          <span className="font-mono font-semibold">{selectedProduct.code}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">ชื่อ:</span>
                          <span className="font-semibold">{selectedProduct.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">หมวดหมู่:</span>
                          <span>{selectedProduct.category_name ?? selectedProduct.category}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">ราคา:</span>
                          <span>{Number(selectedProduct.selling_price).toFixed(2)} ฿</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">คงเหลือปัจจุบัน:</span>
                          <span className={`text-lg font-bold ${
                            Number(selectedProduct.stock) === 0 ? 'text-rose-600' :
                            Number(selectedProduct.stock) < 5 ? 'text-amber-600' :
                            'text-emerald-600'
                          }`}>
                            {selectedProduct.stock} {selectedProduct.unit}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        จำนวนที่ต้องการเพิ่ม <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          value={addQty}
                          onChange={(e) => setAddQty(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                          placeholder="ระบุจำนวน"
                          required
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                          {selectedProduct.unit}
                        </span>
                      </div>
                    </div>

                    {addQty && Number(addQty) > 0 && (
                      <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4">
                        <p className="text-sm text-blue-800">
                          <span className="font-semibold">ผลลัพธ์:</span> สต็อกจะเปลี่ยนจาก{' '}
                          <span className="font-bold">{selectedProduct.stock}</span> เป็น{' '}
                          <span className="font-bold text-blue-600">
                            {Number(selectedProduct.stock) + Number(addQty)}
                          </span> {selectedProduct.unit}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={saving}
                  className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium text-sm transition-colors disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={!canSubmitExisting || saving}
                  className={`px-6 py-2.5 rounded-lg text-white font-medium text-sm flex items-center gap-2 shadow-sm transition-colors ${
                    !canSubmitExisting || saving ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      กำลังบันทึก...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      ยืนยันเพิ่มสต็อก
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}