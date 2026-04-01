import { useNavigate } from 'react-router';
import { BarChart3, Monitor, ArrowRight, Database, Activity, Layers, Server, Bell, Phone, Brain } from 'lucide-react';
import { motion } from 'motion/react';
import { ImageWithFallback } from './figma/ImageWithFallback';

const bgImage = 'https://images.unsplash.com/photo-1680992046626-418f7e910589?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzZXJ2ZXIlMjByb29tJTIwZGF0YSUyMGNlbnRlciUyMGRhcmt8ZW58MXx8fHwxNzc0NTQ0NTI1fDA&ixlib=rb-4.1.0&q=80&w=1080';

const features = [
  { icon: <Server className="w-5 h-5" />, label: '业务日志采集' },
  { icon: <Database className="w-5 h-5" />, label: 'Loki 日志存储' },
  { icon: <Layers className="w-5 h-5" />, label: 'Promtail 规则分类' },
  { icon: <BarChart3 className="w-5 h-5" />, label: 'Grafana 可视化分析' },
  { icon: <Bell className="w-5 h-5" />, label: '多级别智能告警' },
  { icon: <Phone className="w-5 h-5" />, label: '钉钉 / 电话告警通知' },
];

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-950 text-white relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <ImageWithFallback
          src={bgImage}
          alt="background"
          className="w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-gray-950/60 via-gray-950/80 to-gray-950" />
      </div>

      {/* Animated grid dots */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 40 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-indigo-500/30 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0.2, 0.6, 0.2],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 3 + Math.random() * 4,
              repeat: Infinity,
              delay: Math.random() * 3,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Nav */}
        <header className="px-6 sm:px-10 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <span className="text-lg font-semibold tracking-tight">LogVision</span>
          </div>
          <div className="text-xs text-gray-500">Powered by Loki + Grafana</div>
        </header>

        {/* Hero */}
        <main className="flex-1 flex flex-col items-center justify-center px-6 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="text-center max-w-3xl mx-auto mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium mb-6">
              <Activity className="w-3.5 h-3.5" />
              日志监控可视化系统 v2.0
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight mb-5">
              <span className="bg-gradient-to-r from-white via-indigo-200 to-purple-300 bg-clip-text text-transparent">
                全链路日志监控
              </span>
              <br />
              <span className="text-gray-400 text-3xl sm:text-4xl lg:text-5xl">
                可视化分析平台
              </span>
            </h1>
            <p className="text-gray-400 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
              采集业务层 Error 日志，经 Promtail 规则分类后存入 Loki，
              通过 Grafana 进行图形化分析，并根据日志严重程度
              自动触发钉钉消息或电话告警。
            </p>
          </motion.div>

          {/* Two Entry Cards */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl mx-auto mb-16"
          >
            {/* Entry 0: Advanced Analytics (NEW) */}
            <button
              onClick={() => navigate('/advanced')}
              className="group relative bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700/60 rounded-2xl p-8 text-left transition-all duration-300 hover:border-pink-500/50 hover:shadow-[0_0_40px_rgba(236,72,153,0.12)] cursor-pointer"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/5 rounded-full blur-2xl group-hover:bg-pink-500/10 transition-colors" />
              <div className="relative">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-pink-500/20 to-rose-500/20 border border-pink-500/20 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <Brain className="w-7 h-7 text-pink-400" />
                </div>
                <h2 className="text-xl font-semibold mb-2 text-white">🚀 高级分析</h2>
                <p className="text-sm text-gray-400 leading-relaxed mb-6">
                  实时监控、服务健康评估、SLO跟踪、根因分析、性能监控。
                </p>
                <div className="flex items-center gap-2 text-pink-400 text-sm font-medium group-hover:gap-3 transition-all">
                  查看分析
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </button>

            {/* Entry 1: Log Analytics */}
            <button
              onClick={() => navigate('/analytics')}
              className="group relative bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700/60 rounded-2xl p-8 text-left transition-all duration-300 hover:border-emerald-500/50 hover:shadow-[0_0_40px_rgba(16,185,129,0.12)] cursor-pointer"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors" />
              <div className="relative">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/20 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <BarChart3 className="w-7 h-7 text-emerald-400" />
                </div>
                <h2 className="text-xl font-semibold mb-2 text-white">日志统计分析</h2>
                <p className="text-sm text-gray-400 leading-relaxed mb-6">
                  错误趋势图、多维度分组统计、Top N 错误排行、实时日志流，全方位洞察系统健康状况。
                </p>
                <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium group-hover:gap-3 transition-all">
                  查看分析
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </button>

            {/* Entry 2: Monitoring System */}
            <button
              onClick={() => navigate('/system')}
              className="group relative bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700/60 rounded-2xl p-8 text-left transition-all duration-300 hover:border-indigo-500/50 hover:shadow-[0_0_40px_rgba(99,102,241,0.12)] cursor-pointer"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-colors" />
              <div className="relative">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500/20 to-blue-500/20 border border-indigo-500/20 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <Monitor className="w-7 h-7 text-indigo-400" />
                </div>
                <h2 className="text-xl font-semibold mb-2 text-white">Grafana 面板</h2>
                <p className="text-sm text-gray-400 leading-relaxed mb-6">
                  实时仪表板、错误统计分析、LogQL 查询工具、告警规则管理和分级告警策略。
                </p>
                <div className="flex items-center gap-2 text-indigo-400 text-sm font-medium group-hover:gap-3 transition-all">
                  进入系统
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </button>
          </motion.div>

          {/* Feature Pills */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="flex flex-wrap justify-center gap-3 max-w-3xl"
          >
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + i * 0.08 }}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-800/60 border border-gray-700/40 text-gray-400 text-xs"
              >
                {f.icon}
                {f.label}
              </motion.div>
            ))}
          </motion.div>
        </main>

        {/* Footer */}
        <footer className="px-6 py-6 text-center text-xs text-gray-600">
          <span>Loki + Grafana 日志监控可视化系统</span>
          <span className="mx-2">·</span>
          <span>实时分析 · 智能告警 · 全链路追踪</span>
        </footer>
      </div>
    </div>
  );
}