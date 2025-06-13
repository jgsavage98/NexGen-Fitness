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
    topicCategories?: string[];
    topicStyle?: string;
    customTopicPrompts?: string;
    avoidTopicRepetition?: boolean;
    contentModeration: {
      enabled: boolean;
      profanityFilter: boolean;
      rudenessDetetion: boolean;
      offTopicWarning: boolean;
      customKeywords: string[];
      fitnessStrictness?: number;
      autoRedirect?: boolean;
    };
    responseStyle: 'supportive' | 'motivational' | 'professional' | 'friendly';
    maxResponseLength: number;
    responseDelay: {
      enabled: boolean;
      minSeconds: number; // minimum delay in seconds
      maxSeconds: number; // maximum delay in seconds
      humanLike: boolean; // whether to use random delays
    };
    timingRules: {
      quietHours: { start: string; end: string };
      weekendBehavior: 'normal' | 'reduced' | 'weekend_only';
    };
  };
  individualChat: {
    enabled: boolean;
    autoResponse: boolean;
    autoSuggestResponses: boolean;
    urgentResponseKeywords: string[];
    responseStyle: 'supportive' | 'motivational' | 'professional' | 'friendly';
    confidenceThreshold: number; // 1-10
    contentModeration: {
      enabled: boolean;
      profanityFilter: boolean;
      rudenessDetection: boolean;
      offTopicWarning: boolean;
      customKeywords: string[];
      fitnessStrictness: number; // 1-10 scale
      autoRedirect: boolean;
    };
    responseDelay: {
      enabled: boolean;
      minSeconds: number; // minimum delay in seconds
      maxSeconds: number; // maximum delay in seconds
      humanLike: boolean; // whether to use random delays
      quietHoursMultiplier: number; // multiply delay during quiet hours
      weekendMultiplier: number; // multiply delay during weekends
    };
    timingRules: {
      quietHours: { start: string; end: string };
      weekendBehavior: 'normal' | 'reduced' | 'extended_delay';
    };
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
      topicCategories: ['nutrition', 'workouts', 'motivation'],
      topicStyle: 'engaging',
      customTopicPrompts: '',
      avoidTopicRepetition: true,
      contentModeration: {
        enabled: true,
        profanityFilter: true,
        rudenessDetetion: true,
        offTopicWarning: true,
        customKeywords: ["spam", "promotion"],
        fitnessStrictness: 7,
        autoRedirect: false
      },
      responseStyle: 'supportive',
      maxResponseLength: 300,
      responseDelay: {
        enabled: true,
        minSeconds: 15,
        maxSeconds: 30,
        humanLike: true
      },
      timingRules: {
        quietHours: { start: "22:00", end: "06:00" },
        weekendBehavior: 'reduced'
      }
    },
    individualChat: {
      enabled: true,
      autoResponse: true,
      autoSuggestResponses: true,
      urgentResponseKeywords: ["emergency", "urgent", "help", "crisis"],
      responseStyle: 'supportive',
      confidenceThreshold: 7,
      contentModeration: {
        enabled: true,
        profanityFilter: true,
        rudenessDetection: true,
        offTopicWarning: true,
        customKeywords: ["spam", "promotion"],
        fitnessStrictness: 7,
        autoRedirect: true
      },
      responseDelay: {
        enabled: true,
        minSeconds: 30,
        maxSeconds: 120,
        humanLike: true,
        quietHoursMultiplier: 3,
        weekendMultiplier: 2
      },
      timingRules: {
        quietHours: { start: "22:00", end: "06:00" },
        weekendBehavior: 'extended_delay'
      }
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
      return await apiRequest('/api/trainer/ai-settings', 'PUT', newSettings);
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
    if (currentSettings && typeof currentSettings === 'object') {
      // Deep merge current settings with defaults to ensure all nested properties exist
      setSettings(prev => {
        const merged = { ...prev };
        
        // Merge groupChat settings
        if (currentSettings.groupChat) {
          merged.groupChat = {
            ...prev.groupChat,
            ...currentSettings.groupChat,
            contentModeration: {
              ...prev.groupChat.contentModeration,
              ...(currentSettings.groupChat.contentModeration || {})
            },
            responseDelay: {
              ...prev.groupChat.responseDelay,
              ...(currentSettings.groupChat.responseDelay || {})
            },
            timingRules: {
              ...prev.groupChat.timingRules,
              ...(currentSettings.groupChat.timingRules || {}),
              quietHours: {
                ...prev.groupChat.timingRules.quietHours,
                ...(currentSettings.groupChat.timingRules?.quietHours || {})
              }
            }
          };
        }
        
        // Merge individualChat settings
        if (currentSettings.individualChat) {
          merged.individualChat = {
            ...prev.individualChat,
            ...currentSettings.individualChat,
            contentModeration: {
              ...prev.individualChat.contentModeration,
              ...(currentSettings.individualChat.contentModeration || {})
            },
            responseDelay: {
              ...prev.individualChat.responseDelay,
              ...(currentSettings.individualChat.responseDelay || {})
            },
            timingRules: {
              ...prev.individualChat.timingRules,
              ...(currentSettings.individualChat.timingRules || {}),
              quietHours: {
                ...prev.individualChat.timingRules.quietHours,
                ...(currentSettings.individualChat.timingRules?.quietHours || {})
              }
            }
          };
        }
        
        // Merge other settings
        Object.keys(currentSettings).forEach(key => {
          if (key !== 'groupChat' && key !== 'individualChat' && currentSettings[key]) {
            merged[key] = { ...prev[key], ...currentSettings[key] };
          }
        });
        
        return merged;
      });
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

  const updateIndividualChatModerationSetting = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      individualChat: { 
        ...prev.individualChat, 
        contentModeration: { 
          ...prev.individualChat.contentModeration || {
            enabled: true,
            profanityFilter: true,
            rudenessDetection: true,
            offTopicWarning: true,
            customKeywords: [],
            fitnessStrictness: 7,
            autoRedirect: true
          }, 
          [key]: value 
        }
      }
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
                  <div className="space-y-4 pl-4 border-l-2 border-muted">
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

                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Topic Direction & Focus</Label>
                      
                      <div className="space-y-2">
                        <Label htmlFor="topic-categories" className="text-xs">Primary Topic Categories</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {['Nutrition', 'Workouts', 'Motivation', 'Progress', 'Habits', 'Recovery'].map((category) => (
                            <div key={category} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`category-${category.toLowerCase()}`}
                                checked={settings.groupChat.topicCategories?.includes(category.toLowerCase()) || false}
                                onChange={(e) => {
                                  const categories = settings.groupChat.topicCategories || [];
                                  const updatedCategories = e.target.checked
                                    ? [...categories, category.toLowerCase()]
                                    : categories.filter(c => c !== category.toLowerCase());
                                  updateGroupChatSetting('topicCategories', updatedCategories);
                                }}
                                className="rounded border-gray-300"
                              />
                              <Label htmlFor={`category-${category.toLowerCase()}`} className="text-xs">{category}</Label>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="topic-style" className="text-xs">Topic Style</Label>
                        <Select
                          value={settings.groupChat.topicStyle || 'engaging'}
                          onValueChange={(value) => updateGroupChatSetting('topicStyle', value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="engaging">Engaging Questions</SelectItem>
                            <SelectItem value="educational">Educational Tips</SelectItem>
                            <SelectItem value="challenges">Fun Challenges</SelectItem>
                            <SelectItem value="discussions">Open Discussions</SelectItem>
                            <SelectItem value="tips">Quick Tips & Facts</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="custom-topics" className="text-xs">Custom Topic Prompts</Label>
                        <Textarea
                          id="custom-topics"
                          placeholder="Add specific topics you'd like the AI to generate discussions about..."
                          value={settings.groupChat.customTopicPrompts || ''}
                          onChange={(e) => updateGroupChatSetting('customTopicPrompts', e.target.value)}
                          rows={3}
                        />
                        <p className="text-xs text-muted-foreground">
                          Examples: "Weekly meal prep strategies", "Home workout equipment alternatives", "Building healthy morning routines"
                        </p>
                      </div>

                      <div className="flex items-center justify-between">
                        <Label htmlFor="avoid-repetition" className="text-xs">Avoid Topic Repetition</Label>
                        <Switch
                          id="avoid-repetition"
                          checked={settings.groupChat.avoidTopicRepetition !== false}
                          onCheckedChange={(checked) => updateGroupChatSetting('avoidTopicRepetition', checked)}
                        />
                      </div>
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
                      checked={settings.groupChat.contentModeration?.profanityFilter || false}
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
                      checked={settings.groupChat.contentModeration?.rudenessDetetion || false}
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
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="off-topic-warning">Off-Topic Detection</Label>
                    <Switch
                      id="off-topic-warning"
                      checked={settings.groupChat.contentModeration?.offTopicWarning || false}
                      onCheckedChange={(checked) => 
                        setSettings(prev => ({
                          ...prev,
                          groupChat: {
                            ...prev.groupChat,
                            contentModeration: {
                              ...prev.groupChat.contentModeration,
                              offTopicWarning: checked
                            }
                          }
                        }))
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="content-moderation-enabled">Enable Auto Moderation</Label>
                    <Switch
                      id="content-moderation-enabled"
                      checked={settings.groupChat.contentModeration?.enabled || false}
                      onCheckedChange={(checked) => 
                        setSettings(prev => ({
                          ...prev,
                          groupChat: {
                            ...prev.groupChat,
                            contentModeration: {
                              ...prev.groupChat.contentModeration,
                              enabled: checked
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
                    value={settings.groupChat.contentModeration?.customKeywords?.join(', ') || ''}
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
                  <p className="text-xs text-muted-foreground">
                    Topics like politics, religion, personal relationships unrelated to fitness, sales/promotions, spam
                  </p>
                </div>

                <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                  <Label className="text-sm font-medium">Off-Topic Detection Settings</Label>
                  
                  <div className="space-y-2">
                    <Label htmlFor="fitness-strictness" className="text-xs">Fitness/Nutrition Focus Level</Label>
                    <div className="px-2">
                      <Slider
                        id="fitness-strictness"
                        value={[settings.groupChat.contentModeration?.fitnessStrictness || 7]}
                        onValueChange={([value]) => 
                          setSettings(prev => ({
                            ...prev,
                            groupChat: {
                              ...prev.groupChat,
                              contentModeration: {
                                ...prev.groupChat.contentModeration,
                                fitnessStrictness: value
                              }
                            }
                          }))
                        }
                        max={10}
                        min={1}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>Lenient</span>
                        <span>Moderate</span>
                        <span>Strict</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Higher levels will flag more conversations as off-topic from fitness and nutrition
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="auto-redirect" className="text-xs">Auto-Redirect Off-Topic Conversations</Label>
                    <Switch
                      id="auto-redirect"
                      checked={settings.groupChat.contentModeration?.autoRedirect || false}
                      onCheckedChange={(checked) => 
                        setSettings(prev => ({
                          ...prev,
                          groupChat: {
                            ...prev.groupChat,
                            contentModeration: {
                              ...prev.groupChat.contentModeration,
                              autoRedirect: checked
                            }
                          }
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <Label className="text-base font-medium">Response Delays</Label>
                <p className="text-sm text-muted-foreground">
                  Control how human-like AI responses appear by adding realistic delays
                </p>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">Enable Human-Like Delays</Label>
                      <p className="text-xs text-muted-foreground">Add random delays to make AI responses feel more natural</p>
                    </div>
                    <Switch
                      checked={settings.groupChat.responseDelay.enabled}
                      onCheckedChange={(checked) => 
                        setSettings(prev => ({
                          ...prev,
                          groupChat: {
                            ...prev.groupChat,
                            responseDelay: {
                              ...prev.groupChat.responseDelay,
                              enabled: checked
                            }
                          }
                        }))
                      }
                    />
                  </div>

                  {settings.groupChat.responseDelay.enabled && (
                    <div className="space-y-4 pl-4 border-l-2 border-muted">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="min-delay" className="text-xs">Minimum Delay (seconds)</Label>
                          <Input
                            id="min-delay"
                            type="number"
                            min="5"
                            max="60"
                            value={settings.groupChat.responseDelay.minSeconds}
                            onChange={(e) => 
                              setSettings(prev => ({
                                ...prev,
                                groupChat: {
                                  ...prev.groupChat,
                                  responseDelay: {
                                    ...prev.groupChat.responseDelay,
                                    minSeconds: parseInt(e.target.value) || 15
                                  }
                                }
                              }))
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="max-delay" className="text-xs">Maximum Delay (seconds)</Label>
                          <Input
                            id="max-delay"
                            type="number"
                            min="10"
                            max="120"
                            value={settings.groupChat.responseDelay.maxSeconds}
                            onChange={(e) => 
                              setSettings(prev => ({
                                ...prev,
                                groupChat: {
                                  ...prev.groupChat,
                                  responseDelay: {
                                    ...prev.groupChat.responseDelay,
                                    maxSeconds: parseInt(e.target.value) || 30
                                  }
                                }
                              }))
                            }
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-xs">Random Variation</Label>
                          <p className="text-xs text-muted-foreground">Use random delays within the range for natural timing</p>
                        </div>
                        <Switch
                          checked={settings.groupChat.responseDelay.humanLike}
                          onCheckedChange={(checked) => 
                            setSettings(prev => ({
                              ...prev,
                              groupChat: {
                                ...prev.groupChat,
                                responseDelay: {
                                  ...prev.groupChat.responseDelay,
                                  humanLike: checked
                                }
                              }
                            }))
                          }
                        />
                      </div>

                      <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                          <strong>Current Setting:</strong> AI will wait {settings.groupChat.responseDelay.minSeconds}-{settings.groupChat.responseDelay.maxSeconds} seconds before responding
                          {settings.groupChat.responseDelay.humanLike ? ' with random variation' : ' with fixed timing'}
                        </p>
                      </div>
                    </div>
                  )}
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
                      value={settings.groupChat.timingRules?.quietHours?.start || "22:00"}
                      onChange={(e) => 
                        setSettings(prev => ({
                          ...prev,
                          groupChat: {
                            ...prev.groupChat,
                            timingRules: {
                              ...prev.groupChat.timingRules,
                              quietHours: {
                                ...prev.groupChat.timingRules?.quietHours,
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
                      value={settings.groupChat.timingRules?.quietHours?.end || "06:00"}
                      onChange={(e) => 
                        setSettings(prev => ({
                          ...prev,
                          groupChat: {
                            ...prev.groupChat,
                            timingRules: {
                              ...prev.groupChat.timingRules,
                              quietHours: {
                                ...prev.groupChat.timingRules?.quietHours,
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
                    value={settings.groupChat.timingRules?.weekendBehavior || "normal"}
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

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Fully Automated Responses</Label>
                  <p className="text-sm text-muted-foreground">AI automatically responds to individual messages without trainer approval</p>
                </div>
                <Switch
                  checked={settings.individualChat.autoResponse}
                  onCheckedChange={(checked) => updateIndividualChatSetting('autoResponse', checked)}
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

              {/* Individual Chat Content Moderation Settings */}
              <div className="space-y-4 border-t pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">Content Moderation</Label>
                    <p className="text-sm text-muted-foreground">Filter inappropriate content in individual chats</p>
                  </div>
                  <Switch
                    checked={settings.individualChat.contentModeration?.enabled || false}
                    onCheckedChange={(checked) => updateIndividualChatModerationSetting('enabled', checked)}
                  />
                </div>

                {settings.individualChat.contentModeration?.enabled && (
                  <div className="space-y-4 ml-4 border-l-2 border-gray-200 pl-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-medium">Profanity Filter</Label>
                        <p className="text-xs text-muted-foreground">Detect and warn about profane language</p>
                      </div>
                      <Switch
                        checked={settings.individualChat.contentModeration?.profanityFilter || false}
                        onCheckedChange={(checked) => updateIndividualChatModerationSetting('profanityFilter', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-medium">Rudeness Detection</Label>
                        <p className="text-xs text-muted-foreground">Identify rude or mean messages</p>
                      </div>
                      <Switch
                        checked={settings.individualChat.contentModeration?.rudenessDetection || false}
                        onCheckedChange={(checked) => updateIndividualChatModerationSetting('rudenessDetection', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-medium">Off-Topic Warning</Label>
                        <p className="text-xs text-muted-foreground">Warn when discussions drift from fitness topics</p>
                      </div>
                      <Switch
                        checked={settings.individualChat.contentModeration?.offTopicWarning || false}
                        onCheckedChange={(checked) => updateIndividualChatModerationSetting('offTopicWarning', checked)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="individual-fitness-strictness">Fitness Topic Strictness</Label>
                      <div className="px-3">
                        <Slider
                          value={[settings.individualChat.contentModeration?.fitnessStrictness || 7]}
                          onValueChange={([value]) => updateIndividualChatModerationSetting('fitnessStrictness', value)}
                          max={10}
                          min={1}
                          step={1}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>Relaxed</span>
                          <span>Balanced</span>
                          <span>Strict</span>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        How strictly to enforce fitness and nutrition topics ({settings.individualChat.contentModeration?.fitnessStrictness || 7}/10)
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-medium">Auto-Redirect</Label>
                        <p className="text-xs text-muted-foreground">Automatically guide conversations back to fitness topics</p>
                      </div>
                      <Switch
                        checked={settings.individualChat.contentModeration?.autoRedirect || false}
                        onCheckedChange={(checked) => updateIndividualChatModerationSetting('autoRedirect', checked)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="individual-custom-keywords">Custom Keywords</Label>
                      <Input
                        id="individual-custom-keywords"
                        placeholder="Enter keywords separated by commas (e.g., spam, promotion)"
                        value={settings.individualChat.contentModeration?.customKeywords?.join(', ') || ''}
                        onChange={(e) => 
                          updateIndividualChatModerationSetting('customKeywords', 
                            e.target.value.split(',').map(k => k.trim()).filter(k => k.length > 0)
                          )
                        }
                      />
                      <p className="text-sm text-muted-foreground">
                        Additional keywords to flag in individual messages
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Individual Chat Response Delay Settings */}
              <div className="space-y-4 border-t pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">Human-Like Response Delays</Label>
                    <p className="text-sm text-muted-foreground">Add realistic delays to automated responses</p>
                  </div>
                  <Switch
                    checked={settings.individualChat.responseDelay.enabled}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({
                        ...prev,
                        individualChat: {
                          ...prev.individualChat,
                          responseDelay: {
                            ...prev.individualChat.responseDelay,
                            enabled: checked
                          }
                        }
                      }))
                    }
                  />
                </div>

                {settings.individualChat.responseDelay.enabled && (
                  <div className="space-y-4 ml-4 border-l-2 border-gray-200 pl-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="individual-min-delay">Min Delay (seconds)</Label>
                        <Input
                          id="individual-min-delay"
                          type="number"
                          min="5"
                          max="600"
                          value={settings.individualChat.responseDelay.minSeconds}
                          onChange={(e) => 
                            setSettings(prev => ({
                              ...prev,
                              individualChat: {
                                ...prev.individualChat,
                                responseDelay: {
                                  ...prev.individualChat.responseDelay,
                                  minSeconds: parseInt(e.target.value) || 30
                                }
                              }
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="individual-max-delay">Max Delay (seconds)</Label>
                        <Input
                          id="individual-max-delay"
                          type="number"
                          min="5"
                          max="600"
                          value={settings.individualChat.responseDelay.maxSeconds}
                          onChange={(e) => 
                            setSettings(prev => ({
                              ...prev,
                              individualChat: {
                                ...prev.individualChat,
                                responseDelay: {
                                  ...prev.individualChat.responseDelay,
                                  maxSeconds: parseInt(e.target.value) || 120
                                }
                              }
                            }))
                          }
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-medium">Random Variation</Label>
                        <p className="text-xs text-muted-foreground">Use random delays within range</p>
                      </div>
                      <Switch
                        checked={settings.individualChat.responseDelay.humanLike}
                        onCheckedChange={(checked) => 
                          setSettings(prev => ({
                            ...prev,
                            individualChat: {
                              ...prev.individualChat,
                              responseDelay: {
                                ...prev.individualChat.responseDelay,
                                humanLike: checked
                              }
                            }
                          }))
                        }
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="quiet-hours-multiplier">Quiet Hours Multiplier</Label>
                        <Input
                          id="quiet-hours-multiplier"
                          type="number"
                          min="1"
                          max="10"
                          step="0.5"
                          value={settings.individualChat.responseDelay.quietHoursMultiplier}
                          onChange={(e) => 
                            setSettings(prev => ({
                              ...prev,
                              individualChat: {
                                ...prev.individualChat,
                                responseDelay: {
                                  ...prev.individualChat.responseDelay,
                                  quietHoursMultiplier: parseFloat(e.target.value) || 3
                                }
                              }
                            }))
                          }
                        />
                        <p className="text-xs text-muted-foreground">
                          Multiply delay by {settings.individualChat.responseDelay.quietHoursMultiplier}x during quiet hours
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="weekend-multiplier">Weekend Multiplier</Label>
                        <Input
                          id="weekend-multiplier"
                          type="number"
                          min="1"
                          max="10"
                          step="0.5"
                          value={settings.individualChat.responseDelay.weekendMultiplier}
                          onChange={(e) => 
                            setSettings(prev => ({
                              ...prev,
                              individualChat: {
                                ...prev.individualChat,
                                responseDelay: {
                                  ...prev.individualChat.responseDelay,
                                  weekendMultiplier: parseFloat(e.target.value) || 2
                                }
                              }
                            }))
                          }
                        />
                        <p className="text-xs text-muted-foreground">
                          Multiply delay by {settings.individualChat.responseDelay.weekendMultiplier}x on weekends
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="individual-quiet-start">Quiet Hours Start</Label>
                        <Input
                          id="individual-quiet-start"
                          type="time"
                          value={settings.individualChat.timingRules.quietHours.start}
                          onChange={(e) => 
                            setSettings(prev => ({
                              ...prev,
                              individualChat: {
                                ...prev.individualChat,
                                timingRules: {
                                  ...prev.individualChat.timingRules,
                                  quietHours: {
                                    ...prev.individualChat.timingRules.quietHours,
                                    start: e.target.value
                                  }
                                }
                              }
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="individual-quiet-end">Quiet Hours End</Label>
                        <Input
                          id="individual-quiet-end"
                          type="time"
                          value={settings.individualChat.timingRules.quietHours.end}
                          onChange={(e) => 
                            setSettings(prev => ({
                              ...prev,
                              individualChat: {
                                ...prev.individualChat,
                                timingRules: {
                                  ...prev.individualChat.timingRules,
                                  quietHours: {
                                    ...prev.individualChat.timingRules.quietHours,
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
                      <Label htmlFor="individual-weekend-behavior">Weekend Behavior</Label>
                      <Select
                        value={settings.individualChat.timingRules.weekendBehavior}
                        onValueChange={(value) => 
                          setSettings(prev => ({
                            ...prev,
                            individualChat: {
                              ...prev.individualChat,
                              timingRules: {
                                ...prev.individualChat.timingRules,
                                weekendBehavior: value as 'normal' | 'reduced' | 'extended_delay'
                              }
                            }
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="normal">Normal Response Times</SelectItem>
                          <SelectItem value="reduced">Reduced Activity</SelectItem>
                          <SelectItem value="extended_delay">Extended Delays</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="bg-gray-50 p-3 rounded-md">
                      <p className="text-sm text-gray-600">
                        <strong>Current Configuration:</strong> {
                          settings.individualChat.responseDelay.enabled 
                            ? `${settings.individualChat.responseDelay.minSeconds}-${settings.individualChat.responseDelay.maxSeconds} seconds base delay${
                                settings.individualChat.responseDelay.humanLike ? ' with random variation' : ''
                              }. Quiet hours (${settings.individualChat.timingRules.quietHours.start}-${settings.individualChat.timingRules.quietHours.end}) multiply by ${settings.individualChat.responseDelay.quietHoursMultiplier}x, weekends by ${settings.individualChat.responseDelay.weekendMultiplier}x.`
                            : 'Instant responses enabled'
                        }
                      </p>
                    </div>
                  </div>
                )}
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