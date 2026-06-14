import { Navigate } from 'react-router-dom';
import { useIsSuperAdmin } from '@/hooks/useIsSuperAdmin';

interface Props { children: React.ReactNode }

export function SuperAdminRoute({ children }: Props) {
  const isSuperAdmin = useIsSuperAdmin();
  if (!isSuperAdmin) {
    return <Navigate to="/admin/users" replace />;
  }
  return <>{children}</>;
}
