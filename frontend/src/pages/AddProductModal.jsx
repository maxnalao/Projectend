const submit = async (e) => {
  e.preventDefault();
  if (!canSubmit || saving) return;

  const fd = new FormData();
  fd.append("code", code);
  fd.append("name", name);
  fd.append("cost_price", String(costPrice));     // ✅ แก้ไข
  fd.append("selling_price", String(sellingPrice)); // ✅ แก้ไข
  fd.append("stock", String(qty));
  fd.append("unit", unit);
  fd.append("category_name", categoryName);        // ✅ แก้ไข
  if (imageFile) fd.append("image", imageFile);

  setSaving(true);
  try {
    const { data: created } = await api.post("/products/", fd); // ✅ ใช้ api instance
    onSaved?.(created);
    onClose?.();
  } catch (err) {
    console.error("create product error:", err);
    alert(`บันทึกสินค้าไม่สำเร็จ`);
  } finally {
    setSaving(false);
  }
};