import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';
import SplashScreen from '../Screens/SplashScreen';

// Screens
import HomeScreen from '../Screens/HomeScreen';
import PropertyScreen from '../Screens/PropertiesScreen';
import AgentLoginScreen from '../Screens/AgentScreen';
import AgentRegisterScreen from '../Screens/Agents';
import AgentProfileScreen from '../Screens/AgentsProfileScreen';
import AgentDashboard from '../Screens/AgentDashboard';
import { RootStackParamList, BottomTabParamList } from '../type/navigation';
import ViewProperty from '../Screens/viewProperty';
import AiChat from '../Screens/AiChat';
import AgentAiChat from '../Screens/AgentAiChat';
import AnalyticsDashboard from '../Screens/AnalyticsDashboard';
import LeadPipeline from '../Screens/LeadPipeline';
import Subscription from '../Screens/Subscription';
import AgentPublicProfile from '../Screens/AgentPublicProfile';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<BottomTabParamList>();

function BottomTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          paddingBottom: 6,
          paddingTop: 6,
          height: 62,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Properties') {
            iconName = focused ? 'business' : 'business-outline';
          } else if (route.name === 'Agents') {
            iconName = focused ? 'people' : 'people-outline';
          } else {
            iconName = 'ellipse-outline';
          }

          return <Icon name={iconName} size={size ?? 24} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Properties" component={PropertyScreen} />
      <Tab.Screen name="Agents" component={AgentProfileScreen} />
    </Tab.Navigator>
  );
}

export default function RootStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      
      {/* ✅ Splash first */}
      <Stack.Screen
        name="Splash"
        component={SplashScreen}
      />

      {/* Main App (Bottom Tabs) */}
      <Stack.Screen
        name="Main"
        component={BottomTabs}
        options={{ headerShown: false }}
      />
     
      {/* Other screens */}
      <Stack.Screen
        name="AgentLogin"
        component={AgentLoginScreen}
        options={{ title: 'Agent Login' }}
      />
      <Stack.Screen
        name="AgentDashboard"
        component={AgentDashboard}
        options={{ title: 'Agent Dashboard' }}
      />
      <Stack.Screen
        name="AgentRegister"
        component={AgentRegisterScreen}
        options={{ title: 'Agent Registration' }}
      />
      <Stack.Screen name="ViewProperty" component={ViewProperty} />
      <Stack.Screen
        name="AgentProfile"
        component={AgentProfileScreen}
        options={{ title: 'My Profile' }}
      />
      <Stack.Screen
        name="AiChat"
        component={AiChat}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="AgentAiChat" component={AgentAiChat} options={{ headerShown: false }} />
      <Stack.Screen name="Analytics" component={AnalyticsDashboard} options={{ headerShown: false }} />
      <Stack.Screen name="LeadPipeline" component={LeadPipeline} options={{ headerShown: false }} />
      <Stack.Screen name="Subscription" component={Subscription} options={{ headerShown: false }} />
      <Stack.Screen name="AgentPublicProfile" component={AgentPublicProfile} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}