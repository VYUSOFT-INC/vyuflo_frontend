// src/components/lawyer/LawyerNotificationsHost.tsx
//
// One-shot mount point that (a) runs the attorney background poller and
// (b) renders the top-right toast portal.  Kept as its own component so
// DashboardLayout can conditionally render it *only* when the logged-in
// user has the `attorney` role — the hook + portal must not fire for
// admin / HR / employee.
//
// Design note
//   The hook already returns nothing (side effects only) and the toaster
//   is self-contained, so this file is intentionally tiny.

import useLawyerNotificationWatcher from '../../hooks/lawyer/useLawyerNotificationWatcher';
import NotificationToaster from './NotificationToaster';

export default function LawyerNotificationsHost() {
  useLawyerNotificationWatcher();
  return <NotificationToaster />;
}
