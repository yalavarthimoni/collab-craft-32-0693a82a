-- Fix search_path for security functions
CREATE OR REPLACE FUNCTION notify_freelancers_new_project()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION notify_application_status()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION update_project_progress()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;