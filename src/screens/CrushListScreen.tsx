import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { supabase } from "../lib/supabase";
import { Crush } from "../types/database";
import { RootStackParamList } from "../navigation/types";

interface Props {
  navigation: NativeStackNavigationProp<RootStackParamList, "CrushList">;
}

export default function CrushListScreen({ navigation }: Props) {
  const [crushes, setCrushes] = useState<Crush[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCrushes = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("crushes")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setCrushes(data as Crush[]);
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCrushes();
    }, [loadCrushes])
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Meus crushs</Text>
        <Pressable onPress={() => navigation.navigate("Profile")}>
          <Text style={styles.link}>Meu perfil</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color="#FFFFFF" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={crushes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>Nenhum crush cadastrado ainda.</Text>
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() =>
                navigation.navigate("CrushForm", { crushId: item.id })
              }
            >
              <Text style={styles.cardName}>{item.name}</Text>
              <Text style={styles.cardSub}>
                {[item.instagram, item.twitter_x, item.tiktok, item.facebook]
                  .filter(Boolean)
                  .join(" · ") || "Sem redes cadastradas"}
              </Text>
            </Pressable>
          )}
        />
      )}

      <Pressable
        style={styles.fab}
        onPress={() => navigation.navigate("CrushForm", undefined)}
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1E2327",
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  link: {
    color: "#E1306C",
    fontSize: 14,
  },
  list: {
    paddingBottom: 80,
  },
  empty: {
    color: "#A0A0A0",
    textAlign: "center",
    marginTop: 40,
  },
  card: {
    backgroundColor: "#262B31",
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  cardName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  cardSub: {
    color: "#A0A0A0",
    fontSize: 13,
    marginTop: 4,
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#E1306C",
    justifyContent: "center",
    alignItems: "center",
  },
  fabText: {
    color: "#FFFFFF",
    fontSize: 28,
    lineHeight: 30,
  },
});
