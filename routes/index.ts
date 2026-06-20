import express, { type Request, type Response } from 'express'

const router = express.Router()

router.get('/', function (_req: Request, res: Response) {
  res.send('DeathBed backend is running')
})

export default router