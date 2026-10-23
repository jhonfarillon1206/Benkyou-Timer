import Dexie from 'dexie'
import { sync } from './lib/timer'

export const db = new Dexie('study-tracker')

db.version(1).stores({
  activities: 'id, date, status',
  sessions: 'id, date, subject, activityId',
  settings: 'key',
})

export async function saveActivity(activity) {
  await db.activities.put(activity)
}

export async function deleteActivity(id) {
  await db.activities.delete(id)
}

// Loads a day's activities and applies sync() so any timer that
// finished while the app was closed is completed correctly.
export async function getActivitiesByDate(date) {
  const list = await db.activities.where('date').equals(date).toArray()
  const synced = list.map((a) => sync(a))
  const changed = synced.filter((a, i) => a !== list[i])
  if (changed.length) await db.activities.bulkPut(changed)
  return synced
}

export async function getRunningActivity() {
  return db.activities.where('status').equals('running').first()
}