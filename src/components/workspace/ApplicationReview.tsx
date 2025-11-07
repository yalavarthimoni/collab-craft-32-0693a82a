import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, FileText, MessageSquare, Download } from "lucide-react";

interface ApplicationReviewProps {
  projectId: string;
}

interface Application {
  id: string;
  user_id: string;
  status: string;
  resume_url: string | null;
  cover_letter: string | null;
  interview_notes: string | null;
  applied_at: string;
  profiles: {
    full_name: string;
    email: string;
    skills: string[] | null;
  };
}

const ApplicationReview = ({ projectId }: ApplicationReviewProps) => {
  const { toast } = useToast();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [interviewNotes, setInterviewNotes] = useState("");

  useEffect(() => {
    fetchApplications();
  }, [projectId]);

  const fetchApplications = async () => {
    const { data, error } = await supabase
      .from("project_members")
      .select(`
        *,
        profiles!inner(full_name, email, skills)
      `)
      .eq("project_id", projectId)
      .in("status", ["pending", "approved", "rejected"])
      .order("applied_at", { ascending: false });

    if (error) {
      console.error("Error fetching applications:", error);
      toast({
        title: "Error",
        description: "Failed to load applications",
        variant: "destructive",
      });
    } else {
      setApplications(data as Application[]);
    }
    setLoading(false);
  };

  const handleStatusUpdate = async (appId: string, status: "approved" | "rejected", notes: string) => {
    const { error } = await supabase
      .from("project_members")
      .update({ 
        status, 
        interview_notes: notes 
      })
      .eq("id", appId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update application status",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `Application ${status}`,
      });
      fetchApplications();
      setSelectedApp(null);
      setInterviewNotes("");
    }
  };

  const downloadResume = async (resumeUrl: string) => {
    const { data, error } = await supabase.storage
      .from('project-files')
      .download(resumeUrl);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to download resume",
        variant: "destructive",
      });
      return;
    }

    // Create download link
    const url = window.URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = resumeUrl.split('/').pop() || 'resume.pdf';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  if (loading) {
    return <div className="text-center py-8">Loading applications...</div>;
  }

  const pendingApps = applications.filter(a => a.status === "pending");
  const reviewedApps = applications.filter(a => a.status !== "pending");

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Pending Applications ({pendingApps.length})</h3>
        {pendingApps.length === 0 ? (
          <p className="text-muted-foreground">No pending applications</p>
        ) : (
          <div className="grid gap-4">
            {pendingApps.map((app) => (
              <Card key={app.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-semibold">{app.profiles.full_name}</h4>
                    <p className="text-sm text-muted-foreground">{app.profiles.email}</p>
                    {app.profiles.skills && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {app.profiles.skills.map((skill) => (
                          <Badge key={skill} variant="secondary">{skill}</Badge>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      Applied: {new Date(app.applied_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {app.resume_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadResume(app.resume_url!)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Resume
                      </Button>
                    )}
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedApp(app)}
                        >
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Review
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Review Application - {app.profiles.full_name}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          {app.cover_letter && (
                            <div>
                              <Label>Cover Letter</Label>
                              <div className="p-4 bg-muted rounded-lg mt-2">
                                <p className="text-sm whitespace-pre-wrap">{app.cover_letter}</p>
                              </div>
                            </div>
                          )}
                          <div>
                            <Label>Interview Notes</Label>
                            <Textarea
                              placeholder="Add interview notes or feedback..."
                              value={interviewNotes}
                              onChange={(e) => setInterviewNotes(e.target.value)}
                              rows={4}
                              className="mt-2"
                            />
                          </div>
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="destructive"
                              onClick={() => handleStatusUpdate(app.id, "rejected", interviewNotes)}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Reject
                            </Button>
                            <Button
                              onClick={() => handleStatusUpdate(app.id, "approved", interviewNotes)}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Approve
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {reviewedApps.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Reviewed Applications</h3>
          <div className="grid gap-4">
            {reviewedApps.map((app) => (
              <Card key={app.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold">{app.profiles.full_name}</h4>
                    <p className="text-sm text-muted-foreground">{app.profiles.email}</p>
                    {app.interview_notes && (
                      <p className="text-sm mt-2 text-muted-foreground">
                        <strong>Notes:</strong> {app.interview_notes}
                      </p>
                    )}
                  </div>
                  <Badge variant={app.status === "approved" ? "default" : "destructive"}>
                    {app.status}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ApplicationReview;