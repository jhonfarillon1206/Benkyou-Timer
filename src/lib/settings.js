import { ref } from 'vue'
import { db } from '../db'

export const dailyGoalMin = ref(120)

export async function loadSettings() {
  const row = await db.settings.get('dailyGoalMin')
  if (row) dailyGoalMin.value = row.value
}

export async function setDailyGoal(min) {
  const v = Math.round(Number(min))
  if (!v || v < 1) return
  dailyGoalMin.value = v
  await db.settings.put({ key: 'dailyGoalMin', value: v })
}