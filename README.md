# BoothCraft 3D

A browser-based exhibition booth planner for exhibitors and event teams. Configure a footprint, brand the back wall, arrange furniture, and export a PNG or PDF proposal.

## Run locally

Use Node.js 20 or later and npm.

```sh
npm install
npm run dev
```

Open http://localhost:3000. Run `npm run check`, `npm run lint`, `npm test`, and `npm run build` to validate changes.

## Planner

- Choose a 3 × 3 m, 3 × 6 m, or 6 × 6 m footprint and toggle side walls.
- Customize signage, brand colors, flooring, walls, and a PNG, JPEG, or WebP logo.
- Drag items in the viewport or use numeric position and rotation controls. Placement uses conservative rotated bounding boxes.
- Switch between perspective and top views. Fit or reset the camera.
- Export the rendered scene as PNG or as a PDF with the current layout and item quantities.
- Designs are saved in this browser. Reset restores the demo.

## Architecture

Next.js App Router serves the editor. React Three Fiber, Three.js, and Drei render the client-only scene. The editor owns state and controls. `src/lib/design.ts` owns geometry, placement, validation, and persistence. `src/lib/export.ts` generates downloads with jsPDF. Tailwind and CSS style the interface.

## Limitations

Exports require WebGL. The editor and browser storage remain usable without it. A quota-limited browser may save a design without its logo. Layouts and exports are conceptual and require separate construction verification.
