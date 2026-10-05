import { Search, Bell, Settings, Sun, Moon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useState } from "react";

export function TopNavigation() {
  const [isDark, setIsDark] = useState(true);
  const [hasNotification, setHasNotification] = useState(true);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-16 bg-black/40 backdrop-blur-xl border-b border-white/10">
      <div className="flex items-center justify-between h-full px-6">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="text-2xl bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
            Lindgo
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex-1 max-w-xl mx-8">
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

          {/* Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="relative group">
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-400 to-purple-600 opacity-75 blur-sm group-hover:opacity-100 transition-opacity" />
                <Avatar className="relative w-10 h-10 border-2 border-cyan-400/50">
                  <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=John" />
                  <AvatarFallback>JD</AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-gray-900/95 backdrop-blur-xl border border-white/10">
              <DropdownMenuItem className="text-gray-300 focus:bg-cyan-500/20 focus:text-cyan-300">
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem className="text-gray-300 focus:bg-cyan-500/20 focus:text-cyan-300">
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem className="text-gray-300 focus:bg-cyan-500/20 focus:text-cyan-300">
                Billing
              </DropdownMenuItem>
              <DropdownMenuItem className="text-red-400 focus:bg-red-500/20 focus:text-red-300">
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
