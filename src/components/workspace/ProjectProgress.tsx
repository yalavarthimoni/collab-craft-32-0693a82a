import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, TrendingUp } from "lucide-react";

interface ProjectProgressProps {
  projectId: string;
}

interface ProgressData {
  progress_percentage: number;
  updated_at: string;
  notes: string | null;
}

interface ProjectData {
  deadline: string | null;
  status: string;
}

const ProjectProgress = ({ projectId }: ProjectProgressProps) => {
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [project, setProject] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProgressData();
    
    // Subscribe to progress updates
    const channel = supabase
      .channel(`project-progress-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_progress',
          filter: `project_id=eq.${projectId}`
        },
        () => {
          fetchProgressData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  const fetchProgressData = async () => {
    // Fetch progress
    const { data: progressData } = await supabase
      .from("project_progress")
      .select("*")
      .eq("project_id", projectId)
      .maybeSingle();

    // Fetch project details
    const { data: projectData } = await supabase
      .from("projects")
      .select("deadline, status")
      .eq("id", projectId)
      .single();

    setProgress(progressData);
    setProject(projectData);
    setLoading(false);
  };

  const getDaysRemaining = () => {
    if (!project?.deadline) return null;
    const deadline = new Date(project.deadline);
    const now = new Date();
    const diff = deadline.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  };

  const getDeadlineColor = () => {
    const days = getDaysRemaining();
    if (!days) return "default";
    if (days < 0) return "destructive";
    if (days <= 3) return "destructive";
    if (days <= 7) return "secondary";
    return "default";
  };

  if (loading) {
    return <div className="text-center py-4">Loading progress...</div>;
  }

  const daysRemaining = getDaysRemaining();
  const progressPercentage = progress?.progress_percentage || 0;

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Project Progress
          </h3>
          <Badge variant={project?.status === "completed" ? "default" : "secondary"}>
            {project?.status || "active"}
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Completion</span>
            <span className="font-semibold">{progressPercentage}%</span>
          </div>
          <Progress value={progressPercentage} className="h-3" />
        </div>

        {project?.deadline && (
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Deadline</span>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">
                {new Date(project.deadline).toLocaleDateString()}
              </p>
              {daysRemaining !== null && (
                <Badge variant={getDeadlineColor()} className="mt-1">
                  {daysRemaining < 0
                    ? `Overdue by ${Math.abs(daysRemaining)} days`
                    : daysRemaining === 0
                    ? "Due today"
                    : `${daysRemaining} days remaining`}
                </Badge>
              )}
            </div>
          </div>
        )}

        {progress?.notes && (
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground">Last Update</p>
            <p className="text-sm mt-1">{progress.notes}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(progress.updated_at).toLocaleString()}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default ProjectProgress;