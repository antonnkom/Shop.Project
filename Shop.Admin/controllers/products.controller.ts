import { Router, Request, Response } from 'express';
import { getProducts } from '../models/products.model';

export const productsRouter = Router();
    
const throwServerError = (res: Response, e: Error) => {
    console.debug(e.message);
    res.status(500);
    res.send('Something went wrong');
}
    
productsRouter.get('/', async (req: Request, res: Response) => {
    try {
        const products = await getProducts();
        res.render('products', { items: products });
    } catch (e) {
        throwServerError(res, e);
    }
});