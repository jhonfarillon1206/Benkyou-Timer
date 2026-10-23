<script setup>
import { computed } from "vue";
import { getRemainingMs, formatMs, STATUS } from "../lib/timer";

const props = defineProps({ activity: Object, now: Number });
defineEmits(["start", "pause", "stop", "reset", "edit", "delete"]);

const remaining = computed(() => getRemainingMs(props.activity, props.now));
const progress = computed(
  () => 100 - (remaining.value / props.activity.targetMs) * 100
);

const badge = {
  [STATUS.IDLE]: ["NOT STARTED", "bg-slate-100 text-slate-600"],
  [STATUS.RUNNING]: ["RUNNING", "bg-green-100 text-green-700"],
  [STATUS.PAUSED]: ["PAUSED", "bg-amber-100 text-amber-700"],
  [STATUS.COMPLETED]: ["COMPLETED", "bg-blue-100 text-blue-700"],
  [STATUS.STOPPED]: ["STOPPED EARLY", "bg-rose-100 text-rose-700"],
};
</script>

<template>
  <div class="rounded-xl bg-white p-4 shadow-sm border border-slate-200">
    <div class="flex items-start justify-between gap-2">
      <div>
        <div class="font-semibold">{{ activity.title }}</div>
        <div class="text-sm text-slate-500">
          {{ activity.subject }} ·
          {{ Math.round(activity.targetMs / 60000) }} min
          <span v-if="activity.pauseCount">
            · paused {{ activity.pauseCount }}×</span
          >
        </div>
      </div>
      <span
        class="rounded-full px-2 py-0.5 text-xs font-medium"
        :class="badge[activity.status][1]"
      >
        {{ badge[activity.status][0] }}
      </span>
    </div>

    <div class="mt-3 text-4xl font-mono font-bold tabular-nums">
      {{ formatMs(remaining) }}
    </div>

    <div class="mt-2 h-2 w-full rounded-full bg-slate-100">
      <div
        class="h-2 rounded-full bg-indigo-500"
        :style="{ width: progress + '%' }"
      ></div>
    </div>

    <div class="mt-3 flex flex-wrap gap-2">
      <button
        v-if="activity.status === 'idle'"
        class="btn bg-indigo-600 text-white"
        @click="$emit('start')"
      >
        Start
      </button>
      <button
        v-if="activity.status === 'paused'"
        class="btn bg-indigo-600 text-white"
        @click="$emit('start')"
      >
        Resume
      </button>
      <button
        v-if="activity.status === 'running'"
        class="btn bg-amber-500 text-white"
        @click="$emit('pause')"
      >
        Pause
      </button>
      <button
        v-if="activity.status === 'running' || activity.status === 'paused'"
        class="btn bg-rose-100 text-rose-700"
        @click="$emit('stop')"
      >
        Stop
      </button>
      <button
        v-if="['paused', 'completed', 'stopped'].includes(activity.status)"
        class="btn bg-slate-100 text-slate-700"
        @click="$emit('reset')"
      >
        Reset
      </button>
      <button
        v-if="activity.status === 'idle'"
        class="btn bg-slate-100 text-slate-700"
        @click="$emit('edit')"
      >
        Edit
      </button>
      <button class="btn bg-slate-100 text-rose-600" @click="$emit('delete')">
        Delete
      </button>
    </div>
  </div>
</template>

<style scoped>
.btn {
  border-radius: 0.5rem;
  padding: 0.4rem 0.9rem;
  font-size: 0.875rem;
  font-weight: 500;
}
</style>