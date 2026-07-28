import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { RootStackParamList } from "./types";
import CrushListScreen from "../screens/CrushListScreen";
import CrushFormScreen from "../screens/CrushFormScreen";
import ProfileScreen from "../screens/ProfileScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: "#1E2327" },
          headerTintColor: "#FFFFFF",
        }}
      >
        <Stack.Screen
          name="CrushList"
          component={CrushListScreen}
          options={{ title: "CrushRoll" }}
        />
        <Stack.Screen
          name="CrushForm"
          component={CrushFormScreen}
          options={{ title: "Crush" }}
        />
        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
          options={{ title: "Meu perfil" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
