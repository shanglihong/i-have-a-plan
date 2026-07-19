import { TrendingUp, Bookmark, Cpu, Network, ArrowUpRight } from "lucide-react";
import { COLOR_MAP, ThemeColorKey } from "../../shared/constants";
import { useDashboardStatsQuery, DashboardStatsDO } from "../../entities";

interface StatConfig {
  key: keyof DashboardStatsDO;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: ThemeColorKey;
}

const STAT_CONFIGS: StatConfig[] = [
  {
    key: "active_projects",
    label: "进行中项目",
    icon: TrendingUp,
    color: "cyan",
  },
  {
    key: "total_notes",
    label: "累计笔记",
    icon: Bookmark,
    color: "violet",
  },
  {
    key: "extracted_skills",
    label: "已提炼技能",
    icon: Cpu,
    color: "emerald",
  },
  {
    key: "graph_nodes",
    label: "图谱节点",
    icon: Network,
    color: "blue",
  },
];

export function DashboardStatsGrid() {
  const { data: statsData, isLoading } = useDashboardStatsQuery();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {STAT_CONFIGS.map((config, i) => {
        const colorStyle = COLOR_MAP[config.color];
        const IconComp = config.icon;
        const stat = statsData ? statsData[config.key] : null;

        return (
          <div
            key={i}
            className="group relative glass rounded-2xl p-4.5 border border-white/10 hover:border-white/20 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-950/20 overflow-hidden"
          >
            {/* Ambient Corner Glow Effect */}
            <div
              className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full opacity-10 group-hover:opacity-25 blur-xl transition-opacity duration-500 ${colorStyle.bg}`}
            />

            <div className="flex items-start justify-between mb-3 relative z-10">
              <div
                className={`w-10 h-10 rounded-xl ${colorStyle.bg} border border-white/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-inner`}
              >
                <IconComp size={19} className={colorStyle.text} />
              </div>
              <span
                className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded-full border border-white/10 ${colorStyle.bg} ${colorStyle.text} flex items-center gap-0.5`}
              >
                <span>{isLoading ? "加载中..." : stat?.badge || "--"}</span>
                <ArrowUpRight size={10} />
              </span>
            </div>

            <div className="relative z-10">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-100 leading-none font-mono tracking-tight">
                  {isLoading ? "--" : stat?.value ?? 0}
                </span>
                <span className="text-xs font-semibold text-slate-300">{config.label}</span>
              </div>
              <p className="text-[11px] text-slate-400 truncate mt-1.5 font-normal">
                {isLoading ? "数据请求中..." : stat?.desc || ""}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
