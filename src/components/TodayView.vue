<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import {
  createActivity,
  start,
  pause,
  stop,
  reset,
  sync,
  updateDetails,
  getStudiedMs,
  formatMs,
  STATUS,
} from "../lib/timer";
import {
  saveActivity,
  deleteActivity,
  getActivitiesByDate,
  getRunningActivity,
  recordSession,
} from "../db";
import { todayStr, addDays } from "../lib/date";
import { dailyGoalMin, setDailyGoal } from "../lib/settings";
import ActivityCard from "./ActivityCard.vue";

const SUBJECTS = [
  "Kanji Study",
  "Vocabulary",
  "Grammar",
  "Reading Practice",
  "Speaking Practice",
  "Listening",
];

const editingGoal = ref(false);
const goalInput = ref(120);
function startGoalEdit() {
  goalInput.value = dailyGoalMin.value;
  editingGoal.value = true;
}
async function saveGoal() {
  await setDailyGoal(goalInput.value);
  editingGoal.value = false;
}

const date = ref(todayStr());
const activities = ref([]);
const now = ref(Date.now());
const ready = ref(false);
let tick = null;

// form (used for both add and edit)
const subject = ref(SUBJECTS[0]);
const title = ref("");
const minutes = ref(60);
const editingId = ref(null);

const isToday = computed(() => date.value === todayStr());

async function load() {
  activities.value = await getActivitiesByDate(date.value);
}

// Recalculate from the real clock. Completes any timer that ran out.
function refresh() {
  now.value = Date.now();
  let changed = false;
  const next = activities.value.map((a) => {
    const s = sync(a, now.value);
    if (s !== a) {
      changed = true;
      saveActivity(s);
      recordSession(s);
    }
    return s;
  });
  if (changed) activities.value = next;
}

onMounted(async () => {
  await load();
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

watch(date, () => {
  cancelEdit();
  load();
});

async function update(a) {
  activities.value = activities.value.map((x) => (x.id === a.id ? a : x));
  await saveActivity(a);
}

function resetForm() {
  title.value = "";
  minutes.value = 60;
  subject.value = SUBJECTS[0];
}

function cancelEdit() {
  editingId.value = null;
  resetForm();
}

async function submit() {
  const mins = Number(minutes.value);
  if (!mins || mins < 1) return;

  if (editingId.value) {
    const a = activities.value.find((x) => x.id === editingId.value);
    if (a) {
      await update(
        updateDetails(a, {
          subject: subject.value,
          title: title.value.trim() || subject.value,
          targetMin: mins,
        })
      );
    }
    cancelEdit();
    return;
  }

  const a = createActivity({
    subject: subject.value,
    title: title.value.trim() || subject.value,
    date: date.value,
    targetMin: mins,
  });
  activities.value = [...activities.value, a];
  await saveActivity(a);
  resetForm();
}

function onEdit(a) {
  editingId.value = a.id;
  subject.value = a.subject;
  title.value = a.title;
  minutes.value = Math.round(a.targetMs / 60000);
}

async function onDelete(a) {
  if (!confirm(`Delete "${a.title}"?`)) return;
  if (editingId.value === a.id) cancelEdit();
  activities.value = activities.value.filter((x) => x.id !== a.id);
  await deleteActivity(a.id);
}

// Only one timer runs at a time, across all dates: starting one pauses the other.
async function onStart(a) {
  const t = Date.now();
  const running = await getRunningActivity();
  if (running && running.id !== a.id) {
    const paused = pause(running, t);
    await saveActivity(paused);
    activities.value = activities.value.map((x) =>
      x.id === paused.id ? paused : x
    );
  }
  await update(start(a, t));
}
const onPause = (a) => update(pause(a, Date.now()));
const onStop = async (a) => {
  const s = stop(a, Date.now());
  await recordSession(s);
  await update(s);
};
const onReset = async (a) => {
  if (a.status === "paused") await recordSession({ ...a, endedAt: Date.now() });
  await update(reset(a));
};

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
  Math.min(100, (studiedMs.value / (dailyGoalMin.value * 60000)) * 100)
);
</script>

<template>
  <div v-if="ready" class="space-y-6">
    <header class="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h1 class="text-2xl font-bold">{{ isToday ? "Today" : "Schedule" }}</h1>
        <p class="text-sm text-slate-500">{{ date }}</p>
      </div>
      <div class="flex items-center gap-1">
        <button
          class="rounded-lg bg-white border border-slate-300 px-3 py-1.5 text-sm"
          @click="date = addDays(date, -1)"
        >
          ‹
        </button>
        <input
          v-model="date"
          type="date"
          class="rounded-lg border border-slate-300 bg-white p-1.5 text-sm"
        />
        <button
          class="rounded-lg bg-white border border-slate-300 px-3 py-1.5 text-sm"
          @click="date = addDays(date, 1)"
        >
          ›
        </button>
        <button
          v-if="!isToday"
          class="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm text-white"
          @click="date = todayStr()"
        >
          Today
        </button>
      </div>
    </header>

    <section class="rounded-xl bg-white p-4 shadow-sm border border-slate-200">
      <div class="flex justify-between text-sm">
        <span
          >Studied: <b>{{ formatMs(studiedMs) }}</b></span
        >
        <form
          v-if="editingGoal"
          class="flex items-center gap-1"
          @submit.prevent="saveGoal"
        >
          <input
            v-model="goalInput"
            type="number"
            min="1"
            class="w-20 rounded border border-slate-300 p-1 text-sm"
          />
          <span class="text-slate-500">min</span>
          <button class="rounded bg-indigo-600 px-2 py-1 text-xs text-white">
            Save
          </button>
          <button
            type="button"
            class="rounded bg-slate-100 px-2 py-1 text-xs"
            @click="editingGoal = false"
          >
            ×
          </button>
        </form>
        <button
          v-else
          class="text-slate-500 hover:text-indigo-600"
          @click="startGoalEdit"
        >
          Goal: {{ dailyGoalMin }} min ✎
        </button>
      </div>
      <div class="mt-2 h-2 w-full rounded-full bg-slate-100">
        <div
          class="h-2 rounded-full bg-emerald-500"
          :style="{ width: goalPct + '%' }"
        ></div>
      </div>
    </section>

    <section class="rounded-xl bg-white p-4 shadow-sm border border-slate-200">
      <div v-if="editingId" class="mb-2 text-sm font-medium text-indigo-600">
        Editing activity
      </div>
      <form
        class="grid grid-cols-1 gap-2 sm:grid-cols-4"
        @submit.prevent="submit"
      >
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
        <div class="flex gap-2">
          <button
            class="flex-1 rounded-lg bg-indigo-600 p-2 text-sm font-medium text-white"
          >
            {{ editingId ? "Save" : "+ Add" }}
          </button>
          <button
            v-if="editingId"
            type="button"
            class="rounded-lg bg-slate-100 px-3 text-sm"
            @click="cancelEdit"
          >
            Cancel
          </button>
        </div>
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
        @edit="onEdit(a)"
        @delete="onDelete(a)"
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
        @edit="onEdit(a)"
        @delete="onDelete(a)"
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
        @edit="onEdit(a)"
        @delete="onDelete(a)"
      />
    </section>

    <p v-if="!activities.length" class="text-center text-sm text-slate-500">
      No activities for this date. Add one above.
    </p>
  </div>
</template>