import { getCurrentUser } from '@/server/auth';

import { AdminLoginRedirect } from '../../admin-login-redirect';
import { renderCardPage } from '../../card-page';

export default async function AdminExceptionsPage() {
  const user = await getCurrentUser();

  if (user?.role !== 'admin') {
    return <AdminLoginRedirect nextPath="/admin/exceptions" />;
  }

  return renderCardPage('exceptions', { mode: 'edit' });
}
