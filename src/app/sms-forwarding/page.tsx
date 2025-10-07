'use client';

export default function SmsForwardingPage() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">SMS Forwarding Configuration</h1>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            Please access the SMS Forwarding feature through the main dashboard at{' '}
            <a href="/dashboard" className="underline text-blue-600 hover:text-blue-800">
              /dashboard
            </a>{' '}
            and click on the "SMS Forwarding" tab.
          </p>
        </div>
      </div>
    </div>
  );
}