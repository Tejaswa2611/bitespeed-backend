import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();
let sequelize: Sequelize;

if (process.env.DB_URL) {
    sequelize = new Sequelize(process.env.DB_URL);
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


