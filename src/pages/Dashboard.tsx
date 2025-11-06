import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import FreelancerDashboard from "@/components/dashboard/FreelancerDashboard";
import ProjectOwnerDashboard from "@/components/dashboard/ProjectOwnerDashboard";
import ThemeToggle from "@/components/ThemeToggle";
import { getCurrentUser, setCurrentUser, Profile } from "@/lib/localStorage";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      navigate("/auth");
    } else {
      setUser(currentUser);
    }
    setLoading(false);
  }, [navigate]);

  const handleLogout = () => {
    setCurrentUser(null);
    toast({
      title: "Logged out",
      description: "You have been successfully logged out",
    });
    navigate("/");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-primary">FPCP</h1>
            <p className="text-sm text-muted-foreground">
              {user?.role === "freelancer" ? "Freelancer Dashboard" : "Project Owner Dashboard"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button onClick={handleLogout} variant="ghost" size="sm">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {user?.role === "freelancer" ? (
          <FreelancerDashboard userId={user.id} />
        ) : (
          <ProjectOwnerDashboard userId={user?.id || ""} />
        )}
      </main>
    </div>
  );
};

export default Dashboard;
