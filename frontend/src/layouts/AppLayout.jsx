import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useRef, useState, useMemo } from "react";
import { useUser } from "../context/UserContext";
import api from "../api";

function NavItem({ to, children, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        "px-3 py-1.5 rounded-md text-sm font-medium transition-colors " +
        (isActive ? "bg-black text-white" : "text-slate-700 hover:bg-slate-100")
      }
      end
    >
      {children}
    </NavLink>
  );
}

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);
  
  const { user } = useUser();

  // ✅ เช็คว่า Admin หรือ Employee
  const isAdmin = user?.is_staff || user?.is_superuser || false;

  useEffect(() => {
    setMenuOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function onDocClick(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const logout = () => {
    if (window.confirm("ต้องการออกจากระบบใช่หรือไม่?")) {
      localStorage.removeItem("access");
      localStorage.removeItem("refresh");
      navigate("/login", { replace: true });
    }
  };

  // ✅ Navbar items ตามสิทธิ์
  const navItems = useMemo(() => {
    const baseItems = [];
    
    if (isAdmin) {
      // ✅ Admin เห็น: ภาพรวม, สินค้า, สต็อก, จัดการงาน, ประวัติ, ผู้ใช้
      baseItems.push(
        { to: "/overview", label: "ภาพรวม" },
        { to: "/products", label: "สินค้า" },
        { to: "/stock", label: "สต็อกสินค้า" },
        { to: "/festivals", label: "ปฏิทิน" },
        { to: "/task-management", label: "จัดการงาน" },
        { to: "/history", label: "ประวัติ" },
        { to: "/users", label: "ผู้ใช้" }
      );
    } else {
      // ✅ Employee เห็น: แดชบอร์ด, งานของฉัน, สินค้า, สต็อกสินค้า, ประวัติ
      baseItems.push(
        { to: "/dashboard", label: "แดชบอร์ด" },
        { to: "/tasks", label: "งานของฉัน" },
        { to: "/products", label: "สินค้า" },
        { to: "/stock", label: "สต็อกสินค้า" },
        { to: "/history", label: "ประวัติ" }
      );
    }
    
    return baseItems;
  }, [isAdmin]);

  const userName = user?.first_name && user?.last_name
    ? `${user.first_name} ${user.last_name}`
    : user?.username || "ผู้ใช้งาน";

  const userEmail = user?.email || "user@example.com";
  const userInitial = userName.charAt(0).toUpperCase();

  const profileImageUrl = user?.profile_image
    ? (user.profile_image.startsWith('http')
        ? user.profile_image
        : `${api.defaults.baseURL}${user.profile_image}`)
    : null;

  console.log("🔍 AppLayout - User:", user);
  console.log("🔍 AppLayout - isAdmin:", isAdmin);
  console.log("🔍 AppLayout - navItems:", navItems);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              className="sm:hidden p-2 hover:bg-slate-100 rounded-md transition-colors"
              aria-label="เปิดเมนู"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className="font-extrabold text-xl tracking-tight select-none text-gray-800">
              EasyStock
            </div>

            <nav className="hidden sm:flex items-center gap-1 ml-6" aria-label="เมนูหลัก">
              {navItems.map((n) => (
                <NavItem key={n.to} to={n.to}>
                  {n.label}
                </NavItem>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen((v) => !v)}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full"
                aria-haspopup="menu"
                aria-expanded={profileOpen}
              >
                {profileImageUrl ? (
                  <img
                    src={profileImageUrl}
                    alt="โปรไฟล์"
                    className="h-10 w-10 rounded-full border-2 border-gray-300 hover:border-blue-500 transition-colors object-cover"
                    key={user?.profile_image}
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full border-2 border-gray-300 hover:border-blue-500 transition-colors bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
                    {userInitial}
                  </div>
                )}
                <span className="hidden sm:block text-sm font-medium text-gray-700">
                  {userName}
                </span>
                <svg 
                  className={`hidden sm:block w-4 h-4 text-gray-500 transition-transform ${profileOpen ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {profileOpen && (
                <div
                  className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden"
                  role="menu"
                >
                  <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                    <div className="flex items-center gap-3">
                      {profileImageUrl ? (
                        <img
                          src={profileImageUrl}
                          alt="โปรไฟล์"
                          className="h-12 w-12 rounded-full border-2 border-blue-300 object-cover"
                          key={user?.profile_image}
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full border-2 border-blue-300 bg-blue-500 flex items-center justify-center text-white font-bold">
                          {userInitial}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{userName}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{userEmail}</p>
                        {/* ✅ แสดง role */}
                        <p className="text-xs text-blue-600 mt-1 font-medium">
                          {isAdmin ? "👤 ผู้ดูแลระบบ" : "👨‍💼 พนักงาน"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="py-1">
                    {/* ✅ ดูโปรไฟล์ */}
                    <button
                      onClick={() => {
                        navigate("/profile");
                        setProfileOpen(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 flex items-center gap-3 transition-colors"
                      role="menuitem"
                    >
                      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span className="font-medium">ดูโปรไฟล์</span>
                    </button>

                    {/* ✅ แจ้งเตือน LINE */}
                    <button
                      onClick={() => {
                        navigate("/line-notifications");
                        setProfileOpen(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-green-700 hover:bg-green-50 flex items-center gap-3 transition-colors group"
                      role="menuitem"
                    >
                      <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                      </svg>
                      <span className="font-medium group-hover:text-green-800">แจ้งเตือน LINE</span>
                    </button>
                  </div>

                  <div className="border-t border-gray-100 py-1">
                    {/* ✅ ออกจากระบบ */}
                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        logout();
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors font-medium"
                      role="menuitem"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span>ออกจากระบบ</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {menuOpen && (
          <nav className="sm:hidden border-t border-slate-200 bg-white shadow-inner">
            <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col gap-2">
              {navItems.map((n) => (
                <NavItem key={n.to} to={n.to} onClick={() => setMenuOpen(false)}>
                  {n.label}
                </NavItem>
              ))}
            </div>
          </nav>
        )}
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}