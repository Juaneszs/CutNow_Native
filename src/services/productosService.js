import { createRecord, deleteRecord, getRecords, updateRecord } from "./collectionService";

const COLLECTION = "Productos";

export const getProductos = () => getRecords(COLLECTION);
export const createProducto = data => createRecord(COLLECTION, data);
export const updateProducto = (id, data) => updateRecord(COLLECTION, id, data);
export const deleteProducto = id => deleteRecord(COLLECTION, id);
