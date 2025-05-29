import express from 'express';
import { identifyContact } from '../controllers/contactController';

const router = express.Router();
router.post('/', identifyContact);
export default router;
