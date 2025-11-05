import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface TeamMembersProps {
  projectId: string;
  isOwner: boolean;
}

const TeamMembers = ({ projectId, isOwner }: TeamMembersProps) => {
  const [members, setMembers] = useState<any[]>([]);
  const [owner, setOwner] = useState<any>(null);

  useEffect(() => {
    fetchTeamMembers();
  }, [projectId]);

  const fetchTeamMembers = async () => {
    // Fetch project owner
    const { data: project } = await supabase
      .from("projects")
      .select("owner_id, profiles!projects_owner_id_fkey(full_name, email, skills)")
      .eq("id", projectId)
      .single();

    if (project) {
      setOwner(project.profiles);
    }

    // Fetch team members
    const { data } = await supabase
      .from("project_members")
      .select("user_id, joined_at, profiles(full_name, email, skills, portfolio_url)")
      .eq("project_id", projectId);

    setMembers(data || []);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Project Owner</CardTitle>
        </CardHeader>
        <CardContent>
          {owner && (
            <div className="flex items-start gap-4">
              <Avatar className="h-12 w-12">
                <AvatarFallback>
                  {owner.full_name?.charAt(0) || "O"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="font-semibold">{owner.full_name}</h3>
                <p className="text-sm text-muted-foreground">{owner.email}</p>
                {owner.skills && owner.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {owner.skills.map((skill: string) => (
                      <Badge key={skill} variant="secondary">{skill}</Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Team Members ({members.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No team members yet
            </p>
          ) : (
            <div className="space-y-4">
              {members.map((member: any) => (
                <div key={member.user_id} className="flex items-start gap-4 p-4 rounded-lg border">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback>
                      {member.profiles?.full_name?.charAt(0) || "M"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="font-semibold">{member.profiles?.full_name}</h3>
                    <p className="text-sm text-muted-foreground">{member.profiles?.email}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Joined: {new Date(member.joined_at).toLocaleDateString()}
                    </p>
                    {member.profiles?.skills && member.profiles.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {member.profiles.skills.map((skill: string) => (
                          <Badge key={skill} variant="secondary">{skill}</Badge>
                        ))}
                      </div>
                    )}
                    {member.profiles?.portfolio_url && (
                      <a
                        href={member.profiles.portfolio_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline mt-2 inline-block"
                      >
                        View Portfolio
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TeamMembers;
