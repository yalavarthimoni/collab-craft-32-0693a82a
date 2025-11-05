-- Fix role security by creating separate user_roles table
CREATE TYPE public.app_role AS ENUM ('freelancer', 'project_owner');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User roles are viewable by everyone"
  ON public.user_roles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own role"
  ON public.user_roles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Migrate existing roles from profiles to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, role::text::app_role FROM public.profiles
ON CONFLICT (user_id, role) DO NOTHING;

-- Create milestones table
CREATE TABLE public.milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Milestones viewable by project members"
  ON public.milestones FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.project_members WHERE project_id = milestones.project_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.projects WHERE id = milestones.project_id AND owner_id = auth.uid())
  );

CREATE POLICY "Project owners can manage milestones"
  ON public.milestones FOR ALL
  USING (EXISTS (SELECT 1 FROM public.projects WHERE id = milestones.project_id AND owner_id = auth.uid()));

-- Create payments table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  freelancer_id UUID REFERENCES public.profiles(id) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  status TEXT DEFAULT 'pending',
  payment_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Payments viewable by involved parties"
  ON public.payments FOR SELECT
  USING (
    auth.uid() = freelancer_id
    OR EXISTS (SELECT 1 FROM public.projects WHERE id = payments.project_id AND owner_id = auth.uid())
  );

CREATE POLICY "Project owners can create payments"
  ON public.payments FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND owner_id = auth.uid()));

CREATE POLICY "Project owners can update payments"
  ON public.payments FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND owner_id = auth.uid()));

-- Create messages table for chat
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.profiles(id) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Messages viewable by project members"
  ON public.messages FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.project_members WHERE project_id = messages.project_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.projects WHERE id = messages.project_id AND owner_id = auth.uid())
  );

CREATE POLICY "Project members can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND (
      EXISTS (SELECT 1 FROM public.project_members WHERE project_id = messages.project_id AND user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.projects WHERE id = messages.project_id AND owner_id = auth.uid())
    )
  );

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  related_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Create file_attachments table
CREATE TABLE public.file_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES public.profiles(id) NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.file_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Attachments viewable by project members"
  ON public.file_attachments FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.project_members WHERE project_id = file_attachments.project_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.projects WHERE id = file_attachments.project_id AND owner_id = auth.uid())
  );

CREATE POLICY "Project members can upload files"
  ON public.file_attachments FOR INSERT
  WITH CHECK (
    auth.uid() = uploaded_by
    AND (
      EXISTS (SELECT 1 FROM public.project_members WHERE project_id = file_attachments.project_id AND user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.projects WHERE id = file_attachments.project_id AND owner_id = auth.uid())
    )
  );

-- Add trigger for milestones updated_at
CREATE TRIGGER update_milestones_updated_at
  BEFORE UPDATE ON public.milestones
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create storage bucket for project files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('project-files', 'project-files', false);

-- Storage policies
CREATE POLICY "Project members can view files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'project-files'
    AND (
      EXISTS (
        SELECT 1 FROM public.file_attachments fa
        JOIN public.project_members pm ON fa.project_id = pm.project_id
        WHERE fa.file_path = name AND pm.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.file_attachments fa
        JOIN public.projects p ON fa.project_id = p.id
        WHERE fa.file_path = name AND p.owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Project members can upload files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'project-files' AND auth.uid() IS NOT NULL);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;