# 📦 Guía de Instalación y Despliegue - HOME Experience

Este documento detalla cómo instalar, configurar y desplegar la aplicación **HOME Experience**. Incluye detalles sobre la arquitectura de datos, endpoints simulados y guías para Cloudflare y Pterodactyl.

---

## 1. 🛠️ Instalación Local

### Prerrequisitos
- **Node.js**: v18 o superior.
- **NPM**: v9 o superior.

### Pasos
1.  **Clonar el repositorio**:
    ```bash
    git clone <url-del-repositorio>
    cd home-experience
    ```

2.  **Instalar dependencias**:
    ```bash
    npm install
    ```

3.  **Iniciar servidor de desarrollo**:
    ```bash
    npm run dev
    ```
    La aplicación estará disponible en `http://localhost:3000`.

---

## 2. 🗄️ Estructura de Base de Datos (Simulada)

Actualmente, el proyecto utiliza una arquitectura **Serverless / Client-Side** simulada mediante `MockDatabase`. Los datos se persisten en el `localStorage` del navegador del usuario.

> **⚠️ IMPORTANTE PARA PRODUCCIÓN**:
> Al estar basada en `localStorage`, los datos **NO se comparten entre usuarios**.
> - Lo que un usuario escribe, solo lo ve él en su dispositivo.
> - El panel de Admin solo ve los datos generados en ese mismo navegador.
>
> **Para un entorno real multi-usuario (Cloudflare)**, se recomienda migrar `src/services/mockDatabase.ts` a una API real conectada a **Cloudflare D1**, **Firebase** o **Supabase**.

### Esquema de Datos (Formato 3FN)

Aunque es simulada, la estructura respeta la Tercera Forma Normal (3FN) para facilitar la migración a SQL.

#### Tabla: `Testimonials`
Almacena los testimonios de los usuarios.

| Campo | Tipo | Descripción | Restricciones |
| :--- | :--- | :--- | :--- |
| `id` | UUID (String) | Identificador único | Primary Key |
| `author` | String | Nombre del autor | Not Null |
| `quote` | Text | Contenido del testimonio | Not Null |
| `rating` | Integer | Calificación (1-5) | Default: 5 |
| `status` | Enum | Estado de moderación | `pending`, `approved`, `rejected` |
| `createdAt` | DateTime | Fecha de creación | ISO 8601 |
| `cycle` | String | Ciclo/Camada (Opcional) | Nullable |
| `pl` | Integer | Nivel de PL (Opcional) | Nullable |

#### Tabla: `TestimonialRoles` (Relación M:N)
*Nota: En la implementación actual, esto se maneja como un array de strings `roles` dentro de `Testimonials` por simplicidad, pero en SQL sería una tabla pivote.*

| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `testimonial_id` | UUID | FK -> Testimonials.id |
| `role` | Enum | `Participante`, `Senior`, `Staff` |

---

## 3. 🔌 Endpoints / Servicios Disponibles

Dado que no hay un backend real, estos son los métodos del servicio `MockDatabase` que actúan como endpoints de una API.

### Testimonios

#### `GET /api/testimonials`
Obtiene todos los testimonios.
- **Método**: `MockDatabase.getTestimonials()`
- **Retorno**: `Testimonial[]`

#### `POST /api/testimonials`
Crea un nuevo testimonio.
- **Método**: `MockDatabase.createTestimonial(data)`
- **Body**: `{ author, quote, roles, cycle, ... }`
- **Comportamiento**: Establece `status` = `'pending'`.

#### `PUT /api/testimonials/:id/status`
Actualiza el estado de moderación.
- **Método**: `MockDatabase.updateTestimonialStatus(id, status)`
- **Params**: `id`, `status` ('approved' | 'rejected')

#### `DELETE /api/testimonials/:id`
Elimina un testimonio.
- **Método**: `MockDatabase.deleteTestimonial(id)`

---

## 4. ☁️ Despliegue en Cloudflare Pages

Esta es la configuración recomendada para desplegar el frontend estático.

### Configuración del Proyecto
1.  Entra a **Cloudflare Dashboard** > **Workers & Pages**.
2.  Haz clic en **Create Application** > **Pages** > **Connect to Git**.
3.  Selecciona tu repositorio `home-experience`.

### Ajustes de Build (Build Settings)
Configura los siguientes valores:

| Configuración | Valor |
| :--- | :--- |
| **Framework Preset** | `Vite` |
| **Build Command** | `npm run build` |
| **Build Output Directory** | `dist` |
| **Node.js Version** | `18` (o superior) |

### Variables de Entorno
Si usas alguna variable (ej. API Keys), agrégalas en **Settings** > **Environment Variables**.

---

## 5. 🎮 Sidequest: Instalación en Pterodactyl

Si deseas alojar esto en un panel Pterodactyl (comúnmente usado para servidores de juegos, pero sirve para Node.js/Web).

### Requisitos del Egg
- Usa el **Generic Node.js Egg**.

### Configuración del Servidor
1.  **Startup Command**:
    ```bash
    npm install && npm run build && npm run preview -- --host 0.0.0.0 --port {{SERVER_PORT}}
    ```
    *Nota: `npm run preview` sirve la versión construida (dist) de manera ligera.*

2.  **Instalación**:
    - Sube todos los archivos al servidor (excepto `node_modules`).
    - En la pestaña **Startup**, asegúrate de que la versión de Node sea 18+.

3.  **Variables**:
    - `SERVER_PORT`: Asignado por Pterodactyl (ej. 3000).

### Notas para Pterodactyl
- Pterodactyl no suele exponer puertos web estándar (80/443) directamente a menos que tengas un Proxy Inverso configurado.
- Necesitarás configurar un **Reverse Proxy (Nginx/Apache)** o un **Cloudflare Tunnel** que apunte a la IP:PUERTO de tu servidor Pterodactyl para acceder con un dominio (ej. `siendohome.com`).

---

*Documentación generada automáticamente por Antigravity.*
