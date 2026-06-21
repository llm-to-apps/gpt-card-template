import { getCurrentUser } from '@/server/auth';

import { AdminLoginRedirect } from '../../admin-login-redirect';
import { renderCardPage } from '../../card-page';

export default async function AdminSettingsPage() {
  const user = await getCurrentUser();

  if (user?.role !== 'admin') {
    return <AdminLoginRedirect nextPath="/admin/settings" />;
  }

  return renderCardPage('settings', { mode: 'edit' });
}
