import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import { loadSettings } from './lib/settings'

loadSettings().finally(() => {
  createApp(App).use(router).mount('#app')
})