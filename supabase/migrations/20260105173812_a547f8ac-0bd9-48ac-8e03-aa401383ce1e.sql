-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create staff_accounts table
CREATE TABLE public.staff_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    staff_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    staff_email TEXT NOT NULL,
    staff_name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    allowed_modules TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(staff_user_id)
);

-- Enable RLS
ALTER TABLE public.staff_accounts ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check if a user is admin
CREATE OR REPLACE FUNCTION public.is_admin_user(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT NOT EXISTS (
        SELECT 1
        FROM public.staff_accounts
        WHERE staff_user_id = _user_id
    )
$$;

-- Create function to get admin user id for a staff member
CREATE OR REPLACE FUNCTION public.get_admin_user_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        (SELECT admin_user_id FROM public.staff_accounts WHERE staff_user_id = _user_id),
        _user_id
    )
$$;

-- Create function to check if user has module access
CREATE OR REPLACE FUNCTION public.has_module_access(_user_id UUID, _module TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        CASE 
            WHEN public.is_admin_user(_user_id) THEN true
            ELSE EXISTS (
                SELECT 1
                FROM public.staff_accounts
                WHERE staff_user_id = _user_id
                AND is_active = true
                AND _module = ANY(allowed_modules)
            )
        END
$$;

-- Policies for staff_accounts
CREATE POLICY "Admins can view their staff accounts"
ON public.staff_accounts
FOR SELECT
TO authenticated
USING (auth.uid() = admin_user_id OR auth.uid() = staff_user_id);

CREATE POLICY "Admins can create staff accounts"
ON public.staff_accounts
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = admin_user_id AND public.is_admin_user(auth.uid()));

CREATE POLICY "Admins can update their staff accounts"
ON public.staff_accounts
FOR UPDATE
TO authenticated
USING (auth.uid() = admin_user_id);

CREATE POLICY "Admins can delete their staff accounts"
ON public.staff_accounts
FOR DELETE
TO authenticated
USING (auth.uid() = admin_user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_staff_accounts_updated_at
BEFORE UPDATE ON public.staff_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();