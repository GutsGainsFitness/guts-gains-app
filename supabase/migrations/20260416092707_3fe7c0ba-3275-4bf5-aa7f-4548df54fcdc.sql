
-- Fix purchases: restrict SELECT to admin only
DROP POLICY IF EXISTS "Authenticated users can view purchases" ON public.purchases;
CREATE POLICY "Admins can view purchases" ON public.purchases
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Fix blog_posts: restrict INSERT/UPDATE/DELETE to admin only
DROP POLICY IF EXISTS "Authenticated users can create posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Authors can update own posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Authors can delete own posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Authors can view own drafts" ON public.blog_posts;

CREATE POLICY "Admins can create posts" ON public.blog_posts
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update posts" ON public.blog_posts
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete posts" ON public.blog_posts
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all posts" ON public.blog_posts
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
