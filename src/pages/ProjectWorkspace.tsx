import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";
import TaskBoard from "@/components/workspace/TaskBoard";
import TeamMembers from "@/components/workspace/TeamMembers";
import ProjectChat from "@/components/workspace/ProjectChat";
import FileManager from "@/components/workspace/FileManager";
import MilestoneTracker from "@/components/workspace/MilestoneTracker";
import PaymentManager from "@/components/workspace/PaymentManager";
import ApplicationReview from "@/components/workspace/ApplicationReview";
import ProjectProgress from "@/components/workspace/ProjectProgress";

const ProjectWorkspace = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  const fetchProject = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (data) {
      setProject(data);
      setIsOwner(data.owner_id === user.id);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-center text-muted-foreground">Project not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{project.title}</h1>
              <p className="text-sm text-muted-foreground">{project.description}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="tasks" className="w-full">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
            <TabsTrigger value="milestones">Milestones</TabsTrigger>
            {isOwner && <TabsTrigger value="applications">Applications</TabsTrigger>}
            {isOwner && <TabsTrigger value="payments">Payments</TabsTrigger>}
          </TabsList>

          <TabsContent value="tasks" className="mt-6">
            <TaskBoard projectId={projectId!} isOwner={isOwner} />
          </TabsContent>

          <TabsContent value="team" className="mt-6">
            <TeamMembers projectId={projectId!} isOwner={isOwner} />
          </TabsContent>

          <TabsContent value="chat" className="mt-6">
            <ProjectChat projectId={projectId!} />
          </TabsContent>

          <TabsContent value="files" className="mt-6">
            <FileManager projectId={projectId!} />
          </TabsContent>

          <TabsContent value="milestones" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <MilestoneTracker projectId={projectId!} isOwner={isOwner} />
              </div>
              <div>
                <ProjectProgress projectId={projectId!} />
              </div>
            </div>
          </TabsContent>

          {isOwner && (
            <>
              <TabsContent value="applications" className="mt-6">
                <ApplicationReview projectId={projectId!} />
              </TabsContent>

              <TabsContent value="payments" className="mt-6">
                <PaymentManager projectId={projectId!} />
              </TabsContent>
            </>
          )}
        </Tabs>
      </main>
    </div>
  );
};

export default ProjectWorkspace;
