import { Request, Response } from 'express';
import { reconcileContact } from '../services/contactService';

export const identifyContact = async (req: Request, res: Response) => {
    try {
        const { email, phoneNumber } = req.body;

        if (!email && !phoneNumber) {
            return res.status(400).json({ error: 'Email or phoneNumber must be provided.' });
        }

        const result = await reconcileContact({ email, phoneNumber });

        return res.status(200).json(result);
    } catch (error) {
        console.error('Error in identifyContact:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};
