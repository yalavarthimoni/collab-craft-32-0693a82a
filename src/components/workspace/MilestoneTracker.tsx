import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MilestoneTrackerProps {
  projectId: string;
  isOwner: boolean;
}

const MilestoneTracker = ({ projectId, isOwner }: MilestoneTrackerProps) => {
  const { toast } = useToast();
  const [milestones, setMilestones] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");

  useEffect(() => {
    fetchMilestones();
  }, [projectId]);

  const fetchMilestones = async () => {
    const { data } = await supabase
      .from("milestones")
      .select("*")
      .eq("project_id", projectId)
      .order("due_date", { ascending: true });

    setMilestones(data || []);
  };

  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase.from("milestones").insert({
      project_id: projectId,
      title,
      description,
      due_date: dueDate || null,
      status: "pending",
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create milestone",
        variant: "destructive",
      });
    } else {
      toast({ title: "Success!", description: "Milestone created successfully" });
      setOpen(false);
      setTitle("");
      setDescription("");
      setDueDate("");
      fetchMilestones();
    }
  };

  const handleToggleStatus = async (milestoneId: string, currentStatus: string) => {
    const newStatus = currentStatus === "completed" ? "pending" : "completed";

    const { error } = await supabase
      .from("milestones")
      .update({ status: newStatus })
      .eq("id", milestoneId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update milestone",
        variant: "destructive",
      });
    } else {
      fetchMilestones();
    }
  };

  return (
    <div className="space-y-6">
      {isOwner && (
        <div className="flex justify-end">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="gradient">
                <Plus className="h-4 w-4 mr-2" />
                Create Milestone
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Milestone</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateMilestone} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="milestone-title">Title</Label>
                  <Input
                    id="milestone-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="milestone-description">Description</Label>
                  <Textarea
                    id="milestone-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="milestone-due-date">Due Date</Label>
                  <Input
                    id="milestone-due-date"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" variant="gradient">
                  Create Milestone
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      )}

      <div className="grid gap-4">
        {milestones.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                No milestones created yet
              </p>
            </CardContent>
          </Card>
        ) : (
          milestones.map((milestone) => (
            <Card key={milestone.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="flex items-center gap-2">
                    {milestone.title}
                    {milestone.status === "completed" && (
                      <CheckCircle2 className="h-5 w-5 text-success" />
                    )}
                  </CardTitle>
                  <Badge variant={milestone.status === "completed" ? "default" : "secondary"}>
                    {milestone.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {milestone.description && (
                  <p className="text-sm text-muted-foreground mb-3">
                    {milestone.description}
                  </p>
                )}
                {milestone.due_date && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                    <Calendar className="h-4 w-4" />
                    Due: {new Date(milestone.due_date).toLocaleDateString()}
                  </div>
                )}
                {isOwner && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleStatus(milestone.id, milestone.status)}
                  >
                    Mark as {milestone.status === "completed" ? "Pending" : "Completed"}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default MilestoneTracker;
