import axios from 'axios';
import { IProduct, IProductFilterPayload } from '@Shared/types';
import { IProductEditData } from '../types';

const host = `http://${process.env.LOCAL_HOST}:${process.env.LOCAL_PORT}/${process.env.API_PATH}`;

export const getProducts = async (): Promise<IProduct[]> => {
    const { data } = await axios.get <IProduct[]> (`${host}/products`);
    return data || [];
};

export const searchProducts = async (filter: IProductFilterPayload): Promise<IProduct[]> => {
    const { data } = await axios.get <IProduct[]> (
        `${host}/products/search`,
        { params: filter }
    );
    return data || [];
};

export const getProduct = async (id: string): Promise<IProduct | null> => {
    try {
        const { data } = await axios.get <IProduct> (`${host}/products/${id}`);
        return data;
    } catch (e) {
        return null;
    }
};

export const removeProduct = async (id: string): Promise<void> => {
    await axios.delete(`${host}/products/${id}`);
};

const splitNewImages = (str = ''): string[] => {
    return str
      .split(/\r\n|,/g)
      .map(url => url.trim())
      .filter(url => url);
};

const compileIdsToRemove = (data: string | string[]): string[] => {
    if (typeof data === 'string') { return [data] };
    return data;
};

export const updateProduct = async (productId: string, formData: IProductEditData): Promise<void> => {
    try {
        const { data: currentProduct } = await axios.get <IProduct> (`${host}/products/${productId}`);

        if (formData.commentsToRemove) {
            const commentsIdsToRemove = compileIdsToRemove(formData.commentsToRemove);

            const getDeleteCommentActions = () => commentsIdsToRemove.map(commentId => {
                return axios.delete(`${host}/comments/${commentId}`);
            });

            await Promise.all(getDeleteCommentActions());
        }

        if (formData.imagesToRemove) {
            const imagesIdsToRemove = compileIdsToRemove(formData.imagesToRemove);
            await axios.post(`${host}/products/remove-images`, imagesIdsToRemove);
        }

        if (formData.newImages) {
            const urls = splitNewImages(formData.newImages);
            const images = urls.map(url => ({ url, main: false }));

            if (!currentProduct.thumbnail) {
                images[0].main = true;
            }

            await axios.post(`${host}/products/add-images`, { productId, images });
        }

        if (formData.mainImage && formData.mainImage !== currentProduct?.thumbnail?.id) {
            await axios.post(`${host}/products/update-thumbnail/${productId}`, {
                newThumbnailId: formData.mainImage
            });
        }

        await axios.patch(`${host}/products/${productId}`, {
            title: formData.title,
            description: formData.description,
            price: Number(formData.price)
        });
    } catch (e) {
        console.log(e);
    }
};