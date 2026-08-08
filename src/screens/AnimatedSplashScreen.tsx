import React, { useEffect, useState } from "react";
import { View, Image, StyleSheet, Dimensions } from "react-native";

const FRAMES = [
  require("../../assets/splash_1.png"),
  require("../../assets/splash_2.png"),
  require("../../assets/splash_3.png"),
  require("../../assets/splash_4.png"),
  require("../../assets/splash_5.png"),
];

const FRAME_MS = 160;
const CYCLES = 3;
const TOTAL_FRAMES = FRAMES.length * CYCLES;

interface Props {
  onFinish: () => void;
}

export default function AnimatedSplashScreen({ onFinish }: Props) {
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    let count = 0;
    const interval = setInterval(() => {
      count += 1;
      if (count >= TOTAL_FRAMES) {
        clearInterval(interval);
        onFinish();
        return;
      }
      setFrameIndex(count % FRAMES.length);
    }, FRAME_MS);
    return () => clearInterval(interval);
  }, []);

  const { width, height } = Dimensions.get("window");

  return (
    <View style={styles.container}>
      <Image
        source={FRAMES[frameIndex]}
        style={{ width, height }}
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1E2327" },
});
