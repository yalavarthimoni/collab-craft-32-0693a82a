import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Calendar, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getProjects, getProjectMembers, addProjectMember, Project } from "@/lib/localStorage";

interface FreelancerDashboardProps {
  userId: string;
}

const FreelancerDashboard = ({ userId }: FreelancerDashboardProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [availableProjects, setAvailableProjects] = useState<Project[]>([]);
  const [myProjects, setMyProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, [userId]);

  const fetchProjects = () => {
    const allProjects = getProjects();
    const members = getProjectMembers();
    
    const myProjectIds = members
      .filter(m => m.user_id === userId)
      .map(m => m.project_id);

    const joined = allProjects.filter(p => myProjectIds.includes(p.id));
    const available = allProjects.filter(
      p => p.status === "open" && !myProjectIds.includes(p.id)
    );

    setMyProjects(joined);
    setAvailableProjects(available);
    setLoading(false);
  };

  const handleJoinProject = (projectId: string) => {
    addProjectMember({ project_id: projectId, user_id: userId });

    toast({
      title: "Success!",
      description: "You have joined the project",
      variant: "default",
    });

    fetchProjects();
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
                    <Button
                      variant="outline"
                      className="w-full"
                      size="sm"
                      onClick={() => navigate(`/project/${project.id}`)}
                    >
                      View Workspace
                    </Button>
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
