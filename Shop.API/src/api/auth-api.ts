import { IAuthRequisites } from '@Shared/types';
import { Router, Request, Response } from 'express';
import { connection } from '../../index';
import { throwServerError } from '../helper';
import { SELECT_USER_QUERY } from '../services/queries';
import { IUserRequisitesEntity } from '../../types';

export const authRouter = Router();

authRouter.post('/', async (req: Request<{}, {}, IAuthRequisites>, res: Response) => {
    try {
        const { username, password } = req.body;
        const [data] = await connection.query <IUserRequisitesEntity[]> (SELECT_USER_QUERY, [username, password]);

        if (!data?.length) {
            res.status(404);
        }

        res.send();
    } catch (e) {
        throwServerError(res, e);
    }
});