import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Settings, MessageSquare, Users, Zap, Brain, Shield, Clock, Target } from "lucide-react";

interface AISettings {
  groupChat: {
    enabled: boolean;
    responseFrequency: number; // 1-10 scale
    topics: string[];
    autoTopicGeneration: boolean;
    topicFrequency: number; // hours
    contentModeration: {
      enabled: boolean;
      profanityFilter: boolean;
      rudenessDetetion: boolean;
      offTopicWarning: boolean;
      customKeywords: string[];
    };
    responseStyle: 'supportive' | 'motivational' | 'professional' | 'friendly';
    maxResponseLength: number;
    timingRules: {
      quietHours: { start: string; end: string };
      weekendBehavior: 'normal' | 'reduced' | 'weekend_only';
    };
  };
  individualChat: {
    enabled: boolean;
    autoSuggestResponses: boolean;
    responseDelay: number; // seconds
    urgentResponseKeywords: string[];
    responseStyle: 'supportive' | 'motivational' | 'professional' | 'friendly';
    confidenceThreshold: number; // 1-10
  };
  macroRecommendations: {
    enabled: boolean;
    aggressiveness: number; // 1-10 scale
    hungerThreshold: number; // 1-5
    weightChangeThreshold: number; // pounds
    autoApprovalThreshold: number; // confidence 1-10
    customRules: string;
  };
  workoutGeneration: {
    enabled: boolean;
    difficulty: 'beginner' | 'intermediate' | 'advanced' | 'adaptive';
    variety: number; // 1-10 scale
    injuryAwareness: boolean;
    equipmentAdaptation: boolean;
    progressionTracking: boolean;
  };
  nutritionAnalysis: {
    enabled: boolean;
    strictness: number; // 1-10 scale
    customFoodDatabase: boolean;
    alternativesuggestions: boolean;
    portionWarnings: boolean;
  };
  progressReports: {
    enabled: boolean;
    frequency: 'weekly' | 'biweekly' | 'monthly';
    autoGeneration: boolean;
    includeAIInsights: boolean;
    customMetrics: string[];
  };
}

export default function AISettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [settings, setSettings] = useState<AISettings>({
    groupChat: {
      enabled: true,
      responseFrequency: 5,
      topics: ["Motivation Monday", "Workout Wednesday", "Nutrition Check-in"],
      autoTopicGeneration: true,
      topicFrequency: 24,
      contentModeration: {
        enabled: true,
        profanityFilter: true,
        rudenessDetetion: true,
        offTopicWarning: true,
        customKeywords: ["spam", "promotion"]
      },
      responseStyle: 'supportive',
      maxResponseLength: 300,
      timingRules: {
        quietHours: { start: "22:00", end: "06:00" },
        weekendBehavior: 'reduced'
      }
    },
    individualChat: {
      enabled: true,
      autoSuggestResponses: true,
      responseDelay: 2,
      urgentResponseKeywords: ["emergency", "urgent", "help", "crisis"],
      responseStyle: 'supportive',
      confidenceThreshold: 7
    },
    macroRecommendations: {
      enabled: true,
      aggressiveness: 5,
      hungerThreshold: 4,
      weightChangeThreshold: 2,
      autoApprovalThreshold: 8,
      customRules: "Focus on sustainable changes. Prioritize protein for muscle retention."
    },
    workoutGeneration: {
      enabled: true,
      difficulty: 'adaptive',
      variety: 7,
      injuryAwareness: true,
      equipmentAdaptation: true,
      progressionTracking: true
    },
    nutritionAnalysis: {
      enabled: true,
      strictness: 6,
      customFoodDatabase: true,
      alternativesuggestions: true,
      portionWarnings: true
    },
    progressReports: {
      enabled: true,
      frequency: 'weekly',
      autoGeneration: true,
      includeAIInsights: true,
      customMetrics: ["Adherence Score", "Energy Levels", "Sleep Quality"]
    }
  });

  const { data: currentSettings, isLoading } = useQuery({
    queryKey: ['/api/trainer/ai-settings'],
    retry: false,
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: AISettings) => {
      return await apiRequest('/api/trainer/ai-settings', {
        method: 'PUT',
        body: newSettings,
      });
    },
    onSuccess: () => {
      toast({
        title: "Settings Updated",
        description: "AI behavior settings have been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/trainer/ai-settings'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update AI settings",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (currentSettings) {
      setSettings(currentSettings);
    }
  }, [currentSettings]);

  const handleSave = () => {
    updateSettingsMutation.mutate(settings);
  };

  const updateGroupChatSetting = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      groupChat: { ...prev.groupChat, [key]: value }
    }));
  };

  const updateIndividualChatSetting = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      individualChat: { ...prev.individualChat, [key]: value }
    }));
  };

  const updateMacroSetting = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      macroRecommendations: { ...prev.macroRecommendations, [key]: value }
    }));
  };

  const updateWorkoutSetting = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      workoutGeneration: { ...prev.workoutGeneration, [key]: value }
    }));
  };

  const updateNutritionSetting = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      nutritionAnalysis: { ...prev.nutritionAnalysis, [key]: value }
    }));
  };

  const updateProgressSetting = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      progressReports: { ...prev.progressReports, [key]: value }
    }));
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading AI settings...</div>;
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="h-8 w-8" />
            AI Behavior Settings
          </h1>
          <p className="text-muted-foreground mt-2">
            Control how the AI assistant behaves across all interactions with your clients
          </p>
        </div>
        <Button 
          onClick={handleSave}
          disabled={updateSettingsMutation.isPending}
          size="lg"
        >
          {updateSettingsMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <Tabs defaultValue="group-chat" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="group-chat" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Group Chat
          </TabsTrigger>
          <TabsTrigger value="individual-chat" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Individual Chat
          </TabsTrigger>
          <TabsTrigger value="macros" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Macro Recommendations
          </TabsTrigger>
          <TabsTrigger value="workouts" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Workout Generation
          </TabsTrigger>
          <TabsTrigger value="nutrition" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Nutrition Analysis
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Progress Reports
          </TabsTrigger>
        </TabsList>

        {/* Group Chat Settings */}
        <TabsContent value="group-chat">
          <Card>
            <CardHeader>
              <CardTitle>Group Chat AI Behavior</CardTitle>
              <CardDescription>
                Configure how the AI moderates and participates in group conversations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Enable AI Group Chat Participation</Label>
                  <p className="text-sm text-muted-foreground">Allow AI to respond in group conversations</p>
                </div>
                <Switch
                  checked={settings.groupChat.enabled}
                  onCheckedChange={(checked) => updateGroupChatSetting('enabled', checked)}
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <Label className="text-base font-medium">Response Frequency</Label>
                <div className="px-3">
                  <Slider
                    value={[settings.groupChat.responseFrequency]}
                    onValueChange={([value]) => updateGroupChatSetting('responseFrequency', value)}
                    max={10}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Rarely</span>
                    <span>Moderate</span>
                    <span>Frequently</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Current: {settings.groupChat.responseFrequency}/10 - 
                  {settings.groupChat.responseFrequency <= 3 ? ' Conservative' : 
                   settings.groupChat.responseFrequency <= 7 ? ' Balanced' : ' Active'}
                </p>
              </div>

              <div className="space-y-4">
                <Label className="text-base font-medium">Response Style</Label>
                <Select
                  value={settings.groupChat.responseStyle}
                  onValueChange={(value) => updateGroupChatSetting('responseStyle', value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="supportive">Supportive & Encouraging</SelectItem>
                    <SelectItem value="motivational">High-Energy & Motivational</SelectItem>
                    <SelectItem value="professional">Professional & Informative</SelectItem>
                    <SelectItem value="friendly">Casual & Friendly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">Auto Topic Generation</Label>
                    <p className="text-sm text-muted-foreground">Automatically post discussion topics</p>
                  </div>
                  <Switch
                    checked={settings.groupChat.autoTopicGeneration}
                    onCheckedChange={(checked) => updateGroupChatSetting('autoTopicGeneration', checked)}
                  />
                </div>
                
                {settings.groupChat.autoTopicGeneration && (
                  <div className="space-y-3 pl-4 border-l-2 border-muted">
                    <div className="space-y-2">
                      <Label htmlFor="topic-frequency">Topic Frequency (hours)</Label>
                      <Input
                        id="topic-frequency"
                        type="number"
                        value={settings.groupChat.topicFrequency}
                        onChange={(e) => updateGroupChatSetting('topicFrequency', parseInt(e.target.value))}
                        min="1"
                        max="168"
                      />
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-4">
                <Label className="text-base font-medium">Content Moderation</Label>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="profanity-filter">Profanity Filter</Label>
                    <Switch
                      id="profanity-filter"
                      checked={settings.groupChat.contentModeration.profanityFilter}
                      onCheckedChange={(checked) => 
                        setSettings(prev => ({
                          ...prev,
                          groupChat: {
                            ...prev.groupChat,
                            contentModeration: {
                              ...prev.groupChat.contentModeration,
                              profanityFilter: checked
                            }
                          }
                        }))
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="rudeness-detection">Rudeness Detection</Label>
                    <Switch
                      id="rudeness-detection"
                      checked={settings.groupChat.contentModeration.rudenessDetetion}
                      onCheckedChange={(checked) => 
                        setSettings(prev => ({
                          ...prev,
                          groupChat: {
                            ...prev.groupChat,
                            contentModeration: {
                              ...prev.groupChat.contentModeration,
                              rudenessDetetion: checked
                            }
                          }
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="custom-keywords">Custom Moderation Keywords</Label>
                  <Textarea
                    id="custom-keywords"
                    placeholder="Enter keywords separated by commas..."
                    value={settings.groupChat.contentModeration.customKeywords.join(', ')}
                    onChange={(e) => 
                      setSettings(prev => ({
                        ...prev,
                        groupChat: {
                          ...prev.groupChat,
                          contentModeration: {
                            ...prev.groupChat.contentModeration,
                            customKeywords: e.target.value.split(',').map(k => k.trim()).filter(k => k)
                          }
                        }
                      }))
                    }
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <Label className="text-base font-medium">Timing Rules</Label>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quiet-start">Quiet Hours Start</Label>
                    <Input
                      id="quiet-start"
                      type="time"
                      value={settings.groupChat.timingRules.quietHours.start}
                      onChange={(e) => 
                        setSettings(prev => ({
                          ...prev,
                          groupChat: {
                            ...prev.groupChat,
                            timingRules: {
                              ...prev.groupChat.timingRules,
                              quietHours: {
                                ...prev.groupChat.timingRules.quietHours,
                                start: e.target.value
                              }
                            }
                          }
                        }))
                      }
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="quiet-end">Quiet Hours End</Label>
                    <Input
                      id="quiet-end"
                      type="time"
                      value={settings.groupChat.timingRules.quietHours.end}
                      onChange={(e) => 
                        setSettings(prev => ({
                          ...prev,
                          groupChat: {
                            ...prev.groupChat,
                            timingRules: {
                              ...prev.groupChat.timingRules,
                              quietHours: {
                                ...prev.groupChat.timingRules.quietHours,
                                end: e.target.value
                              }
                            }
                          }
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="weekend-behavior">Weekend Behavior</Label>
                  <Select
                    value={settings.groupChat.timingRules.weekendBehavior}
                    onValueChange={(value) => 
                      setSettings(prev => ({
                        ...prev,
                        groupChat: {
                          ...prev.groupChat,
                          timingRules: {
                            ...prev.groupChat.timingRules,
                            weekendBehavior: value as 'normal' | 'reduced' | 'weekend_only'
                          }
                        }
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal Activity</SelectItem>
                      <SelectItem value="reduced">Reduced Activity</SelectItem>
                      <SelectItem value="weekend_only">Weekend Topics Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Individual Chat Settings */}
        <TabsContent value="individual-chat">
          <Card>
            <CardHeader>
              <CardTitle>Individual Chat AI Behavior</CardTitle>
              <CardDescription>
                Configure AI assistance for one-on-one client conversations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Enable AI Chat Assistance</Label>
                  <p className="text-sm text-muted-foreground">AI suggests responses for individual chats</p>
                </div>
                <Switch
                  checked={settings.individualChat.enabled}
                  onCheckedChange={(checked) => updateIndividualChatSetting('enabled', checked)}
                />
              </div>

              <div className="space-y-4">
                <Label className="text-base font-medium">Response Confidence Threshold</Label>
                <div className="px-3">
                  <Slider
                    value={[settings.individualChat.confidenceThreshold]}
                    onValueChange={([value]) => updateIndividualChatSetting('confidenceThreshold', value)}
                    max={10}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Low Quality</span>
                    <span>Balanced</span>
                    <span>High Quality</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Only suggest responses with {settings.individualChat.confidenceThreshold}/10 confidence or higher
                </p>
              </div>

              <div className="space-y-4">
                <Label className="text-base font-medium">Response Style</Label>
                <Select
                  value={settings.individualChat.responseStyle}
                  onValueChange={(value) => updateIndividualChatSetting('responseStyle', value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="supportive">Supportive & Encouraging</SelectItem>
                    <SelectItem value="motivational">High-Energy & Motivational</SelectItem>
                    <SelectItem value="professional">Professional & Informative</SelectItem>
                    <SelectItem value="friendly">Casual & Friendly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="urgent-keywords">Urgent Response Keywords</Label>
                <Textarea
                  id="urgent-keywords"
                  placeholder="Keywords that trigger immediate response suggestions..."
                  value={settings.individualChat.urgentResponseKeywords.join(', ')}
                  onChange={(e) => 
                    updateIndividualChatSetting('urgentResponseKeywords', 
                      e.target.value.split(',').map(k => k.trim()).filter(k => k)
                    )
                  }
                />
                <p className="text-sm text-muted-foreground">
                  Messages containing these keywords will trigger immediate AI response suggestions
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Macro Recommendations Settings */}
        <TabsContent value="macros">
          <Card>
            <CardHeader>
              <CardTitle>Macro Recommendation AI</CardTitle>
              <CardDescription>
                Control how AI analyzes and suggests macro adjustments
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Enable AI Macro Recommendations</Label>
                  <p className="text-sm text-muted-foreground">AI can suggest macro adjustments</p>
                </div>
                <Switch
                  checked={settings.macroRecommendations.enabled}
                  onCheckedChange={(checked) => updateMacroSetting('enabled', checked)}
                />
              </div>

              <div className="space-y-4">
                <Label className="text-base font-medium">Recommendation Aggressiveness</Label>
                <div className="px-3">
                  <Slider
                    value={[settings.macroRecommendations.aggressiveness]}
                    onValueChange={([value]) => updateMacroSetting('aggressiveness', value)}
                    max={10}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Conservative</span>
                    <span>Moderate</span>
                    <span>Aggressive</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hunger-threshold">Hunger Level Trigger</Label>
                  <Select
                    value={settings.macroRecommendations.hungerThreshold.toString()}
                    onValueChange={(value) => updateMacroSetting('hungerThreshold', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">Level 3+ (Moderate)</SelectItem>
                      <SelectItem value="4">Level 4+ (High)</SelectItem>
                      <SelectItem value="5">Level 5 (Extreme)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="weight-threshold">Weight Change Threshold (lbs)</Label>
                  <Input
                    id="weight-threshold"
                    type="number"
                    value={settings.macroRecommendations.weightChangeThreshold}
                    onChange={(e) => updateMacroSetting('weightChangeThreshold', parseFloat(e.target.value))}
                    min="0.5"
                    max="10"
                    step="0.5"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="custom-rules">Custom AI Rules</Label>
                <Textarea
                  id="custom-rules"
                  placeholder="Additional guidelines for AI macro recommendations..."
                  value={settings.macroRecommendations.customRules}
                  onChange={(e) => updateMacroSetting('customRules', e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Workout Generation Settings */}
        <TabsContent value="workouts">
          <Card>
            <CardHeader>
              <CardTitle>Workout Generation AI</CardTitle>
              <CardDescription>
                Configure AI workout creation and personalization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Enable AI Workout Generation</Label>
                  <p className="text-sm text-muted-foreground">AI can create personalized workouts</p>
                </div>
                <Switch
                  checked={settings.workoutGeneration.enabled}
                  onCheckedChange={(checked) => updateWorkoutSetting('enabled', checked)}
                />
              </div>

              <div className="space-y-4">
                <Label className="text-base font-medium">Default Difficulty Level</Label>
                <Select
                  value={settings.workoutGeneration.difficulty}
                  onValueChange={(value) => updateWorkoutSetting('difficulty', value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                    <SelectItem value="adaptive">Adaptive (AI Decides)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <Label className="text-base font-medium">Exercise Variety</Label>
                <div className="px-3">
                  <Slider
                    value={[settings.workoutGeneration.variety]}
                    onValueChange={([value]) => updateWorkoutSetting('variety', value)}
                    max={10}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Consistent</span>
                    <span>Balanced</span>
                    <span>Highly Varied</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="injury-awareness">Injury Awareness</Label>
                  <Switch
                    id="injury-awareness"
                    checked={settings.workoutGeneration.injuryAwareness}
                    onCheckedChange={(checked) => updateWorkoutSetting('injuryAwareness', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="equipment-adaptation">Equipment Adaptation</Label>
                  <Switch
                    id="equipment-adaptation"
                    checked={settings.workoutGeneration.equipmentAdaptation}
                    onCheckedChange={(checked) => updateWorkoutSetting('equipmentAdaptation', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Nutrition Analysis Settings */}
        <TabsContent value="nutrition">
          <Card>
            <CardHeader>
              <CardTitle>Nutrition Analysis AI</CardTitle>
              <CardDescription>
                Control AI food recognition and nutritional analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Enable AI Nutrition Analysis</Label>
                  <p className="text-sm text-muted-foreground">AI analyzes food photos and logs</p>
                </div>
                <Switch
                  checked={settings.nutritionAnalysis.enabled}
                  onCheckedChange={(checked) => updateNutritionSetting('enabled', checked)}
                />
              </div>

              <div className="space-y-4">
                <Label className="text-base font-medium">Analysis Strictness</Label>
                <div className="px-3">
                  <Slider
                    value={[settings.nutritionAnalysis.strictness]}
                    onValueChange={([value]) => updateNutritionSetting('strictness', value)}
                    max={10}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Lenient</span>
                    <span>Balanced</span>
                    <span>Strict</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="alternative-suggestions">Alternative Suggestions</Label>
                  <Switch
                    id="alternative-suggestions"
                    checked={settings.nutritionAnalysis.alternativesuggestions}
                    onCheckedChange={(checked) => updateNutritionSetting('alternativesuggestions', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="portion-warnings">Portion Warnings</Label>
                  <Switch
                    id="portion-warnings"
                    checked={settings.nutritionAnalysis.portionWarnings}
                    onCheckedChange={(checked) => updateNutritionSetting('portionWarnings', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Progress Reports Settings */}
        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>Progress Report AI</CardTitle>
              <CardDescription>
                Configure AI-generated progress reports and insights
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Enable AI Progress Reports</Label>
                  <p className="text-sm text-muted-foreground">AI generates automated progress reports</p>
                </div>
                <Switch
                  checked={settings.progressReports.enabled}
                  onCheckedChange={(checked) => updateProgressSetting('enabled', checked)}
                />
              </div>

              <div className="space-y-4">
                <Label className="text-base font-medium">Report Frequency</Label>
                <Select
                  value={settings.progressReports.frequency}
                  onValueChange={(value) => updateProgressSetting('frequency', value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Bi-weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Auto-Generation</Label>
                  <p className="text-sm text-muted-foreground">Automatically generate reports on schedule</p>
                </div>
                <Switch
                  checked={settings.progressReports.autoGeneration}
                  onCheckedChange={(checked) => updateProgressSetting('autoGeneration', checked)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="custom-metrics">Custom Metrics to Track</Label>
                <Textarea
                  id="custom-metrics"
                  placeholder="Additional metrics to include in reports..."
                  value={settings.progressReports.customMetrics.join(', ')}
                  onChange={(e) => 
                    updateProgressSetting('customMetrics', 
                      e.target.value.split(',').map(m => m.trim()).filter(m => m)
                    )
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-center mt-8">
        <Button 
          onClick={handleSave}
          disabled={updateSettingsMutation.isPending}
          size="lg"
          className="min-w-[200px]"
        >
          {updateSettingsMutation.isPending ? "Saving Settings..." : "Save All Changes"}
        </Button>
      </div>
    </div>
  );
}