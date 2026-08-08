import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  ActivityIndicator,
  Pressable,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { supabase } from "../lib/supabase";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const H_PAD = 16; // content horizontal padding
const CHART_PAGE_W = SCREEN_WIDTH - H_PAD * 2; // width of each chart page
const CHART_HEIGHT = 150;
const BAR_W = 32;

// ─── Types ──────────────────────────────────────────────────────────────────

interface TimelineEntry {
  id: string;
  date: string | null;
  created_at: string;
  location: string | null;
  had_chat: boolean;
  had_kiss: boolean;
  had_pirulito: boolean;
  had_donut: boolean;
  had_fire: boolean;
  had_sweat: boolean;
  crushes: { name: string; photo_url: string | null }[] | null;
}

type ActivityKey = "had_chat" | "had_kiss" | "had_pirulito" | "had_donut" | "had_fire" | "had_sweat";

interface Bar { ym: string; label: string; count: number }

interface Period { year: number; half: 1 | 2 }

// ─── Constants ──────────────────────────────────────────────────────────────

const MONTH_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const H1_MONTHS = [1, 2, 3, 4, 5, 6];
const H2_MONTHS = [7, 8, 9, 10, 11, 12];

const ACTS: { key: ActivityKey; emoji: string; label: string }[] = [
  { key: "had_chat",     emoji: "💬", label: "Conversa" },
  { key: "had_kiss",     emoji: "💋", label: "Beijo"    },
  { key: "had_pirulito", emoji: "🍭", label: "Pirulito" },
  { key: "had_donut",    emoji: "🍩", label: "Donut"    },
  { key: "had_fire",     emoji: "🔥", label: "Fogo"     },
  { key: "had_sweat",    emoji: "💦", label: "Suor"     },
];

// 💬 excluded from chart (per product decision)
const CHART_ACTS = ACTS.filter((a) => a.key !== "had_chat");

// ─── Period helpers ──────────────────────────────────────────────────────────

function currentPeriod(): Period {
  const now = new Date();
  return { year: now.getFullYear(), half: now.getMonth() < 6 ? 1 : 2 };
}

function periodLabel(p: Period): string {
  return p.half === 1 ? `Jan — Jun ${p.year}` : `Jul — Dez ${p.year}`;
}

function periodMonths(p: Period): number[] {
  return p.half === 1 ? H1_MONTHS : H2_MONTHS;
}

function prevPeriod(p: Period): Period {
  return p.half === 2 ? { year: p.year, half: 1 } : { year: p.year - 1, half: 2 };
}

function nextPeriod(p: Period): Period {
  return p.half === 1 ? { year: p.year, half: 2 } : { year: p.year + 1, half: 1 };
}

function dateInPeriod(date: string, p: Period): boolean {
  const year  = parseInt(date.slice(0, 4));
  const month = parseInt(date.slice(5, 7));
  return year === p.year && periodMonths(p).includes(month);
}

function periodHasData(entries: TimelineEntry[], p: Period): boolean {
  return entries.some((e) => e.date != null && dateInPeriod(e.date, p));
}

// ─── Chart data builder ──────────────────────────────────────────────────────

function buildBars(entries: TimelineEntry[], key: ActivityKey, p: Period): Bar[] {
  const map = new Map<string, number>();
  for (const e of entries) {
    if (!e.date || !e[key]) continue;
    const ym = e.date.slice(0, 7);
    map.set(ym, (map.get(ym) ?? 0) + 1);
  }
  return periodMonths(p).map((m) => {
    const ym = `${p.year}-${String(m).padStart(2, "0")}`;
    return { ym, label: MONTH_PT[m - 1], count: map.get(ym) ?? 0 };
  });
}

// ─── ChartPage component ─────────────────────────────────────────────────────

function ChartPage({ bars }: { bars: Bar[] }) {
  const maxCount = Math.max(...bars.map((b) => b.count), 1);
  const allZero  = bars.every((b) => b.count === 0);

  return (
    <View style={{ width: CHART_PAGE_W, paddingHorizontal: 4, paddingTop: 8, paddingBottom: 12 }}>
      {allZero ? (
        <View style={{ height: CHART_HEIGHT + 36, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ color: "#5A5F65", fontSize: 13 }}>Sem registros neste período</Text>
        </View>
      ) : (
        <View style={{ height: CHART_HEIGHT + 36, flexDirection: "row", alignItems: "flex-end" }}>
          {bars.map((bar) => {
            const barH = bar.count > 0
              ? Math.max((bar.count / maxCount) * CHART_HEIGHT, 8)
              : 2;
            const hasCount = bar.count > 0;
            return (
              <View key={bar.ym} style={{ flex: 1, alignItems: "center", justifyContent: "flex-end" }}>
                {hasCount && (
                  <Text style={chartStyles.count}>{bar.count}</Text>
                )}
                <View style={[chartStyles.bar, {
                  height: barH,
                  backgroundColor: hasCount ? "#E1306C" : "#2A2F35",
                }]} />
                <Text style={chartStyles.monthLabel}>{bar.label}</Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const chartStyles = StyleSheet.create({
  count:      { color: "#E1306C", fontSize: 11, fontWeight: "700", marginBottom: 2 },
  bar:        { width: BAR_W, borderRadius: 5 },
  monthLabel: { color: "#A0A0A0", fontSize: 10, marginTop: 5, textAlign: "center" },
});

// ─── Main component ──────────────────────────────────────────────────────────

interface Props { refreshKey: number }

export default function TimelineTab({ refreshKey }: Props) {
  const [entries,     setEntries]     = useState<TimelineEntry[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [selectedAct, setSelectedAct] = useState<ActivityKey>("had_kiss");
  const [period,      setPeriod]      = useState<Period>(currentPeriod());

  const chartScrollRef = useRef<ScrollView>(null);

  useEffect(() => { load(); }, [refreshKey]);

  // After period changes, silently reset chart scroll to center page
  useEffect(() => {
    chartScrollRef.current?.scrollTo({ x: CHART_PAGE_W, animated: false });
  }, [period]);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("crush_dates")
      .select(`
        id, date, created_at, location,
        had_chat, had_kiss, had_pirulito, had_donut, had_fire, had_sweat,
        crushes (name, photo_url)
      `)
      .order("date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (!error && data) setEntries(data as unknown as TimelineEntry[]);
    setLoading(false);
  }

  function onChartScrollEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const x = e.nativeEvent.contentOffset.x;
    if (x < CHART_PAGE_W * 0.5) {
      const p = prevPeriod(period);
      if (periodHasData(entries, p)) { setPeriod(p); }
      else { chartScrollRef.current?.scrollTo({ x: CHART_PAGE_W, animated: true }); }
    } else if (x > CHART_PAGE_W * 1.5) {
      const p = nextPeriod(period);
      if (periodHasData(entries, p)) { setPeriod(p); }
      else { chartScrollRef.current?.scrollTo({ x: CHART_PAGE_W, animated: true }); }
    }
  }

  const prev = prevPeriod(period);
  const next = nextPeriod(period);
  const hasPrev = periodHasData(entries, prev);
  const hasNext = periodHasData(entries, next);

  const prevBars    = buildBars(entries, selectedAct, prev);
  const currentBars = buildBars(entries, selectedAct, period);
  const nextBars    = buildBars(entries, selectedAct, next);

  // Timeline filtered to current period only
  const periodEntries = entries.filter((e) => e.date != null && dateInPeriod(e.date!, period));

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#E1306C" size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ══════ DASHBOARD ══════ */}
      <Text style={styles.sectionTitle}>Dashboard</Text>

      {/* Activity selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.actRow}
        contentContainerStyle={styles.actRowInner}
      >
        {CHART_ACTS.map((a) => {
          const active = selectedAct === a.key;
          return (
            <Pressable
              key={a.key}
              style={[styles.actTab, active && styles.actTabActive]}
              onPress={() => setSelectedAct(a.key)}
            >
              <Text style={styles.actTabEmoji}>{a.emoji}</Text>
              <Text style={[styles.actTabLabel, active && styles.actTabLabelActive]}>{a.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Chart card */}
      <View style={styles.chartCard}>
        {/* Period navigation header */}
        <View style={styles.periodHeader}>
          <Pressable
            onPress={() => hasPrev && setPeriod(prev)}
            style={styles.periodArrowBtn}
            hitSlop={12}
          >
            <Text style={[styles.periodArrow, !hasPrev && styles.periodArrowOff]}>‹</Text>
          </Pressable>

          <Text style={styles.periodLabel}>{periodLabel(period)}</Text>

          <Pressable
            onPress={() => hasNext && setPeriod(next)}
            style={styles.periodArrowBtn}
            hitSlop={12}
          >
            <Text style={[styles.periodArrow, !hasNext && styles.periodArrowOff]}>›</Text>
          </Pressable>
        </View>

        {/* 3-page swipeable chart (prev | current | next) */}
        <ScrollView
          ref={chartScrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onChartScrollEnd}
          contentOffset={{ x: CHART_PAGE_W, y: 0 }}
          scrollEventThrottle={16}
        >
          <ChartPage bars={prevBars} />
          <ChartPage bars={currentBars} />
          <ChartPage bars={nextBars} />
        </ScrollView>
      </View>

      {/* ══════ TIMELINE ══════ */}
      <Text style={[styles.sectionTitle, { marginTop: 28 }]}>
        Linha do Tempo
      </Text>
      <Text style={styles.periodSub}>{periodLabel(period)}</Text>

      {periodEntries.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyIcon}>📅</Text>
          <Text style={styles.emptyText}>Sem dates neste período.</Text>
        </View>
      ) : (
        periodEntries.map((entry, index) => {
          const isLast    = index === periodEntries.length - 1;
          const activeActs = ACTS.filter((a) => entry[a.key]);
          const crush      = Array.isArray(entry.crushes) ? entry.crushes[0] : entry.crushes;

          return (
            <View key={entry.id} style={styles.row}>
              <View style={styles.lineCol}>
                <View style={styles.dotOuter}><View style={styles.dotInner} /></View>
                {!isLast && <View style={styles.vertLine} />}
              </View>

              <View style={[styles.card, isLast && { marginBottom: 0 }]}>
                <Text style={styles.dateLabel}>
                  {entry.date ? formatDate(entry.date) : "Sem data"}
                </Text>
                <View style={styles.cardRow}>
                  {crush?.photo_url ? (
                    <Image source={{ uri: crush.photo_url }} style={styles.photo} />
                  ) : (
                    <View style={styles.photoPlaceholder}>
                      <Text style={{ fontSize: 22 }}>💘</Text>
                    </View>
                  )}
                  <View style={styles.cardBody}>
                    <Text style={styles.crushName} numberOfLines={1}>{crush?.name ?? "?"}</Text>
                    {entry.location ? (
                      <Text style={styles.location} numberOfLines={1}>📍 {entry.location}</Text>
                    ) : null}
                    {activeActs.length > 0 && (
                      <Text style={styles.actEmojis}>{activeActs.map((a) => a.emoji).join(" ")}</Text>
                    )}
                  </View>
                </View>
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#1E2327" },

  container: { flex: 1, backgroundColor: "#1E2327" },
  content:   { paddingTop: 16, paddingBottom: 32, paddingHorizontal: H_PAD },

  sectionTitle: {
    color: "#FFFFFF", fontSize: 18, fontWeight: "800",
    marginBottom: 4, letterSpacing: -0.3,
  },
  periodSub: {
    color: "#A0A0A0", fontSize: 12, marginBottom: 14,
  },

  // ── Activity selector ──
  actRow:      { marginBottom: 12 },
  actRowInner: { gap: 8, paddingBottom: 2 },
  actTab: {
    alignItems: "center", paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 12, borderWidth: 1, borderColor: "#3A3F45",
    backgroundColor: "#262B31", minWidth: 62,
  },
  actTabActive:      { borderColor: "#E1306C", backgroundColor: "#3D1A26" },
  actTabEmoji:       { fontSize: 22 },
  actTabLabel:       { fontSize: 10, color: "#A0A0A0", marginTop: 2, fontWeight: "600" },
  actTabLabelActive: { color: "#E1306C" },

  // ── Chart card ──
  chartCard: {
    backgroundColor: "#262B31", borderRadius: 14,
    borderWidth: 1, borderColor: "#3A3F45", overflow: "hidden",
    marginBottom: 4,
  },

  periodHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6,
  },
  periodArrowBtn: { padding: 4 },
  periodArrow:    { color: "#E1306C", fontSize: 24, fontWeight: "700", lineHeight: 28 },
  periodArrowOff: { color: "#3A3F45" },
  periodLabel: {
    color: "#FFFFFF", fontSize: 14, fontWeight: "700", textAlign: "center",
  },

  // ── Timeline ──
  emptyWrap: { alignItems: "center", paddingVertical: 24, gap: 6 },
  emptyIcon: { fontSize: 40 },
  emptyText: { color: "#A0A0A0", fontSize: 14 },

  row:     { flexDirection: "row" },
  lineCol: { width: 44, alignItems: "center" },
  dotOuter: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: "#3D1A26", borderWidth: 2, borderColor: "#E1306C",
    justifyContent: "center", alignItems: "center",
    marginTop: 12, zIndex: 1,
  },
  dotInner: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#E1306C" },
  vertLine: { width: 2, flex: 1, backgroundColor: "#3A3F45", marginTop: 3, marginBottom: 3 },

  card: {
    flex: 1, backgroundColor: "#262B31", borderRadius: 12,
    padding: 12, marginBottom: 10, borderWidth: 1, borderColor: "#3A3F45",
  },
  dateLabel: {
    color: "#E1306C", fontSize: 11, fontWeight: "700",
    letterSpacing: 0.5, marginBottom: 8, textTransform: "uppercase",
  },
  cardRow:        { flexDirection: "row", alignItems: "center", gap: 10 },
  photo:          { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: "#3A3F45" },
  photoPlaceholder: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: "#3A3F45", justifyContent: "center", alignItems: "center",
  },
  cardBody:  { flex: 1 },
  crushName: { color: "#FFFFFF", fontSize: 15, fontWeight: "700", marginBottom: 2 },
  location:  { color: "#A0A0A0", fontSize: 12, marginBottom: 4 },
  actEmojis: { fontSize: 18 },
});
