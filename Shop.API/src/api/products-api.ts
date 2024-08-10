import { Request, Response, Router } from "express";
import {
    IProductEntity,
    ICommentEntity,
    IProductSearchFilter,
    IProductImageEntity,
    ProductAddImagesPayload,
    ImagesRemovePayload,
    ProductCreatePayload
} from '../../types';
import { connection } from '../../index';
import { mapProductsEntity, mapCommentsEntity, mapImagesEntity } from '../services/mapping';
import { enhanceProductsComments, enhanceProductsImages, getProductsFilterQuery } from "../helper";
import { v4 as uuidv4 } from 'uuid';
import { OkPacket } from "mysql2";
import {
    INSERT_PRODUCT_QUERY,
    SELECT_PRODUCT_BY_ID_QUERY,
    SELECT_COMMENT_BY_PRODUCT_ID_QUERY,
    SELECT_IMAGE_BY_PRODUCT_ID_QUERY,
    INSERT_PRODUCT_IMAGES_QUERY,
    DELETE_IMAGES_BY_PRODUCT_ID_QUERY,
    DELETE_COMMENT_BY_PRODUCT_ID_QUERY,
    DELETE_PRODUCT_QUERY,
    DELETE_IMAGES_QUERY,
    UPDATE_PRODUCT_FIELDS,
    SELECT_IMAGE_MAIN_BY_PRODUCT_ID_QUERY,
    SELECT_IMAGE_BY_ID_AND_PRODUCT_ID_QUERY,
    REPLACE_PRODUCT_THUMBNAIL
} from '../services/queries';
import { IProduct } from "@Shared/types";

export const productsRouter = Router();

const throwServerError = (res: Response, e: Error) => {
    console.debug(e.message);
    res.status(500);
    res.send('Something went wrong');
};

productsRouter.get('/', async (req: Request, res: Response) => {
    try {
        const [productRows] = await connection.query <IProductEntity[]> ('SELECT * FROM products');
        const [commentRows] = await connection.query < ICommentEntity[] > ('SELECT * FROM comments');
        const [imageRows] = await connection.query <IProductImageEntity[]> ('SELECT * FROM images');
    
        const products = mapProductsEntity(productRows);
        const productsWithComments = enhanceProductsComments(products, commentRows);
        const productsWithImages = enhanceProductsImages(productsWithComments, imageRows);
    
        res.send(productsWithImages);
        return;
    } catch (e) {
        throwServerError(res, e);
        return;
    }
});

productsRouter.get('/search', async (req: Request<{}, {}, {}, IProductSearchFilter>, res: Response) => {
    try {
        const [query, values] = getProductsFilterQuery(req.query);
        const [rows] = await connection.query <IProductEntity[]> (query, values);

        if (!rows?.length) {
            res.status(404);
            res.send(`Products are not found`);
            return;
        }

        const [commentRows] = await connection.query <ICommentEntity[]> ('SELECT * FROM comments');
        const [imageRows] = await connection.query <IProductImageEntity[]> ('SELECT * FROM images');

        const products = mapProductsEntity(rows);
        const productsWithComments = enhanceProductsComments(products, commentRows);
        const productsWithImages = enhanceProductsImages(productsWithComments, imageRows);

        res.send(productsWithImages);
        return;
    } catch (e) {
        throwServerError(res, e);
        return;
    }
});   

productsRouter.get('/:id', async (req: Request<{ id: string }>, res: Response) => {
    try {
        const [rows] = await connection.query <IProductEntity[]> (SELECT_PRODUCT_BY_ID_QUERY, [req.params.id]);

        if (!rows?.[0]) {
            res.status(404);
            res.send(`Product with id ${req.params.id} is not found`);
            return;
        }

        const [comments] = await connection.query <ICommentEntity[]> (SELECT_COMMENT_BY_PRODUCT_ID_QUERY, [req.params.id]);
        const [images] = await connection.query <IProductImageEntity[]> (SELECT_IMAGE_BY_PRODUCT_ID_QUERY, [req.params.id]);

        const product = mapProductsEntity(rows)[0];

        if (comments.length) {
            product.comments = mapCommentsEntity(comments);
        }

        if (images.length) {
            product.images = mapImagesEntity(images);
            product.thumbnail = product.images.find(image => image.main) || product.images[0];
        }

        res.send(product);
        return;
    } catch (e) {
        throwServerError(res, e);
    }
});

productsRouter.post('/', async (req: Request<{}, {}, ProductCreatePayload>, res: Response) => {
    try {
        const { title, description, price, images } = req.body;
        const productId = uuidv4();
        await connection.query <OkPacket> (
            INSERT_PRODUCT_QUERY,
            [productId, title || null, description || null, price || null]
        );

        if (images) {
            const values = images.map((image) => [uuidv4(), image.url, productId, image.main]);
            await connection.query<OkPacket>(INSERT_PRODUCT_IMAGES_QUERY, [values]);
        }

        res.status(201);
        res.send(`Product id:${productId} has been added!`);
        return;
    } catch (e) {
        throwServerError(res, e);
        return;
    }
});

productsRouter.delete('/:id', async (req: Request<{ id: string }>, res: Response) => {
    try {
        const productId = req.params.id;
        const [rows] = await connection.query<IProductEntity[]>(SELECT_PRODUCT_BY_ID_QUERY, productId);

        if (!rows?.[0]) {
            res.status(404);
            res.send(`Product with id ${req.params.id} is not found`);
            return;
        }

        await connection.query<OkPacket>(DELETE_IMAGES_BY_PRODUCT_ID_QUERY, productId);
        await connection.query<OkPacket>(DELETE_COMMENT_BY_PRODUCT_ID_QUERY, productId);
        await connection.query<OkPacket>(DELETE_PRODUCT_QUERY, productId);
      

        res.status(200);
        res.end();
        return;
    } catch (e) {
        throwServerError(res, e);
        return;
    }
});

productsRouter.post('/add-images', async (req: Request<{}, {}, ProductAddImagesPayload>, res: Response) => {
    try {
        const { productId, images } = req.body;

        if (!images?.length) {
            res.status(400);
            res.send('Images array is empty');
            return;
        }
      
        const values = images.map((image) => [uuidv4(), image.url, productId, image.main]);
        await connection.query<OkPacket>(INSERT_PRODUCT_IMAGES_QUERY, [values]);
    
        res.status(201);
        res.send(`Images for a product id:${productId} have been added!`);
        return;
    } catch(e) {
        throwServerError(res, e);
        return;
    }
});

productsRouter.post('/remove-images', async (req: Request<{}, {}, ImagesRemovePayload>, res: Response) => {
    try {
        const imagesToRemove = req.body;

        if (!imagesToRemove?.length) {
            res.status(400);
            res.send('Images array is empty');
            return;
        }

        const [info] = await connection.query<OkPacket>(DELETE_IMAGES_QUERY, [[imagesToRemove]]);

        if (info.affectedRows === 0) {
            res.status(404);
            res.send('No one image has been removed');
            return;
        }

        res.status(200);
        res.send('Images have been removed!');
        return;
    } catch(e) {
        throwServerError(res, e);
        return;
    }
});

productsRouter.post('/update-thumbnail/:id', async (
    req: Request<{ id: string }, {}, { newThumbnailId: string }>,
    res: Response
) => {
    try {
        const [currentThumbnailRows] = await connection.query<IProductImageEntity[]>(
            SELECT_IMAGE_MAIN_BY_PRODUCT_ID_QUERY,
            [req.params.id, 1]
        );

        if (!currentThumbnailRows?.length || currentThumbnailRows.length > 1) {
            res.status(400);
            res.send('Incorrect product id');
            return;
        }

        const [newThumbnailRows] = await connection.query<IProductImageEntity[]>(
            SELECT_IMAGE_BY_ID_AND_PRODUCT_ID_QUERY,
            [req.params.id, req.body.newThumbnailId]
        );

        if (newThumbnailRows?.length !== 1) {
            res.status(400);
            res.send('Incorrect new thumbnail id');
            return;
        }

        const currentThumbnailId = currentThumbnailRows[0].image_id;
        const [info] = await connection.query<OkPacket>(
            REPLACE_PRODUCT_THUMBNAIL,
            [currentThumbnailId, req.body.newThumbnailId, currentThumbnailId, req.body.newThumbnailId]
        );

        if (info.affectedRows === 0) {
            res.status(404);
            res.send('No one image has been updated');
            return;
        }

        res.status(200);
        res.send('New product thumbnail has been set!');
    } catch (e) {
        throwServerError(res, e);
    }
});

productsRouter.patch('/:id', async (req: Request<{ id: string }, {}, ProductCreatePayload>, res: Response) => {
    try {
        const { id } = req.params;
        const [rows] = await connection.query<IProductEntity[]>(SELECT_PRODUCT_BY_ID_QUERY, [id]);

        if (!rows?.[0]) {
            res.status(404);
            res.send(`Product with id ${id} is not found`);
            return;
        }

        const currentProduct = rows[0];

        await connection.query<OkPacket>(
            UPDATE_PRODUCT_FIELDS,
            [
                req.body.hasOwnProperty('title') ? req.body.title : currentProduct.title,
                req.body.hasOwnProperty('description') ? req.body.description : currentProduct.description,
                req.body.hasOwnProperty('price') ? req.body.price : currentProduct.price,
                id
            ]
        );

        res.status(200);
        res.send(`Product id:${id} has been added!`);
    } catch (e) {
        throwServerError(res, e);
    }
});
