export const SELECT_COMMENT_BY_ID_QUERY = `
    SELECT * FROM comments WHERE comment_id = ?
`;

export const COMMENT_DUPLICATE_QUERY = `
    SELECT * FROM comments c
    WHERE LOWER(c.email) = ?
    AND LOWER(c.name) = ?
    AND LOWER(c.body) = ?
    AND c.product_id = ?
`;

export const INSERT_COMMENT_QUERY = `
    INSERT INTO comments
    (comment_id, email, name, body, product_id)
    VALUES
    (?, ?, ?, ?, ?)
`;

export const DELETE_COMMENT_QUERY = `
    DELETE FROM comments WHERE comment_id = ?
`;

export const DELETE_COMMENT_BY_PRODUCT_ID_QUERY = `
    DELETE FROM comments WHERE product_id = ?
`;

export const SELECT_PRODUCT_BY_ID_QUERY = `
    SELECT * FROM products WHERE product_id = ?
`;

export const SELECT_COMMENT_BY_PRODUCT_ID_QUERY = `
    SELECT * FROM comments WHERE product_id = ?
`;

export const SELECT_IMAGE_BY_PRODUCT_ID_QUERY = `
    SELECT * FROM images WHERE product_id = ?
`;

export const INSERT_PRODUCT_QUERY = `
    INSERT INTO products
    (product_id, title, description, price)
    VALUES
    (?, ?, ?, ?)
`;

export const INSERT_PRODUCT_IMAGES_QUERY = `
    INSERT INTO images (image_id, url, product_id, main) VALUES ?
`;

export const DELETE_PRODUCT_QUERY = `
    DELETE FROM products WHERE product_id = ?
`;

export const DELETE_IMAGES_QUERY = `
    DELETE FROM images WHERE image_id IN ?;
`;

export const DELETE_IMAGES_BY_PRODUCT_ID_QUERY = `
    DELETE FROM images WHERE product_id = ?;
`;