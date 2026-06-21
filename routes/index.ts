import express from 'express';
const router = express.Router();

router.get('/', function (req, res) {
  res.json({ message: 'DeathBed backend is running' });
});

export default router;