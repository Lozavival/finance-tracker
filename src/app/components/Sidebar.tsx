import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  Settings,
} from "lucide-react";
import { Button } from "./ui/button";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", id: "dashboard" },
  { icon: ArrowLeftRight, label: "Transactions", id: "transactions" },
  { icon: Wallet, label: "Accounts", id: "accounts" },
  { icon: Settings, label: "Settings", id: "settings" },
];

type SidebarProps = {
  activeItem: string;
  onItemSelect: (id: string) => void;
};

export function Sidebar({ activeItem, onItemSelect }: SidebarProps) {
  return (
    <div className="fixed left-0 top-16 bottom-0 w-64 bg-background/80 backdrop-blur-xl border-r border-border flex flex-col">
      {/* Menu Items */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = activeItem === item.id;

          return (
            <div key={item.id}>
              <Button
                variant="ghost"
                onClick={() => onItemSelect(item.id)}
                className={`h-auto w-full justify-start gap-3 px-4 py-3 rounded-lg
                         transition-all duration-300 group relative overflow-hidden
                         ${
                           isActive
                             ? "bg-cyan-500/20 border border-cyan-400/50 shadow-lg shadow-cyan-500/20"
                             : "bg-foreground/5 border border-border hover:border-cyan-400/50 hover:shadow-lg hover:shadow-cyan-500/10"
                         }`}
              >
                {/* Neon border effect on hover */}
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-400 to-blue-500 shadow-md shadow-cyan-400/60" />
                )}

                <Icon
                  className={`w-5 h-5 transition-colors ${
                    isActive ? "text-theme-cyan" : "text-muted-foreground group-hover:text-theme-cyan"
                  }`}
                />
                <span
                  className={`transition-colors ${
                    isActive ? "text-cyan-700 dark:text-cyan-300" : "text-muted-foreground group-hover:text-foreground"
                  }`}
                >
                  {item.label}
                </span>
              </Button>

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
