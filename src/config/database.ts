import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();
let sequelize: Sequelize;

// Render provides DATABASE_URL, but we also support DB_URL for flexibility
const databaseUrl = process.env.DATABASE_URL || process.env.DB_URL;

if (databaseUrl) {
    sequelize = new Sequelize(databaseUrl, {
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false // For Render PostgreSQL
            }
        },
        logging: false
    });
} else {
    sequelize = new Sequelize(
        process.env.DB_NAME as string,
        process.env.DB_USER as string,
        process.env.DB_PASSWORD,
        {
            host: process.env.DB_HOST,
            dialect: 'postgres',
            port: Number(process.env.DB_PORT),
            logging: false,
            dialectOptions: {
                ssl: process.env.NODE_ENV === 'production' ? {
                    require: true,
                    rejectUnauthorized: false
                } : false
            }
        }
    );
}
// const sequelize = new Sequelize(
//     process.env.DB_NAME as string,
//     process.env.DB_USER as string,
//     process.env.DB_PASSWORD,
//     {
//         host: process.env.DB_HOST,
//         dialect: 'postgres',
//         port: Number(process.env.DB_PORT),
//         logging: false,
//     }
// );

export default sequelize;


