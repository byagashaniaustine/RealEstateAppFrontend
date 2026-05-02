// types/navigation.ts
export type RootStackParamList = {
  Main: undefined;          // Bottom Tabs
  AgentLogin: undefined;    // Agent Login screen
  AgentProfile: { id: number } | undefined; // Agent Profile screen
  PropertyDetails: { id: number } | undefined; // Optional property details
  AgentRegister: undefined; // Agent Registration screen
  AgentDashboard: undefined; // Agent Dashboard screen
  Splash: undefined; // Splash screen
  ViewProperty: { property: { id: number; name: string; location: string; price: number; status: string; image?: string | string[]; phone?: string; agent_id?: number } };
  AiChat: { propertyContext?: { id: number; name: string; price: number; location: string; agent_id: number } } | undefined;
  AgentAiChat: { agent: { id: number; name: string } };
  Analytics: { agent: { id: number; name: string } };
  LeadPipeline: { agent: { id: number; name: string } };
  Subscription: { agent: { id: number; name: string; email: string } };
  AgentPublicProfile: { agent_id: number };
};

export type BottomTabParamList = {
  Home: undefined;
  Properties: undefined;
  Agents: undefined;
  Market: undefined;
};
