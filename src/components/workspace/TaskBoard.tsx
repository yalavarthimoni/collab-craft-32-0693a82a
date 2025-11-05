import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import TaskCard from "./TaskCard";

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  assigned_to: string | null;
  due_date: string | null;
}

interface TaskBoardProps {
  projectId: string;
  isOwner: boolean;
}

const TaskBoard = ({ projectId, isOwner }: TaskBoardProps) => {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [dueDate, setDueDate] = useState("");

  useEffect(() => {
    fetchTasks();
    fetchMembers();

    // Real-time subscription
    const channel = supabase
      .channel('task-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tasks',
        filter: `project_id=eq.${projectId}`
      }, () => {
        fetchTasks();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  const fetchTasks = async () => {
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    setTasks(data || []);
  };

  const fetchMembers = async () => {
    const { data } = await supabase
      .from("project_members")
      .select("user_id, profiles(id, full_name)")
      .eq("project_id", projectId);

    setMembers(data || []);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase.from("tasks").insert({
      project_id: projectId,
      title,
      description,
      assigned_to: assignedTo || null,
      due_date: dueDate || null,
      status: "todo",
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create task",
        variant: "destructive",
      });
    } else {
      toast({ title: "Success!", description: "Task created successfully" });
      setOpen(false);
      setTitle("");
      setDescription("");
      setAssignedTo("");
      setDueDate("");
      fetchTasks();
    }
  };

  const todoTasks = tasks.filter(t => t.status === 'todo');
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
  const doneTasks = tasks.filter(t => t.status === 'done');

  return (
    <div className="space-y-6">
      {isOwner && (
        <div className="flex justify-end">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="gradient">
                <Plus className="h-4 w-4 mr-2" />
                Create Task
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Task</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateTask} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="task-title">Title</Label>
                  <Input
                    id="task-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="task-description">Description</Label>
                  <Textarea
                    id="task-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assign-to">Assign To</Label>
                  <Select value={assignedTo} onValueChange={setAssignedTo}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select member" />
                    </SelectTrigger>
                    <SelectContent>
                      {members.map((member: any) => (
                        <SelectItem key={member.user_id} value={member.user_id}>
                          {member.profiles?.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="due-date">Due Date</Label>
                  <Input
                    id="due-date"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" variant="gradient">
                  Create Task
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">To Do ({todoTasks.length})</h3>
          <div className="space-y-3">
            {todoTasks.map(task => (
              <TaskCard key={task.id} task={task} members={members} onUpdate={fetchTasks} />
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4">In Progress ({inProgressTasks.length})</h3>
          <div className="space-y-3">
            {inProgressTasks.map(task => (
              <TaskCard key={task.id} task={task} members={members} onUpdate={fetchTasks} />
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4">Done ({doneTasks.length})</h3>
          <div className="space-y-3">
            {doneTasks.map(task => (
              <TaskCard key={task.id} task={task} members={members} onUpdate={fetchTasks} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskBoard;
