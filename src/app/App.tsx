import { TopNavigation } from "./components/TopNavigation";
import { Sidebar } from "./components/Sidebar";
import { SummaryCards } from "./components/SummaryCards";
import { AnalyticsChart } from "./components/AnalyticsChart";
import { TransactionsTable } from "./components/TransactionsTable";
import { AIInsights } from "./components/AIInsights";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

export default function App() {
  const [isInsightsOpen, setIsInsightsOpen] = useState(true);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Animated background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      {/* Top Navigation */}
      <TopNavigation />

      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="ml-64 mt-16 relative">
        <div className={`transition-all duration-300 ${isInsightsOpen ? "mr-80" : "mr-0"}`}>
          <div className="p-8 space-y-8">
            {/* Page Header */}
            <div>
              <h1 className="text-white text-3xl mb-2">Dashboard</h1>
              <p className="text-gray-400">Welcome back! Here's your financial overview.</p>
            </div>

            {/* Summary Cards */}
            <SummaryCards />

            {/* Analytics Overview */}
            <AnalyticsChart />

            {/* Transactions Table */}
            <TransactionsTable />
          </div>
        </div>

        {/* Right Sidebar - AI Insights (Collapsible) */}
        <div
          className={`fixed right-0 top-16 bottom-0 bg-black/40 backdrop-blur-xl border-l border-white/10
                     transition-all duration-300 ${isInsightsOpen ? "w-80" : "w-0"} overflow-hidden`}
        >
          <div className="p-6 h-full overflow-y-auto">
            <AIInsights />
          </div>
        </div>

        {/* Toggle Button for Insights Panel */}
        <button
          onClick={() => setIsInsightsOpen(!isInsightsOpen)}
          className={`fixed top-24 bg-cyan-500/20 backdrop-blur-xl border border-cyan-500/50
                     p-2 rounded-l-lg shadow-[0_0_20px_rgba(34,211,238,0.3)]
                     hover:bg-cyan-500/30 transition-all duration-300
                     ${isInsightsOpen ? "right-80" : "right-0"}`}
        >
          {isInsightsOpen ? (
            <ChevronRight className="w-5 h-5 text-cyan-400" />
          ) : (
            <ChevronLeft className="w-5 h-5 text-cyan-400" />
          )}
        </button>
      </div>
    </div>
  );
}
