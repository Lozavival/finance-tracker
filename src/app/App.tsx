import { TopNavigation } from "./components/TopNavigation";
import { Sidebar } from "./components/Sidebar";
import { SummaryCards } from "./components/SummaryCards";
import { AnalyticsChart } from "./components/AnalyticsChart";
import { TransactionsTable } from "./components/TransactionsTable";

export default function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Navigation */}
      <TopNavigation />

      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="ml-64 mt-16 relative">
        <div className="p-8 space-y-8">
          {/* Page Header */}
          <div>
            <h1 className="text-foreground text-3xl mb-2">
              Dashboard
            </h1>
            <p className="text-muted-foreground">
              Welcome back! Here's your financial overview.
            </p>
          </div>

          {/* Summary Cards */}
          <SummaryCards />

          {/* Analytics Overview */}
          <AnalyticsChart />

          {/* Transactions Table */}
          <TransactionsTable />
        </div>
      </div>
    </div>
  );
}
