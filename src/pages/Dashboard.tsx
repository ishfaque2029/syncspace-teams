import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Plus, Users, CheckSquare, Clock, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface Team {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
  member_count?: number;
  task_count?: number;
}

export default function Dashboard() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchTeams();
      setupRealtimeSubscription();
    }
  }, [user]);

  const fetchTeams = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Fetch teams where user is owner or member
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select(`
          *,
          team_members!inner(user_id)
        `)
        .or(`owner_id.eq.${user.id},team_members.user_id.eq.${user.id}`);

      if (teamsError) {
        throw teamsError;
      }

      // Get member and task counts for each team
      const teamsWithCounts = await Promise.all(
        (teamsData || []).map(async (team) => {
          // Get member count
          const { count: memberCount } = await supabase
            .from('team_members')
            .select('*', { count: 'exact', head: true })
            .eq('team_id', team.id);

          // Get task count
          const { count: taskCount } = await supabase
            .from('tasks')
            .select('*', { count: 'exact', head: true })
            .eq('team_id', team.id);

          return {
            ...team,
            member_count: memberCount || 0,
            task_count: taskCount || 0,
          };
        })
      );

      setTeams(teamsWithCounts);
    } catch (error: any) {
      console.error('Error fetching teams:', error);
      toast({
        title: "Error",
        description: "Failed to load teams",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!user) return;

    const channel = supabase
      .channel('dashboard-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'teams'
        },
        () => {
          setTimeout(() => fetchTeams(), 100);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_members'
        },
        () => {
          setTimeout(() => fetchTeams(), 100);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks'
        },
        () => {
          setTimeout(() => fetchTeams(), 100);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const isTeamOwner = (team: Team) => {
    return team.owner_id === user?.id;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <LoadingSpinner size="lg" className="mx-auto mb-4" />
              <p className="text-muted-foreground">Loading your teams...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Welcome back, {profile?.username || 'User'}!
          </h1>
          <p className="text-muted-foreground">
            Here's an overview of your teams and projects.
          </p>
        </div>

        {/* Action Section */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <Button 
            asChild 
            className="bg-gradient-primary hover:opacity-90 transition-all duration-300 shadow-medium"
          >
            <Link to="/teams/create">
              <Plus className="mr-2 h-4 w-4" />
              Create New Team
            </Link>
          </Button>
        </div>

        {/* Teams Grid */}
        {teams.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto h-16 w-16 rounded-lg bg-muted flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No teams yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Get started by creating your first team. Invite members and start collaborating on tasks.
            </p>
            <Button asChild className="bg-gradient-primary hover:opacity-90">
              <Link to="/teams/create">
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Team
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.map((team) => (
              <Card 
                key={team.id} 
                className="group hover:shadow-large transition-all duration-300 cursor-pointer bg-gradient-card border-0"
              >
                <Link to={`/teams/${team.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="group-hover:text-primary transition-colors">
                          {team.name}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {team.description || 'No description provided'}
                        </CardDescription>
                      </div>
                      {isTeamOwner(team) && (
                        <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-2"></div>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                      <div className="flex items-center">
                        <Users className="mr-1 h-3 w-3" />
                        {team.member_count} {team.member_count === 1 ? 'member' : 'members'}
                      </div>
                      <div className="flex items-center">
                        <CheckSquare className="mr-1 h-3 w-3" />
                        {team.task_count} {team.task_count === 1 ? 'task' : 'tasks'}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Created {formatDate(team.created_at)}</span>
                      {isTeamOwner(team) && (
                        <span className="text-primary font-medium">Owner</span>
                      )}
                    </div>
                  </CardContent>
                </Link>
              </Card>
            ))}
          </div>
        )}

        {/* Quick Stats */}
        {teams.length > 0 && (
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-gradient-card border-0">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mr-4">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {teams.length}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Teams Joined
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card border-0">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="h-12 w-12 rounded-lg bg-success/10 flex items-center justify-center mr-4">
                    <CheckSquare className="h-6 w-6 text-success" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {teams.reduce((acc, team) => acc + (team.task_count || 0), 0)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Total Tasks
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card border-0">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="h-12 w-12 rounded-lg bg-warning/10 flex items-center justify-center mr-4">
                    <Clock className="h-6 w-6 text-warning" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {teams.filter(team => team.owner_id === user?.id).length}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Teams Owned
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}