import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import HomeScreen from '../Screens/HomeScreen';
import AgentsScreen from '../Screens/AgentScreen';
import PropertyScreen from '../Screens/PropertiesScreen';

const Drawer = createDrawerNavigator();

export default function DrawerNavigator() {
  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          backgroundColor: '#fff',
          width: 260,
        },
      }}
    >
      <Drawer.Screen name="Home" component={HomeScreen} />
      <Drawer.Screen name="Market" component={PropertyScreen} />
      <Drawer.Screen name="Agents" component={AgentsScreen} />
    </Drawer.Navigator>
  );
}
