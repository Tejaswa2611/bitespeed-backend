import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface ContactAttributes {
    id: number;
    phoneNumber?: string;
    email?: string;
    linkedId?: number;
    linkPrecedence: 'primary' | 'secondary';
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date | null;
}

type ContactCreationAttributes = Optional<ContactAttributes, 'id'>;

class Contact extends Model<ContactAttributes, ContactCreationAttributes> implements ContactAttributes {
    public id!: number;
    public phoneNumber?: string;
    public email?: string;
    public linkedId?: number;
    public linkPrecedence!: 'primary' | 'secondary';
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
    public deletedAt?: Date | null;
}

Contact.init(
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        phoneNumber: {
            type: DataTypes.STRING,
            allowNull: true
        },
        email: {
            type: DataTypes.STRING,
            allowNull: true
        },
        linkedId: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        linkPrecedence: {
            type: DataTypes.ENUM('primary', 'secondary'),
            allowNull: false
        },
        deletedAt: {
            type: DataTypes.DATE,
            allowNull: true
        }
    },
    {
        sequelize,
        tableName: 'contacts',
        timestamps: true,
        paranoid: true
    }
);

export default Contact;
