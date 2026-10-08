# CutNow Mobile

Cliente móvil de CutNow migrado a Expo SDK 57, React Native y Expo Router. El cliente web Vite permanece disponible durante la transición.

## Requisitos

- Node.js 20.19 o posterior.
- Expo Go actualizado para probar en un dispositivo, o un emulador Android/iOS configurado.

## Desarrollo móvil

```sh
npm install
npm run dev
```

Escanea el QR con Expo Go o usa `npm run android` / `npm run ios` con un emulador abierto. Los bundles se exportan con `npm run export:android` y `npm run export:ios`.

## Flujos móviles

- Autenticación, registro y recuperación de contraseña.
- Catálogo y reservas con selector nativo de fecha y horarios disponibles.
- Historial, cancelación y valoración de citas.
- Tienda, carrito persistente y checkout por efectivo o WhatsApp.
- Panel y gestión administrativa protegidos por rol.

Las rutas Expo viven en `app/`. Firebase Auth conserva la sesión mediante AsyncStorage y las reglas de Firestore siguen siendo la autoridad para los permisos de datos.

## Cliente web

```sh
npm run dev:web
npm run build:web
```

La implementación web anterior se conserva en `src/components` durante la transición.
