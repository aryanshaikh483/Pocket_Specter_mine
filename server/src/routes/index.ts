import { Router } from 'express';
import helloRouter from './hello.route';

const router = Router();

router.use('/hello', helloRouter);

export default router;
