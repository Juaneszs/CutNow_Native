import { createRecord, deleteRecord, getRecords, updateRecord } from "./collectionService";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";

const COLLECTION = "Sedes";

export const getSedes = () => getRecords(COLLECTION);
export async function getSedesActivas() {
  const snapshot = await getDocs(query(collection(db, COLLECTION), where("activa", "==", true)));
  return snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
}
export const createSede = data => createRecord(COLLECTION, data);
export const updateSede = (id, data) => updateRecord(COLLECTION, id, data);
export const deleteSede = id => deleteRecord(COLLECTION, id);
