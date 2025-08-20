import { NextFunction, Request, RequestHandler, Response } from 'express';
import { reconcileContact } from '../services/contactService';

export const identifyContact: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, phoneNumber } = req.body;

        // Validate input
        if (!email && !phoneNumber) {
            res.status(400).json({ 
                error: 'At least one of email or phoneNumber must be provided.' 
            });
            return;
        }

        // Basic email validation if provided
        if (email && typeof email !== 'string') {
            res.status(400).json({ 
                error: 'Email must be a string.' 
            });
            return;
        }

        // Basic phone number validation if provided
        if (phoneNumber && typeof phoneNumber !== 'string') {
            res.status(400).json({ 
                error: 'Phone number must be a string.' 
            });
            return;
        }

        const result = await reconcileContact({ email, phoneNumber });
        res.status(200).json(result);
        
    } catch (error) {
        console.error('Error in identifyContact:', error);
        res.status(500).json({ 
            error: 'Internal Server Error' 
        });
    }
};
