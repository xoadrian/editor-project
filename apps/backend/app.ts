import express from 'express'
import cors from 'cors'
import expressWs from 'express-ws'

import apiRoutes from './routes'

const app = express()
const PORT = 3001
const appWs = expressWs(app)

app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cors())

app.use('/api', apiRoutes)
app.set('wss', appWs.getWss())

app.listen(PORT, () => {
  console.log(`⚡️[server]: Server is running at https://localhost:${PORT}`);
})


