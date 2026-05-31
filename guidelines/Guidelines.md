# General Guidelines
* **Code Style**: Write clean, modular, functional TypeScript React components. Keep files small (< 300 lines). If a file gets too big, suggest splitting it.
* **Architecture**: Always follow the "Minimalist Architecture" structure:
    - Logic/API in `src/app/services/`
    - Types in `src/app/types/`
    - Components in `src/app/components/ui/`
* **Performance**: Prioritize performance and fast initial load times.
* **Modern Syntax**: Use modern ES modules and strict TypeScript typing.
* **Ownership**: Always respect the "All Rights Reserved" license. Do not use external libraries unless explicitly asked.

# Styling (Tailwind CSS v4)
* Always use the latest Tailwind CSS v4 syntax (`@import "tailwindcss";`, `@theme`, `@layer utilities`).
* Do not use legacy `@tailwind base/components/utilities` directives.
* **Mobile First**: Design for mobile (iPhone) first. Always account for iOS Safe Areas (`safe-area-inset-top/bottom`).
* **Components**: Use Radix UI primitives as the base for accessible components.
* **Classes**: Keep class lists readable. Use `tailwind-merge` and `clsx` for dynamic classes.

# iOS / PWA Guidelines
* **Touch Targets**: Minimum 44px x 44px for all interactive elements.
* **Typography**: Minimum 16px font size on inputs to prevent iOS Safari auto-zoom.
* **Viewport**: Use `viewport-fit=cover` and handle safe areas in the `globals.css` layer utilities.
* **PWA**: Ensure all new routes or features are compatible with `standalone` PWA mode.

# Component Design
* **Layout**: Prefer Flexbox and Grid. Avoid absolute positioning unless strictly necessary for UI layering.
* **Visuals**: Keep the UI clean, minimalist, and "pro-lawyer" (serene, readable, high contrast).
* **Errors**: Always implement error boundaries or fallback UI (like `ImageWithFallback` for broken images/data).