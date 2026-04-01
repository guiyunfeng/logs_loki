import { useState } from 'react';
import { Bell, Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Save, X } from 'lucide-react';

export interface AlertRule {
  id: string;
  name: string;
  query: string;
  severity: 'critical' | 'error' | 'warning';
  threshold: number;
  duration: number;
  enabled: boolean;
  description: string;
}

interface AlertRuleManagerProps {
  readonly rules: AlertRule[];
  readonly onRulesChange: (rules: AlertRule[]) => void;
}

const emptyRule: Omit<AlertRule, 'id'> = {
  name: '',
  query: '',
  severity: 'error',
  threshold: 0,
  duration: 5,
  enabled: true,
  description: '',
};

export function AlertRuleManager({ rules, onRulesChange }: AlertRuleManagerProps) {
  const [isAddingRule, setIsAddingRule] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<AlertRule, 'id'>>(emptyRule);

  const toggleRule = (id: string) => {
    onRulesChange(rules.map(rule => 
      rule.id === id ? { ...rule, enabled: !rule.enabled } : rule
    ));
  };

  const deleteRule = (id: string) => {
    if (confirm('确定要删除这条告警规则吗？')) {
      onRulesChange(rules.filter(rule => rule.id !== id));
    }
  };

  const startEdit = (rule: AlertRule) => {
    setEditingId(rule.id);
    setFormData({ name: rule.name, query: rule.query, severity: rule.severity, threshold: rule.threshold, duration: rule.duration, enabled: rule.enabled, description: rule.description });
    setIsAddingRule(false);
  };

  const saveRule = () => {
    if (!formData.name || !formData.query) return;

    if (editingId) {
      onRulesChange(rules.map(rule => 
        rule.id === editingId ? { ...rule, ...formData } : rule
      ));
      setEditingId(null);
    } else {
      onRulesChange([...rules, { id: Date.now().toString(), ...formData }]);
      setIsAddingRule(false);
    }
    setFormData(emptyRule);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsAddingRule(false);
    setFormData(emptyRule);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-700 border-red-300';
      case 'error': return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'warning': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const renderForm = () => (
    <div className="p-4 border-2 border-dashed border-indigo-300 rounded-lg bg-indigo-50">
      <h4 className="font-semibold mb-3">{editingId ? '编辑告警规则' : '新增告警规则'}</h4>
      <div className="grid grid-cols-2 gap-3">
        <input
          type="text"
          placeholder="规则名称"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <select
          value={formData.severity}
          onChange={(e) => setFormData({ ...formData, severity: e.target.value as AlertRule['severity'] })}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="critical">Critical</option>
          <option value="error">Error</option>
          <option value="warning">Warning</option>
        </select>
        <input
          type="text"
          placeholder="LogQL 查询"
          value={formData.query}
          onChange={(e) => setFormData({ ...formData, query: e.target.value })}
          className="col-span-2 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <input
          type="number"
          placeholder="阈值"
          value={formData.threshold || ''}
          onChange={(e) => setFormData({ ...formData, threshold: Number.parseFloat(e.target.value) || 0 })}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <input
          type="number"
          placeholder="持续时间(分钟)"
          value={formData.duration || ''}
          onChange={(e) => setFormData({ ...formData, duration: Number.parseInt(e.target.value) || 0 })}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <textarea
          placeholder="描述信息"
          rows={2}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="col-span-2 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={saveRule}
          disabled={!formData.name || !formData.query}
          className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          {editingId ? '更新规则' : '保存规则'}
        </button>
        <button
          onClick={cancelEdit}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 flex items-center gap-2"
        >
          <X className="w-4 h-4" />
          取消
        </button>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-indigo-500" />
          <h3 className="font-semibold text-lg">告警规则管理</h3>
          <span className="text-sm text-gray-500">({rules.filter(r => r.enabled).length}/{rules.length} 启用)</span>
        </div>
        <button
          onClick={() => { setIsAddingRule(!isAddingRule); setEditingId(null); setFormData(emptyRule); }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4" />
          新增规则
        </button>
      </div>

      <div className="space-y-4">
        {rules.map((rule) => (
          <div key={rule.id}>
            {editingId === rule.id ? (
              renderForm()
            ) : (
              <div className={`border rounded-lg p-4 ${rule.enabled ? 'border-gray-200' : 'border-gray-100 bg-gray-50'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-gray-900">{rule.name}</h4>
                      <span className={`px-2 py-1 text-xs font-medium rounded border ${getSeverityColor(rule.severity)}`}>
                        {rule.severity.toUpperCase()}
                      </span>
                      {!rule.enabled && (
                        <span className="px-2 py-1 text-xs bg-gray-200 text-gray-600 rounded">
                          已禁用
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{rule.description}</p>
                    <div className="font-mono text-xs bg-gray-900 text-gray-100 px-3 py-2 rounded">
                      {rule.query}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => toggleRule(rule.id)}
                      className="p-2 hover:bg-gray-100 rounded"
                      title={rule.enabled ? '禁用规则' : '启用规则'}
                    >
                      {rule.enabled ? (
                        <ToggleRight className="w-5 h-5 text-green-500" />
                      ) : (
                        <ToggleLeft className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                    <button
                      onClick={() => startEdit(rule)}
                      className="p-2 hover:bg-gray-100 rounded"
                      title="编辑规则"
                    >
                      <Edit2 className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => deleteRule(rule.id)}
                      className="p-2 hover:bg-red-50 rounded"
                      title="删除规则"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>
                
                <div className="flex gap-6 text-sm text-gray-600 border-t border-gray-100 pt-3">
                  <div>
                    <span className="font-medium">阈值:</span> {rule.threshold}
                  </div>
                  <div>
                    <span className="font-medium">持续时间:</span> {rule.duration} 分钟
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {isAddingRule && !editingId && (
        <div className="mt-4">
          {renderForm()}
        </div>
      )}

      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
        <strong>提示:</strong> 告警规则会定期执行 LogQL 查询，当结果超过设定阈值并持续指定时间后触发告警。
      </div>
    </div>
  );
}
