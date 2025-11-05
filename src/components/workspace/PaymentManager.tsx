import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PaymentManagerProps {
  projectId: string;
}

const PaymentManager = ({ projectId }: PaymentManagerProps) => {
  const { toast } = useToast();
  const [payments, setPayments] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [freelancerId, setFreelancerId] = useState("");
  const [amount, setAmount] = useState("");

  useEffect(() => {
    fetchPayments();
    fetchMembers();
  }, [projectId]);

  const fetchPayments = async () => {
    const { data } = await supabase
      .from("payments")
      .select("*, profiles(full_name)")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    setPayments(data || []);
  };

  const fetchMembers = async () => {
    const { data } = await supabase
      .from("project_members")
      .select("user_id, profiles(id, full_name)")
      .eq("project_id", projectId);

    setMembers(data || []);
  };

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase.from("payments").insert({
      project_id: projectId,
      freelancer_id: freelancerId,
      amount: parseFloat(amount),
      status: "pending",
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create payment",
        variant: "destructive",
      });
    } else {
      toast({ title: "Success!", description: "Payment created successfully" });
      setOpen(false);
      setFreelancerId("");
      setAmount("");
      fetchPayments();
    }
  };

  const handleMarkPaid = async (paymentId: string) => {
    const { error } = await supabase
      .from("payments")
      .update({ status: "paid", payment_date: new Date().toISOString() })
      .eq("id", paymentId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update payment",
        variant: "destructive",
      });
    } else {
      toast({ title: "Success!", description: "Payment marked as paid" });
      fetchPayments();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Payments</h2>
          <p className="text-sm text-muted-foreground">
            Manage freelancer payments for this project
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="gradient">
              <Plus className="h-4 w-4 mr-2" />
              Create Payment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Payment</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreatePayment} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="freelancer">Freelancer</Label>
                <Select value={freelancerId} onValueChange={setFreelancerId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select freelancer" />
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
                <Label htmlFor="amount">Amount ($)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" variant="gradient">
                Create Payment
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {payments.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                No payments created yet
              </p>
            </CardContent>
          </Card>
        ) : (
          payments.map((payment) => (
            <Card key={payment.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-4">
                    <div className="bg-primary/10 p-3 rounded-lg">
                      <DollarSign className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{payment.profiles?.full_name}</h3>
                      <p className="text-2xl font-bold text-primary mt-1">
                        ${payment.amount.toFixed(2)}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Created: {new Date(payment.created_at).toLocaleDateString()}
                      </p>
                      {payment.payment_date && (
                        <p className="text-sm text-muted-foreground">
                          Paid: {new Date(payment.payment_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant={payment.status === "paid" ? "default" : "secondary"}>
                      {payment.status}
                    </Badge>
                    {payment.status === "pending" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMarkPaid(payment.id)}
                      >
                        Mark as Paid
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default PaymentManager;
