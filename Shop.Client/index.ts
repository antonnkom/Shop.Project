import express, { Request, Response } from 'express';
import * as path from 'path';

const app = express();

app.get('/', async (req: Request, res: Response) => {
    try {
        const page = path.join(__dirname, 'page.html');
        res.sendFile(page);
    } catch (e) {
        console.log(e);
    }
});

app.listen(5000, () => {
    console.log('Server 2 listening on port 5000');
});