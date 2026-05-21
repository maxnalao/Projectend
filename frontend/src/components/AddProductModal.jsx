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
  const [duplicateProduct, setDuplicateProduct] = useState(null);
  const [saving, setSaving] = useState(false);

  // ── กดปุ่มรับเข้า → เปิด Modal ──
  // โหลดข้อมูลเตรียมไว้ก่อนที่ผู้ใช้จะเริ่มกรอก
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        // [1] 
        // → เก็บไว้ใน setCatMap({ ชื่อหมวดหมู่: id }) → ใช้แสดงใน dropdown หมวดหมู่
        const { data: catData } = await api.get("/categories/");
        const arr = Array.isArray(catData) ? catData : (catData.results ?? []);
        const map = {};
        for (const c of arr) map[c.name] = c.id;
        setCatMap(map);

        // [2]
        // → เก็บไว้ใน setExistingProducts (เรียงสต็อกน้อยไปมาก)
        // → ใช้ 2 อย่าง: เช็ครหัสซ้ำ real-time + แสดงใน dropdown tab เพิ่มสต็อกสินค้าเดิม
        const { data: prodData } = await api.get("/products/?show_empty=1");
        const products = Array.isArray(prodData) ? prodData : (prodData.results ?? []);
        const sorted = products.sort((a, b) => Number(a.stock) - Number(b.stock));
        setExistingProducts(sorted);
      } catch {
        setCatMap({});
        setExistingProducts([]);
      }
    })();
  }, [open]);

  // สร้าง URL preview รูปภาพเมื่อเลือกไฟล์
  useEffect(() => {
    if (!imageFile) { setImageUrl(""); return; }
    const url = URL.createObjectURL(imageFile);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  // Reset ค่าทั้งหมดเมื่อปิด Modal
  useEffect(() => {
    if (!open) {
      setMode("new");
      setCode(""); setName(""); setSellingPrice("");
      setQty(""); setUnit("ชิ้น"); setCategoryName("");
      setImageFile(null); setImageUrl("");
      setSelectedProductId(""); setAddQty("");
      setDuplicateProduct(null); setSaving(false);
      setCatMap({}); setExistingProducts([]);
    }
  }, [open]);

  // เช็ครหัสซ้ำ real-time ทุกครั้งที่ code เปลี่ยน
  // → ถ้าเจอ → setDuplicateProduct(found) + auto-fill ชื่อ ราคา หน่วย หมวดหมู่
  // → ถ้าไม่เจอ → setDuplicateProduct(null)
  useEffect(() => {
    if (!code.trim() || existingProducts.length === 0) {
      setDuplicateProduct(null);
      setName(""); setSellingPrice(""); setCategoryName(""); setUnit("ชิ้น");
      return;
    }
    const found = existingProducts.find(
      (p) => p.code.toLowerCase() === code.trim().toLowerCase()
    );
    if (found) {
      setDuplicateProduct(found);
      setName(found.name);
      setSellingPrice(String(found.selling_price || ""));
      setUnit(found.unit || "ชิ้น");
      const catName = Object.keys(catMap).find((key) => catMap[key] === found.category);
      if (catName) setCategoryName(catName);
    } else {
      setDuplicateProduct(null);
    }
  }, [code, existingProducts, catMap]);

  const canSubmitNew = useMemo(
    () => name.trim() && categoryName && Number(sellingPrice) >= 0 && Number(qty) >= 0,
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

  //รหัสซ้ำ → เติมสต็อกสินค้าเดิม
  // คำนวณ newStock = stock เดิม + qty ที่กรอก
  const handleAddToDuplicate = async () => {
    if (!duplicateProduct || !qty || Number(qty) <= 0) return;
    setSaving(true);
    try {
      const newStock = Number(duplicateProduct.stock) + Number(qty);
      const fd = new FormData();
      fd.append("stock", String(newStock));
      await api.patch(`/products/${duplicateProduct.id}/`, fd, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      alert(`เติมสต็อกสำเร็จ! ${duplicateProduct.name} จาก ${duplicateProduct.stock} เป็น ${newStock} ${duplicateProduct.unit}`);
      onSaved?.();
      onClose?.();
    } catch {
      alert("เติมสต็อกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  //สินค้าใหม่ รหัสไม่ซ้ำ
  // submitNew() → เช็ค duplicateProduct ก่อน ถ้า null = สินค้าใหม่จริง
  const submitNew = async (e) => {
    e.preventDefault();
    if (!canSubmitNew || saving) return;

    // รหัสซ้ำ → เบี่ยงไป handleAddToDuplicate() แทน (กรณีที่ 2)
    if (duplicateProduct) {
      await handleAddToDuplicate();
      return;
    }

    setSaving(true);
    try {
      const catId = await getOrCreateCategoryId(categoryName);
      const fd = new FormData();
      fd.append("code", code || `A${Date.now().toString().slice(-3)}`);
      fd.append("name", name);
      fd.append("selling_price", String(sellingPrice));
      fd.append("stock", String(qty));
      fd.append("unit", unit);
      fd.append("category", String(catId));
      if (imageFile) fd.append("image", imageFile);
      await api.post("/products/", fd, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      alert("เพิ่มสินค้าใหม่สำเร็จ!");
      onSaved?.();
      onClose?.();
    } catch (err) {
      alert(`บันทึกสินค้าไม่สำเร็จ (${err?.response?.status ?? "ERR"})`);
    } finally {
      setSaving(false);
    }
  };

  //เลือกสินค้าเดิมจาก dropdown
  // คำนวณ newStock = stock เดิม + addQty ที่กรอก
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
    } catch {
      alert(`เพิ่มสต็อกไม่สำเร็จ`);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const selectedProduct = existingProducts.find(p => String(p.id) === String(selectedProductId));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div ref={dialogRef} className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl transform transition-all">

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
            <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="mt-4 flex items-center gap-2 bg-white rounded-lg p-1">
            <button type="button" onClick={() => setMode("new")}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${mode === "new" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}>
              เพิ่มสินค้าใหม่
            </button>
            <button type="button" onClick={() => setMode("existing")}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${mode === "existing" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}>
              เพิ่มสต็อกสินค้าเดิม
            </button>
          </div>
        </div>

        <div className="p-6">
          {mode === "new" ? (
            <form onSubmit={submitNew}>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          รหัสสินค้า <span className="text-gray-400 font-normal text-xs ml-1">(ถ้าไม่ใส่จะสร้างอัตโนมัติ)</span>
                        </label>
                        {/* พิมพ์รหัส → useEffect เช็คซ้ำ real-time → auto-fill ถ้าซ้ำ */}
                        <input value={code} onChange={(e) => setCode(e.target.value)}
                          className={`w-full border rounded-lg px-4 py-2.5 text-sm outline-none transition-all ${duplicateProduct ? 'border-amber-400 bg-amber-50' : 'border-gray-300'}`}
                          placeholder="เช่น A100" />
                        {/* แสดงคำเตือนเมื่อรหัสซ้ำ */}
                        {duplicateProduct && (
                          <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <p className="font-semibold text-amber-800 text-sm">รหัสนี้มีอยู่แล้ว!</p>
                            <p className="text-amber-700 text-sm mt-1">
                              {duplicateProduct.name} — คงเหลือ: {duplicateProduct.stock} {duplicateProduct.unit}
                            </p>
                            <p className="text-amber-600 text-xs mt-1">
                              กรอกแค่ "จำนวนที่รับเข้า" แล้วกด "เติมสต็อก" ได้เลย
                            </p>
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          ชื่อสินค้า <span className="text-red-500">*</span>
                        </label>
                        <input
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          disabled={!!duplicateProduct}
                          className={`w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none transition-all ${duplicateProduct ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                          placeholder="เช่น โค้ก 500 มล."
                          required
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          ราคาขาย (฿) <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">฿</span>
                          <input
                            type="number" step="0.01" min="0"
                            value={sellingPrice}
                            onChange={(e) => setSellingPrice(e.target.value)}
                            disabled={!!duplicateProduct}
                            className={`w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2.5 text-sm outline-none transition-all ${duplicateProduct ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                            placeholder="0.00"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          {duplicateProduct ? "จำนวนที่รับเข้า" : "จำนวนเริ่มต้น"} <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number" min="0"
                          value={qty}
                          onChange={(e) => setQty(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none transition-all"
                          placeholder={duplicateProduct ? "ระบุจำนวนที่รับเข้า" : "0"}
                          required
                        />
                        {/* แสดงสต็อกใหม่ = เดิม + รับเข้า (คำนวณใน JSX ไม่เรียก API) */}
                        {duplicateProduct && qty && Number(qty) > 0 && (
                          <p className="text-xs text-blue-600 mt-1 font-medium">
                            สต็อกจะเปลี่ยนจาก <strong>{duplicateProduct.stock}</strong> เป็น{" "}
                            <strong>{Number(duplicateProduct.stock) + Number(qty)}</strong> {duplicateProduct.unit}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          หมวดหมู่ <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={categoryName}
                          onChange={(e) => setCategoryName(e.target.value)}
                          disabled={!!duplicateProduct}
                          className={`w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none transition-all ${duplicateProduct ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                          required
                        >
                          <option value="">เลือกหมวดหมู่</option>
                          {DEFAULT_CATS.map((n) => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          หน่วยสินค้า <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={unit}
                          onChange={(e) => setUnit(e.target.value)}
                          disabled={!!duplicateProduct}
                          className={`w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none transition-all ${duplicateProduct ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                        >
                          {UNIT_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {!duplicateProduct && (
                  <div className="lg:col-span-1">
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-blue-400 transition-colors">
                      {imageUrl ? (
                        <div className="space-y-3">
                          <img src={imageUrl} alt="preview" className="w-full h-48 object-contain rounded-lg" />
                          <button type="button" onClick={() => { setImageUrl(""); setImageFile(null); }}
                            className="text-xs text-red-600 hover:text-red-700 font-medium">ลบรูปภาพ</button>
                        </div>
                      ) : (
                        <div className="space-y-3 py-6">
                          <p className="text-sm text-gray-600 font-medium">อัพโหลดรูปภาพ</p>
                          <p className="text-xs text-gray-400">PNG, JPG, WEBP</p>
                        </div>
                      )}
                      <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} className="hidden" id="modalImageInput" />
                      {!imageUrl && (
                        <label htmlFor="modalImageInput" className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer text-sm font-medium transition-colors">
                          เลือกรูปภาพ
                        </label>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t">
                <button type="button" onClick={onClose} disabled={saving}
                  className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium text-sm transition-colors disabled:opacity-50">
                  ยกเลิก
                </button>
                <button type="submit" disabled={!canSubmitNew || saving}
                  className={`px-6 py-2.5 rounded-lg text-white font-medium text-sm flex items-center gap-2 shadow-sm transition-colors ${!canSubmitNew || saving ? 'bg-gray-300 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                  {saving ? "กำลังบันทึก..." : duplicateProduct ? "เติมสต็อก" : "เพิ่มสินค้า"}
                </button>
              </div>
            </form>

          ) : (
            <form onSubmit={submitExisting}>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">เลือกสินค้า <span className="text-red-500">*</span></label>
                  <select value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm outline-none transition-all" required>
                    <option value="">-- เลือกสินค้าที่ต้องการเพิ่มสต็อก --</option>
                    {existingProducts.map((p) => {
                      const stock = Number(p.stock);
                      const badge = stock === 0 ? "หมด" : stock < 5 ? "ใกล้หมด" : "ปกติ";
                      return <option key={p.id} value={p.id}>[{badge}] {p.code} - {p.name} (คงเหลือ: {p.stock} {p.unit})</option>;
                    })}
                  </select>
                </div>

                {selectedProduct && (
                  <>
                    <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-2">
                      <div className="flex justify-between"><span>รหัส:</span><span className="font-mono font-semibold">{selectedProduct.code}</span></div>
                      <div className="flex justify-between"><span>ชื่อ:</span><span className="font-semibold">{selectedProduct.name}</span></div>
                      <div className="flex justify-between"><span>คงเหลือ:</span>
                        <span className={`text-lg font-bold ${Number(selectedProduct.stock) === 0 ? 'text-rose-600' : Number(selectedProduct.stock) < 5 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {selectedProduct.stock} {selectedProduct.unit}
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">จำนวนที่ต้องการเพิ่ม <span className="text-red-500">*</span></label>
                      <input type="number" min="1" value={addQty} onChange={(e) => setAddQty(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm outline-none transition-all"
                        placeholder="ระบุจำนวน" required />
                    </div>
                    {/* แสดงสต็อกใหม่ = เดิม + รับเข้า (คำนวณใน JSX ไม่เรียก API) */}
                    {addQty && Number(addQty) > 0 && (
                      <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4">
                        <p className="text-sm text-blue-800">
                          สต็อกจะเปลี่ยนจาก <strong>{selectedProduct.stock}</strong> เป็น{" "}
                          <strong className="text-blue-600">{Number(selectedProduct.stock) + Number(addQty)}</strong> {selectedProduct.unit}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t">
                <button type="button" onClick={onClose} disabled={saving}
                  className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium text-sm disabled:opacity-50">
                  ยกเลิก
                </button>
                <button type="submit" disabled={!canSubmitExisting || saving}
                  className={`px-6 py-2.5 rounded-lg text-white font-medium text-sm flex items-center gap-2 ${!canSubmitExisting || saving ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}>
                  {saving ? "กำลังบันทึก..." : "ยืนยันเพิ่มสต็อก"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}