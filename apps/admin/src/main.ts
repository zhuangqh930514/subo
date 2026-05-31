import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import 'element-plus/dist/index.css'
import App from './App.vue'
import { setupAuthNavigation } from './auth/session'
import router from './router'
import './styles.css'

const app = createApp(App)

setupAuthNavigation(router)
app.use(router)
app.use(ElementPlus, {
  locale: zhCn,
  size: 'default',
})

app.mount('#app')
