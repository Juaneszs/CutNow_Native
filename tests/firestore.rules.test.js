import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, afterEach, before, beforeEach, test } from "node:test";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from "firebase/firestore";

const projectId = "demo-cutnow";
const userId = "cliente-1";
const otherUserId = "cliente-2";
const adminId = "admin-1";
let testEnv;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: {
      rules: await readFile(new URL("../firestore.rules", import.meta.url), "utf8"),
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), "usuarios", adminId), { role: "admin" });
    await setDoc(doc(context.firestore(), "usuarios", userId), { role: "user" });
    await setDoc(doc(context.firestore(), "usuarios", otherUserId), { role: "user" });
  });
});

afterEach(async () => {
  await testEnv.clearFirestore();
});

after(async () => {
  await testEnv.cleanup();
});

function userDb(uid = userId) {
  return testEnv.authenticatedContext(uid).firestore();
}

function adminDb() {
  return userDb(adminId);
}

test("a user can create their profile only with the user role", async () => {
  const db = userDb("nuevo-cliente");

  await assertSucceeds(setDoc(doc(db, "usuarios", "nuevo-cliente"), {
    nombre: "Ana",
    apellido: "López",
    email: "ana@example.com",
    creadoEn: "2026-10-21T00:00:00.000Z",
    role: "user",
  }));
  await assertFails(setDoc(doc(userDb("escalador"), "usuarios", "escalador"), {
    role: "admin",
  }));
  await assertFails(setDoc(doc(db, "usuarios", otherUserId), { role: "user" }));
});

test("a user can update profile fields but cannot change their role", async () => {
  const db = userDb();

  await assertSucceeds(updateDoc(doc(db, "usuarios", userId), { nombre: "Ana María" }));
  await assertSucceeds(updateDoc(doc(db, "usuarios", userId), { apellido: "Pérez" }));
  await assertFails(updateDoc(doc(db, "usuarios", userId), { role: "admin" }));
  await assertFails(updateDoc(doc(db, "usuarios", userId), {
    nombre: "Admin",
    role: "admin",
  }));

  const admin = adminDb();
  await assertSucceeds(updateDoc(doc(admin, "usuarios", userId), {
    role: "admin",
    correo_verificado: true,
  }));
  await assertSucceeds(deleteDoc(doc(admin, "usuarios", userId)));
});

test("a user can cancel their own pending appointment", async () => {
  const db = userDb();
  const appointment = doc(db, "citas", "cita-propia");

  await testEnv.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), "citas", "cita-propia"), {
      usuario_id: userId,
      estado: "pendiente",
    });
  });

  await assertSucceeds(updateDoc(appointment, { estado: "cancelada" }));
  assert.equal((await getDoc(appointment)).data().estado, "cancelada");

  await testEnv.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), "citas", "cita-confirmada-propia"), {
      usuario_id: userId,
      estado: "confirmada",
    });
    await setDoc(doc(context.firestore(), "citas", "cita-no-cancelable"), {
      usuario_id: userId,
      estado: "pendiente",
    });
  });

  await assertSucceeds(updateDoc(doc(db, "citas", "cita-confirmada-propia"), {
    estado: "cancelada",
    cancelada_at: new Date(),
  }));
  await assertFails(updateDoc(doc(db, "citas", "cita-no-cancelable"), {
    estado: "cancelada",
    usuario_id: otherUserId,
  }));
});

test("a user cannot read or cancel another user's appointment", async () => {
  const db = userDb();
  const appointment = doc(db, "citas", "cita-ajena");

  await testEnv.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), "citas", "cita-ajena"), {
      usuario_id: otherUserId,
      estado: "pendiente",
    });
  });

  await assertFails(getDoc(appointment));
  await assertFails(getDocs(collection(db, "citas")));
  await assertFails(updateDoc(appointment, { estado: "cancelada" }));
});

test("appointments can only be created for the authenticated user in pending state", async () => {
  const db = userDb();

  await assertSucceeds(setDoc(doc(db, "citas", "cita-valida"), {
    usuario_id: userId,
    estado: "pendiente",
  }));
  await assertFails(setDoc(doc(db, "citas", "cita-ajena"), {
    usuario_id: otherUserId,
    estado: "pendiente",
  }));
  await assertFails(setDoc(doc(db, "citas", "cita-confirmada"), {
    usuario_id: userId,
    estado: "confirmada",
  }));
});

test("users can rate finished appointments without changing other fields", async () => {
  const db = userDb();
  const appointment = doc(db, "citas", "cita-finalizada");

  await testEnv.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), "citas", "cita-finalizada"), {
      usuario_id: userId,
      estado: "finalizada",
      calificacion: null,
      comentario: "",
    });
  });

  await assertSucceeds(updateDoc(appointment, {
    calificacion: 5,
    comentario: "Excelente",
    calificado: true,
  }));
  await assertFails(updateDoc(appointment, {
    calificacion: 4,
    estado: "cancelada",
  }));
});

test("only admins can write Servicios, Sedes, Barberos, and Productos", async () => {
  const user = userDb();
  const admin = adminDb();

  for (const collectionName of ["Servicios", "Sedes", "Barberos", "Productos"]) {
    const userDocument = doc(user, collectionName, "documento");
    const adminDocument = doc(admin, collectionName, "documento");

    await testEnv.withSecurityRulesDisabled(async context => {
      await setDoc(doc(context.firestore(), collectionName, "documento"), {
        nombre: "Existente",
      });
    });
    await assertFails(setDoc(userDocument, { nombre: "Prueba" }));
    await assertSucceeds(setDoc(adminDocument, { nombre: "Prueba" }));
    await assertFails(updateDoc(userDocument, { nombre: "Cambio" }));
    await assertSucceeds(updateDoc(adminDocument, { nombre: "Cambio" }));
    await assertFails(deleteDoc(userDocument));
    await assertSucceeds(deleteDoc(adminDocument));
  }
});

test("authenticated users can only change slots_ocupados in availability documents", async () => {
  const db = userDb();
  const availability = doc(db, "Barberos", "barbero-1", "disponibilidad", "2026-10-21");
  const adminAvailability = doc(
    adminDb(),
    "Barberos",
    "barbero-1",
    "disponibilidad",
    "2026-10-22",
  );

  await assertSucceeds(setDoc(availability, { slots_ocupados: ["09:00"] }));
  await assertFails(setDoc(
    doc(db, "Barberos", "barbero-1", "disponibilidad", "2026-10-23"),
    { slots_ocupados: ["09:00"], notas: "no permitido" },
  ));
  await assertSucceeds(getDoc(availability));
  await assertFails(getDoc(
    doc(testEnv.unauthenticatedContext().firestore(), "Barberos", "barbero-1", "disponibilidad", "2026-10-21"),
  ));
  await assertSucceeds(updateDoc(availability, { slots_ocupados: ["10:00"] }));
  await assertFails(updateDoc(availability, {
    slots_ocupados: ["11:00"],
    notas: "cambio no autorizado",
  }));
  await assertFails(deleteDoc(availability));
  await assertSucceeds(setDoc(adminAvailability, { notas: "admin puede crear" }));
  await assertSucceeds(updateDoc(adminAvailability, { notas: "admin puede actualizar" }));
  await assertSucceeds(deleteDoc(adminAvailability));
});

test("users can create and read their own orders, while admins read and update all orders", async () => {
  const user = userDb();
  const otherUser = userDb(otherUserId);
  const admin = adminDb();
  const ownOrder = doc(user, "pedidos", "pedido-propio");
  const otherOrder = doc(user, "pedidos", "pedido-ajeno");

  await assertSucceeds(setDoc(ownOrder, { usuario_id: userId, estado: "nuevo" }));
  await assertFails(setDoc(doc(user, "pedidos", "pedido-invalido"), {
    usuario_id: otherUserId,
  }));

  await testEnv.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), "pedidos", "pedido-ajeno"), {
      usuario_id: otherUserId,
      estado: "nuevo",
    });
  });

  await assertSucceeds(getDoc(ownOrder));
  await assertFails(getDoc(otherOrder));
  await assertSucceeds(getDoc(doc(otherUser, "pedidos", "pedido-ajeno")));
  await assertSucceeds(getDoc(doc(admin, "pedidos", "pedido-ajeno")));
  await assertFails(updateDoc(ownOrder, { estado: "pagado" }));
  await assertFails(deleteDoc(ownOrder));
  await assertSucceeds(updateDoc(doc(admin, "pedidos", "pedido-ajeno"), {
    estado: "procesando",
  }));
  await assertSucceeds(deleteDoc(doc(admin, "pedidos", "pedido-ajeno")));
});
