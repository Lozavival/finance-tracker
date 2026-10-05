import { Card } from "./ui/card";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useState } from "react";

const revenueData = {
  "7D": [
    { date: "Mon", value: 12400 },
    { date: "Tue", value: 13200 },
    { date: "Wed", value: 11800 },
    { date: "Thu", value: 14500 },
    { date: "Fri", value: 13900 },
    { date: "Sat", value: 15200 },
    { date: "Sun", value: 14800 },
  ],
  "1M": [
    { date: "Week 1", value: 45000 },
    { date: "Week 2", value: 52000 },
    { date: "Week 3", value: 48000 },
    { date: "Week 4", value: 58000 },
  ],
  "1Y": [
    { date: "Jan", value: 45000 },
    { date: "Feb", value: 52000 },
    { date: "Mar", value: 48000 },
    { date: "Apr", value: 61000 },
    { date: "May", value: 55000 },
    { date: "Jun", value: 67000 },
    { date: "Jul", value: 72000 },
    { date: "Aug", value: 68000 },
    { date: "Sep", value: 75000 },
    { date: "Oct", value: 82000 },
    { date: "Nov", value: 78000 },
    { date: "Dec", value: 85000 },
  ],
};

const categoryData = [
  { name: "Shopping", value: 4500, color: "#06b6d4" },
  { name: "Food & Dining", value: 3200, color: "#3b82f6" },
  { name: "Transportation", value: 2100, color: "#8b5cf6" },
  { name: "Entertainment", value: 1800, color: "#ec4899" },
  { name: "Bills", value: 2800, color: "#f59e0b" },
];

export function AnalyticsChart() {
  const [timePeriod, setTimePeriod] = useState<"7D" | "1M" | "1Y">("1M");

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900/95 backdrop-blur-xl border border-cyan-400/50 rounded-lg p-3 shadow-[0_0_20px_rgba(34,211,238,0.3)]">
          <p className="text-gray-300 text-sm">{payload[0].payload.date}</p>
          <p className="text-cyan-400">${payload[0].value.toLocaleString()}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Revenue Chart - Takes 2 columns */}
      <Card className="lg:col-span-2 p-6 bg-white/5 backdrop-blur-xl border border-cyan-500/30 hover:shadow-[0_0_25px_rgba(34,211,238,0.2)] transition-all duration-300">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-white text-lg">Revenue Growth Over Time</h3>
          <div className="flex gap-2">
            {(["7D", "1M", "1Y"] as const).map((period) => (
              <button
                key={period}
                onClick={() => setTimePeriod(period)}
                className={`px-4 py-1.5 rounded-lg transition-all duration-300 ${
                  timePeriod === period
                    ? "bg-cyan-500/30 border border-cyan-400/50 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.3)]"
                    : "bg-white/5 border border-white/10 text-gray-400 hover:border-cyan-400/30"
                }`}
              >
                {period}
              </button>
            ))}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={revenueData[timePeriod]}>
            <defs>
              <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
            <XAxis dataKey="date" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="url(#lineGradient)"
              strokeWidth={3}
              fill="url(#colorGradient)"
            />
            <defs>
              <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#22c55e" />
              </linearGradient>
            </defs>
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Spending by Category - Takes 1 column */}
      <Card className="p-6 bg-white/5 backdrop-blur-xl border border-purple-500/30 hover:shadow-[0_0_25px_rgba(168,85,247,0.2)] transition-all duration-300">
        <h3 className="text-white text-lg mb-4">Spending by Category</h3>

        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={categoryData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {categoryData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Stats */}
        <div className="mt-6 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Total Spend</span>
            <span className="text-white">$14,400</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Top Merchant</span>
            <span className="text-cyan-400">Amazon</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Top Country</span>
            <span className="text-purple-400">United States</span>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
          {categoryData.map((category, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                <span className="text-gray-400">{category.name}</span>
              </div>
              <span className="text-white">${category.value}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
