require('dotenv').config();
import { Express } from 'express';
import { Connection } from 'mysql2/promise';
import { initDataBase } from './Server/services/db';
import { initServer } from './Server/services/server';
import ShopAPI from './Shop.API/index';
import ShopAdmin from './Shop.Admin';

export let server: Express;
export let connection: Connection | null;

const initRouter = () => {
    const shopApi = ShopAPI(connection);
    server.use('/api', shopApi);

    const shopAdmin = ShopAdmin();
    server.use('/admin', shopAdmin);

    server.use('/', (_, res) => {
        res.send("React App");
    });
};

const launchApplication = async () => {
    server = initServer();
    connection = await initDataBase();

    initRouter();
};

launchApplication();