import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './style.css'
import { useSettingsStore } from './stores/settings'

// 正式版屏蔽 WebView 默认右键菜单；业务组件的右键菜单仍可正常处理事件。
if (import.meta.env.PROD) {
  document.addEventListener('contextmenu', (event) => event.preventDefault())
}

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// 启动时尽早加载偏好并应用外观，避免亮暗闪烁；同时恢复岛停靠位置
const settings = useSettingsStore(pinia)
await settings.load()

app.mount('#app')
