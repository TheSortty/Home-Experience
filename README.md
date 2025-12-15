# HOME Experience -

> "Gravity is just a suggestion."

Welcome to the **HOME Experience** repository. This project represents a deep dive into creative coding, bringing the fluidity and "premium feel" of high-end award-winning sites to a modern React architecture.

## 🏗 Architecture: Feature-First

I decided to move away from the traditional "layer-based" structure (components/hooks/utils) in favor of a **Vertical Slice / Feature-First** architecture. This approach allows the codebase to scale without becoming a tangled mess of dependencies.

```ascii
src/
├── core/           # Global configuration, types, and shared logic
├── ui/             # Atomic, reusable design system components
├── features/       # The heart of the application
│   ├── landing/    # All components for the landing page (Hero, About, etc.)
│   ├── auth/       # Login & Registration logic isolated
│   └── dashboard/  # Admin features lazy-loaded on demand
├── assets/         # Static resources
└── main.tsx        # Application entry point
```

By colocating components with their specific features, I ensured that deleting a feature is as simple as deleting a folder.

## 🚀 Technical Challenges & Solutions

### 1. The Engine (Matter.js + React)
Integrating a physics engine like `matter-js` into the React lifecycle is notoriously tricky. React wants to control the DOM, while Matter.js wants to control the Canvas.

**My Approach:**
I built a custom rendering loop using `requestAnimationFrame` instead of relying on the default `Matter.Render`. This gave me full control over:
- **Texture Fallbacks:** If an asset fails to load (a common issue in creative coding), the engine seamlessly switches to rendering a geometric primitive with the brand's color palette. No broken images, no white screens.
- **Performance:** By decoupling the physics calculation (Fixed Step) from the rendering (Frame Rate), I achieved a buttery smooth 60fps even on lower-end devices.

### 2. The "Hatching" Aesthetic
For the background, I wanted a specific "architectural blueprint" look. Instead of using heavy image assets, I procedurally generated the pattern using CSS `repeating-linear-gradient`.

To add depth, I implemented a **Mouse Parallax** effect using `GSAP`. I chose GSAP's `quickSetter` over React state for this specific interaction to avoid re-rendering the component on every mouse movement, ensuring the main thread stays free for the physics engine.

## ⚡ Optimizations

- **Code Splitting:** The Dashboard and Auth routes are lazy-loaded using `React.lazy` and `Suspense`. The initial bundle only includes what's needed for the Landing experience.
- **Tree Shaking:** I carefully selected imports from `gsap` and `matter-js` to ensure unused modules are dropped during the build process.
- **Strict TypeScript:** No `any`. Every prop, state, and event is typed to ensure maintainability.

## 🛠 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/home-experience.git
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```

---

## 🗄️ Data Structure (Mock Database)

### Testimonials Schema
The system uses a 3NF-inspired structure for testimonials, managed via `MockDatabase` service.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` (UUID) | Unique identifier |
| `author` | `string` | Name of the person |
| `quote` | `string` | The testimonial content |
| `rating` | `number` | 1-5 stars |
| `roles` | `string[]` | e.g., "Participante", "Senior" |
| `status` | `string` | `pending`, `approved`, `rejected` |
| `createdAt` | `string` | ISO Date string |

### API Simulation
- **Public**: `createTestimonial()` (sets status: `pending`), `getTestimonials()` (filters `approved`).
- **Admin**: `updateTestimonialStatus()`, `deleteTestimonial()`.

---

*Crafted with passion for the web.*
