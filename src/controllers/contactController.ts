import { NextFunction, Request, RequestHandler, Response } from 'express';
import { reconcileContact } from '../services/contactService';

export const identifyContact: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, phoneNumber } = req.body;

        if (!email && !phoneNumber) {
            res.status(400).json({ error: 'Email or phoneNumber must be provided.' });
        }

        const result = await reconcileContact({ email, phoneNumber });

        res.status(200).json(result);
    } catch (error) {
        console.error('Error in identifyContact:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
