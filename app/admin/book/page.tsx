import { getCurrentUser } from '@/server/auth';

import { AdminLoginRedirect } from '../../admin-login-redirect';
import { renderCardPage } from '../../card-page';

export default async function AdminBookPage() {
  const user = await getCurrentUser();

  if (user?.role !== 'admin') {
    return <AdminLoginRedirect nextPath="/admin/book" />;
  }

  return renderCardPage('book', { mode: 'edit' });
}
