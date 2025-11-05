import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TaskCardProps {
  task: any;
  members: any[];
  onUpdate: () => void;
}

const TaskCard = ({ task, members, onUpdate }: TaskCardProps) => {
  const { toast } = useToast();

  const handleStatusChange = async (newStatus: string) => {
    const { error } = await supabase
      .from("tasks")
      .update({ status: newStatus })
      .eq("id", task.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update task status",
        variant: "destructive",
      });
    } else {
      onUpdate();
    }
  };

  const assignedMember = members.find(m => m.user_id === task.assigned_to);

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="pt-4">
        <h4 className="font-semibold mb-2">{task.title}</h4>
        {task.description && (
          <p className="text-sm text-muted-foreground mb-3">{task.description}</p>
        )}
        
        <div className="space-y-2">
          {task.assigned_to && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              {assignedMember?.profiles?.full_name || "Unknown"}
            </div>
          )}
          
          {task.due_date && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              {new Date(task.due_date).toLocaleDateString()}
            </div>
          )}

          <Select value={task.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todo">To Do</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
};

export default TaskCard;
