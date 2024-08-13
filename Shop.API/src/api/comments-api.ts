import { Request, Response, Router } from 'express';
import { CommentCreatePayload, ICommentEntity, IProductEntity } from '../../types';
import { IComment } from '@Shared/types';
import { validateComment } from '../helper';
import { connection } from '../../index';
import { mapCommentsEntity } from '../services/mapping';
import { v4 as uuidv4 } from 'uuid';
import { OkPacket } from "mysql2";
import {
    SELECT_COMMENT_BY_ID_QUERY,
    COMMENT_DUPLICATE_QUERY,
    INSERT_COMMENT_QUERY,
    DELETE_COMMENT_QUERY,
    SELECT_PRODUCT_BY_ID_QUERY
} from "../services/queries";
import { param, validationResult } from 'express-validator';

export const commentsRouter = Router();

const throwServerError = (res: Response, e: Error) => {
    console.debug(e.message);
    res.status(500);
    res.send('Something went wrong');
};

commentsRouter.get('/', async (req: Request, res: Response) => {
    try {
        const [comments] = await connection.query<ICommentEntity[]>(
            'SELECT * FROM comments'
        );
        res.setHeader('Content-Type', 'aplication/json');
        res.send(mapCommentsEntity(comments));
        return;
    } catch (e) {
        throwServerError(res, e);
        return;
    }
});

// search comment by id, task 28.5.1
commentsRouter.get(
    '/:id',
    [
        param('id').isUUID().withMessage('Comment id is not UUID')
    ],
    async (req: Request<{ id: string }>, res: Response
) => {
    const id = req.params.id;

    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400);
            res.json({ errors: errors.array() });
            return;
        }

        const [comments] = await connection.query<ICommentEntity[]>(SELECT_COMMENT_BY_ID_QUERY, id);
        res.setHeader('Content-Type', 'aplication/json');
        
        if (comments.length === 0) {
            res.status(404);
            res.send(`Comment with id ${id} is not found`);
            return;
        } 

        console.log(comments.length);
        res.send(mapCommentsEntity(comments));
        return;
    } catch (e) {
        throwServerError(res, e);
        return;
    }
});

commentsRouter.post('/', async (req: Request<{}, {}, CommentCreatePayload>, res: Response) => {
    const validationResult = validateComment(req.body);
    console.log(validationResult);

    if (validationResult) {
        res.status(400);
        res.send(validationResult);
        return;
    }

    try {
        const { name, email, body, productId } = req.body;

        const [product] = await connection.query <IProductEntity[]> (SELECT_PRODUCT_BY_ID_QUERY, [productId]);

        if (!product.length) {
            res.status(404);
            res.send(`Product with id ${productId} is not found`);
            return;
        }

        const [sameResult] = await connection.query<ICommentEntity[]>(
            COMMENT_DUPLICATE_QUERY,
            [email.toLowerCase(), name.toLowerCase(), body.toLowerCase(), productId]
        );

        if (sameResult.length) {
            res.status(422);
            res.send('Comment with the same fields already exists');
            return;
        }

        const id = uuidv4();
        await connection.query<OkPacket>(INSERT_COMMENT_QUERY, [id, email, name, body, productId]);

        res.status(201);
        res.send(`Comment id:${id} has been added!`);
        return;
    } catch (e) {
        throwServerError(res, e);
        return;
    }
});

commentsRouter.patch('/', async (req: Request<{}, {}, Partial<IComment>>, res: Response) => {
    try {
        let updateQuery = 'UPDATE comments SET ';

        const valuesToUpdate = [];
        ['name', 'body', 'email'].forEach(fieldName => {
            if (req.body.hasOwnProperty(fieldName)) {
                if (valuesToUpdate.length) {
                    updateQuery += ', ';
                }

                updateQuery += `${fieldName} = ?`;
                valuesToUpdate.push(req.body[fieldName]);
            }
        });

        updateQuery += ' WHERE comment_id = ?';
        valuesToUpdate.push(req.body.id);

        const [info] = await connection.query <OkPacket>(updateQuery, valuesToUpdate);

        if (info.affectedRows === 1) {
            res.status(200);
            res.end();
            return;
        }

        const newComment = req.body as CommentCreatePayload;
        const validationResult = validateComment(newComment);

        if (validationResult) {
            res.status(400);
            res.send(validationResult);
            return;
        }

        const id = uuidv4();
        await connection.query <OkPacket> (
            INSERT_COMMENT_QUERY,
            [id, newComment.email, newComment.name, newComment.body, newComment.productId]
        );

        res.status(201);
        res.send({ ...newComment, id });
        return;
    } catch (e) {
        throwServerError(res, e);
        return;
    }
});

commentsRouter.delete('/:id', async (req: Request<{id: string}>, res: Response) => {
    const id = req.params.id;

    try {
        const [comment] = await connection.query<ICommentEntity[]>(SELECT_COMMENT_BY_ID_QUERY, id);
        res.setHeader('Content-Type', 'aplication/json');
        if (!comment.length) {
            res.status(404);
            res.send(`Comment with id ${id} is not found`);
            return;
        }

        const query = await connection.query<ICommentEntity[]>(DELETE_COMMENT_QUERY, id);
        if (query) {
            res.send(`Comment with id ${id} deleted`);
            return;
        }
    } catch (e) {
        throwServerError(res, e);
        return;
    }
});
