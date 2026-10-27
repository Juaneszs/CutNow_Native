import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

export async function getRecords(collectionName) {
  const snapshot = await getDocs(collection(db, collectionName));
  return snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
}

export async function createRecord(collectionName, data) {
  const result = await addDoc(collection(db, collectionName), data);
  return { id: result.id, ...data };
}

export async function updateRecord(collectionName, id, data) {
  await updateDoc(doc(db, collectionName, id), data);
  return { id, ...data };
}

export async function deleteRecord(collectionName, id) {
  await deleteDoc(doc(db, collectionName, id));
}
