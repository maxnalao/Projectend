// src/components/EditListingModal.jsx
import { useEffect, useState } from "react";
import api from "../api";

const UNIT_OPTIONS = ["ชิ้น", "ขวด", "กล่อง", "ซอง", "แพ็ค", "ถุง", "กระป๋อง", "ลัง"];

export default function EditListingModal({ open, listing, onClose, onSaved }) {
  // เก็บข้อมูลในฟอร์ม
  const [title, setTitle]         = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [unit, setUnit]           = useState("");
  const [quantity, setQuantity]   = useState("");
  const [image, setImage]         = useState(null);
  const [preview, setPreview]     = useState("");
  const [saving, setSaving]       = useState(false);

  // เมื่อ Modal เปิด → ดึงข้อมูลสินค้าเดิมมาใส่ฟอร์ม
  useEffect(() => {
    if (!listing) return;
    setTitle(listing.title || listing.product_name || "");
    setSalePrice(listing.sale_price ?? listing.selling_price ?? "");
    setUnit(listing.unit || "");
    setQuantity(listing.quantity ?? 0);
    setPreview(listing.image_url || "");
    setImage(null);
  }, [listing]);

  // ถ้า Modal ยังไม่เปิดหรือไม่มี listing → ไม่แสดงอะไร
  if (!open || !listing) return null;

  // ข้อมูลอ่านอย่างเดียว (แก้ไขไม่ได้)
  const productCode  = listing.product_code || listing.code || "-";
  const productName  = listing.product_name || listing.title || "สินค้า";
  const categoryName = listing.category_name || "-";

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      // สร้าง FormData รองรับทั้งข้อความและรูปภาพ
      const fd = new FormData();
      fd.append("title",    title.trim());
      fd.append("unit",     unit?.trim() || "");
      fd.append("quantity", String(parseInt(quantity || 0, 10)));
      if (salePrice !== "") fd.append("sale_price", parseFloat(salePrice));
      if (image)            fd.append("image", image); // แนบรูปเฉพาะถ้าเลือกรูปใหม่

      // เสร็จสิ้นการแก้ไข แล้วส่งข้อมูลไปยัง Backend
      const res = await api.patch(`/listings/${listing.id}/`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.status === 200) {
        alert("บันทึกข้อมูลสำเร็จ!");
        // แจ้ง ProductsPage ให้ load() ใหม่ → ตารางอัปเดต
        if (onSaved) await onSaved();
      } else {
        alert(`บันทึกไม่สำเร็จ (${res.status})`);
      }
    } catch (err) {
      alert(`บันทึกไม่สำเร็จ: ${err?.response?.data ? JSON.stringify(err.response.data) : err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* พื้นหลังมืด กดปิด Modal ได้ */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 px-6 py-4 border-b bg-gradient-to-r from-amber-50 to-orange-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">แก้ไขรายการสินค้า</h2>
                <p className="text-xs text-gray-500">แก้ไขข้อมูลสินค้าที่แสดงในหน้ารายการ</p>
              </div>
            </div>
            {/* ปุ่ม X ปิด Modal */}
            <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Form — onSubmit เรียก onSubmit() เมื่อกดบันทึก */}
        <form onSubmit={onSubmit} className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ซ้าย: ฟอร์มกรอกข้อมูล */}
            <div className="lg:col-span-2 space-y-6">

              {/* ข้อมูลอ่านอย่างเดียว — ไม่สามารถแก้ไขได้ */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-700">ข้อมูลอ้างอิง (อ่านอย่างเดียว)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">รหัสสินค้า</label>
                    <input value={productCode} disabled className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm bg-gray-50 text-gray-600 cursor-not-allowed font-mono font-semibold" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">หมวดหมู่</label>
                    <input value={categoryName} disabled className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm bg-gray-50 text-gray-600 cursor-not-allowed" />
                  </div>
                </div>
              </div>

              {/* ข้อมูลที่แก้ไขได้ */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-700">ข้อมูลที่แก้ไขได้</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  {/* ชื่อแสดง */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      ชื่อแสดง <span className="text-gray-400 font-normal text-xs">(ว่างไว้ = ใช้ชื่อจากสต็อก)</span>
                    </label>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder={productName}
                    />
                  </div>

                  {/* ราคาขาย */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      ราคาขาย (฿) <span className="text-gray-400 font-normal text-xs">(ว่างไว้ = ใช้ราคาจากสต็อก)</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">฿</span>
                      <input
                        type="number" step="0.01" min="0"
                        value={salePrice}
                        onChange={(e) => setSalePrice(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {/* หน่วย */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      หน่วยแสดง <span className="text-gray-400 font-normal text-xs">(ว่างไว้ = ใช้หน่วยจากสต็อก)</span>
                    </label>
                    <select
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="">ใช้จากสต็อก</option>
                      {UNIT_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>

                  {/* จำนวนคงเหลือ */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">จำนวนคงเหลือ</label>
                    <input
                      type="number" min={0}
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ขวา: อัปโหลดรูปภาพ */}
            <div className="lg:col-span-1">
              <h3 className="text-sm font-bold text-gray-700 mb-4">รูปสำหรับหน้าแสดง</h3>
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-blue-400 transition-colors">
                {preview ? (
                  <div className="space-y-3">
                    {/* แสดง preview รูปที่เลือก */}
                    <img src={preview} alt="preview" className="w-full h-56 object-contain rounded-lg bg-gray-50" />
                    <button type="button" onClick={() => { setPreview(""); setImage(null); }} className="text-xs text-red-600 font-medium">
                      ลบรูปภาพ
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 py-8">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-600 font-medium">อัพโหลดรูปภาพใหม่</p>
                    <p className="text-xs text-gray-400">PNG, JPG, WEBP</p>
                  </div>
                )}
                {/* input file ซ่อนไว้ ใช้ label เปิดแทน */}
                <input
                  type="file" accept="image/*" id="editImageInput"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    setImage(file || null);
                    if (file) setPreview(URL.createObjectURL(file)); // แสดง preview ทันที
                  }}
                />
                {!preview && (
                  <label htmlFor="editImageInput" className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg cursor-pointer text-sm font-medium">
                    เลือกรูปภาพ
                  </label>
                )}
              </div>
              <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-3 mt-4">
                <p className="text-xs text-blue-800"><span className="font-semibold">หมายเหตุ:</span> ถ้าไม่อัพโหลดรูปใหม่ จะใช้รูปจากสต็อก</p>
              </div>
            </div>
          </div>

          {/* ปุ่มยกเลิก / บันทึก */}
          <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t">
            <button type="button" onClick={onClose} disabled={saving} className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium text-sm disabled:opacity-50">
              ยกเลิก
            </button>
            <button type="submit" disabled={saving} className={`px-6 py-2.5 rounded-lg text-white font-medium text-sm flex items-center gap-2 ${saving ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}>
              {saving ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>กำลังบันทึก...</>
              ) : (
                <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>บันทึกการแก้ไข</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}