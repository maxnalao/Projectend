const submit = async (e) => {
  e.preventDefault();
  if (!canSubmit || saving) return;

  const fd = new FormData();
  fd.append("code", code);
  fd.append("name", name);
  fd.append("price", String(price));
  fd.append("stock", String(qty));
  fd.append("unit", unit);
  fd.append("category", String(categoryId)); // ส่งเป็น id
  if (imageFile) fd.append("image", imageFile);

  // ✅ ใช้ key ให้ตรงกับที่ระบบเก็บจริง
  const token = localStorage.getItem("access");

  setSaving(true);
  try {
    const { data: created } = await api.post("/products/", fd, {
      // ไม่ต้อง set Content-Type เอง ให้ axios ใส่ boundary ให้
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    onSaved?.(created);
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
