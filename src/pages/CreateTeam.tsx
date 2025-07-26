import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ArrowLeft, Users, Plus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

export default function CreateTeam() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Team name is required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Create the team
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .insert([
          {
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            owner_id: user.id,
          }
        ])
        .select()
        .single();

      if (teamError) {
        throw teamError;
      }

      // Add the creator as a team member with owner role
      const { error: memberError } = await supabase
        .from('team_members')
        .insert([
          {
            team_id: teamData.id,
            user_id: user.id,
            role: 'owner'
          }
        ]);

      if (memberError) {
        throw memberError;
      }

      toast({
        title: "Team created successfully!",
        description: `${formData.name} has been created and you've been added as the owner.`,
      });

      navigate(`/teams/${teamData.id}`);
    } catch (error: any) {
      console.error('Error creating team:', error);
      toast({
        title: "Error creating team",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        {/* Navigation */}
        <div className="mb-6">
          <Button variant="ghost" asChild className="mb-4">
            <Link to="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Create New Team</h1>
          <p className="text-muted-foreground">
            Set up a new team to collaborate with others on tasks and projects.
          </p>
        </div>

        {/* Form */}
        <div className="max-w-2xl">
          <Card className="shadow-large bg-gradient-card border-0">
            <CardHeader>
              <div className="flex items-center">
                <div className="h-12 w-12 rounded-lg bg-gradient-primary flex items-center justify-center mr-4">
                  <Users className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <CardTitle className="text-xl">Team Information</CardTitle>
                  <CardDescription>
                    Provide basic information about your team
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="team-name" className="text-sm font-medium">
                    Team Name *
                  </Label>
                  <Input
                    id="team-name"
                    type="text"
                    placeholder="e.g., Marketing Team, Development Squad"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="transition-all duration-200 focus:shadow-medium"
                    required
                    maxLength={50}
                  />
                  <p className="text-xs text-muted-foreground">
                    Choose a clear, descriptive name for your team
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="team-description" className="text-sm font-medium">
                    Description (Optional)
                  </Label>
                  <Textarea
                    id="team-description"
                    placeholder="Describe what this team does and its main objectives..."
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    className="min-h-[100px] transition-all duration-200 focus:shadow-medium resize-none"
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground">
                    Help team members understand the purpose and goals of this team
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button
                    type="submit"
                    disabled={loading || !formData.name.trim()}
                    className="bg-gradient-primary hover:opacity-90 transition-all duration-300 shadow-medium"
                  >
                    {loading ? (
                      <LoadingSpinner size="sm" className="mr-2" />
                    ) : (
                      <Plus className="mr-2 h-4 w-4" />
                    )}
                    Create Team
                  </Button>
                  
                  <Button 
                    type="button" 
                    variant="outline" 
                    asChild
                    className="transition-all duration-200"
                  >
                    <Link to="/dashboard">
                      Cancel
                    </Link>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Tips Card */}
          <Card className="mt-6 bg-info/5 border-info/20">
            <CardContent className="p-6">
              <h3 className="font-semibold text-info mb-3 flex items-center">
                <Users className="mr-2 h-4 w-4" />
                Team Setup Tips
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Choose a name that clearly identifies your team's purpose</li>
                <li>• Add a description to help new members understand team goals</li>
                <li>• You'll be able to invite members and assign roles after creation</li>
                <li>• As the team owner, you'll have full administrative privileges</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}