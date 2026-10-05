import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  Settings,
} from "lucide-react";
import { useState } from "react";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", id: "dashboard" },
  { icon: ArrowLeftRight, label: "Transactions", id: "transactions" },
  { icon: Wallet, label: "Accounts", id: "accounts" },
  { icon: Settings, label: "Settings", id: "settings" },
];

export function Sidebar() {
  const [activeItem, setActiveItem] = useState("dashboard");

  return (
    <div className="fixed left-0 top-16 bottom-0 w-64 bg-black/40 backdrop-blur-xl border-r border-white/10 flex flex-col">
      {/* Menu Items */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = activeItem === item.id;

          return (
            <div key={item.id}>
              <button
                onClick={() => setActiveItem(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg
                         transition-all duration-300 group relative overflow-hidden
                         ${
                           isActive
                             ? "bg-cyan-500/20 border border-cyan-400/50 shadow-[0_0_20px_rgba(34,211,238,0.3)]"
                             : "bg-white/5 border border-white/10 hover:border-cyan-400/50 hover:shadow-[0_0_15px_rgba(34,211,238,0.2)]"
                         }`}
              >
                {/* Neon border effect on hover */}
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-400 to-blue-500 shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
                )}

                <Icon
                  className={`w-5 h-5 transition-colors ${
                    isActive ? "text-cyan-400" : "text-gray-400 group-hover:text-cyan-300"
                  }`}
                />
                <span
                  className={`transition-colors ${
                    isActive ? "text-cyan-300" : "text-gray-300 group-hover:text-white"
                  }`}
                >
                  {item.label}
                </span>
              </button>

              {/* Neon separator after Transactions and Wallets */}
              {(index === 2) && (
                <div className="my-4 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );
}
