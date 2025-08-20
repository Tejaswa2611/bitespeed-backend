import { Op } from 'sequelize';
import Contact from '../models/Contact';

interface ContactPayload {
    email?: string;
    phoneNumber?: string;
}

interface ContactResponse {
    contact: {
        primaryContactId: number;
        emails: string[];
        phoneNumbers: string[];
        secondaryContactIds: number[];
    };
}

function dedupe(arr: (string | undefined)[]): string[] {
    return [...new Set(arr.filter(Boolean) as string[])];
}

function createContactResponse(
    primaryContactId: number,
    emails: string[],
    phoneNumbers: string[],
    secondaryContactIds: number[]
): ContactResponse {
    return {
        contact: {
            primaryContactId,
            emails,
            phoneNumbers,
            secondaryContactIds
        }
    };
}

async function findMatchingContacts(email?: string, phoneNumber?: string) {
    return Contact.findAll({
        where: {
            deletedAt: null,
            [Op.or]: [
                ...(email ? [{ email }] : []),
                ...(phoneNumber ? [{ phoneNumber }] : [])
            ]
        },
        order: [['createdAt', 'ASC']]
    });
}

function extractPrimaryIds(matches: Contact[]): number[] {
    const primaryIdSet = new Set<number>();
    for (const contact of matches) {
        if (contact.linkPrecedence === 'primary') {
            primaryIdSet.add(contact.id);
        } else if (contact.linkPrecedence === 'secondary' && contact.linkedId) {
            primaryIdSet.add(contact.linkedId);
        }
    }
    return Array.from(primaryIdSet);
}

async function convertPrimariesToSecondary(primaryIds: number[], finalPrimaryId: number) {
    const primaries = await Contact.findAll({
        where: { id: primaryIds },
        order: [['createdAt', 'ASC']]
    });
    
    // Convert all except the oldest primary to secondary
    for (const oldPrimary of primaries.slice(1)) {
        await Contact.update(
            { linkPrecedence: 'secondary', linkedId: finalPrimaryId },
            {
                where: {
                    deletedAt: null,
                    [Op.or]: [
                        { id: oldPrimary.id },
                        { linkedId: oldPrimary.id }
                    ]
                }
            }
        );
    }
}

export const reconcileContact = async ({
    email,
    phoneNumber
}: ContactPayload): Promise<ContactResponse> => {
    // Find all existing contacts matching email or phone
    const matches = await findMatchingContacts(email, phoneNumber);

    // Case 1: No existing contacts - create new primary
    if (matches.length === 0) {
        const newPrimary = await Contact.create({
            email,
            phoneNumber,
            linkPrecedence: 'primary'
        });
        
        return createContactResponse(
            newPrimary.id,
            email ? [email] : [],
            phoneNumber ? [phoneNumber] : [],
            []
        );
    }

    // Case 2: Existing contacts found - determine primary contact
    const primaryIds = extractPrimaryIds(matches);
    let finalPrimaryId: number;

    if (primaryIds.length > 1) {
        // Multiple primaries found - merge them (oldest wins)
        finalPrimaryId = primaryIds[0]; // Already sorted by createdAt ASC
        await convertPrimariesToSecondary(primaryIds, finalPrimaryId);
    } else {
        // Single primary found - check if we need to create secondary
        finalPrimaryId = primaryIds[0];
        
        const exactExists = matches.some(
            contact => contact.email === email && contact.phoneNumber === phoneNumber
        );
        
        // Create secondary contact if not exact duplicate and has new information
        if (!exactExists) {
            const hasEmailMatch = email ? matches.some(c => c.email === email) : false;
            const hasPhoneMatch = phoneNumber ? matches.some(c => c.phoneNumber === phoneNumber) : false;
            
            // Create secondary if exactly one of email or phone matches (new information)
            if (hasEmailMatch !== hasPhoneMatch) {
                await Contact.create({
                    email,
                    phoneNumber,
                    linkPrecedence: 'secondary',
                    linkedId: finalPrimaryId
                });
            }
        }
    }

    // Get final consolidated contact cluster
    const finalCluster = await Contact.findAll({
        where: {
            deletedAt: null,
            [Op.or]: [
                { id: finalPrimaryId },
                { linkedId: finalPrimaryId }
            ]
        },
        order: [['createdAt', 'ASC']]
    });

    // Build response
    const emails = dedupe(finalCluster.map(c => c.email));
    const phoneNumbers = dedupe(finalCluster.map(c => c.phoneNumber));
    const secondaryContactIds = finalCluster
        .filter(c => c.id !== finalPrimaryId)
        .map(c => c.id);

    return createContactResponse(finalPrimaryId, emails, phoneNumbers, secondaryContactIds);
};
