import AppShell from '@/components/AppShell';
import ToastHost from '@/components/Toast';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppShell>{children}</AppShell>
      <ToastHost />
    </>
  );
}
