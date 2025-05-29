import { Op } from 'sequelize';
import Contact from '../models/Contact';

interface ContactPayload {
    email?: string;
    phoneNumber?: string;
}

export const reconcileContact = async ({ email, phoneNumber }: ContactPayload) => {
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
    matches.forEach(contact => {
        if (contact.linkPrecedence === 'primary') {
            primaryIdSet.add(contact.id);
        } else if (contact.linkPrecedence === 'secondary' && contact.linkedId) {
            primaryIdSet.add(contact.linkedId);
        }
    });
    const primaryIds = Array.from(primaryIdSet);

    let finalPrimaryId: number;

    if (primaryIds.length > 1) {
        const primaries = await Contact.findAll({
            where: { id: primaryIds },
            order: [['createdAt', 'ASC']]
        });
        const root = primaries[0];
        finalPrimaryId = root.id;

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

        const cluster = await Contact.findAll({
            where: {
                deletedAt: null,
                [Op.or]: [
                    { id: finalPrimaryId },
                    { linkedId: finalPrimaryId }
                ]
            }
        });

        const exactExists = cluster.some(
            c => c.email === email && c.phoneNumber === phoneNumber
        );

        if (!exactExists && matches.length === 1) {
            const newSecondary = await Contact.create({
                email,
                phoneNumber,
                linkPrecedence: 'secondary',
                linkedId: finalPrimaryId
            });
            cluster.push(newSecondary);
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

function dedupe(arr: (string | undefined)[]) {
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
