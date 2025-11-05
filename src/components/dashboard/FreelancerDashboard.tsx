import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Calendar, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Project {
  id: string;
  title: string;
  description: string;
  required_skills: string[];
  deadline: string | null;
  status: string;
}

interface FreelancerDashboardProps {
  userId: string;
}

const FreelancerDashboard = ({ userId }: FreelancerDashboardProps) => {
  const { toast } = useToast();
  const [availableProjects, setAvailableProjects] = useState<Project[]>([]);
  const [myProjects, setMyProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, [userId]);

  const fetchProjects = async () => {
    // Fetch all available projects
    const { data: allProjects } = await supabase
      .from("projects")
      .select("*")
      .eq("status", "open")
      .order("created_at", { ascending: false });

    // Fetch projects the user is part of
    const { data: memberProjects } = await supabase
      .from("project_members")
      .select("project_id")
      .eq("user_id", userId);

    const memberProjectIds = memberProjects?.map((p) => p.project_id) || [];

    // Fetch full details of joined projects
    const { data: joinedProjects } = await supabase
      .from("projects")
      .select("*")
      .in("id", memberProjectIds);

    setAvailableProjects(
      allProjects?.filter((p) => !memberProjectIds.includes(p.id)) || []
    );
    setMyProjects(joinedProjects || []);
    setLoading(false);
  };

  const handleJoinProject = async (projectId: string) => {
    const { error } = await supabase
      .from("project_members")
      .insert({ project_id: projectId, user_id: userId });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to join project",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success!",
        description: "You have joined the project",
        variant: "default",
      });
      fetchProjects();
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <CheckCircle2 className="h-6 w-6 text-success" />
          My Projects
        </h2>
        {myProjects.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-center">
                You haven't joined any projects yet. Browse available projects below.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {myProjects.map((project) => (
              <Card key={project.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="line-clamp-1">{project.title}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {project.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-1">
                      {project.required_skills?.map((skill) => (
                        <Badge key={skill} variant="secondary">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                    {project.deadline && (
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Due: {new Date(project.deadline).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Briefcase className="h-6 w-6 text-primary" />
          Available Projects
        </h2>
        {availableProjects.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-center">
                No available projects at the moment. Check back later!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {availableProjects.map((project) => (
              <Card key={project.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="line-clamp-1">{project.title}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {project.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-1">
                      {project.required_skills?.map((skill) => (
                        <Badge key={skill} variant="secondary">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                    {project.deadline && (
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Due: {new Date(project.deadline).toLocaleDateString()}
                      </p>
                    )}
                    <Button
                      onClick={() => handleJoinProject(project.id)}
                      className="w-full"
                      variant="gradient"
                    >
                      Join Project
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default FreelancerDashboard;
