import express from 'express';
import dotenv from 'dotenv';
import sequelize from './config/database';
import contactRoutes from './routes/contactRoutes';

dotenv.config();
const app = express();
app.use(express.json());

app.use('/identify', contactRoutes);

const PORT = process.env.PORT || 8000;

sequelize.sync().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
});
