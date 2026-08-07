import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  Pressable,
  ActivityIndicator,
  Alert,
  Linking,
  FlatList,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { supabase } from "../lib/supabase";
import { Crush, CrushDate } from "../types/database";
import { RootStackParamList } from "../navigation/types";

interface Props {
  navigation: NativeStackNavigationProp<RootStackParamList, "CrushDetail">;
  route: RouteProp<RootStackParamList, "CrushDetail">;
}

// Non-interactive stars display
function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <Text style={{ color: "#FFD700", fontSize: size }}>
      {"★".repeat(value)}{"☆".repeat(5 - value)}
    </Text>
  );
}

// Mini non-interactive star rating for activities
function MiniStars({ value }: { value: number }) {
  return (
    <Text style={{ color: "#FFD700", fontSize: 12 }}>
      {"★".repeat(value)}{"☆".repeat(5 - value)}
    </Text>
  );
}

// Collapsible section component
function Collapsible({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <View style={collapsibleStyles.container}>
      <Pressable style={collapsibleStyles.header} onPress={() => setOpen(!open)}>
        <Text style={collapsibleStyles.title}>{title}</Text>
        <Text style={collapsibleStyles.arrow}>{open ? "▲" : "▼"}</Text>
      </Pressable>
      {open && <View style={collapsibleStyles.body}>{children}</View>}
    </View>
  );
}

const collapsibleStyles = StyleSheet.create({
  container: {
    backgroundColor: "#262B31",
    borderRadius: 10,
    marginBottom: 12,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  title: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
  arrow: { color: "#A0A0A0", fontSize: 12 },
  body: { paddingHorizontal: 16, paddingBottom: 14 },
});

function formatDate(iso: string): string {
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

const ACTIVITIES: {
  key: "had_chat" | "had_kiss" | "had_pirulito" | "had_donut" | "had_fire";
  ratingKey: "had_chat_rating" | "had_kiss_rating" | "had_pirulito_rating" | "had_donut_rating" | "had_fire_rating";
  emoji: string;
  label: string;
}[] = [
  { key: "had_chat", ratingKey: "had_chat_rating", emoji: "💬", label: "Bom papo" },
  { key: "had_kiss", ratingKey: "had_kiss_rating", emoji: "💋", label: "Beijo" },
  { key: "had_pirulito", ratingKey: "had_pirulito_rating", emoji: "🍭", label: "Pirulito" },
  { key: "had_donut", ratingKey: "had_donut_rating", emoji: "🍩", label: "Donut" },
  { key: "had_fire", ratingKey: "had_fire_rating", emoji: "🔥", label: "Foguinho" },
];

function DateItem({
  d,
  num,
  onEdit,
  onOpenMap,
}: {
  d: CrushDate;
  num: number;
  onEdit: () => void;
  onOpenMap: (loc: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const activeActs = ACTIVITIES.filter((a) => d[a.key]);

  return (
    <View style={diStyles.card}>
      {/* Collapsed header — tap to expand */}
      <Pressable style={diStyles.header} onPress={() => setOpen((v) => !v)}>
        <View style={diStyles.headerLeft}>
          <Text style={diStyles.num}>Date #{num}</Text>
          {d.date ? (
            <Text style={diStyles.dateLabel}>{formatDate(d.date)}</Text>
          ) : null}
        </View>
        <View style={diStyles.headerRight}>
          <Text style={{ color: "#FFD700", fontSize: 13 }}>
            {"★".repeat(d.date_rating)}{"☆".repeat(5 - d.date_rating)}
          </Text>
          {d.location ? (
            <Text style={diStyles.locPreview} numberOfLines={1}>📍 {d.location}</Text>
          ) : null}
          <Text style={diStyles.arrow}>{open ? "▲" : "▼"}</Text>
        </View>
      </Pressable>

      {/* Expanded body */}
      {open && (
        <View style={diStyles.body}>
          {d.location ? (
            <View style={diStyles.locationBlock}>
              <Text style={diStyles.locationText}>📍 {d.location}</Text>
              <Pressable style={diStyles.mapBtn} onPress={() => onOpenMap(d.location!)}>
                <Text style={diStyles.mapBtnText}>Ver no Mapa</Text>
              </Pressable>
            </View>
          ) : null}

          {activeActs.length > 0 && (
            <View style={diStyles.actsBlock}>
              <Text style={diStyles.subLabel}>O que rolou</Text>
              <View style={diStyles.actsGrid}>
                {activeActs.map((a) => (
                  <View key={a.key} style={diStyles.actCard}>
                    <Text style={diStyles.actEmoji}>{a.emoji}</Text>
                    <Text style={diStyles.actLabel}>{a.label}</Text>
                    <MiniStars value={d[a.ratingKey]} />
                  </View>
                ))}
              </View>
            </View>
          )}

          {d.photos && d.photos.length > 0 && (
            <View style={diStyles.photosBlock}>
              <Text style={diStyles.subLabel}>Fotos</Text>
              <FlatList
                horizontal
                data={d.photos}
                keyExtractor={(_, i) => String(i)}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
                renderItem={({ item }) => (
                  <Image source={{ uri: item }} style={diStyles.photoThumb} />
                )}
              />
            </View>
          )}

          {d.review ? (
            <View style={diStyles.reviewBlock}>
              <Text style={diStyles.subLabel}>Anotações</Text>
              <Text style={diStyles.reviewText}>{d.review}</Text>
            </View>
          ) : null}

          <Pressable style={diStyles.editBtn} onPress={onEdit}>
            <Text style={diStyles.editBtnText}>Editar Date</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const diStyles = StyleSheet.create({
  card: {
    backgroundColor: "#1E2327",
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#3A3F45",
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  headerLeft: { gap: 2 },
  headerRight: { alignItems: "flex-end", gap: 2, flex: 1, marginLeft: 8 },
  num: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  dateLabel: { color: "#A0A0A0", fontSize: 12 },
  locPreview: { color: "#A0A0A0", fontSize: 11, maxWidth: 160 },
  arrow: { color: "#A0A0A0", fontSize: 11 },
  body: { paddingHorizontal: 12, paddingBottom: 12, borderTopWidth: 1, borderTopColor: "#3A3F45" },
  subLabel: { color: "#A0A0A0", fontSize: 12, fontWeight: "600", marginBottom: 6, marginTop: 10 },
  locationBlock: { marginTop: 10 },
  locationText: { color: "#FFFFFF", fontSize: 14, marginBottom: 8 },
  mapBtn: {
    backgroundColor: "#262B31", borderRadius: 8,
    paddingVertical: 8, paddingHorizontal: 12,
    alignSelf: "flex-start", borderWidth: 1, borderColor: "#3A3F45",
  },
  mapBtnText: { color: "#FFFFFF", fontSize: 13 },
  actsBlock: {},
  actsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  actCard: {
    alignItems: "center", backgroundColor: "#262B31",
    borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10,
    borderWidth: 1, borderColor: "#3A3F45",
  },
  actEmoji: { fontSize: 22 },
  actLabel: { color: "#A0A0A0", fontSize: 10, marginTop: 3, marginBottom: 2 },
  photosBlock: { marginTop: 6 },
  photoThumb: { width: 100, height: 100, borderRadius: 8 },
  reviewBlock: {},
  reviewText: { color: "#FFFFFF", fontSize: 14, lineHeight: 20 },
  editBtn: {
    marginTop: 12, backgroundColor: "#2D2D5E",
    borderRadius: 8, paddingVertical: 10, alignItems: "center",
    borderWidth: 1, borderColor: "#5B5BD6",
  },
  editBtnText: { color: "#A5B4FC", fontWeight: "600", fontSize: 14 },
});

const SOCIAL_FIELDS: {
  key: "instagram" | "twitter_x" | "tiktok" | "facebook";
  label: string;
  urlPrefix: string;
}[] = [
  { key: "instagram", label: "Instagram", urlPrefix: "https://instagram.com/" },
  { key: "twitter_x", label: "Twitter/X", urlPrefix: "https://twitter.com/" },
  { key: "tiktok", label: "TikTok", urlPrefix: "https://tiktok.com/@" },
  { key: "facebook", label: "Facebook", urlPrefix: "https://facebook.com/" },
];

export default function CrushDetailScreen({ navigation, route }: Props) {
  const { crushId } = route.params;
  const [crush, setCrush] = useState<Crush | null>(null);
  const [loading, setLoading] = useState(true);
  const [crushDates, setCrushDates] = useState<CrushDate[]>([]);

  useEffect(() => {
    loadCrush();
  }, [crushId]);

  useFocusEffect(
    useCallback(() => {
      loadCrushDates();
    }, [crushId])
  );

  async function loadCrush() {
    setLoading(true);
    const { data, error } = await supabase
      .from("crushes")
      .select("*")
      .eq("id", crushId)
      .single<Crush>();

    if (error) {
      Alert.alert("Erro ao carregar crush", error.message);
    } else if (data) {
      setCrush(data);
    }
    setLoading(false);
  }

  async function loadCrushDates() {
    const { data, error } = await supabase
      .from("crush_dates")
      .select("*")
      .eq("crush_id", crushId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setCrushDates(data as CrushDate[]);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#FFFFFF" size="large" />
      </View>
    );
  }

  if (!crush) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Crush não encontrado.</Text>
      </View>
    );
  }

  const filledSocials = SOCIAL_FIELDS.filter((f) => {
    const val = crush[f.key];
    return val && val.trim().length > 0;
  });

  function openMap(location: string) {
    const query = encodeURIComponent(location);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
  }

  function openSocial(urlPrefix: string, value: string) {
    const handle = value.startsWith("@") ? value.slice(1) : value;
    Linking.openURL(`${urlPrefix}${handle}`);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Photo Header */}
      <View style={styles.photoHeader}>
        {crush.photo_url ? (
          <Image source={{ uri: crush.photo_url }} style={styles.headerPhoto} />
        ) : (
          <View style={styles.headerPlaceholder}>
            <Text style={{ fontSize: 60 }}>💘</Text>
          </View>
        )}
        <View style={styles.headerOverlay}>
          <Text style={styles.headerName}>{crush.name}</Text>
          <Stars value={crush.interest_rating} size={18} />
        </View>
      </View>

      {/* TOP badge */}
      {crush.is_top && (
        <View style={styles.topBadgeRow}>
          <Text style={styles.topBadgeText}>⭐ TOP</Text>
        </View>
      )}

      <View style={styles.body}>
        {/* Interesse */}
        <Collapsible title="Interesse" defaultOpen>
          <Stars value={crush.interest_rating} size={28} />
        </Collapsible>

        {/* Redes Sociais */}
        <Collapsible title="Redes Sociais">
          {filledSocials.length === 0 ? (
            <Text style={styles.emptyText}>Nenhuma rede cadastrada</Text>
          ) : (
            filledSocials.map((f) => {
              const val = crush[f.key] as string;
              return (
                <Pressable
                  key={f.key}
                  style={styles.socialRow}
                  onPress={() => openSocial(f.urlPrefix, val)}
                >
                  <Text style={styles.socialLabel}>{f.label}</Text>
                  <Text style={styles.socialValue}>{val}</Text>
                </Pressable>
              );
            })
          )}
        </Collapsible>

        {/* Notas gerais */}
        <Collapsible title="Notas">
          {crush.review ? (
            <Text style={styles.reviewText}>{crush.review}</Text>
          ) : (
            <Text style={styles.emptyText}>Sem anotações ainda.</Text>
          )}
        </Collapsible>

        {/* Dates — colapsado por padrão, cada date é um sub-colapsável */}
        <Collapsible title={`Dates (${crushDates.length})`}>
          {crushDates.length === 0 ? (
            <Text style={styles.emptyText}>Nenhum date registrado.</Text>
          ) : (
            crushDates.map((d, index) => (
              <DateItem
                key={d.id}
                d={d}
                num={crushDates.length - index}
                onEdit={() => navigation.navigate("DateForm", { crushId: crush.id, dateId: d.id })}
                onOpenMap={openMap}
              />
            ))
          )}

          <Pressable
            style={styles.registerDateBtn}
            onPress={() => navigation.navigate("DateForm", { crushId: crush.id })}
          >
            <Text style={styles.registerDateBtnText}>Registrar Date</Text>
          </Pressable>
        </Collapsible>

        {/* Edit button */}
        <Pressable
          style={styles.editButton}
          onPress={() => navigation.navigate("CrushForm", { crushId: crush.id })}
        >
          <Text style={styles.editButtonText}>Editar</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1E2327" },
  content: { paddingBottom: 40 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1E2327",
  },
  errorText: { color: "#FFFFFF", fontSize: 16 },

  // Header
  photoHeader: {
    height: 250,
    width: "100%",
    position: "relative",
  },
  headerPhoto: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  headerPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#262B31",
    justifyContent: "center",
    alignItems: "center",
  },
  headerOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.55)",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerName: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
    flex: 1,
    marginRight: 8,
  },

  // TOP badge
  topBadgeRow: {
    backgroundColor: "#2D2400",
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: "flex-start",
  },
  topBadgeText: {
    color: "#FFD700",
    fontWeight: "800",
    fontSize: 15,
    letterSpacing: 1,
  },

  body: { padding: 16 },

  emptyText: { color: "#A0A0A0", fontSize: 14 },

  subLabel: {
    color: "#A0A0A0",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 8,
  },

  // Social
  socialRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#3A3F45",
  },
  socialLabel: { color: "#A0A0A0", fontSize: 13 },
  socialValue: { color: "#E1306C", fontSize: 14, fontWeight: "600" },

  // Location
  locationBlock: { marginTop: 10 },
  locationText: { color: "#FFFFFF", fontSize: 14, marginBottom: 8 },
  mapButton: {
    backgroundColor: "#262B31",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#3A3F45",
  },
  mapButtonText: { color: "#FFFFFF", fontSize: 14 },

  // Activities
  activitiesBlock: { marginTop: 8 },
  activitiesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  activityCard: {
    alignItems: "center",
    backgroundColor: "#1E2327",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#3A3F45",
  },
  activityEmoji: { fontSize: 24 },
  activityLabel: { color: "#A0A0A0", fontSize: 11, marginTop: 4, marginBottom: 2 },

  // Review
  reviewText: { color: "#FFFFFF", fontSize: 14, lineHeight: 22 },

  // Dates section header
  registerDateBtn: {
    backgroundColor: "#16a34a",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 10,
  },
  registerDateBtnText: { color: "#FFFFFF", fontWeight: "600", fontSize: 15 },

  // Edit button
  editButton: {
    backgroundColor: "#E1306C",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 20,
  },
  editButtonText: { color: "#FFFFFF", fontWeight: "600", fontSize: 16 },
});
