import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowLeft, Network, Layers, TrendingUp, BookOpen,
  Sparkles, Code,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ServiceTopologyMap } from './ServiceTopologyMap';
import { InfrastructureView } from './InfrastructureView';

type TabId = 'topology' | 'infrastructure';

const tabs: { id: TabId; label: string; icon: React.ReactNode; desc: string; color: string }[] = [
  { id: 'topology', label: '服务拓扑', icon: <Network className="w-4 h-4" />, desc: '依赖关系图', color: 'text-indigo-400' },
  { id: 'infrastructure', label: '基础设施', icon: <Layers className="w-4 h-4" />, desc: '三层架构树', color: 'text-emerald-400' },
];

export function ArchitecturePage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('topology');

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-gray-950/80 backdrop-blur-xl border-b border-gray-800/60">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/')} className="p-2 rounded-lg hover:bg-gray-800 transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </button>
            <div>
              <h1 className="text-lg font-semibold">业务架构总览</h1>
              <p className="text-xs text-gray-500">服务拓扑 · 基础设施 · 实时监控</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/flow')}
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors border border-gray-700"
            >
              <Code className="w-4 h-4" />
              日志处理
            </button>
            <button
              onClick={() => navigate('/system')}
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium transition-colors"
            >
              <TrendingUp className="w-4 h-4" />
              Grafana 面板
            </button>
          </div>
        </div>
      </header>

      {/* 关键信息条 */}
      <div className="border-b border-gray-800/60 bg-gray-900/30">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-8 py-3">
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-indigo-400 font-medium">混合云部署</span>
              <span className="text-gray-500">·</span>
              <span className="text-gray-400">多语言技术栈</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-emerald-400 font-medium">3</span>
              <span className="text-gray-400">服务组</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <span className="text-blue-400 font-medium">9</span>
              <span className="text-gray-400">服务器</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <span className="text-purple-400 font-medium">16</span>
              <span className="text-gray-400">服务实例</span>
            </div>
            <div className="ml-auto px-3 py-1.5 rounded-lg bg-gray-800/50 border border-gray-700 text-gray-400">
              阿里云 · 腾讯云 · 自建机房
            </div>
          </div>
        </div>
      </div>

      {/* Tab 导航 */}
      <div className="sticky top-[65px] z-10 bg-gray-950/90 backdrop-blur-lg border-b border-gray-800/60">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-8">
          <div className="flex gap-1 py-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm transition-all cursor-pointer ${ 
                  activeTab === tab.id
                    ? 'bg-gray-800 text-white shadow-lg'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-gray-900'
                }`}
              >
                <span className={activeTab === tab.id ? tab.color : ''}>{tab.icon}</span>
                <span className="font-medium">{tab.label}</span>
                <span className="text-[10px] text-gray-600 hidden sm:block">{tab.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab 内容 */}
      <main className="max-w-[1600px] mx-auto px-4 sm:px-8 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'topology' && <ServiceTopologyMap />}
            {activeTab === 'infrastructure' && <InfrastructureView />}
          </motion.div>
        </AnimatePresence>

        {/* 底部提示 */}
        <div className="mt-12 p-6 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-indigo-500/20 border border-indigo-500/30">
              <BookOpen className="w-6 h-6 text-indigo-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-200 mb-2">Loki 日志标签体系设计</h3>
              <p className="text-sm text-gray-400 mb-3">
                每条日志都会携带完整的基础设施标签，确保可以精准定位到具体实例。
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 rounded-lg bg-gray-900/50 border border-gray-700">
                  <div className="text-gray-500 mb-2">【核心三元组】唯一定位</div>
                  <div className="space-y-1 text-gray-400">
                    <div><span className="text-indigo-400">server:</span> "192.168.1.10"</div>
                    <div><span className="text-indigo-400">project:</span> "project-a"</div>
                    <div><span className="text-indigo-400">service:</span> "nginx"</div>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-gray-900/50 border border-gray-700">
                  <div className="text-gray-500 mb-2">【辅助信息】</div>
                  <div className="space-y-1 text-gray-400">
                    <div><span className="text-emerald-400">hostname:</span> "web-server-01"</div>
                    <div><span className="text-emerald-400">region:</span> "华东-上海"</div>
                    <div><span className="text-emerald-400">cloud:</span> "阿里云"</div>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-gray-900/50 border border-gray-700">
                  <div className="text-gray-500 mb-2">【服务类型】</div>
                  <div className="space-y-1 text-gray-400">
                    <div><span className="text-purple-400">service_type:</span> "gateway"</div>
                    <div><span className="text-purple-400">language:</span> "Nginx 1.24"</div>
                    <div><span className="text-purple-400">port:</span> "80"</div>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-gray-900/50 border border-gray-700">
                  <div className="text-gray-500 mb-2">【日志分类】</div>
                  <div className="space-y-1 text-gray-400">
                    <div><span className="text-amber-400">severity:</span> "ERROR"</div>
                    <div><span className="text-amber-400">error_category:</span> "upstream"</div>
                    <div><span className="text-amber-400">error_code:</span> "TIMEOUT"</div>
                  </div>
                </div>
              </div>
              <div className="mt-4 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                <div className="text-xs text-emerald-400">
                  <strong>示例 LogQL 查询：</strong> <code className="ml-2 text-gray-300">
                    {`{server="192.168.1.10", project="project-a", service="nginx", severity="ERROR"}`}
                  </code>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  → 精准定位到 192.168.1.10 服务器上 project-a 项目的 nginx 服务的所有 ERROR 日志
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}