'use client';

import { Badge } from '@/components/ui/badge';
import { useSocket } from '@/hooks/useSocket';
import { Wifi, WifiOff, AlertCircle } from 'lucide-react';

export function ConnectionStatus() {
  const { connected, error } = useSocket();

  if (error) {
    return (
      <Badge variant="destructive" className="flex items-center gap-1">
        <AlertCircle className="h-3 w-3" />
        Connection Error
      </Badge>
    );
  }

  if (connected) {
    return (
      <Badge variant="default" className="flex items-center gap-1 bg-green-500 hover:bg-green-600">
        <Wifi className="h-3 w-3" />
        Real-time Connected
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="flex items-center gap-1">
      <WifiOff className="h-3 w-3" />
      Connecting...
    </Badge>
  );
}
