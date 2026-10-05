import { Card } from "./ui/card";
import { Brain, TrendingDown, AlertCircle, CheckCircle, Sparkles } from "lucide-react";

const insights = [
  {
    icon: AlertCircle,
    title: "Unusual Spending Detected",
    description: "Your spending on Shopping increased 45% this week",
    color: "orange",
    time: "2 hours ago",
  },
  {
    icon: TrendingDown,
    title: "Cost Savings",
    description: "Your cross-border fees dropped 15% this month",
    color: "green",
    time: "1 day ago",
  },
  {
    icon: CheckCircle,
    title: "Budget on Track",
    description: "You're within budget for November. Great job!",
    color: "cyan",
    time: "2 days ago",
  },
];

const stats = [
  {
    label: "AI Predictions",
    value: "94%",
    subtext: "Accuracy",
    icon: Brain,
  },
  {
    label: "Saved This Month",
    value: "$320",
    subtext: "From insights",
    icon: Sparkles,
  },
];

export function AIInsights() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Brain className="w-6 h-6 text-purple-400" />
        <h3 className="text-white text-lg">AI Insights</h3>
      </div>

      {/* Insights Cards */}
      <div className="space-y-4">
        {insights.map((insight, index) => {
          const Icon = insight.icon;
          const colorClasses = {
            orange: {
              iconBg: "bg-orange-500/20",
              iconColor: "text-orange-400",
              border: "border-orange-500/30",
            },
            green: {
              iconBg: "bg-green-500/20",
              iconColor: "text-green-400",
              border: "border-green-500/30",
            },
            cyan: {
              iconBg: "bg-cyan-500/20",
              iconColor: "text-cyan-400",
              border: "border-cyan-500/30",
            },
          };

          const colors = colorClasses[insight.color as keyof typeof colorClasses];

          return (
            <Card
              key={index}
              className={`p-4 bg-white/5 backdrop-blur-xl border ${colors.border} 
                         hover:shadow-[0_0_20px_rgba(168,85,247,0.2)] transition-all duration-300 group`}
            >
              <div className="flex gap-3">
                <div className={`w-10 h-10 rounded-lg ${colors.iconBg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${colors.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-white text-sm mb-1">{insight.title}</h4>
                  <p className="text-gray-400 text-xs mb-2">{insight.description}</p>
                  <p className="text-gray-500 text-xs">{insight.time}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Stats Widgets */}
      <div className="space-y-3 pt-4 border-t border-white/10">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card
              key={index}
              className="p-4 bg-gradient-to-br from-purple-500/10 to-cyan-500/10 backdrop-blur-xl border border-purple-500/30 hover:shadow-[0_0_20px_rgba(168,85,247,0.2)] transition-all duration-300"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-xs mb-1">{stat.label}</p>
                  <p className="text-white text-xl">{stat.value}</p>
                  <p className="text-purple-400 text-xs">{stat.subtext}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <Icon className="w-6 h-6 text-purple-400" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Quick Tip */}
      <Card className="p-4 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 backdrop-blur-xl border border-cyan-500/30">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-cyan-300 text-sm mb-1">Quick Tip</h4>
            <p className="text-gray-400 text-xs">
              Consider setting up automatic savings for recurring surplus amounts to maximize your savings potential.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
