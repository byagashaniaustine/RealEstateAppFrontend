// types/navigation.ts
export type RootStackParamList = {
  Main: undefined;          // Bottom Tabs
  AgentLogin: undefined;    // Agent Login screen
  AgentProfile: { id: number } | undefined; // Agent Profile screen
  PropertyDetails: { id: number } | undefined; // Optional property details
  AgentRegister: undefined; // Agent Registration screen
  AgentDashboard: undefined; // Agent Dashboard screen
  Splash: undefined; // Splash screen
};

export type BottomTabParamList = {
  Home: undefined;
  Properties: undefined;
  Agents: undefined;
  Market: undefined;
};
