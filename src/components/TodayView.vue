<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import {
  createActivity,
  start,
  pause,
  stop,
  reset,
  sync,
  getStudiedMs,
  formatMs,
  STATUS,
} from "../lib/timer";
import { saveActivity, getActivitiesByDate } from "../db";
import { todayStr } from "../lib/date";
import ActivityCard from "./ActivityCard.vue";

const SUBJECTS = [
  "Kanji Study",
  "Vocabulary",
  "Grammar",
  "Reading Practice",
  "Speaking Practice",
  "Listening",
];
const DAILY_GOAL_MIN = 120; // moves to settings later

const date = todayStr();
const activities = ref([]);
const now = ref(Date.now());
const ready = ref(false);
let tick = null;

// add form
const subject = ref(SUBJECTS[0]);
const title = ref("");
const minutes = ref(60);

// Recalculate from the real clock. Completes any timer that ran out.
function refresh() {
  now.value = Date.now();
  let changed = false;
  const next = activities.value.map((a) => {
    const s = sync(a, now.value);
    if (s !== a) {
      changed = true;
      saveActivity(s);
    }
    return s;
  });
  if (changed) activities.value = next;
}

onMounted(async () => {
  activities.value = await getActivitiesByDate(date);
  ready.value = true;
  refresh();
  tick = setInterval(refresh, 250);
  document.addEventListener("visibilitychange", refresh);
  window.addEventListener("focus", refresh);
});

onUnmounted(() => {
  clearInterval(tick);
  document.removeEventListener("visibilitychange", refresh);
  window.removeEventListener("focus", refresh);
});

async function update(a) {
  activities.value = activities.value.map((x) => (x.id === a.id ? a : x));
  await saveActivity(a);
}

async function add() {
  const mins = Number(minutes.value);
  if (!mins || mins < 1) return;
  const a = createActivity({
    subject: subject.value,
    title: title.value.trim() || subject.value,
    date,
    targetMin: mins,
  });
  activities.value = [...activities.value, a];
  await saveActivity(a);
  title.value = "";
}

// Only one timer runs at a time: starting one pauses the other.
async function onStart(a) {
  const running = activities.value.find(
    (x) => x.status === STATUS.RUNNING && x.id !== a.id
  );
  if (running) await update(pause(running, Date.now()));
  await update(start(a, Date.now()));
}
const onPause = (a) => update(pause(a, Date.now()));
const onStop = (a) => update(stop(a, Date.now()));
const onReset = (a) => update(reset(a));

const ongoing = computed(() =>
  activities.value.filter(
    (a) => a.status === "running" || a.status === "paused"
  )
);
const upcoming = computed(() =>
  activities.value.filter((a) => a.status === "idle")
);
const done = computed(() =>
  activities.value.filter(
    (a) => a.status === "completed" || a.status === "stopped"
  )
);

const studiedMs = computed(() =>
  activities.value.reduce((sum, a) => sum + getStudiedMs(a, now.value), 0)
);
const goalPct = computed(() =>
  Math.min(100, (studiedMs.value / (DAILY_GOAL_MIN * 60000)) * 100)
);
</script>

<template>
  <div v-if="ready" class="space-y-6">
    <header>
      <h1 class="text-2xl font-bold">Today</h1>
      <p class="text-sm text-slate-500">{{ date }}</p>
    </header>

    <section class="rounded-xl bg-white p-4 shadow-sm border border-slate-200">
      <div class="flex justify-between text-sm">
        <span
          >Studied today: <b>{{ formatMs(studiedMs) }}</b></span
        >
        <span class="text-slate-500">Goal: {{ DAILY_GOAL_MIN }} min</span>
      </div>
      <div class="mt-2 h-2 w-full rounded-full bg-slate-100">
        <div
          class="h-2 rounded-full bg-emerald-500"
          :style="{ width: goalPct + '%' }"
        ></div>
      </div>
    </section>

    <section class="rounded-xl bg-white p-4 shadow-sm border border-slate-200">
      <form class="grid grid-cols-1 gap-2 sm:grid-cols-4" @submit.prevent="add">
        <select
          v-model="subject"
          class="rounded-lg border border-slate-300 p-2 text-sm"
        >
          <option v-for="s in SUBJECTS" :key="s">{{ s }}</option>
        </select>
        <input
          v-model="title"
          placeholder="Title (optional)"
          class="rounded-lg border border-slate-300 p-2 text-sm"
        />
        <input
          v-model="minutes"
          type="number"
          min="1"
          placeholder="Minutes"
          class="rounded-lg border border-slate-300 p-2 text-sm"
        />
        <button
          class="rounded-lg bg-indigo-600 p-2 text-sm font-medium text-white"
        >
          + Add
        </button>
      </form>
    </section>

    <section v-if="ongoing.length" class="space-y-3">
      <h2 class="font-semibold">Ongoing</h2>
      <ActivityCard
        v-for="a in ongoing"
        :key="a.id"
        :activity="a"
        :now="now"
        @start="onStart(a)"
        @pause="onPause(a)"
        @stop="onStop(a)"
        @reset="onReset(a)"
      />
    </section>

    <section v-if="upcoming.length" class="space-y-3">
      <h2 class="font-semibold">Upcoming</h2>
      <ActivityCard
        v-for="a in upcoming"
        :key="a.id"
        :activity="a"
        :now="now"
        @start="onStart(a)"
        @pause="onPause(a)"
        @stop="onStop(a)"
        @reset="onReset(a)"
      />
    </section>

    <section v-if="done.length" class="space-y-3">
      <h2 class="font-semibold">Completed</h2>
      <ActivityCard
        v-for="a in done"
        :key="a.id"
        :activity="a"
        :now="now"
        @start="onStart(a)"
        @pause="onPause(a)"
        @stop="onStop(a)"
        @reset="onReset(a)"
      />
    </section>

    <p v-if="!activities.length" class="text-center text-sm text-slate-500">
      No activities yet. Add one above.
    </p>
  </div>
</template>