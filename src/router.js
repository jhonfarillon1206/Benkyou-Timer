import { createRouter, createWebHashHistory } from 'vue-router'
import TodayView from './components/TodayView.vue'
import HistoryView from './components/HistoryView.vue'

export default createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: TodayView },
    { path: '/history', component: HistoryView },
  ],
})