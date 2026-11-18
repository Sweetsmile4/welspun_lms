'use client';
import { useDemo } from './demo-context';
export function DemoConnectionNotice() {
  const { connection, retryConnection } = useDemo();
  const message = {
    checking: 'Checking demo service connection�',
    local: 'Local demo mode. Learning progress stays on this device.',
    connected:
      'Demo API connected. Course assignments loaded from the backend; progress stays on this device.',
    unavailable:
      'Demo API unavailable. Showing local demo content; progress stays on this device.',
  }[connection];
  return (
    <div
      role="status"
      data-testid="demo-connection"
      className="border-b border-slate-200 bg-white px-4 py-2 text-center text-xs text-slate-700"
    >
      {message}
      {connection === 'unavailable' && (
        <button
          type="button"
          onClick={retryConnection}
          className="ml-3 underline font-semibold"
        >
          Retry connection
        </button>
      )}
    </div>
  );
}
