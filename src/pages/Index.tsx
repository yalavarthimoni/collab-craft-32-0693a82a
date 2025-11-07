import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Briefcase, Users, CheckCircle, ArrowRight } from "lucide-react";
import heroBackground from "@/assets/hero-background.jpg";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section 
        className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-accent/5 to-background"
        style={{
          backgroundImage: `url(${heroBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundBlendMode: 'overlay',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary/70 to-accent/80"></div>
        <div className="relative container mx-auto px-4 py-24 md:py-32">
          <div className="max-w-3xl mx-auto text-center text-white">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 animate-fade-in">
              Freelance Project Collaboration Portal
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-white/90">
              Connect freelancers with project owners for seamless collaboration
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth">
                <Button size="lg" variant="gradient" className="text-lg px-8 group">
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="lg" variant="outline" className="text-lg px-8 bg-white/10 hover:bg-white/20 text-white border-white/30">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Why Choose FPCP?
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-card p-8 rounded-lg shadow-md hover:shadow-xl transition-shadow">
              <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Briefcase className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">For Project Owners</h3>
              <p className="text-muted-foreground">
                Create projects, assign tasks, and manage freelancers all in one place. Track progress and collaborate efficiently.
              </p>
            </div>
            
            <div className="bg-card p-8 rounded-lg shadow-md hover:shadow-xl transition-shadow">
              <div className="bg-accent/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-accent" />
              </div>
              <h3 className="text-xl font-semibold mb-3">For Freelancers</h3>
              <p className="text-muted-foreground">
                Browse available projects, join teams that match your skills, and showcase your work with a dynamic portfolio.
              </p>
            </div>
            
            <div className="bg-card p-8 rounded-lg shadow-md hover:shadow-xl transition-shadow">
              <div className="bg-success/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <CheckCircle className="h-6 w-6 text-success" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Seamless Workflow</h3>
              <p className="text-muted-foreground">
                Kanban boards, real-time updates, file sharing, and integrated communication keep your projects on track.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary to-accent text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Start Collaborating?
          </h2>
          <p className="text-xl mb-8 text-white/90 max-w-2xl mx-auto">
            Join thousands of freelancers and project owners working together to bring ideas to life.
          </p>
          <Link to="/auth">
            <Button size="lg" variant="gradient" className="bg-white text-primary hover:bg-white/90 text-lg px-8">
              Create Your Account
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2024 FPCP. Built with Lovable Cloud.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
