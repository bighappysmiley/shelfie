-- Allow users to delete their own in-app notifications (swipe delete + retention purge).

DROP POLICY IF EXISTS app_notifications_own_delete ON public.app_notifications;
CREATE POLICY app_notifications_own_delete ON public.app_notifications
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
