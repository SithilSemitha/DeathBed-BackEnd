import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import path from 'path'
import cookieParser from 'cookie-parser'
import logger from 'morgan'
import indexRouter from './routes/index'
import usersRouter from './routes/users'

const app = express()

app.use(logger('dev'))
app.use(express.json())
app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  }),
)
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(express.static(path.join(process.cwd(), 'public')))

app.use('/', indexRouter)
app.use('/users', usersRouter)

const port = Number(process.env.PORT || 4000)

app.listen(port, () => {
  console.log(`DeathBed backend running on port ${port}`)
})

export default app