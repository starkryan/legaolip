'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Eye,
  Download,
  Search,
  Filter,
  MoreHorizontal
} from 'lucide-react';
import { format } from 'date-fns';

interface WithdrawalRequest {
  id: string;
  amount: number;
  amountInRupees: number;
  formattedAmount: string;
  status: 'pending' | 'approved' | 'rejected' | 'processed';
  bankDetails: {
    bankName: string;
    accountHolderName: string;
    accountNumber: string;
    ifscCode: string;
    lastDigits: string;
    upiId?: string;
  };
  user: {
    deviceId: string;
    phoneNumber: string;
    currentBalance: number;
    balanceInRupees: number;
    accountStatus: string;
    kycStatus: string;
  };
  notes?: string;
  createdAt: string;
  pendingFor: number;
  priority: 'high' | 'medium' | 'normal';
}

export function WithdrawalManagement() {
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequest | null>(null);
  const [refreshKey, setRefreshKey] = useState(0); // Force re-render
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  // Form states
  const [transactionId, setTransactionId] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [approveNotes, setApproveNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchWithdrawals();
  }, [refreshKey]);

  const fetchWithdrawals = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/withdrawals?adminKey=admin-secret-key-2024&t=${refreshKey}`);
      const data = await response.json();

      if (data.success) {
        // Format the withdrawal data to match the component interface
        const formattedWithdrawals = data.data.withdrawalRequests.map((request: any) => ({
          id: request.id,
          amount: request.amount,
          amountInRupees: request.amountInRupees,
          formattedAmount: `${request.amount} coins (₹${request.amountInRupees})`,
          status: request.status,
          bankDetails: {
            bankName: request.bankDetails?.bankName || 'N/A',
            accountHolderName: request.bankDetails?.accountHolderName || 'N/A',
            accountNumber: request.bankDetails?.accountNumber ?
              `****${request.bankDetails.accountNumber.slice(-4)}` : 'N/A',
            lastDigits: request.bankDetails?.accountNumber?.slice(-4) || request.bankDetails?.upiId || null,
            upiId: request.bankDetails?.upiId || null,
            withdrawalType: request.bankDetails?.withdrawalType || 'upi'
          },
          user: {
            deviceId: request.user.deviceId,
            phoneNumber: request.user.phoneNumber,
            currentBalance: 0,
            balanceInRupees: 0,
            accountStatus: 'active',
            kycStatus: 'verified'
          },
          notes: request.notes,
          createdAt: request.createdAt,
          pendingFor: Math.floor((Date.now() - new Date(request.createdAt).getTime()) / (1000 * 60 * 60)),
          priority: request.amount >= 1000 ? 'high' : request.amount >= 500 ? 'medium' : 'normal',
          transactionId: request.transactionId,
          referenceNumber: request.referenceNumber,
          rejectionReason: request.rejectionReason,
          processedAt: request.processedAt
        }));
        setWithdrawals(formattedWithdrawals);
      }
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedWithdrawal) return;

    try {
      const response = await fetch('/api/admin/withdrawals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          withdrawalId: selectedWithdrawal.id,
          action: 'approve',
          transactionId,
          referenceNumber,
          adminNotes: approveNotes,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setApproveDialogOpen(false);
        // Add a small delay to ensure server state is updated
        setTimeout(() => {
          setRefreshKey(prev => prev + 1); // Force refresh
          fetchWithdrawals(); // Refresh list
        }, 500);
        // Reset form
        setTransactionId('');
        setReferenceNumber('');
        setApproveNotes('');
        setSelectedWithdrawal(null);
      } else {
        console.error('Error approving withdrawal:', data.error);
      }
    } catch (error) {
      console.error('Error approving withdrawal:', error);
    }
  };

  const handleReject = async () => {
    if (!selectedWithdrawal) return;

    try {
      const response = await fetch('/api/admin/withdrawals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          withdrawalId: selectedWithdrawal.id,
          action: 'reject',
          rejectionReason,
          adminNotes: 'Rejected via admin dashboard',
        }),
      });

      const data = await response.json();

      if (data.success) {
        setRejectDialogOpen(false);
        // Add a small delay to ensure server state is updated
        setTimeout(() => {
          setRefreshKey(prev => prev + 1); // Force refresh
          fetchWithdrawals(); // Refresh list
        }, 500);
        // Reset form
        setRejectionReason('');
        setSelectedWithdrawal(null);
      } else {
        console.error('Error rejecting withdrawal:', data.error);
      }
    } catch (error) {
      console.error('Error rejecting withdrawal:', error);
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive">High</Badge>;
      case 'medium':
        return <Badge variant="secondary">Medium</Badge>;
      default:
        return <Badge variant="outline">Normal</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      case 'processed':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Processed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredWithdrawals = withdrawals.filter(withdrawal => {
    const matchesSearch = withdrawal.user.deviceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         withdrawal.bankDetails.accountHolderName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         withdrawal.formattedAmount.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || withdrawal.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || withdrawal.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Withdrawal Management</h2>
          <p className="text-gray-600">Manage and process withdrawal requests</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-orange-600">
                  {withdrawals.filter(w => w.status === 'pending').length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-blue-600">
                  {withdrawals.filter(w => w.status === 'approved').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Rejected</p>
                <p className="text-2xl font-bold text-red-600">
                  {withdrawals.filter(w => w.status === 'rejected').length}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Amount</p>
                <p className="text-2xl font-bold text-green-600">
                  ₹{withdrawals.reduce((sum, w) => sum + w.amountInRupees, 0).toLocaleString()}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by device ID, name, or amount..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="processed">Processed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Withdrawals Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Withdrawals</CardTitle>
          <CardDescription>
            {filteredWithdrawals.length} withdrawal requests found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredWithdrawals.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No withdrawal requests found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Bank Details</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Pending For</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWithdrawals.map((withdrawal) => (
                    <TableRow key={withdrawal.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{withdrawal.user.deviceId}</p>
                          <p className="text-sm text-gray-500">{withdrawal.user.phoneNumber}</p>
                          <p className="text-xs text-gray-400">
                            Balance: {withdrawal.user.currentBalance} coins
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{withdrawal.formattedAmount}</p>
                          <p className="text-sm text-gray-500">
                            ₹{withdrawal.amountInRupees}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          {withdrawal.bankDetails.upiId ? (
                            <>
                              <p className="font-medium">UPI: {withdrawal.bankDetails.upiId}</p>
                              <p className="text-sm text-gray-500">{withdrawal.bankDetails.accountHolderName}</p>
                            </>
                          ) : (
                            <>
                              <p className="font-medium">{withdrawal.bankDetails.accountHolderName}</p>
                              <p className="text-sm text-gray-500">{withdrawal.bankDetails.bankName}</p>
                              <p className="text-sm text-gray-500">
                                ****{withdrawal.bankDetails.lastDigits}
                              </p>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(withdrawal.status)}
                      </TableCell>
                      <TableCell>
                        {getPriorityBadge(withdrawal.priority)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {withdrawal.pendingFor}h ago
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedWithdrawal(withdrawal);
                              setViewDialogOpen(true);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {withdrawal.status === 'pending' && (
                            <>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => {
                                  setSelectedWithdrawal(withdrawal);
                                  setApproveDialogOpen(true);
                                }}
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  setSelectedWithdrawal(withdrawal);
                                  setRejectDialogOpen(true);
                                }}
                              >
                                <XCircle className="w-4 h-4 mr-1" />
                                Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Withdrawal</DialogTitle>
            <DialogDescription>
              Approve withdrawal request for {selectedWithdrawal?.formattedAmount}
              {selectedWithdrawal?.bankDetails?.upiId && (
                <span className="block text-sm text-gray-600 mt-1">
                  UPI: {selectedWithdrawal.bankDetails.upiId}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="transactionId">Transaction ID</Label>
              <Input
                id="transactionId"
                placeholder="Enter transaction ID"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="referenceNumber">Reference Number</Label>
              <Input
                id="referenceNumber"
                placeholder="Enter bank reference number"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="approveNotes">Notes (Optional)</Label>
              <Textarea
                id="approveNotes"
                placeholder="Add any notes about this approval"
                value={approveNotes}
                onChange={(e) => setApproveNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleApprove}>
              Approve Withdrawal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Withdrawal</DialogTitle>
            <DialogDescription>
              Reject withdrawal request for {selectedWithdrawal?.formattedAmount}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rejectionReason">Rejection Reason *</Label>
              <Textarea
                id="rejectionReason"
                placeholder="Enter the reason for rejection"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                required
              />
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> The amount ({selectedWithdrawal?.formattedAmount}) will be
                refunded back to the user's account.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              Reject Withdrawal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Withdrawal Details</DialogTitle>
            <DialogDescription>
              Complete details for withdrawal request {selectedWithdrawal?.formattedAmount}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {selectedWithdrawal && (
              <>
                {/* Status and Priority */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">Status:</span>
                    {getStatusBadge(selectedWithdrawal.status)}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">Priority:</span>
                    {getPriorityBadge(selectedWithdrawal.priority)}
                  </div>
                </div>

                {/* User Information */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-3">User Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Device ID:</span>
                      <p className="font-mono text-xs break-all">{selectedWithdrawal.user.deviceId}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Phone Number:</span>
                      <p>{selectedWithdrawal.user.phoneNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Current Balance:</span>
                      <p>{selectedWithdrawal.user.currentBalance} coins</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Account Status:</span>
                      <p>{selectedWithdrawal.user.accountStatus}</p>
                    </div>
                  </div>
                </div>

                {/* Amount Information */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-3">Amount Information</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Coins:</span>
                      <p className="text-lg font-semibold">{selectedWithdrawal.amount} coins</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Rupees:</span>
                      <p className="text-lg font-semibold">₹{selectedWithdrawal.amountInRupees}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Pending For:</span>
                      <p>{selectedWithdrawal.pendingFor} hours</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Created:</span>
                      <p>{new Date(selectedWithdrawal.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Payment Details */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-3">Payment Details</h3>
                  {selectedWithdrawal.bankDetails.upiId ? (
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-500">Payment Method:</span>
                        <p className="font-medium">UPI Transfer</p>
                      </div>
                      <div>
                        <span className="text-gray-500">UPI ID:</span>
                        <p className="font-mono font-medium">{selectedWithdrawal.bankDetails.upiId}</p>
                      </div>
                      {selectedWithdrawal.bankDetails.accountHolderName && (
                        <div>
                          <span className="text-gray-500">Account Holder:</span>
                          <p>{selectedWithdrawal.bankDetails.accountHolderName}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-500">Bank Name:</span>
                        <p className="font-medium">{selectedWithdrawal.bankDetails.bankName}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Account Holder:</span>
                        <p>{selectedWithdrawal.bankDetails.accountHolderName}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Account Number:</span>
                        <p className="font-mono">{selectedWithdrawal.bankDetails.accountNumber}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Last 4 Digits:</span>
                        <p className="font-mono">****{selectedWithdrawal.bankDetails.lastDigits}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Processing Details */}
                {(selectedWithdrawal.transactionId || selectedWithdrawal.referenceNumber || selectedWithdrawal.processedAt) && (
                  <div className="border rounded-lg p-4">
                    <h3 className="font-medium mb-3">Processing Details</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                      {selectedWithdrawal.transactionId && (
                        <div>
                          <span className="text-gray-500">Transaction ID:</span>
                          <p className="font-mono text-xs break-all">{selectedWithdrawal.transactionId}</p>
                        </div>
                      )}
                      {selectedWithdrawal.referenceNumber && (
                        <div>
                          <span className="text-gray-500">Reference Number:</span>
                          <p className="font-mono text-xs break-all">{selectedWithdrawal.referenceNumber}</p>
                        </div>
                      )}
                      {selectedWithdrawal.processedAt && (
                        <div>
                          <span className="text-gray-500">Processed At:</span>
                          <p>{new Date(selectedWithdrawal.processedAt).toLocaleString()}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Notes and Rejection Reason */}
                {(selectedWithdrawal.notes || selectedWithdrawal.rejectionReason) && (
                  <div className="border rounded-lg p-4">
                    <h3 className="font-medium mb-3">Additional Information</h3>
                    {selectedWithdrawal.notes && (
                      <div className="mb-3">
                        <span className="text-gray-500 text-sm">Notes:</span>
                        <p className="text-sm mt-1">{selectedWithdrawal.notes}</p>
                      </div>
                    )}
                    {selectedWithdrawal.rejectionReason && (
                      <div>
                        <span className="text-gray-500 text-sm">Rejection Reason:</span>
                        <p className="text-sm mt-1 text-red-600">{selectedWithdrawal.rejectionReason}</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
            {selectedWithdrawal?.status === 'pending' && (
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="default"
                  onClick={() => {
                    setViewDialogOpen(false);
                    setApproveDialogOpen(true);
                  }}
                  className="w-full sm:w-auto"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setViewDialogOpen(false);
                    setRejectDialogOpen(true);
                  }}
                  className="w-full sm:w-auto"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}