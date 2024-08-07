import { 
    CommentValidator,
    CommentCreatePayload,
    ICommentEntity,
    IProductSearchFilter,
    IProductImageEntity
} from '../types';
import { IProduct, IComment, IProductImage } from '@Shared/types';
import { mapCommentEntity, mapImageEntity } from './services/mapping';

export const validateComment = (comment: CommentCreatePayload): CommentValidator => {
    if (Object.keys(comment).length === 0) {
        return 'Comment is absent or empty';
    }

    const fields = ['email', 'body', 'name', 'productId'];
    for (const field of fields) {
        if (!comment[field]) {
            return `Field ${field} is absent`;
        }
    } 

    return null;
};

export const enhanceProductsComments = (products: IProduct[], commentRows: ICommentEntity[]): IProduct[] => {
    const commentsByProductId = new Map <string, IComment[]> ();

    for (let commentEntity of commentRows) {
        const comment = mapCommentEntity(commentEntity);
        if (!commentsByProductId.has(comment.productId)) {
            commentsByProductId.set(comment.productId, []);
        }

        const list = commentsByProductId.get(comment.productId);
        commentsByProductId.set(comment.productId, [...list, comment]);
    }

    for (let product of products) {
        if (commentsByProductId.has(product.id)) {
            product.comments = commentsByProductId.get(product.id);
        }
    }

    return products;
};

export const getProductsFilterQuery = (filter: IProductSearchFilter): [string, string[]] => {
    const { title, description, priceFrom, priceTo } = filter;

    let query = 'SELECT * FROM products WHERE ';
    const values = []

    if (title) {
        query += 'title LIKE ? ';
        values.push(`%${title}%`);
    }

    if (description) {
        if (values.length) {
            query += " OR ";
        }

        query += 'description LIKE ? ';
        values.push(`%${description}%`);
    }

    if (priceFrom || priceTo) {
        if (values.length) {
            query += ' OR ';
        }

        query += `(price > ? AND price < ?)`;
        values.push(priceFrom || 0);
        values.push(priceTo || 999999);
    }

    return [query, values];
};

export const enhanceProductsImages = (products: IProduct[], imageRows: IProductImageEntity[]): IProduct[] => {
    const imagesByProductId = new Map<string, IProductImage[]>();
    const thumbnailsByProductId = new Map<string, IProductImage>();
  
    for (let imageEntity of imageRows) {
        const image = mapImageEntity(imageEntity);

        if (!imagesByProductId.has(image.productId)) {
            imagesByProductId.set(image.productId, []);
        }

        const list = imagesByProductId.get(image.productId);
        imagesByProductId.set(image.productId, [...list, image]);

        if (image.main) {
            thumbnailsByProductId.set(image.productId, image);
        }
    }

    for (let product of products) {
        product.thumbnail = thumbnailsByProductId.get(product.id);

        if (imagesByProductId.has(product.id)) {
            product.images = imagesByProductId.get(product.id);

            if (!product.thumbnail) {
                product.thumbnail = product.images[0];
            }
        }
    }
  
    return products;
  }
