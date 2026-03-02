import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";
import {
  LayoutDashboard,
  Upload,
  Settings,
  LogOut,
  Menu,
  X,
  Bot,
  Share2,
  ChevronLeft,
  ChevronRight,
  ChevronRight as ChevronRightSmall,
  Bell,
  Home,
} from "lucide-react";
import { clsx } from "clsx";

const SIDEBAR_STORAGE_KEY = "admin-sidebar-collapsed";

const routeTitles = {
  "/dashboard": "Dashboard",
  "/upload": "Upload FAQ",
  "/integrations": "Integrations",
  "/settings": "Settings",
};

const getInitials = (name) => {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const getAvatarColor = (name) => {
  if (!name) return "bg-indigo-500";
  const colors = [
    "bg-indigo-500",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-rose-500",
    "bg-cyan-500",
    "bg-violet-500",
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
};

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(SIDEBAR_STORAGE_KEY) ?? "false");
    } catch {
      return false;
    }
  });
  const { user, logout } = useAuth();
  const location = useLocation();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Upload FAQ", href: "/upload", icon: Upload },
    { name: "Integrations", href: "/integrations", icon: Share2 },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  const isActive = (path) => location.pathname === path;
  const currentPageTitle =
    routeTitles[location.pathname] || location.pathname.slice(1) || "Dashboard";

  const sidebarContent = (
    <>
      <div className="flex h-16 shrink-0 items-center px-4">
        <Bot className="h-8 w-8 shrink-0 text-indigo-400" />
        {!sidebarCollapsed && (
          <span className="ml-3 truncate text-lg font-semibold text-white">
            Support Widget
          </span>
        )}
      </div>
      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={() => setSidebarOpen(false)}
              className={clsx(
                "group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "border-l-4 border-indigo-500 bg-gray-800/80 text-white"
                  : "border-l-4 border-transparent text-gray-300 hover:bg-gray-800/60 hover:text-white",
                sidebarCollapsed && "justify-center px-2"
              )}
            >
              <Icon
                className={clsx(
                  "h-5 w-5 shrink-0",
                  active ? "text-indigo-400" : "text-gray-400 group-hover:text-gray-300",
                  !sidebarCollapsed && "mr-3"
                )}
              />
              {!sidebarCollapsed && item.name}
            </Link>
          );
        })}
      </nav>
      {!sidebarCollapsed && (
        <div className="border-t border-gray-700/50 p-4">
          <div className="flex items-center gap-3">
            <div
              className={clsx(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white",
                getAvatarColor(user?.name)
              )}
            >
              {getInitials(user?.name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">
                {user?.name || "User"}
              </p>
              <p className="truncate text-xs text-gray-400">{user?.email}</p>
            </div>
          </div>
        </div>
      )}
      {sidebarCollapsed && (
        <div className="border-t border-gray-700/50 p-3">
          <div
            className={clsx(
              "mx-auto flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white",
              getAvatarColor(user?.name)
            )}
          >
            {getInitials(user?.name)}
          </div>
        </div>
      )}
      <div className="border-t border-gray-700/50 p-3">
        <p
          className={clsx(
            "text-center text-xs text-gray-500",
            sidebarCollapsed ? "" : "text-left"
          )}
        >
          v1.0.0
        </p>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div
        className={clsx(
          "fixed inset-0 z-50 lg:hidden",
          sidebarOpen ? "block" : "hidden"
        )}
      >
        <div
          className={clsx(
            "fixed inset-0 bg-gray-900/60 transition-opacity duration-300",
            sidebarOpen ? "opacity-100" : "opacity-0"
          )}
          onClick={() => setSidebarOpen(false)}
        />
        <div
          className={clsx(
            "fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-gray-900 shadow-xl transition-transform duration-300 ease-in-out",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {sidebarContent}
        </div>
      </div>

      <div
        className={clsx(
          "hidden lg:fixed lg:inset-y-0 lg:flex lg:flex-col lg:bg-gray-900",
          sidebarCollapsed ? "lg:w-20" : "lg:w-64"
        )}
      >
        <div className="flex flex-1 flex-col">
          {sidebarContent}
        </div>
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border border-gray-600 bg-gray-900 text-gray-400 shadow-md hover:bg-gray-800 hover:text-white"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      <div
        className={clsx(
          "transition-[padding] duration-200",
          sidebarCollapsed ? "lg:pl-20" : "lg:pl-64"
        )}
      >
        <div className="sticky top-0 z-40 flex flex-col border-b border-gray-200 bg-white shadow-sm">
          <div className="flex h-16 shrink-0 items-center gap-x-4 px-4 sm:gap-x-6 sm:px-6 lg:px-8">
            <button
              type="button"
              className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex flex-1 items-center justify-between">
              <h1 className="text-lg font-semibold text-gray-900">
                {currentPageTitle}
              </h1>
              <div className="flex items-center gap-x-2">
                <button className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700">
                  <Bell className="h-5 w-5" />
                </button>
                <div className="hidden sm:block lg:h-6 lg:w-px lg:bg-gray-200" />
                <div className="hidden items-center gap-x-2 sm:flex">
                  <div className="text-right text-sm">
                    <div className="font-medium text-gray-900">{user?.name}</div>
                    <div className="text-gray-500">{user?.email}</div>
                  </div>
                  <button
                    onClick={logout}
                    className="flex items-center gap-x-2 rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
          <nav className="flex px-4 py-2 sm:px-6 lg:px-8">
            <ol className="flex items-center gap-1 text-sm text-gray-500">
              <li>
                <Link
                  to="/dashboard"
                  className="flex items-center gap-1 hover:text-gray-700"
                >
                  <Home className="h-4 w-4" />
                  Home
                </Link>
              </li>
              <li className="flex items-center gap-1">
                <ChevronRightSmall className="h-4 w-4 text-gray-400" />
                <span className="font-medium text-gray-900">
                  {currentPageTitle}
                </span>
              </li>
            </ol>
          </nav>
        </div>

        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
