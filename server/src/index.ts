import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import router from './routes/index';
import { pino } from 'pino';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const logger = pino({ transport: { target: 'pino-pretty' } });

app.use(cors());
app.use(express.json());
app.use('/api', router);

app.listen(PORT, () => {
  logger.info(`Server running at http://localhost:${PORT}`);
});
