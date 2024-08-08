import axios from 'axios';
import { IProduct } from '@Shared/types';

const host = `http://${process.env.LOCAL_HOST}:${process.env.LOCAL_PORT}/${process.env.API_PATH}`;

export const getProducts = async () => {
    const { data } = await axios.get <IProduct[]> (`${host}/products`);
    return data || [];
};