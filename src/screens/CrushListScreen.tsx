import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Image,
  Dimensions,
  ScrollView,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/useAuth";
import { Crush } from "../types/database";
import { RootStackParamList } from "../navigation/types";
import TimelineTab from "./TimelineTab";

interface Props {
  navigation: NativeStackNavigationProp<RootStackParamList, "CrushList">;
}

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_MARGIN = 8;
const CARD_WIDTH = (SCREEN_WIDTH - 16 * 2 - CARD_MARGIN) / 2;

type SortMode = "recentes" | "classificacao";
type SortDir = "asc" | "desc";
type FilterMode = "todos" | "com_date" | "sem_date";
type ViewMode = "grid" | "list";

type CrushDateScore = {
  id: string;
  date_rating: number;
  had_chat_rating: number;
  had_kiss_rating: number;
  had_pirulito_rating: number;
  had_donut_rating: number;
  had_fire_rating: number;
  had_sweat_rating: number;
};

type CrushListItem = Crush & { crush_dates: CrushDateScore[] };

function totalScore(item: CrushListItem): number {
  let score = item.interest_rating;
  for (const d of item.crush_dates ?? []) {
    score += d.date_rating + d.had_chat_rating + d.had_kiss_rating
           + d.had_pirulito_rating + d.had_donut_rating + d.had_fire_rating + d.had_sweat_rating;
  }
  return score;
}

function Stars({ value, size = 11 }: { value: number; size?: number }) {
  return (
    <Text style={{ color: "#FFD700", fontSize: size }}>
      {"★".repeat(value)}{"☆".repeat(5 - value)}
    </Text>
  );
}

function formatPokedexNumber(crushNumber: number | null | undefined, fallback: number): string {
  const num = crushNumber != null ? crushNumber : fallback + 1;
  return `#${String(num).padStart(3, "0")}`;
}

function cardBackground(rating: number): string {
  if (rating <= 2) return "#262B31";
  if (rating <= 4) return "#2D1B22";
  return "#2D2400";
}

export default function CrushListScreen({ navigation }: Props) {
  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  const [allCrushes, setAllCrushes] = useState<CrushListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortMode, setSortMode] = useState<SortMode>("recentes");
  const [sortDirs, setSortDirs] = useState<Record<SortMode, SortDir>>({
    recentes: "desc",
    classificacao: "desc",
  });
  const [filterMode, setFilterMode] = useState<FilterMode>("todos");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [fabOpen, setFabOpen] = useState(false);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [timelineKey, setTimelineKey] = useState(0);
  const pagerRef = useRef<ScrollView>(null);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => navigation.navigate("Profile")}
          style={{ paddingHorizontal: 12, paddingVertical: 4 }}
        >
          {profilePhotoUrl ? (
            <Image
              source={{ uri: profilePhotoUrl }}
              style={{ width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: "#E1306C" }}
            />
          ) : (
            <View style={{
              width: 34, height: 34, borderRadius: 17,
              backgroundColor: "#3A3F45", justifyContent: "center", alignItems: "center",
              borderWidth: 2, borderColor: "#3A3F45",
            }}>
              <Text style={{ fontSize: 18 }}>👤</Text>
            </View>
          )}
        </Pressable>
      ),
    });
  }, [navigation, profilePhotoUrl]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [crushRes, profileRes] = await Promise.all([
      supabase
        .from("crushes")
        .select("*, crush_dates(id, date_rating, had_chat_rating, had_kiss_rating, had_pirulito_rating, had_donut_rating, had_fire_rating, had_sweat_rating)")
        .order("crush_number", { ascending: true }),
      session?.user.id
        ? supabase.from("profiles").select("photo_url").eq("id", session.user.id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (!crushRes.error && crushRes.data) setAllCrushes(crushRes.data as CrushListItem[]);
    if (!profileRes.error && profileRes.data) {
      setProfilePhotoUrl((profileRes.data as { photo_url: string | null }).photo_url ?? null);
    }
    setLoading(false);
  }, [session?.user.id]);

  useFocusEffect(
    useCallback(() => {
      loadData();
      setTimelineKey((k) => k + 1);
    }, [loadData])
  );

  function handleSortPress(mode: SortMode) {
    if (mode === sortMode) {
      setSortDirs((prev) => ({ ...prev, [mode]: prev[mode] === "desc" ? "asc" : "desc" }));
    } else {
      setSortMode(mode);
    }
  }

  const sorted = [...allCrushes].sort((a, b) => {
    const dir = sortDirs[sortMode] === "asc" ? 1 : -1;
    if (sortMode === "recentes") {
      return ((a.crush_number ?? 0) - (b.crush_number ?? 0)) * dir;
    }
    // TOP vs não-TOP: segue a direção da seta
    // desc (↓): TOP primeiro, não-TOP depois
    // asc  (↑): não-TOP primeiro, TOP por último
    if (a.is_top !== b.is_top) return a.is_top ? dir : -dir;
    // Dentro do mesmo grupo, ordena pela soma total de pontos
    return (totalScore(a) - totalScore(b)) * dir;
  });

  const displayed = sorted.filter((c) => {
    const hasDate = (c.crush_dates?.length ?? 0) > 0;
    if (filterMode === "com_date") return hasDate;
    if (filterMode === "sem_date") return !hasDate;
    return true;
  });

  function renderGridItem({ item, index }: { item: CrushListItem; index: number }) {
    const hasDate = (item.crush_dates?.length ?? 0) > 0;
    return (
      <Pressable
        style={[styles.card, { backgroundColor: cardBackground(item.interest_rating) }, item.is_top && styles.cardTop]}
        onPress={() => navigation.navigate("CrushDetail", { crushId: item.id })}
      >
        <Text style={styles.pokedexNumber}>{formatPokedexNumber(item.crush_number, index)}</Text>
        <View style={styles.badgesRow}>
          {item.is_top && <View style={styles.topBadge}><Text style={styles.topBadgeText}>TOP</Text></View>}
          {hasDate && <View style={styles.dateBadge}><Text style={styles.dateBadgeText}>Date</Text></View>}
        </View>
        <View style={styles.photoContainer}>
          {item.photo_url ? (
            <Image source={{ uri: item.photo_url }} style={[styles.avatar, item.is_top && styles.avatarGold]} />
          ) : (
            <View style={[styles.avatarPlaceholder, item.is_top && styles.avatarGold]}>
              <Text style={{ fontSize: 30 }}>💘</Text>
            </View>
          )}
        </View>
        <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
        <Stars value={item.interest_rating} size={11} />
      </Pressable>
    );
  }

  function renderListItem({ item, index }: { item: CrushListItem; index: number }) {
    const hasDate = (item.crush_dates?.length ?? 0) > 0;
    return (
      <Pressable
        style={styles.listItem}
        onPress={() => navigation.navigate("CrushDetail", { crushId: item.id })}
      >
        <Text style={styles.listNum}>{formatPokedexNumber(item.crush_number, index)}</Text>
        {item.photo_url ? (
          <Image source={{ uri: item.photo_url }} style={[styles.listPhoto, item.is_top && styles.listPhotoGold]} />
        ) : (
          <View style={[styles.listPhotoPlaceholder, item.is_top && styles.listPhotoGold]}>
            <Text style={{ fontSize: 18 }}>💘</Text>
          </View>
        )}
        <View style={styles.listContent}>
          <Text style={styles.listName} numberOfLines={1}>{item.name}</Text>
          <View style={styles.listTags}>
            {item.is_top && <View style={styles.topBadge}><Text style={styles.topBadgeText}>TOP</Text></View>}
            {hasDate && <View style={styles.dateBadge}><Text style={styles.dateBadgeText}>Date</Text></View>}
          </View>
        </View>
        <Stars value={item.interest_rating} size={16} />
      </Pressable>
    );
  }

  return (
    <View style={styles.container}>
      {/* Horizontal pager: Page 1 = crush list, Page 2 = timeline */}
      <ScrollView
        ref={pagerRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={200}
        onMomentumScrollEnd={(e) => {
          const p = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
          setCurrentPage(p);
        }}
        style={{ flex: 1 }}
      >
        {/* Page 1: Crush list */}
        <View style={styles.page}>
          {/* Row 1: Filters (left) + View toggle (right) */}
          <View style={styles.barRow}>
            {(["todos", "com_date", "sem_date"] as FilterMode[]).map((f) => {
              const label = f === "todos" ? "Todos" : f === "com_date" ? "Com Date" : "Sem Date";
              return (
                <Pressable
                  key={f}
                  style={[styles.filterChip, filterMode === f && styles.filterChipActive]}
                  onPress={() => setFilterMode(f)}
                >
                  <Text style={[styles.filterChipText, filterMode === f && styles.filterChipTextActive]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}

            <View style={{ flex: 1 }} />

            <View style={styles.viewToggle}>
              <Pressable
                style={[styles.viewBtn, viewMode === "grid" && styles.viewBtnActive]}
                onPress={() => setViewMode("grid")}
              >
                <Text style={[styles.viewBtnText, viewMode === "grid" && styles.viewBtnTextActive]}>⊞</Text>
              </Pressable>
              <Pressable
                style={[styles.viewBtn, viewMode === "list" && styles.viewBtnActive]}
                onPress={() => setViewMode("list")}
              >
                <Text style={[styles.viewBtnText, viewMode === "list" && styles.viewBtnTextActive]}>≡</Text>
              </Pressable>
            </View>
          </View>

          {/* Row 2: Sort with direction arrows */}
          <View style={[styles.barRow, { marginBottom: 12 }]}>
            {(["recentes", "classificacao"] as SortMode[]).map((s) => {
              const label = s === "recentes" ? "Recentes" : "Classificação";
              const isActive = sortMode === s;
              const arrow = sortDirs[s] === "desc" ? " ↓" : " ↑";
              return (
                <Pressable
                  key={s}
                  style={[styles.sortBtn, isActive && styles.sortBtnActive]}
                  onPress={() => handleSortPress(s)}
                >
                  <Text style={[styles.sortBtnText, isActive && styles.sortBtnTextActive]}>
                    {label}{arrow}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {loading ? (
            <ActivityIndicator color="#FFFFFF" style={{ marginTop: 40 }} />
          ) : (
            <FlatList
              key={viewMode}
              data={displayed}
              keyExtractor={(item) => item.id}
              numColumns={viewMode === "grid" ? 2 : 1}
              contentContainerStyle={styles.list}
              columnWrapperStyle={viewMode === "grid" ? styles.columnWrapper : undefined}
              ListEmptyComponent={<Text style={styles.empty}>Nenhum crush cadastrado ainda.</Text>}
              renderItem={viewMode === "grid" ? renderGridItem : renderListItem}
            />
          )}
        </View>

        {/* Page 2: Timeline */}
        <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
          <TimelineTab refreshKey={timelineKey} />
        </View>
      </ScrollView>

      {/* Bottom page indicator — sits above system nav bar */}
      <View style={[styles.dotsBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        {[0, 1].map((i) => (
          <Pressable
            key={i}
            style={[styles.pageDot, currentPage === i && styles.pageDotActive]}
            onPress={() => {
              pagerRef.current?.scrollTo({ x: i * SCREEN_WIDTH, animated: true });
              setCurrentPage(i);
            }}
          />
        ))}
      </View>

      {/* FAB dim overlay (only on page 1) */}
      {fabOpen && currentPage === 0 && (
        <Pressable
          style={[StyleSheet.absoluteFillObject, styles.overlay]}
          onPress={() => setFabOpen(false)}
        />
      )}

      {/* Speed-dial FAB (only visible on page 1) */}
      {currentPage === 0 && (
        <View style={[styles.speedDial, { bottom: Math.max(insets.bottom, 10) + 48 }]}>
          {fabOpen && (
            <>
              <View style={styles.speedDialOption}>
                <Text style={styles.speedDialLabel}>Registrar Date</Text>
                <Pressable
                  style={[styles.speedDialBtn, { backgroundColor: "#16a34a" }]}
                  onPress={() => { setFabOpen(false); navigation.navigate("DateForm", undefined); }}
                >
                  <Text style={styles.speedDialBtnText}>📅</Text>
                </Pressable>
              </View>
              <View style={styles.speedDialOption}>
                <Text style={styles.speedDialLabel}>Novo Crush</Text>
                <Pressable
                  style={[styles.speedDialBtn, { backgroundColor: "#E1306C" }]}
                  onPress={() => { setFabOpen(false); navigation.navigate("CrushForm", undefined); }}
                >
                  <Text style={styles.speedDialBtnText}>💘</Text>
                </Pressable>
              </View>
            </>
          )}
          <Pressable style={styles.fab} onPress={() => setFabOpen((p) => !p)}>
            <Text style={styles.fabText}>{fabOpen ? "×" : "+"}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1E2327" },
  page: { width: SCREEN_WIDTH, flex: 1, paddingHorizontal: 16, paddingTop: 12 },

  barRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8, flexWrap: "wrap" },

  viewToggle: { flexDirection: "row", gap: 2, marginRight: 4 },
  viewBtn: {
    width: 32, height: 28, borderRadius: 6,
    justifyContent: "center", alignItems: "center",
    backgroundColor: "#262B31", borderWidth: 1, borderColor: "#3A3F45",
  },
  viewBtnActive: { backgroundColor: "#4A4F55", borderColor: "#A0A0A0" },
  viewBtnText: { color: "#A0A0A0", fontSize: 16 },
  viewBtnTextActive: { color: "#FFFFFF" },

  filterChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: "#3A3F45", backgroundColor: "#262B31",
  },
  filterChipActive: { backgroundColor: "#E1306C", borderColor: "#E1306C" },
  filterChipText: { color: "#A0A0A0", fontSize: 12 },
  filterChipTextActive: { color: "#FFFFFF", fontWeight: "600" },

  sortBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: "#3A3F45", backgroundColor: "#262B31",
  },
  sortBtnActive: { backgroundColor: "#E1306C", borderColor: "#E1306C" },
  sortBtnText: { color: "#A0A0A0", fontSize: 12, fontWeight: "600" },
  sortBtnTextActive: { color: "#FFFFFF" },

  list: { paddingBottom: 130 },
  columnWrapper: { gap: CARD_MARGIN, marginBottom: CARD_MARGIN },
  empty: { color: "#A0A0A0", textAlign: "center", marginTop: 40 },

  // Grid card
  card: { width: CARD_WIDTH, borderRadius: 12, padding: 10, alignItems: "center", position: "relative" },
  cardTop: { borderWidth: 2, borderColor: "#FFD700" },
  pokedexNumber: { position: "absolute", top: 6, left: 8, color: "#A0A0A0", fontSize: 10, fontWeight: "700" },
  badgesRow: { flexDirection: "row", gap: 4, alignSelf: "flex-end", marginBottom: 6, minHeight: 20 },
  topBadge: { backgroundColor: "#FFD700", borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  topBadgeText: { color: "#000", fontSize: 9, fontWeight: "800" },
  dateBadge: { backgroundColor: "#16a34a", borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  dateBadgeText: { color: "#FFF", fontSize: 9, fontWeight: "700" },
  photoContainer: { marginBottom: 8 },
  avatar: { width: 72, height: 72, borderRadius: 36 },
  avatarGold: { borderWidth: 2, borderColor: "#FFD700" },
  avatarPlaceholder: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: "#3A3F45", justifyContent: "center", alignItems: "center",
  },
  cardName: { color: "#FFF", fontSize: 14, fontWeight: "700", textAlign: "center", marginBottom: 4 },

  // List item
  listItem: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#262B31", borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 8, gap: 10,
  },
  listNum: { color: "#A0A0A0", fontSize: 10, fontWeight: "700", width: 30 },
  listPhoto: { width: 44, height: 44, borderRadius: 22 },
  listPhotoPlaceholder: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "#3A3F45", justifyContent: "center", alignItems: "center",
  },
  listPhotoGold: { borderWidth: 2, borderColor: "#FFD700" },
  listContent: { flex: 1 },
  listName: { color: "#FFF", fontSize: 15, fontWeight: "600" },
  listTags: { flexDirection: "row", gap: 4, marginTop: 4 },

  // Page dots
  dotsBar: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    backgroundColor: "#1E2327",
  },
  pageDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: "#3A3F45",
  },
  pageDotActive: {
    width: 22, height: 8, borderRadius: 4,
    backgroundColor: "#E1306C",
  },

  // Speed-dial
  overlay: { backgroundColor: "rgba(0,0,0,0.45)" },
  speedDial: { position: "absolute", right: 20, alignItems: "flex-end" },
  speedDialOption: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 10 },
  speedDialLabel: {
    color: "#FFF", fontSize: 13, fontWeight: "600",
    backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  speedDialBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center" },
  speedDialBtnText: { fontSize: 20 },
  fab: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#E1306C", justifyContent: "center", alignItems: "center" },
  fabText: { color: "#FFF", fontSize: 28, lineHeight: 30 },
});
