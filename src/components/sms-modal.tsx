"use client";

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, MessageSquare, Smartphone, Clock, User } from 'lucide-react';

interface SMSMessage {
  id: number;
  deviceId: string;
  sender?: string;
  recipient?: string;
  message: string;
  timestamp?: string;
  receivedAt?: string;
  sentAt?: string;
  status?: string;
  slotIndex?: number;
  carrierName?: string;
  slotInfo?: {
    slotIndex: number;
    carrierName: string;
    phoneNumber: string;
  };
}

interface SMSModalProps {
  message: SMSMessage | null;
  isOpen: boolean;
  onClose: () => void;
}

export function SMSModal({ message, isOpen, onClose }: SMSModalProps) {
  if (!message) return null;

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleString();
  };

  const formatSMSRecipient = (msg: SMSMessage) => {
    if (msg.carrierName && msg.slotIndex !== undefined) {
      return `${msg.recipient} (${msg.carrierName})`;
    }
    return msg.recipient || 'Unknown';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Message Details
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription>
            View complete SMS message information
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="mt-6 h-[60vh]">
          <div className="space-y-6 pr-4">
            {/* Device Information */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Smartphone className="h-4 w-4" />
                Device Information
              </div>
              <div className="space-y-2 pl-6">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Device ID:</span>
                  <span className="font-mono text-sm">{message.deviceId || 'Unknown'}</span>
                </div>
                {message.slotInfo && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">SIM Slot:</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        SIM{message.slotInfo.slotIndex}
                      </Badge>
                      <span className="text-xs">{message.slotInfo.carrierName}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Message Details */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <MessageSquare className="h-4 w-4" />
                Message Details
              </div>
              <div className="space-y-3 pl-6">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">From:</span>
                  <div className="flex items-center gap-2">
                    <User className="h-3 w-3" />
                    <span className="font-medium">{message.sender || 'Unknown'}</span>
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">To:</span>
                  <span className="font-medium">{formatSMSRecipient(message)}</span>
                </div>
                {message.status && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant={message.status === 'delivered' ? 'default' : 'secondary'}>
                      {message.status}
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Message Content */}
            <div className="space-y-3">
              <div className="text-sm font-medium text-muted-foreground">
                Message Content
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                  {message.message || 'No content'}
                </p>
              </div>
            </div>

            <Separator />

            {/* Timestamp Information */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Clock className="h-4 w-4" />
                Timestamp Information
              </div>
              <div className="space-y-2 pl-6">
                {message.timestamp && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Timestamp:</span>
                    <span>{formatDate(message.timestamp)}</span>
                  </div>
                )}
                {message.receivedAt && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Received:</span>
                    <span>{formatDate(message.receivedAt)}</span>
                  </div>
                )}
                {message.sentAt && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Sent:</span>
                    <span>{formatDate(message.sentAt)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
