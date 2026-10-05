import { Search, Bell, Settings, Sun, Moon } from "lucide-react";
import { useState } from "react";

export function TopNavigation() {
  const [isDark, setIsDark] = useState(true);
  const [hasNotification, setHasNotification] = useState(true);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-16 bg-black/40 backdrop-blur-xl border-b border-white/10">
      <div className="relative flex items-center justify-end h-full px-6">
        {/* Search Bar - centered */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-xl px-4">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400" />
            <input
              type="text"
              placeholder="Search transactions, accounts..."
              className="w-full h-10 pl-10 pr-4 bg-white/5 border border-cyan-500/30 rounded-lg
                       text-white placeholder:text-gray-400 outline-none
                       focus:border-cyan-400 focus:shadow-[0_0_20px_rgba(34,211,238,0.3)]
                       transition-all duration-300"
            />
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-4">
          {/* Notification Bell */}
          <button className="relative p-2 rounded-lg bg-white/5 border border-white/10 hover:border-cyan-400/50 hover:shadow-[0_0_15px_rgba(34,211,238,0.3)] transition-all duration-300">
            <Bell className="w-5 h-5 text-gray-300" />
            {hasNotification && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
            )}
          </button>

          {/* Settings */}
          <button className="p-2 rounded-lg bg-white/5 border border-white/10 hover:border-cyan-400/50 hover:shadow-[0_0_15px_rgba(34,211,238,0.3)] transition-all duration-300">
            <Settings className="w-5 h-5 text-gray-300" />
          </button>

          {/* Theme Toggle */}
          <button
            onClick={() => setIsDark(!isDark)}
            className="p-2 rounded-lg bg-white/5 border border-white/10 hover:border-cyan-400/50 hover:shadow-[0_0_15px_rgba(34,211,238,0.3)] transition-all duration-300"
          >
            {isDark ? (
              <Sun className="w-5 h-5 text-gray-300" />
            ) : (
              <Moon className="w-5 h-5 text-gray-300" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
