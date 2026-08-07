import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { RootStackParamList } from "./types";
import CrushListScreen from "../screens/CrushListScreen";
import CrushFormScreen from "../screens/CrushFormScreen";
import CrushDetailScreen from "../screens/CrushDetailScreen";
import ProfileScreen from "../screens/ProfileScreen";
import DateFormScreen from "../screens/DateFormScreen";

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
          options={{ title: "CrushDex" }}
        />
        <Stack.Screen
          name="CrushDetail"
          component={CrushDetailScreen}
          options={{ title: "CrushDex" }}
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
        <Stack.Screen
          name="DateForm"
          component={DateFormScreen}
          options={{ title: "Registrar Date" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
