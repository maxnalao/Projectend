import { useEffect, useMemo, useRef, useState } from "react";
import api from "../api";

const DEFAULT_CATS = ["เครื่องดื่ม", "เครื่องปรุง", "อาหาร", "อื่นๆ"];
const UNIT_OPTIONS = ["ชิ้น", "ขวด", "กล่อง", "ซอง", "แพ็ค", "ถุง", "กระป๋อง", "ลัง"];

export default function AddProductModal({ open, onClose, onSaved }) {
  const dialogRef = useRef(null);

  // โหมด: "new" = เพิ่มสินค้าใหม่, "existing" = เพิ่มสต็อกสินค้าเดิม
  const [mode, setMode] = useState("new");

  // State ฟอร์มเพิ่มสินค้าใหม่
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("ชิ้น");
  const [categoryName, setCategoryName] = useState("");
  const [catMap, setCatMap] = useState({}); // เก็บ ชื่อหมวดหมู่ → id
  const [imageFile, setImageFile] = useState(null);
  const [imageUrl, setImageUrl] = useState("");

  // State ฟอร์มเพิ่มสต็อกสินค้าเดิม
  const [existingProducts, setExistingProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [addQty, setAddQty] = useState("");

  const [duplicateProduct, setDuplicateProduct] = useState(null); // สินค้าที่รหัสซ้ำ
  const [saving, setSaving] = useState(false);

  // ── Sequence: เปิด Modal → GET categories + GET products ──
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        // GET /categories/ → setCatMap(ชื่อ → id)
        const { data: catData } = await api.get("/categories/");
        const arr = Array.isArray(catData) ? catData : (catData.results ?? []);
        const map = {};
        for (const c of arr) map[c.name] = c.id;
        setCatMap(map);

        // GET /products/?show_empty=1 → ดึงสินค้าทั้งหมดรวมที่หมดสต็อก
        const { data: prodData } = await api.get("/products/?show_empty=1");
        // ถ้าเป็น array → ใช้เลย / ถ้าเป็น object ที่มี .results → ใช้ .results / ถ้าไม่มี → ใช้ []
        const products = Array.isArray(prodData) ? prodData : (prodData.results ?? []);
        // เรียงจากสต็อกน้อยไปมาก
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
    const url = URL.createObjectURL(imageFile); // สร้าง URL ชั่วคราว
    setImageUrl(url);
    return () => URL.revokeObjectURL(url); // ล้าง URL เมื่อปิด
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

  // เช็ครหัสซ้ำแบบ real-time ทุกครั้งที่พิมพ์รหัสสินค้า
  useEffect(() => {
    if (!code.trim() || existingProducts.length === 0) {
      setDuplicateProduct(null);
      return;
    }
    // หาสินค้าที่รหัสตรงกัน (ไม่สนตัวพิมพ์ใหญ่เล็ก)
    const found = existingProducts.find(
      (p) => p.code.toLowerCase() === code.trim().toLowerCase()
    );
    setDuplicateProduct(found || null); // เจอ → เก็บ object / ไม่เจอ → null
  }, [code, existingProducts]);

  // เช็คว่ากรอกข้อมูลครบพอจะกดบันทึกไหม
  const canSubmitNew = useMemo(
    () => name.trim() && categoryName && Number(sellingPrice) >= 0 && Number(qty) >= 0,
    [name, categoryName, sellingPrice, qty]
  );

  const canSubmitExisting = useMemo(
    () => selectedProductId && Number(addQty) > 0,
    [selectedProductId, addQty]
  );

  // หา id หมวดหมู่ ถ้าไม่มี → สร้างใหม่
  async function getOrCreateCategoryId(name) {
    if (catMap[name]) return catMap[name]; // มีอยู่แล้ว → ใช้ id เดิม
    try {
      // POST /categories/ → Category.objects.create()
      const { data: created } = await api.post("/categories/", { name });
      setCatMap(prev => ({ ...prev, [name]: created.id }));
      return created.id;
    } catch (err) {
      // POST ไม่สำเร็จ → ลอง GET มาเช็คอีกครั้ง
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

  // ── [รหัสซ้ำ] → เติมสต็อกสินค้าเดิม ──
  const handleAddToDuplicate = async () => {
    if (!duplicateProduct || !qty || Number(qty) <= 0) return;
    setSaving(true);
    try {
      const newStock = Number(duplicateProduct.stock) + Number(qty); // คำนวณสต็อกใหม่
      const fd = new FormData();
      fd.append("stock", String(newStock));
      // PATCH /products/{id}/ → product.stock = newStock → save()
      await api.patch(`/products/${duplicateProduct.id}/`, fd, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      alert(`เติมสต็อกสำเร็จ! ${duplicateProduct.name} จาก ${duplicateProduct.stock} เป็น ${newStock} ${duplicateProduct.unit}`);
      onSaved?.(); // แจ้ง StockPage ให้โหลดใหม่
      onClose?.(); // ปิด Modal
    } catch (err) {
      alert("เติมสต็อกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  // ── [ไม่ซ้ำ] → สร้างสินค้าใหม่ ──
  const submitNew = async (e) => {
    e.preventDefault();
    if (!canSubmitNew || saving) return;

    // ถ้ารหัสซ้ำ → ถามก่อนว่าจะเติมสต็อกสินค้าเดิมไหม
    if (duplicateProduct) {
      const confirmAdd = window.confirm(
        `รหัส "${code}" มีอยู่แล้ว: ${duplicateProduct.name}\n\nต้องการเติมสต็อกเข้าสินค้าตัวนี้หรือไม่?`
      );
      if (confirmAdd) { await handleAddToDuplicate(); return; }
      else return; // ยกเลิก → ไม่ทำอะไร
    }

    setSaving(true);
    try {
      // หา/สร้าง id หมวดหมู่
      const catId = await getOrCreateCategoryId(categoryName);

      // สร้าง FormData เพราะต้องส่งรูปภาพด้วย
      const fd = new FormData();
      fd.append("code", code || `A${Date.now().toString().slice(-3)}`); // ถ้าไม่กรอก → สร้างอัตโนมัติ
      fd.append("name", name);
      fd.append("selling_price", String(sellingPrice));
      fd.append("stock", String(qty));
      fd.append("unit", unit);
      fd.append("category", String(catId));
      if (imageFile) fd.append("image", imageFile); // แนบรูปถ้ามี

      // POST /products/ → ProductSerializer validate → Product.objects.create() → 201
      await api.post("/products/", fd, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      alert("เพิ่มสินค้าใหม่สำเร็จ!");
      onSaved?.(); // StockPage โหลดใหม่
      onClose?.(); // ปิด Modal
    } catch (err) {
      alert(`บันทึกสินค้าไม่สำเร็จ (${err?.response?.status ?? "ERR"})`);
    } finally {
      setSaving(false);
    }
  };

  // ── เพิ่มสต็อกสินค้าเดิม (mode = "existing") ──
  const submitExisting = async (e) => {
    e.preventDefault();
    if (!canSubmitExisting || saving) return;
    setSaving(true);
    try {
      const product = existingProducts.find(p => String(p.id) === String(selectedProductId));
      if (!product) throw new Error("ไม่พบสินค้า");
      const newStock = Number(product.stock) + Number(addQty); // สต็อกใหม่ = เดิม + ที่เพิ่ม
      const fd = new FormData();
      fd.append("stock", String(newStock));
      // PATCH /products/{id}/ → อัปเดตสต็อก
      await api.patch(`/products/${product.id}/`, fd, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      alert(`เพิ่มสต็อกสำเร็จ! ${product.name} จาก ${product.stock} เป็น ${newStock} ${product.unit}`);
      onSaved?.();
      onClose?.();
    } catch (err) {
      alert(`เพิ่มสต็อกไม่สำเร็จ`);
    } finally {
      setSaving(false);
    }
  };

  // ถ้า Modal ไม่ได้เปิด → ไม่ render อะไรเลย
  if (!open) return null;

  // หาข้อมูลสินค้าที่เลือกสำหรับแสดงผล
  const selectedProduct = existingProducts.find(p => String(p.id) === String(selectedProductId));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* พื้นหลังมืด กดปิด Modal ได้ */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div ref={dialogRef} className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl transform transition-all">

        {/* Header + ปุ่มสลับ mode */}
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
            {/* ปุ่ม X ปิด Modal */}
            <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {/* ปุ่มสลับ mode เพิ่มใหม่ / เพิ่มสต็อกเดิม */}
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
          {/* ── mode = "new" → ฟอร์มเพิ่มสินค้าใหม่ ── */}
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
                        <input value={code} onChange={(e) => setCode(e.target.value)}
                          // สีเหลืองถ้ารหัสซ้ำ
                          className={`w-full border rounded-lg px-4 py-2.5 text-sm outline-none transition-all ${duplicateProduct ? 'border-amber-400 bg-amber-50' : 'border-gray-300'}`}
                          placeholder="เช่น A100" />
                        {/* แสดงคำเตือนเมื่อรหัสซ้ำ */}
                        {duplicateProduct && (
                          <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <p className="font-semibold text-amber-800 text-sm">รหัสนี้มีอยู่แล้ว!</p>
                            <p className="text-amber-700 text-sm mt-1">{duplicateProduct.name} — คงเหลือ: {duplicateProduct.stock} {duplicateProduct.unit}</p>
                            <p className="text-amber-600 text-xs mt-1">กดปุ่ม "เพิ่มสินค้า" จะถามให้เติมสต็อกเข้าตัวเดิมอัตโนมัติ</p>
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">ชื่อสินค้า <span className="text-red-500">*</span></label>
                        <input value={name} onChange={(e) => setName(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none transition-all"
                          placeholder="เช่น โค้ก 500 มล." required />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">ราคาขาย (฿) <span className="text-red-500">*</span></label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">฿</span>
                          <input type="number" step="0.01" min="0" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2.5 text-sm outline-none transition-all"
                            placeholder="0.00" required />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">จำนวนเริ่มต้น <span className="text-red-500">*</span></label>
                        <input type="number" min="0" value={qty} onChange={(e) => setQty(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none transition-all"
                          placeholder="0" required />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">หมวดหมู่ <span className="text-red-500">*</span></label>
                        <select value={categoryName} onChange={(e) => setCategoryName(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none transition-all" required>
                          <option value="">เลือกหมวดหมู่</option>
                          {DEFAULT_CATS.map((n) => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">หน่วยสินค้า <span className="text-red-500">*</span></label>
                        <select value={unit} onChange={(e) => setUnit(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none transition-all">
                          {UNIT_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* อัปโหลดรูปภาพ */}
                <div className="lg:col-span-1">
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-blue-400 transition-colors">
                    {imageUrl ? (
                      <div className="space-y-3">
                        {/* แสดง preview รูปที่เลือก */}
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
                    {/* input file ซ่อนไว้ ใช้ label เปิดแทน */}
                    <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} className="hidden" id="modalImageInput" />
                    {!imageUrl && (
                      <label htmlFor="modalImageInput" className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer text-sm font-medium transition-colors">
                        เลือกรูปภาพ
                      </label>
                    )}
                  </div>
                </div>
              </div>

              {/* ปุ่มยกเลิก / เพิ่มสินค้า */}
              <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t">
                <button type="button" onClick={onClose} disabled={saving}
                  className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium text-sm transition-colors disabled:opacity-50">ยกเลิก</button>
                {/* disabled ถ้ากรอกไม่ครบหรือกำลังบันทึก */}
                <button type="submit" disabled={!canSubmitNew || saving}
                  className={`px-6 py-2.5 rounded-lg text-white font-medium text-sm flex items-center gap-2 shadow-sm transition-colors ${!canSubmitNew || saving ? 'bg-gray-300 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                  {saving ? "กำลังบันทึก..." : "เพิ่มสินค้า"}
                </button>
              </div>
            </form>

          ) : (
            /* ── mode = "existing" → ฟอร์มเพิ่มสต็อกสินค้าเดิม ── */
            <form onSubmit={submitExisting}>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">เลือกสินค้า <span className="text-red-500">*</span></label>
                  {/* dropdown แสดงสินค้าทั้งหมด พร้อมสถานะสต็อก */}
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

                {/* แสดงข้อมูลสินค้าที่เลือก */}
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
                    {/* แสดงผลลัพธ์ที่จะเปลี่ยนแปลง */}
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

              {/* ปุ่มยกเลิก / ยืนยันเพิ่มสต็อก */}
              <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t">
                <button type="button" onClick={onClose} disabled={saving}
                  className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium text-sm disabled:opacity-50">ยกเลิก</button>
                {/* disabled ถ้ายังไม่เลือกสินค้าหรือไม่ได้กรอกจำนวน */}
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