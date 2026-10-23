<script setup>
import { ref, computed, onMounted } from "vue";
import { getAllSessions } from "../db";
import { todayStr, addDays } from "../lib/date";
import { dailyGoalMin } from "../lib/settings";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const sessions = ref([]);
const ready = ref(false);
const weekOffset = ref(0);

onMounted(async () => {
  sessions.value = await getAllSessions();
  ready.value = true;
});

function fmt(ms) {
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function weekStart(str) {
  const [y, m, d] = str.split("-").map(Number);
  const dow = (new Date(y, m - 1, d).getDay() + 6) % 7; // Monday = 0
  return addDays(str, -dow);
}

const today = todayStr();
const monday = computed(() => addDays(weekStart(today), weekOffset.value * 7));
const weekDates = computed(() =>
  Array.from({ length: 7 }, (_, i) => addDays(monday.value, i))
);
const weekLabel = computed(
  () => `${weekDates.value[0]} to ${weekDates.value[6]}`
);

const weekSessions = computed(() =>
  sessions.value.filter((s) => weekDates.value.includes(s.date))
);

const days = computed(() =>
  weekDates.value.map((date, i) => ({
    date,
    label: DAY_LABELS[i],
    ms: weekSessions.value
      .filter((s) => s.date === date)
      .reduce((n, s) => n + s.studiedMs, 0),
  }))
);

const weekTotal = computed(() => days.value.reduce((n, d) => n + d.ms, 0));
const todayTotal = computed(() =>
  sessions.value
    .filter((s) => s.date === today)
    .reduce((n, s) => n + s.studiedMs, 0)
);
const allTotal = computed(() =>
  sessions.value.reduce((n, s) => n + s.studiedMs, 0)
);

const dayScale = computed(() =>
  Math.max(dailyGoalMin.value * 60000, ...days.value.map((d) => d.ms))
);

const subjects = computed(() => {
  const map = {};
  for (const s of weekSessions.value)
    map[s.subject] = (map[s.subject] || 0) + s.studiedMs;
  return Object.entries(map)
    .map(([name, ms]) => ({ name, ms }))
    .sort((a, b) => b.ms - a.ms);
});
const subjectMax = computed(() =>
  Math.max(1, ...subjects.value.map((s) => s.ms))
);

const recent = computed(() => sessions.value.slice(0, 50));

function time(ts) {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}
</script>

<template>
  <div v-if="ready" class="space-y-6">
    <h1 class="text-2xl font-bold">History</h1>

    <section class="grid grid-cols-3 gap-3">
      <div class="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div class="text-xs text-slate-500">Today</div>
        <div class="text-lg font-bold">{{ fmt(todayTotal) }}</div>
      </div>
      <div class="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div class="text-xs text-slate-500">This view's week</div>
        <div class="text-lg font-bold">{{ fmt(weekTotal) }}</div>
      </div>
      <div class="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div class="text-xs text-slate-500">All time</div>
        <div class="text-lg font-bold">{{ fmt(allTotal) }}</div>
      </div>
    </section>

    <section class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div class="mb-3 flex items-center justify-between">
        <button
          class="rounded-lg border border-slate-300 px-3 py-1 text-sm"
          @click="weekOffset--"
        >
          ‹
        </button>
        <div class="text-sm font-medium">{{ weekLabel }}</div>
        <div class="flex gap-1">
          <button
            v-if="weekOffset !== 0"
            class="rounded-lg bg-indigo-600 px-3 py-1 text-sm text-white"
            @click="weekOffset = 0"
          >
            This week
          </button>
          <button
            class="rounded-lg border border-slate-300 px-3 py-1 text-sm"
            :disabled="weekOffset >= 0"
            :class="{ 'opacity-40': weekOffset >= 0 }"
            @click="weekOffset++"
          >
            ›
          </button>
        </div>
      </div>

      <div class="space-y-2">
        <div
          v-for="d in days"
          :key="d.date"
          class="flex items-center gap-2 text-sm"
        >
          <span class="w-10 text-slate-500">{{ d.label }}</span>
          <div class="h-4 flex-1 rounded bg-slate-100">
            <div
              class="h-4 rounded bg-indigo-500"
              :style="{ width: (d.ms / dayScale) * 100 + '%' }"
            ></div>
          </div>
          <span class="w-16 text-right tabular-nums">{{
            d.ms ? fmt(d.ms) : "-"
          }}</span>
        </div>
      </div>
      <p class="mt-2 text-xs text-slate-400">
        Bar scale: daily goal of {{ dailyGoalMin }} min
      </p>
    </section>

    <section class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 class="mb-3 font-semibold">By subject (this week)</h2>
      <p v-if="!subjects.length" class="text-sm text-slate-500">
        No sessions this week.
      </p>
      <div class="space-y-2">
        <div v-for="s in subjects" :key="s.name" class="text-sm">
          <div class="flex justify-between">
            <span>{{ s.name }}</span>
            <span class="tabular-nums">{{ fmt(s.ms) }}</span>
          </div>
          <div class="mt-1 h-2 rounded bg-slate-100">
            <div
              class="h-2 rounded bg-emerald-500"
              :style="{ width: (s.ms / subjectMax) * 100 + '%' }"
            ></div>
          </div>
        </div>
      </div>
    </section>

    <section class="space-y-2">
      <h2 class="font-semibold">Recent sessions</h2>
      <p v-if="!recent.length" class="text-sm text-slate-500">
        No sessions yet. Finish or stop an activity to record one.
      </p>
      <div
        v-for="s in recent"
        :key="s.id"
        class="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-sm"
      >
        <div>
          <div class="font-medium">{{ s.title }}</div>
          <div class="text-xs text-slate-500">
            {{ s.date }} · {{ time(s.startTs) }}
            <span v-if="s.pauseCount"> · paused {{ s.pauseCount }}×</span>
          </div>
        </div>
        <div class="text-right">
          <div class="font-semibold tabular-nums">{{ fmt(s.studiedMs) }}</div>
          <div
            class="text-xs"
            :class="
              s.outcome === 'completed' ? 'text-blue-600' : 'text-rose-600'
            "
          >
            {{ s.outcome }}
          </div>
        </div>
      </div>
    </section>
  </div>
</template>