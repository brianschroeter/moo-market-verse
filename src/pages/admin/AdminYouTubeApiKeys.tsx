import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Edit3, Trash2, RefreshCw, CheckCircle, XCircle, AlertCircle, Key, Activity } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  getYouTubeApiKeys,
  getYouTubeApiKeyStats,
  createYouTubeApiKey,
  updateYouTubeApiKey,
  deleteYouTubeApiKey,
  testYouTubeApiKey,
  resetYouTubeApiKeyQuotas,
} from '@/services/youtubeApiKeyService';
import { YouTubeApiKey, YouTubeApiKeyStats, CreateYouTubeApiKeyPayload, UpdateYouTubeApiKeyPayload, YouTubeApiKeyStatus } from '@/services/types/youtubeApiKey-types';
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog';

const AdminYouTubeApiKeys: React.FC = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<YouTubeApiKey | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [keyToDelete, setKeyToDelete] = useState<YouTubeApiKey | null>(null);
  const [testingKeyId, setTestingKeyId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<CreateYouTubeApiKeyPayload>({
    name: '',
    description: '',
    api_key: '',
    status: 'active',
  });

  // Fetch API Keys
  const { data: apiKeys, isLoading: isLoadingKeys } = useQuery<YouTubeApiKey[], Error>({
    queryKey: ['youtubeApiKeys'],
    queryFn: getYouTubeApiKeys,
  });

  // Fetch API Key Stats
  const { data: apiKeyStats } = useQuery<YouTubeApiKeyStats[], Error>({
    queryKey: ['youtubeApiKeyStats'],
    queryFn: getYouTubeApiKeyStats,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Mutations
  const createKeyMutation = useMutation<YouTubeApiKey, Error, CreateYouTubeApiKeyPayload>({
    mutationFn: createYouTubeApiKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['youtubeApiKeys'] });
      queryClient.invalidateQueries({ queryKey: ['youtubeApiKeyStats'] });
      setIsAddModalOpen(false);
      resetForm();
      toast({ title: 'Success', description: 'API key added successfully.' });
    },
    onError: (err) => {
      toast({ variant: 'destructive', title: 'Error', description: `Failed to add API key: ${err.message}` });
    },
  });

  const updateKeyMutation = useMutation<YouTubeApiKey, Error, { id: string; payload: UpdateYouTubeApiKeyPayload }>({
    mutationFn: ({ id, payload }) => updateYouTubeApiKey(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['youtubeApiKeys'] });
      queryClient.invalidateQueries({ queryKey: ['youtubeApiKeyStats'] });
      setEditingKey(null);
      resetForm();
      toast({ title: 'Success', description: 'API key updated successfully.' });
    },
    onError: (err) => {
      toast({ variant: 'destructive', title: 'Error', description: `Failed to update API key: ${err.message}` });
    },
  });

  const deleteKeyMutation = useMutation<void, Error, string>({
    mutationFn: deleteYouTubeApiKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['youtubeApiKeys'] });
      queryClient.invalidateQueries({ queryKey: ['youtubeApiKeyStats'] });
      toast({ title: 'Success', description: 'API key deleted successfully.' });
    },
    onError: (err) => {
      toast({ variant: 'destructive', title: 'Error', description: `Failed to delete API key: ${err.message}` });
    },
  });

  const resetQuotasMutation = useMutation<void, Error>({
    mutationFn: resetYouTubeApiKeyQuotas,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['youtubeApiKeys'] });
      queryClient.invalidateQueries({ queryKey: ['youtubeApiKeyStats'] });
      toast({ title: 'Success', description: 'API key quotas reset successfully.' });
    },
    onError: (err) => {
      toast({ variant: 'destructive', title: 'Error', description: `Failed to reset quotas: ${err.message}` });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      api_key: '',
      status: 'active',
    });
  };

  const handleAddKey = () => {
    setEditingKey(null);
    resetForm();
    setIsAddModalOpen(true);
  };

  const handleEditKey = (key: YouTubeApiKey) => {
    setEditingKey(key);
    setFormData({
      name: key.name,
      description: key.description || '',
      api_key: '', // Don't show the actual key
      status: key.status,
    });
    setIsAddModalOpen(true);
  };

  const handleDeleteKey = (key: YouTubeApiKey) => {
    setKeyToDelete(key);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    if (keyToDelete) {
      deleteKeyMutation.mutate(keyToDelete.id);
      setShowDeleteConfirm(false);
      setKeyToDelete(null);
    }
  };

  const handleTestKey = async (apiKey: string, keyId?: string) => {
    if (keyId) setTestingKeyId(keyId);
    
    try {
      const result = await testYouTubeApiKey(apiKey);
      
      toast({
        title: result.success ? 'Test Successful' : 'Test Failed',
        description: result.message,
        variant: result.success ? 'default' : 'destructive',
      });
    } catch (error) {
      toast({
        title: 'Test Error',
        description: 'Failed to test API key',
        variant: 'destructive',
      });
    } finally {
      setTestingKeyId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingKey) {
      // Update existing key
      const updatePayload: UpdateYouTubeApiKeyPayload = {
        name: formData.name,
        description: formData.description,
        status: formData.status,
      };
      updateKeyMutation.mutate({ id: editingKey.id, payload: updatePayload });
    } else {
      // Test the key before adding
      if (formData.api_key) {
        const testResult = await testYouTubeApiKey(formData.api_key);
        if (!testResult.success) {
          toast({
            title: 'Invalid API Key',
            description: testResult.message,
            variant: 'destructive',
          });
          return;
        }
      }
      // Create new key
      createKeyMutation.mutate(formData);
    }
  };

  const getStatusBadge = (status: YouTubeApiKeyStatus) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" /> Active</Badge>;
      case 'inactive':
        return <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" /> Inactive</Badge>;
      case 'quota_exceeded':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" /> Quota Exceeded</Badge>;
    }
  };

  const getStatsForKey = (keyId: string) => {
    return apiKeyStats?.find(stat => stat.id === keyId);
  };

  return (
    <AdminLayout>
      <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white font-fredoka">YouTube API Keys</h1>
          <div className="flex gap-2">
            <Button 
              onClick={() => resetQuotasMutation.mutate()} 
              variant="outline" 
              className="border-lolcow-lightgray text-white hover:bg-lolcow-lightgray/[.15]"
              disabled={resetQuotasMutation.isPending}
            >
              <RefreshCw className="mr-2 h-5 w-5" />
              Reset All Quotas
            </Button>
            <Button onClick={handleAddKey} className="bg-lolcow-blue hover:bg-lolcow-blue/90 text-white">
              <PlusCircle className="mr-2 h-5 w-5" />
              Add API Key
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-lolcow-darkgray border-lolcow-lightgray">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-white">Total Keys</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{apiKeys?.length || 0}</div>
              <p className="text-sm text-gray-400">
                Active: {apiKeys?.filter(k => k.status === 'active').length || 0}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-lolcow-darkgray border-lolcow-lightgray">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-white">24h Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {apiKeyStats?.reduce((sum, stat) => sum + stat.units_used_24h, 0) || 0}
              </div>
              <p className="text-sm text-gray-400">API units consumed</p>
            </CardContent>
          </Card>

          <Card className="bg-lolcow-darkgray border-lolcow-lightgray">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-white">24h Errors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {apiKeyStats?.reduce((sum, stat) => sum + stat.errors_24h, 0) || 0}
              </div>
              <p className="text-sm text-gray-400">Total errors</p>
            </CardContent>
          </Card>
        </div>

        {/* API Keys Table */}
        {isLoadingKeys ? (
          <div className="text-center text-gray-400 py-8">Loading API keys...</div>
        ) : (
          <div className="rounded-md border bg-lolcow-charcoal border-lolcow-lightgray">
            <Table>
              <TableHeader>
                <TableRow className="border-lolcow-lightgray">
                  <TableHead className="text-gray-300">Name</TableHead>
                  <TableHead className="text-gray-300">Status</TableHead>
                  <TableHead className="text-gray-300">Usage (24h)</TableHead>
                  <TableHead className="text-gray-300">Last Used</TableHead>
                  <TableHead className="text-gray-300">Errors</TableHead>
                  <TableHead className="text-gray-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys && apiKeys.length > 0 ? (
                  apiKeys.map((key) => {
                    const stats = getStatsForKey(key.id);
                    return (
                      <TableRow key={key.id} className="border-lolcow-lightgray hover:bg-lolcow-gray/10">
                        <TableCell className="text-gray-200">
                          <div>
                            <div className="font-medium">{key.name}</div>
                            {key.description && (
                              <div className="text-sm text-gray-400">{key.description}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(key.status)}</TableCell>
                        <TableCell className="text-gray-200">
                          {stats?.units_used_24h || 0} units
                        </TableCell>
                        <TableCell className="text-gray-200">
                          {key.last_used_at ? format(new Date(key.last_used_at), 'PPp') : 'Never'}
                        </TableCell>
                        <TableCell className="text-gray-200">
                          {key.consecutive_errors > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {key.consecutive_errors} errors
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleEditKey(key)} 
                              className="hover:bg-lolcow-lightgray/[.15] p-1.5"
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleDeleteKey(key)} 
                              className="hover:bg-lolcow-lightgray/[.15] p-1.5 text-red-500 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-gray-400">
                      No API keys found. Add one to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Add/Edit Modal */}
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogContent className="bg-lolcow-darkgray text-white border-lolcow-lightgray max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-fredoka text-xl">
                {editingKey ? 'Edit API Key' : 'Add New API Key'}
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                {editingKey ? 'Update the API key details.' : 'Enter the details for the new YouTube API key.'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-gray-300">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Primary API Key"
                  className="bg-lolcow-charcoal border-lolcow-lightgray text-white placeholder:text-gray-500"
                  style={{ backgroundColor: '#1a1a1a', color: 'white' }}
                  required
                />
              </div>

              <div>
                <Label htmlFor="description" className="text-gray-300">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description"
                  className="bg-lolcow-charcoal border-lolcow-lightgray text-white placeholder:text-gray-500"
                  style={{ backgroundColor: '#1a1a1a', color: 'white' }}
                  rows={3}
                />
              </div>

              {!editingKey && (
                <div>
                  <Label htmlFor="api_key" className="text-gray-300">API Key</Label>
                  <div className="flex gap-2">
                    <Input
                      id="api_key"
                      type="password"
                      value={formData.api_key}
                      onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                      placeholder="Your YouTube API key"
                      className="bg-lolcow-charcoal border-lolcow-lightgray text-white placeholder:text-gray-500"
                      style={{ backgroundColor: '#1a1a1a', color: 'white' }}
                      autoComplete="current-password"
                      required={!editingKey}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleTestKey(formData.api_key)}
                      disabled={!formData.api_key || testingKeyId !== null}
                      className="border-lolcow-lightgray text-white hover:bg-lolcow-lightgray/[.15]"
                    >
                      Test
                    </Button>
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="status" className="text-gray-300">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: YouTubeApiKeyStatus) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger className="bg-lolcow-charcoal border-lolcow-lightgray text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-lolcow-darkgray border-lolcow-lightgray">
                    <SelectItem value="active" className="text-white hover:bg-lolcow-lightgray/20">Active</SelectItem>
                    <SelectItem value="inactive" className="text-white hover:bg-lolcow-lightgray/20">Inactive</SelectItem>
                    {editingKey && <SelectItem value="quota_exceeded" className="text-white hover:bg-lolcow-lightgray/20">Quota Exceeded</SelectItem>}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingKey(null);
                    resetForm();
                  }}
                  className="border-lolcow-lightgray text-white hover:bg-lolcow-lightgray/[.15]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-lolcow-blue hover:bg-lolcow-blue/90 text-white"
                  disabled={createKeyMutation.isPending || updateKeyMutation.isPending}
                >
                  {editingKey ? 'Update' : 'Add'} API Key
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        {keyToDelete && (
          <ConfirmationDialog
            open={showDeleteConfirm}
            onOpenChange={setShowDeleteConfirm}
            onConfirm={handleConfirmDelete}
            isConfirming={deleteKeyMutation.isPending}
            title="Delete API Key"
            description={
              <>
                Are you sure you want to delete the API key "{keyToDelete.name}"?
                This action cannot be undone.
              </>
            }
            confirmText="Delete"
            confirmVariant="destructive"
          />
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminYouTubeApiKeys;