import React, { useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useAuth } from "./src/lib/useAuth";
import LoginScreen from "./src/screens/LoginScreen";
import AppNavigator from "./src/navigation/AppNavigator";
import AnimatedSplashScreen from "./src/screens/AnimatedSplashScreen";

export default function App() {
  const { session, loading } = useAuth();
  const [splashDone, setSplashDone] = useState(false);

  if (!splashDone) {
    return <AnimatedSplashScreen onFinish={() => setSplashDone(true)} />;
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#FFFFFF" />
      </View>
    );
  }

  return session ? <AppNavigator /> : <LoginScreen />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1E2327",
  },
});
