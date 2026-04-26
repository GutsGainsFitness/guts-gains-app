DELETE FROM public.admin_notifications
WHERE type = 'account_deletion_request'
  AND (metadata->>'email') IN ('ui-test@example.com', 'test-deletion-e2e@example.com');