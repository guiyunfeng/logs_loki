import { useState } from 'react';
import {
  ChevronRight, ChevronDown, Server, AlertCircle, CheckCircle,
  XCircle, Activity, Cpu, HardDrive, MapPin, Folder, Code,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BUSINESS_ARCHITECTURE, getProjectStats, getAllInstances, type ServiceInstance } from '../config/businessArchitecture';

export function InfrastructureView() {
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set(['project-a']));
  const [selectedInstance, setSelectedInstance] = useState<ServiceInstance | null>(null);

  const toggleProject = (project: string) => {
    const newSet = new Set(expandedProjects);
    if (newSet.has(project)) {
      newSet.delete(project);
    } else {
      newSet.add(project);
    }
    setExpandedProjects(newSet);
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'running':
        return {
          color: 'text-emerald-400',
          bg: 'bg-emerald-500/10',
          border: 'border-emerald-500/30',
          icon: <CheckCircle className="w-4 h-4" />,
          label: '运行中',
        };
      case 'warning':
        return {
          color: 'text-yellow-400',
          bg: 'bg-yellow-500/10',
          border: 'border-yellow-500/30',
          icon: <AlertCircle className="w-4 h-4" />,
          label: '警告',
        };
      case 'error':
        return {
          color: 'text-red-400',
          bg: 'bg-red-500/10',
          border: 'border-red-500/30',
          icon: <XCircle className="w-4 h-4" />,
          label: '异常',
        };
      default:
        return {
          color: 'text-gray-400',
          bg: 'bg-gray-500/10',
          border: 'border-gray-500/30',
          icon: <Activity className="w-4 h-4" />,
          label: '未知',
        };
    }
  };

  const projectStats = getProjectStats();
  
  // 按项目分组实例
  const instancesByProject = getAllInstances().reduce((acc, inst) => {
    if (!acc[inst.project]) acc[inst.project] = [];
    acc[inst.project].push(inst);
    return acc;
  }, {} as Record<string, ServiceInstance[]>);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 左侧：项目架构树 */}
      <div className="lg:col-span-2 space-y-4">
        {/* 统计卡片 */}
        <div className="grid grid-cols-3 gap-4">
          {projectStats.map((stat) => {
            const healthRate = stat.healthRate;
            
            return (
              <div
                key={stat.project}
                className="p-4 rounded-xl bg-gray-900/50 border border-gray-700"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Folder className="w-4 h-4 text-indigo-400" />
                    <div className="text-sm font-medium text-gray-300">{stat.project}</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-end gap-2">
                    <div className="text-2xl font-bold text-gray-200">{stat.instanceCount}</div>
                    <div className="text-xs text-gray-500 mb-1">服务</div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs">
                    <div className="flex items-center gap-1 text-emerald-400">
                      <CheckCircle className="w-3 h-3" />
                      {stat.runningCount}
                    </div>
                    {stat.instanceCount - stat.runningCount > 0 && (
                      <div className="flex items-center gap-1 text-red-400">
                        <XCircle className="w-3 h-3" />
                        {stat.instanceCount - stat.runningCount}
                      </div>
                    )}
                  </div>
                  
                  <div className="pt-2 border-t border-gray-800">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">24h 错误</span>
                      <span className={`font-medium ${stat.totalErrors > 50 ? 'text-red-400' : stat.totalErrors > 10 ? 'text-yellow-400' : 'text-gray-400'}`}>
                        {stat.totalErrors}
                      </span>
                    </div>
                  </div>
                  
                  {/* 健康率进度条 */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-500">健康率</span>
                      <span className={`font-medium ${healthRate >= 90 ? 'text-emerald-400' : healthRate >= 70 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {healthRate.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          healthRate >= 90 ? 'bg-emerald-500' : healthRate >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${healthRate}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 项目树 */}
        <div className="bg-gray-900/50 rounded-xl border border-gray-700 p-4">
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-1">服务部署视图</h3>
            <p className="text-sm text-gray-500">项目 → 服务器 → 服务实例</p>
          </div>

          <div className="space-y-2">
            {Object.entries(instancesByProject).map(([project, instances]) => {
              const isExpanded = expandedProjects.has(project);
              const runningCount = instances.filter(i => i.status === 'running').length;
              const totalErrors = instances.reduce((sum, i) => sum + i.errorCount24h, 0);
              
              // 按服务器分组
              const byServer = instances.reduce((acc, inst) => {
                if (!acc[inst.server]) acc[inst.server] = [];
                acc[inst.server].push(inst);
                return acc;
              }, {} as Record<string, ServiceInstance[]>);
              
              return (
                <div key={project} className="border border-gray-800 rounded-lg overflow-hidden">
                  {/* 项目头部 */}
                  <button
                    onClick={() => toggleProject(project)}
                    className="w-full px-4 py-3 bg-gray-800/50 hover:bg-gray-800 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-500" />
                      )}
                      <div className="p-2 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-400">
                        <Folder className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <div className="font-medium text-gray-200">{project}</div>
                        <div className="text-xs text-gray-500">
                          {instances.length} 个服务 · {Object.keys(byServer).length} 台服务器
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-xs text-gray-500">
                        <span className="text-emerald-400">{runningCount}</span>/{instances.length} 运行中
                      </div>
                      {totalErrors > 0 && (
                        <div className={`text-xs font-medium ${totalErrors > 50 ? 'text-red-400' : 'text-yellow-400'}`}>
                          {totalErrors} 错误
                        </div>
                      )}
                    </div>
                  </button>

                  {/* 服务器列表 */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-gray-800"
                      >
                        {Object.entries(byServer).map(([serverIP, serverInstances]) => {
                          const serverInfo = serverInstances[0];
                          
                          return (
                            <div key={serverIP} className="border-b border-gray-800 last:border-b-0 bg-gray-900/30">
                              {/* 服务器信息 */}
                              <div className="px-4 py-2 pl-12 bg-gray-800/30">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <Server className="w-4 h-4 text-gray-500" />
                                    <div>
                                      <div className="text-sm font-medium text-gray-300">
                                        {serverInfo.hostname}
                                      </div>
                                      <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <span className="font-mono">{serverIP}</span>
                                        <span>·</span>
                                        <MapPin className="w-3 h-3" />
                                        <span>{serverInfo.hostname.includes('web') ? '华东-上海' : serverInfo.hostname.includes('api') ? '华北-北京' : '华南-深圳'}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {serverInstances.length} 个服务
                                  </div>
                                </div>
                              </div>
                              
                              {/* 服务实例列表 */}
                              {serverInstances.map((instance) => {
                                const statusConfig = getStatusConfig(instance.status);
                                
                                return (
                                  <div
                                    key={instance.id}
                                    onClick={() => setSelectedInstance(instance)}
                                    className={`px-4 py-3 pl-20 border-t border-gray-800 cursor-pointer transition-colors ${
                                      selectedInstance?.id === instance.id
                                        ? 'bg-indigo-500/10 border-l-2 border-l-indigo-500'
                                        : 'hover:bg-gray-900/40'
                                    }`}
                                  >
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                          <div className={statusConfig.color}>
                                            {statusConfig.icon}
                                          </div>
                                          <div className="text-sm font-medium text-gray-300">
                                            {instance.service}
                                          </div>
                                          <div className={`px-2 py-0.5 rounded text-xs border ${statusConfig.bg} ${statusConfig.border} ${statusConfig.color}`}>
                                            {statusConfig.label}
                                          </div>
                                          {instance.language && (
                                            <div className="px-2 py-0.5 rounded text-xs bg-gray-800 text-gray-400 border border-gray-700">
                                              {instance.language}
                                            </div>
                                          )}
                                        </div>
                                        
                                        <div className="text-xs text-gray-500 mb-2 font-mono">
                                          {instance.servicePath}
                                        </div>
                                        
                                        <div className="grid grid-cols-3 gap-3 text-xs">
                                          <div>
                                            <div className="text-gray-500 flex items-center gap-1">
                                              <Cpu className="w-3 h-3" />
                                              CPU
                                            </div>
                                            <div className={`font-medium ${instance.cpu > 80 ? 'text-red-400' : instance.cpu > 60 ? 'text-yellow-400' : 'text-gray-300'}`}>
                                              {instance.cpu}%
                                            </div>
                                          </div>
                                          <div>
                                            <div className="text-gray-500 flex items-center gap-1">
                                              <HardDrive className="w-3 h-3" />
                                              内存
                                            </div>
                                            <div className={`font-medium ${instance.memory > 80 ? 'text-red-400' : instance.memory > 60 ? 'text-yellow-400' : 'text-gray-300'}`}>
                                              {instance.memory}%
                                            </div>
                                          </div>
                                          <div>
                                            <div className="text-gray-500 flex items-center gap-1">
                                              <AlertCircle className="w-3 h-3" />
                                              24h错误
                                            </div>
                                            <div className={`font-medium ${instance.errorCount24h > 50 ? 'text-red-400' : instance.errorCount24h > 10 ? 'text-yellow-400' : 'text-gray-300'}`}>
                                              {instance.errorCount24h}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 右侧：实例详情 */}
      <div className="space-y-4">
        {selectedInstance ? (
          <>
            <div className="bg-gray-900/50 rounded-xl border border-gray-700 p-4">
              <h4 className="font-semibold text-gray-200 mb-4">服务实例详情</h4>
              
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/20">
                  <div className="text-xs text-gray-500 mb-2">核心定位标识</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Server className="w-4 h-4 text-indigo-400" />
                      <span className="text-gray-500">服务器:</span>
                      <span className="font-mono text-indigo-400">{selectedInstance.server}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Folder className="w-4 h-4 text-indigo-400" />
                      <span className="text-gray-500">项目:</span>
                      <span className="font-mono text-indigo-400">{selectedInstance.project}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Code className="w-4 h-4 text-indigo-400" />
                      <span className="text-gray-500">服务:</span>
                      <span className="font-mono text-indigo-400">{selectedInstance.service}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <div className="text-xs text-gray-500 mb-1">主机名</div>
                  <div className="text-sm font-mono text-gray-300">{selectedInstance.hostname}</div>
                </div>
                
                <div>
                  <div className="text-xs text-gray-500 mb-1">日志路径</div>
                  <div className="text-sm font-mono text-gray-300 break-all">{selectedInstance.servicePath}</div>
                </div>
                
                {selectedInstance.port && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">服务端口</div>
                    <div className="text-sm text-gray-300">{selectedInstance.port}</div>
                  </div>
                )}
                
                {selectedInstance.language && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">技术栈</div>
                    <div className="text-sm text-gray-300">{selectedInstance.language}</div>
                  </div>
                )}
                
                <div>
                  <div className="text-xs text-gray-500 mb-1">负责人</div>
                  <div className="text-sm text-gray-300">{selectedInstance.owner} · {selectedInstance.oncallPhone}</div>
                </div>
                
                <div>
                  <div className="text-xs text-gray-500 mb-1">启动时间</div>
                  <div className="text-sm text-gray-300">{selectedInstance.startTime}</div>
                </div>
                
                {selectedInstance.lastError && (
                  <div className="pt-4 border-t border-gray-800">
                    <div className="text-xs text-gray-500 mb-2">最近错误</div>
                    <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                      <div className="text-xs text-red-400 font-mono">
                        {selectedInstance.lastError}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-900/50 rounded-xl border border-gray-700 p-4">
              <h4 className="font-semibold text-gray-200 mb-4">资源使用</h4>
              
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-gray-500 flex items-center gap-1">
                      <Cpu className="w-3 h-3" />
                      CPU 使用率
                    </span>
                    <span className={`font-medium ${selectedInstance.cpu > 80 ? 'text-red-400' : selectedInstance.cpu > 60 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                      {selectedInstance.cpu}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        selectedInstance.cpu > 80 ? 'bg-red-500' : selectedInstance.cpu > 60 ? 'bg-yellow-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${selectedInstance.cpu}%` }}
                    />
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-gray-500 flex items-center gap-1">
                      <HardDrive className="w-3 h-3" />
                      内存使用率
                    </span>
                    <span className={`font-medium ${selectedInstance.memory > 80 ? 'text-red-400' : selectedInstance.memory > 60 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                      {selectedInstance.memory}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        selectedInstance.memory > 80 ? 'bg-red-500' : selectedInstance.memory > 60 ? 'bg-yellow-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${selectedInstance.memory}%` }}
                    />
                  </div>
                </div>
                
                <div className="pt-3 border-t border-gray-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">24小时错误数</span>
                    <span className={`text-lg font-bold ${selectedInstance.errorCount24h > 50 ? 'text-red-400' : selectedInstance.errorCount24h > 10 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                      {selectedInstance.errorCount24h}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Loki 查询示例 */}
            <div className="bg-gradient-to-br from-emerald-500/5 to-teal-500/5 rounded-xl border border-emerald-500/20 p-4">
              <h4 className="font-semibold text-gray-200 mb-3">Loki 查询示例</h4>
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-gray-500 mb-1">查询该服务的所有错误日志</div>
                  <div className="p-2 rounded bg-gray-900/50 border border-gray-700 font-mono text-xs text-emerald-400 overflow-x-auto">
                    {`{server="${selectedInstance.server}", project="${selectedInstance.project}", service="${selectedInstance.service}", severity="ERROR"}`}
                  </div>
                </div>
                
                <div>
                  <div className="text-xs text-gray-500 mb-1">统计最近1小时错误数</div>
                  <div className="p-2 rounded bg-gray-900/50 border border-gray-700 font-mono text-xs text-emerald-400 overflow-x-auto">
                    {`count_over_time({server="${selectedInstance.server}", project="${selectedInstance.project}", service="${selectedInstance.service}", severity="ERROR"}[1h])`}
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-gray-900/50 rounded-xl border border-gray-700 p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-800 border border-gray-700 mb-4">
              <Server className="w-8 h-8 text-gray-600" />
            </div>
            <p className="text-sm text-gray-500">
              点击左侧服务实例<br />查看详细信息
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
