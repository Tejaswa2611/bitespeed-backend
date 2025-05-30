import { Op } from 'sequelize';
import Contact from '../models/Contact';

interface ContactPayload {
    email?: string;
    phoneNumber?: string;
}

function dedupe(arr: (string | undefined)[]): string[] {
    return [...new Set(arr.filter(Boolean) as string[])];
}

function formatResponse(primaryId: number) {
    return {
        contact: {
            primaryContatctId: primaryId,
            emails: [],
            phoneNumbers: [],
            secondaryContactIds: []
        }
    };
}

export const reconcileContact = async ({
    email,
    phoneNumber
}: ContactPayload) => {
    const matches = await Contact.findAll({
        where: {
            deletedAt: null,
            [Op.or]: [
                ...(email ? [{ email }] : []),
                ...(phoneNumber ? [{ phoneNumber }] : [])
            ]
        },
        order: [['createdAt', 'ASC']]
    });

    if (matches.length === 0) {
        const newPrimary = await Contact.create({
            email,
            phoneNumber,
            linkPrecedence: 'primary'
        });
        return formatResponse(newPrimary.id);
    }

    const primaryIdSet = new Set<number>();
    for (const c of matches) {
        if (c.linkPrecedence === 'primary') {
            primaryIdSet.add(c.id);
        } else if (c.linkPrecedence === 'secondary' && c.linkedId) {
            primaryIdSet.add(c.linkedId);
        }
    }
    const primaryIds = Array.from(primaryIdSet);
    let finalPrimaryId: number;

    if (primaryIds.length > 1) {
        const primaries = await Contact.findAll({
            where: { id: primaryIds },
            order: [['createdAt', 'ASC']]
        });
        finalPrimaryId = primaries[0].id;

        for (const old of primaries.slice(1)) {
            await Contact.update(
                { linkPrecedence: 'secondary', linkedId: finalPrimaryId },
                {
                    where: {
                        deletedAt: null,
                        [Op.or]: [
                            { id: old.id },
                            { linkedId: old.id }
                        ]
                    }
                }
            );
        }

    } else {
        finalPrimaryId = primaryIds[0];

        const hasEmailMatch = email ? matches.some(c => c.email === email) : false;
        const hasPhoneMatch = phoneNumber ? matches.some(c => c.phoneNumber === phoneNumber) : false;
        const exactExists = matches.some(
            c => c.email === email && c.phoneNumber === phoneNumber
        );

        // create a new secondary only if there is no exact match AND exactly one of email or phone matches
        // this avoids creating a secondary contact when both email and phone match an existing primary
        if (!exactExists && (hasEmailMatch !== hasPhoneMatch)) {
            await Contact.create({
                email,
                phoneNumber,
                linkPrecedence: 'secondary',
                linkedId: finalPrimaryId
            });
        }
    }

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

    const emails = dedupe(finalCluster.map(c => c.email));
    const phoneNumbers = dedupe(finalCluster.map(c => c.phoneNumber));
    const secondaryContactIds = finalCluster
        .filter(c => c.id !== finalPrimaryId)
        .map(c => c.id);

    return {
        contact: {
            primaryContatctId: finalPrimaryId,
            emails,
            phoneNumbers,
            secondaryContactIds
        }
    };
};
