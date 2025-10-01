-- Add INSERT policy for user_roles to allow users to set their own role during signup
CREATE POLICY "Users can insert their own role during signup"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);