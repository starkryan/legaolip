'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus,
  Edit,
  Trash2,
  TestTube,
  ExternalLink,
  Settings,
  CheckCircle,
  XCircle,
  AlertCircle,
  Copy
} from 'lucide-react';

interface ForwardingConfig {
  _id: string;
  name: string;
  url: string;
  isActive: boolean;
  deviceIds?: string[];
  phoneNumbers?: string[];
  headers?: Record<string, string>;
  retryCount: number;
  retryDelay: number;
  timeout: number;
  successCount: number;
  failureCount: number;
  lastUsed?: string;
  createdAt: string;
  updatedAt: string;
}

interface ForwardingStats {
  totalConfigs: number;
  activeConfigs: number;
  totalSuccesses: number;
  totalFailures: number;
  successRate: string;
}

export default function SmsForwardingPage() {
  const [configs, setConfigs] = useState<ForwardingConfig[]>([]);
  const [stats, setStats] = useState<ForwardingStats>({
    totalConfigs: 0,
    activeConfigs: 0,
    totalSuccesses: 0,
    totalFailures: 0,
    successRate: '0.0'
  });
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ForwardingConfig | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [testingConfig, setTestingConfig] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    url: '',
    isActive: true,
    deviceIds: [] as string[],
    phoneNumbers: [] as string[],
    headers: { 'Content-Type': 'application/json' } as Record<string, string>,
    retryCount: 3,
    retryDelay: 5,
    timeout: 30
  });

  const API_BASE = '/api';

  const loadConfigs = async () => {
    try {
      const response = await fetch(`${API_BASE}/sms/forwarding-configs`);
      const data = await response.json();
      if (data.success) {
        setConfigs(data.configs);
      }
    } catch (error) {
      console.error('Error loading forwarding configs:', error);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/sms/forwarding-stats`);
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error loading forwarding stats:', error);
    }
  };

  const loadDevices = async () => {
    try {
      const response = await fetch(`${API_BASE}/devices`);
      const data = await response.json();
      if (data.success) {
        setDevices(data.devices || []);
      }
    } catch (error) {
      console.error('Error loading devices:', error);
    }
  };

  useEffect(() => {
    loadConfigs();
    loadStats();
    loadDevices();
  }, []);

  const resetForm = () => {
    setFormData({
      name: '',
      url: '',
      isActive: true,
      deviceIds: [],
      phoneNumbers: [],
      headers: { 'Content-Type': 'application/json' },
      retryCount: 3,
      retryDelay: 5,
      timeout: 30
    });
    setEditingConfig(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = editingConfig
        ? `${API_BASE}/sms/forwarding-configs/${editingConfig._id}`
        : `${API_BASE}/sms/forwarding-configs`;

      const method = editingConfig ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        await loadConfigs();
        await loadStats();
        setIsDialogOpen(false);
        resetForm();
        alert(editingConfig ? 'Configuration updated successfully!' : 'Configuration created successfully!');
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error saving config:', error);
      alert('Failed to save configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (config: ForwardingConfig) => {
    setEditingConfig(config);
    setFormData({
      name: config.name,
      url: config.url,
      isActive: config.isActive,
      deviceIds: config.deviceIds || [],
      phoneNumbers: config.phoneNumbers || [],
      headers: { 'Content-Type': 'application/json', ...config.headers },
      retryCount: config.retryCount,
      retryDelay: config.retryDelay,
      timeout: config.timeout
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (configId: string) => {
    if (!confirm('Are you sure you want to delete this forwarding configuration?')) return;

    try {
      const response = await fetch(`${API_BASE}/sms/forwarding-configs/${configId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        await loadConfigs();
        await loadStats();
        alert('Configuration deleted successfully!');
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error deleting config:', error);
      alert('Failed to delete configuration');
    }
  };

  const handleTest = async (configId: string) => {
    setTestingConfig(configId);

    try {
      const response = await fetch(`${API_BASE}/sms/forwarding-configs/${configId}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (data.success) {
        alert(`Test successful! Response: ${data.response.status} ${data.response.statusText}`);
        await loadConfigs();
        await loadStats();
      } else {
        alert(`Test failed: ${data.message}`);
      }
    } catch (error) {
      console.error('Error testing config:', error);
      alert('Failed to test configuration');
    } finally {
      setTestingConfig(null);
    }
  };

  const toggleConfigStatus = async (configId: string, isActive: boolean) => {
    try {
      const response = await fetch(`${API_BASE}/sms/forwarding-configs/${configId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive }),
      });

      const data = await response.json();

      if (data.success) {
        await loadConfigs();
        await loadStats();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error toggling config:', error);
      alert('Failed to update configuration');
    }
  };

  const addHeader = () => {
    const key = prompt('Enter header name:');
    const value = prompt('Enter header value:');
    if (key && value) {
      setFormData(prev => ({
        ...prev,
        headers: { ...prev.headers, [key]: value }
      }));
    }
  };

  const removeHeader = (key: string) => {
    setFormData(prev => {
      const newHeaders = { ...prev.headers };
      delete newHeaders[key];
      return { ...prev, headers: newHeaders };
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getSuccessRate = (successes: number, failures: number) => {
    const total = successes + failures;
    if (total === 0) return '0.0';
    return ((successes / total) * 100).toFixed(1);
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Configs</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalConfigs}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.activeConfigs}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Successes</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.totalSuccesses}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Failures</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.totalFailures}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.successRate}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>SMS Forwarding Configurations</CardTitle>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Configuration
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingConfig ? 'Edit Configuration' : 'Add Forwarding Configuration'}
                  </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Configuration Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="My Webhook"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="url">Webhook URL</Label>
                      <Input
                        id="url"
                        type="url"
                        value={formData.url}
                        onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                        placeholder="https://example.com/webhook"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Device Filter (Optional)</Label>
                    <Select
                      value={formData.deviceIds.length === 0 ? 'all' : formData.deviceIds.join(',')}
                      onValueChange={(value) => setFormData(prev => ({
                        ...prev,
                        deviceIds: value === 'all' ? [] : value.split(',')
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select devices (leave empty for all devices)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Devices</SelectItem>
                        {devices.map((device) => (
                          <SelectItem key={device.deviceId} value={device.deviceId}>
                            {device.deviceId}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="phoneNumbers">Phone Numbers Filter (Optional)</Label>
                    <Textarea
                      id="phoneNumbers"
                      value={formData.phoneNumbers.join('\n')}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        phoneNumbers: e.target.value.split('\n').filter(n => n.trim())
                      }))}
                      placeholder="Enter phone numbers (one per line)&#10;+1234567890&#10;+0987654321"
                      rows={3}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Custom Headers</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addHeader}>
                        <Plus className="h-4 w-4 mr-1" />
                        Add Header
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {Object.entries(formData.headers).map(([key, value]) => (
                        <div key={key} className="flex items-center gap-2">
                          <Input value={key} disabled className="flex-1" />
                          <Input value={value} disabled className="flex-1" />
                          <Button type="button" variant="outline" size="sm" onClick={() => removeHeader(key)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="retryCount">Retry Count</Label>
                      <Input
                        id="retryCount"
                        type="number"
                        min="0"
                        max="10"
                        value={formData.retryCount}
                        onChange={(e) => setFormData(prev => ({ ...prev, retryCount: parseInt(e.target.value) || 0 }))}
                      />
                    </div>

                    <div>
                      <Label htmlFor="retryDelay">Retry Delay (seconds)</Label>
                      <Input
                        id="retryDelay"
                        type="number"
                        min="1"
                        max="300"
                        value={formData.retryDelay}
                        onChange={(e) => setFormData(prev => ({ ...prev, retryDelay: parseInt(e.target.value) || 5 }))}
                      />
                    </div>

                    <div>
                      <Label htmlFor="timeout">Timeout (seconds)</Label>
                      <Input
                        id="timeout"
                        type="number"
                        min="5"
                        max="300"
                        value={formData.timeout}
                        onChange={(e) => setFormData(prev => ({ ...prev, timeout: parseInt(e.target.value) || 30 }))}
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                    />
                    <Label htmlFor="isActive">Active</Label>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading ? 'Saving...' : (editingConfig ? 'Update' : 'Create')}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent>
          {configs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No forwarding configurations found. Add your first configuration to start forwarding SMS messages.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Devices</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Success Rate</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configs.map((config) => (
                  <TableRow key={config._id}>
                    <TableCell className="font-medium">{config.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 max-w-xs">
                        <span className="truncate font-mono text-sm">{config.url}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(config.url)}
                          className="h-6 w-6 p-0"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(config.url, '_blank')}
                          className="h-6 w-6 p-0"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      {config.deviceIds && config.deviceIds.length > 0 ? (
                        <Badge variant="secondary">{config.deviceIds.length} devices</Badge>
                      ) : (
                        <Badge variant="outline">All</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={config.isActive}
                          onCheckedChange={(checked) => toggleConfigStatus(config._id, checked)}
                        />
                        <Badge variant={config.isActive ? 'default' : 'destructive'}>
                          {config.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{getSuccessRate(config.successCount, config.failureCount)}%</div>
                        <div className="text-muted-foreground text-xs">
                          {config.successCount}/{config.successCount + config.failureCount}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {config.lastUsed ? formatDate(config.lastUsed) : 'Never'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTest(config._id)}
                          disabled={testingConfig === config._id}
                          className="h-8 w-8 p-0"
                          title="Test configuration"
                        >
                          <TestTube className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(config)}
                          className="h-8 w-8 p-0"
                          title="Edit configuration"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(config._id)}
                          className="h-8 w-8 p-0"
                          title="Delete configuration"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}