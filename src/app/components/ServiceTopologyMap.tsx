import { useState, useMemo } from 'react';
import {
  Zap, Database, Server, Globe, Network,
  AlertCircle, CheckCircle, XCircle, Info, Cpu,
  Activity, HardDrive, MapPin,
} from 'lucide-react';
import { motion } from 'motion/react';
import { BUSINESS_ARCHITECTURE, getGroupHealthStats, type Server as ServerType, type ServiceInstance } from '../config/businessArchitecture';

export function ServiceTopologyMap() {
  const [selectedServer, setSelectedServer] = useState<ServerType | null>(null);
  const [selectedInstance, setSelectedInstance] = useState<ServiceInstance | null>(null);

  // 获取服务图标
  const getServiceIcon = (type: string) => {
    switch (type) {
      case 'gateway':
        return <Network className="w-4 h-4" />;
      case 'web':
        return <Globe className="w-4 h-4" />;
      case 'api':
        return <Server className="w-4 h-4" />;
      case 'database':
        return <Database className="w-4 h-4" />;
      case 'cache':
        return <Zap className="w-4 h-4" />;
      case 'worker':
        return <Cpu className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  // 计算服务器健康状态
  const getServerHealth = (server: ServerType) => {
    const errorCount = server.instances.reduce((sum, inst) => sum + inst.errorCount24h, 0);
    const runningCount = server.instances.filter(inst => inst.status === 'running').length;
    const totalCount = server.instances.length;
    
    if (errorCount > 100 || runningCount < totalCount * 0.5) {
      return { status: 'error', color: 'red', icon: <XCircle className="w-4 h-4" /> };
    } else if (errorCount > 20 || runningCount < totalCount) {
      return { status: 'warning', color: 'yellow', icon: <AlertCircle className="w-4 h-4" /> };
    } else {
      return { status: 'healthy', color: 'green', icon: <CheckCircle className="w-4 h-4" /> };
    }
  };

  const getInstanceStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400';
      case 'warning':
        return 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400';
      case 'error':
        return 'bg-red-500/20 border-red-500/50 text-red-400';
      case 'stopped':
        return 'bg-gray-500/20 border-gray-500/50 text-gray-400';
      default:
        return 'bg-gray-500/20 border-gray-500/50 text-gray-400';
    }
  };

  const allServers = BUSINESS_ARCHITECTURE.flatMap(group => group.servers);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 左侧：服务器列表 */}
      <div className="lg:col-span-2 space-y-4">
        {/* 按服务组展示 */}
        {BUSINESS_ARCHITECTURE.map((group) => (
          <div key={group.id} className="bg-gray-900/50 rounded-xl border border-gray-700 p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2 rounded-lg bg-${group.color}-500/20 border border-${group.color}-500/30 text-${group.color}-400`}>
                {group.icon === 'Globe' && <Globe className="w-4 h-4" />}
                {group.icon === 'Cpu' && <Cpu className="w-4 h-4" />}
                {group.icon === 'Database' && <Database className="w-4 h-4" />}
              </div>
              <div>
                <h3 className="font-semibold text-gray-200">{group.displayName}</h3>
                <p className="text-xs text-gray-500">{group.servers.length} 台服务器</p>
              </div>
            </div>

            {/* 服务器卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {group.servers.map((server) => {
                const health = getServerHealth(server);
                const isSelected = selectedServer?.ip === server.ip;
                
                return (
                  <motion.div
                    key={server.ip}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => setSelectedServer(server)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-indigo-500/10 border-indigo-500/50'
                        : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="text-sm font-medium text-gray-200">{server.hostname}</div>
                        <div className="text-xs text-gray-500 font-mono">{server.ip}</div>
                      </div>
                      <div className={`text-${health.color}-400`}>
                        {health.icon}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                      <MapPin className="w-3 h-3" />
                      <span>{server.region}</span>
                      <span>·</span>
                      <span>{server.cloud}</span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                      <div>
                        <div className="text-gray-500">服务数</div>
                        <div className="text-gray-300 font-medium">{server.instances.length}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">CPU</div>
                        <div className={`font-medium ${server.cpu > 80 ? 'text-red-400' : server.cpu > 60 ? 'text-yellow-400' : 'text-gray-300'}`}>
                          {server.cpu}%
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500">内存</div>
                        <div className={`font-medium ${server.memory > 80 ? 'text-red-400' : server.memory > 60 ? 'text-yellow-400' : 'text-gray-300'}`}>
                          {server.memory}%
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-2 border-t border-gray-700">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">24h 错误</span>
                        <span className={`font-medium ${
                          server.instances.reduce((sum, inst) => sum + inst.errorCount24h, 0) > 50 
                            ? 'text-red-400' 
                            : 'text-yellow-400'
                        }`}>
                          {server.instances.reduce((sum, inst) => sum + inst.errorCount24h, 0)}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* 右侧：详细信息 */}
      <div className="space-y-4 overflow-y-auto max-h-[800px]">
        {selectedServer ? (
          <>
            {/* 服务器信息卡片 */}
            <div className="bg-gray-900/50 rounded-xl border border-gray-700 p-4">
              <h4 className="font-semibold text-gray-200 mb-3">服务器详情</h4>
              
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-xs text-gray-500 mb-1">主机名</div>
                  <div className="text-gray-300 font-medium">{selectedServer.hostname}</div>
                </div>
                
                <div>
                  <div className="text-xs text-gray-500 mb-1">IP 地址</div>
                  <div className="text-gray-300 font-mono">{selectedServer.ip}</div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">地域</div>
                    <div className="text-gray-300">{selectedServer.region}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">云厂商</div>
                    <div className="text-gray-300">{selectedServer.cloud}</div>
                  </div>
                </div>
                
                <div className="pt-3 border-t border-gray-800">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-gray-500">CPU 使用率</span>
                    <span className={`font-medium ${selectedServer.cpu > 80 ? 'text-red-400' : selectedServer.cpu > 60 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                      {selectedServer.cpu}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        selectedServer.cpu > 80 ? 'bg-red-500' : selectedServer.cpu > 60 ? 'bg-yellow-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${selectedServer.cpu}%` }}
                    />
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-gray-500">内存使用率</span>
                    <span className={`font-medium ${selectedServer.memory > 80 ? 'text-red-400' : selectedServer.memory > 60 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                      {selectedServer.memory}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        selectedServer.memory > 80 ? 'bg-red-500' : selectedServer.memory > 60 ? 'bg-yellow-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${selectedServer.memory}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 服务实例列表 */}
            <div className="bg-gray-900/50 rounded-xl border border-gray-700 p-4">
              <h4 className="font-semibold text-gray-200 mb-3">
                运行的服务 ({selectedServer.instances.length})
              </h4>
              <div className="space-y-2">
                {selectedServer.instances.map((instance) => (
                  <motion.div
                    key={instance.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => setSelectedInstance(instance)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedInstance?.id === instance.id
                        ? 'bg-indigo-500/10 border-indigo-500/50'
                        : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="text-indigo-400">
                          {getServiceIcon(instance.serviceType)}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-200">
                            {instance.project} / {instance.service}
                          </div>
                          <div className="text-xs text-gray-500">{instance.language}</div>
                        </div>
                      </div>
                      <div className={`px-2 py-0.5 rounded text-xs border ${getInstanceStatusColor(instance.status)}`}>
                        {instance.status}
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-500 mb-2 font-mono">
                      {instance.servicePath}
                    </div>
                    
                    {instance.port && (
                      <div className="text-xs text-gray-500 mb-2">
                        端口: {instance.port}
                      </div>
                    )}
                    
                    <div className="grid grid-cols-3 gap-2 text-xs">
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
                          MEM
                        </div>
                        <div className={`font-medium ${instance.memory > 80 ? 'text-red-400' : instance.memory > 60 ? 'text-yellow-400' : 'text-gray-300'}`}>
                          {instance.memory}%
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          错误
                        </div>
                        <div className={`font-medium ${instance.errorCount24h > 50 ? 'text-red-400' : instance.errorCount24h > 10 ? 'text-yellow-400' : 'text-gray-300'}`}>
                          {instance.errorCount24h}
                        </div>
                      </div>
                    </div>
                    
                    {instance.lastError && (
                      <div className="mt-2 pt-2 border-t border-gray-700">
                        <div className="text-xs text-gray-500">最近错误</div>
                        <div className="text-xs text-red-400 mt-1 truncate">{instance.lastError}</div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="bg-gray-900/50 rounded-xl border border-gray-700 p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-800 border border-gray-700 mb-4">
              <Info className="w-8 h-8 text-gray-600" />
            </div>
            <p className="text-sm text-gray-500">
              点击左侧服务器<br />查看详细信息
            </p>
          </div>
        )}
      </div>
    </div>
  );
}