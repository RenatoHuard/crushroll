import React, { useEffect, useRef, useState } from "react";
import { View, Image, Text, StyleSheet, Dimensions } from "react-native";
import { APP_VERSION } from "../version";

const { width, height } = Dimensions.get("window");

const FRAMES = [
  require("../../assets/splash_1.png"),
  require("../../assets/splash_2.png"),
  require("../../assets/splash_3.png"),
  require("../../assets/splash_4.png"),
  require("../../assets/splash_5.png"),
];

const FRAME_MS = 160;
const CYCLES   = 3;
const TOTAL_FRAMES = FRAMES.length * CYCLES;

interface Props {
  onFinish: () => void;
}

export default function AnimatedSplashScreen({ onFinish }: Props) {
  const [frameIndex, setFrameIndex] = useState(0);
  const countRef = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => {
      countRef.current += 1;
      if (countRef.current >= TOTAL_FRAMES) {
        clearInterval(interval);
        onFinish();
        return;
      }
      setFrameIndex(countRef.current % FRAMES.length);
    }, FRAME_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.container}>
      {FRAMES.map((source, i) => (
        <Image
          key={i}
          source={source}
          style={[styles.frame, { opacity: i === frameIndex ? 1 : 0 }]}
          resizeMode="cover"
        />
      ))}
      <Text style={styles.version}>v{APP_VERSION}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1E2327" },
  frame:     { position: "absolute", top: 0, left: 0, width, height },
  version: {
    position: "absolute",
    bottom: 32,
    width: "100%",
    textAlign: "center",
    color: "rgba(255,255,255,0.45)",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 1,
  },
});
