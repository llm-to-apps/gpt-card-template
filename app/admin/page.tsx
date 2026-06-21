import { getCurrentUser } from '@/server/auth';

import { AdminLoginRedirect } from '../admin-login-redirect';
import { renderCardPage } from '../card-page';

export default async function AdminPage() {
  const user = await getCurrentUser();

  if (user?.role !== 'admin') {
    return <AdminLoginRedirect nextPath="/admin" />;
  }

  return renderCardPage('profile', { mode: 'edit' });
}
