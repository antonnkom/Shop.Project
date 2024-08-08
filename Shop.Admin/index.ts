import express, { Express } from 'express';

export default function (): Express
{
    const app = express();
    app.use(express.json());

    app.use('/', (_, res) => {
        res.send('Admin panel');
    });

    return app;
}