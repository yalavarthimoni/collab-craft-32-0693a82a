-- Add application status to project members
ALTER TABLE project_members ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';
ALTER TABLE project_members DROP CONSTRAINT IF EXISTS project_members_status_check;
ALTER TABLE project_members ADD CONSTRAINT project_members_status_check CHECK (status IN ('pending', 'approved', 'rejected'));

ALTER TABLE project_members ADD COLUMN IF NOT EXISTS resume_url text;
ALTER TABLE project_members ADD COLUMN IF NOT EXISTS cover_letter text;
ALTER TABLE project_members ADD COLUMN IF NOT EXISTS interview_notes text;
ALTER TABLE project_members ADD COLUMN IF NOT EXISTS applied_at timestamp with time zone DEFAULT now();

-- Create email notifications preferences table
CREATE TABLE IF NOT EXISTS email_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  new_projects boolean DEFAULT true,
  application_updates boolean DEFAULT true,
  deadline_reminders boolean DEFAULT true,
  project_updates boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE email_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own preferences" ON email_preferences;
CREATE POLICY "Users can view their own preferences"
  ON email_preferences FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own preferences" ON email_preferences;
CREATE POLICY "Users can update their own preferences"
  ON email_preferences FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own preferences" ON email_preferences;
CREATE POLICY "Users can insert their own preferences"
  ON email_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create email queue table
CREATE TABLE IF NOT EXISTS email_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  template_type text NOT NULL,
  metadata jsonb,
  status text DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT now(),
  sent_at timestamp with time zone
);

ALTER TABLE email_queue DROP CONSTRAINT IF EXISTS email_queue_status_check;
ALTER TABLE email_queue ADD CONSTRAINT email_queue_status_check CHECK (status IN ('pending', 'sent', 'failed'));

ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

-- Update project_members policies
DROP POLICY IF EXISTS "Users can join projects" ON project_members;
DROP POLICY IF EXISTS "Users can apply to projects" ON project_members;

CREATE POLICY "Users can apply to projects"
  ON project_members FOR INSERT
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

DROP POLICY IF EXISTS "Project owners can approve/reject applications" ON project_members;
CREATE POLICY "Project owners can approve/reject applications"
  ON project_members FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = project_members.project_id 
    AND projects.owner_id = auth.uid()
  ));

-- Add deadline tracking
ALTER TABLE projects ADD COLUMN IF NOT EXISTS last_reminder_sent timestamp with time zone;

-- Notify freelancers function
CREATE OR REPLACE FUNCTION notify_freelancers_new_project()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO email_queue (to_email, subject, body, template_type, metadata)
  SELECT 
    p.email,
    'New Project Available: ' || NEW.title,
    'A new project matching your skills has been posted.',
    'new_project',
    jsonb_build_object(
      'project_id', NEW.id,
      'project_title', NEW.title,
      'project_description', NEW.description,
      'required_skills', NEW.required_skills
    )
  FROM profiles p
  LEFT JOIN email_preferences ep ON ep.user_id = p.id
  WHERE p.role = 'freelancer'
    AND (ep.new_projects IS NULL OR ep.new_projects = true);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_project_created ON projects;
CREATE TRIGGER on_project_created
  AFTER INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION notify_freelancers_new_project();

-- Notify application status function
CREATE OR REPLACE FUNCTION notify_application_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status != OLD.status AND NEW.status IN ('approved', 'rejected') THEN
    INSERT INTO email_queue (to_email, subject, body, template_type, metadata)
    SELECT 
      p.email,
      'Application ' || CASE WHEN NEW.status = 'approved' THEN 'Approved' ELSE 'Rejected' END,
      'Your application status has been updated.',
      'application_status',
      jsonb_build_object(
        'project_id', NEW.project_id,
        'status', NEW.status,
        'interview_notes', NEW.interview_notes
      )
    FROM profiles p
    WHERE p.id = NEW.user_id;
    
    INSERT INTO notifications (user_id, title, message, type, related_id)
    SELECT 
      NEW.user_id,
      'Application ' || CASE WHEN NEW.status = 'approved' THEN 'Approved' ELSE 'Rejected' END,
      'Your application for ' || pr.title || ' has been ' || NEW.status,
      'application',
      NEW.project_id
    FROM projects pr
    WHERE pr.id = NEW.project_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_application_status_change ON project_members;
CREATE TRIGGER on_application_status_change
  AFTER UPDATE ON project_members
  FOR EACH ROW
  EXECUTE FUNCTION notify_application_status();

-- Progress tracking table
CREATE TABLE IF NOT EXISTS project_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  progress_percentage integer DEFAULT 0,
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id),
  notes text,
  UNIQUE(project_id)
);

ALTER TABLE project_progress DROP CONSTRAINT IF EXISTS project_progress_progress_percentage_check;
ALTER TABLE project_progress ADD CONSTRAINT project_progress_progress_percentage_check CHECK (progress_percentage >= 0 AND progress_percentage <= 100);

ALTER TABLE project_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Progress viewable by project members" ON project_progress;
CREATE POLICY "Progress viewable by project members"
  ON project_progress FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_members 
      WHERE project_members.project_id = project_progress.project_id 
      AND project_members.user_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_progress.project_id 
      AND projects.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Project members can update progress" ON project_progress;
CREATE POLICY "Project members can update progress"
  ON project_progress FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM project_members 
      WHERE project_members.project_id = project_progress.project_id 
      AND project_members.user_id = auth.uid()
      AND project_members.status = 'approved'
    ) OR EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_progress.project_id 
      AND projects.owner_id = auth.uid()
    )
  );

-- Auto-update progress function
CREATE OR REPLACE FUNCTION update_project_progress()
RETURNS TRIGGER AS $$
DECLARE
  total_tasks integer;
  completed_tasks integer;
  progress integer;
BEGIN
  SELECT COUNT(*) INTO total_tasks
  FROM tasks
  WHERE project_id = COALESCE(NEW.project_id, OLD.project_id);
  
  SELECT COUNT(*) INTO completed_tasks
  FROM tasks
  WHERE project_id = COALESCE(NEW.project_id, OLD.project_id)
  AND status = 'done';
  
  IF total_tasks > 0 THEN
    progress := (completed_tasks * 100) / total_tasks;
    
    INSERT INTO project_progress (project_id, progress_percentage, updated_by, notes)
    VALUES (
      COALESCE(NEW.project_id, OLD.project_id),
      progress,
      auth.uid(),
      'Auto-updated from task completion'
    )
    ON CONFLICT (project_id) 
    DO UPDATE SET 
      progress_percentage = progress,
      updated_at = now(),
      updated_by = auth.uid();
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_task_status_change ON tasks;
CREATE TRIGGER on_task_status_change
  AFTER INSERT OR UPDATE OR DELETE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_project_progress();