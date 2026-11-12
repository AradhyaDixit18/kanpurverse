# Measurement log
Apple M2, 8 GB unified memory; Chrome157, macOS. Multiple user applications were active. Development builds and compiler load affect results; this is not an isolated hardware benchmark.

Initial new-game sample: 724 frames over20012.9ms, average36.18FPS, median24.3ms, p95 47ms, p99 70.2ms, worst95.4ms; mean948 draw calls and360338 triangles across all passes; 1355×921 buffer,1084×737 CSS viewport,DPR1.25, Medium; position462.4,-336.9. This preceded shop batching and tighter character LOD. Its foreground state was not independently verified. It is retained as diagnostic data, not an accepted benchmark or proof of60FPS.

An old review-camera run was inside a building and is excluded. A later old-view capture succeeded, but interrupted/background-tab measurements are not used as a claimed speedup. Measurements need matched camera, quality, viewport, foreground state and no simultaneous Next compilers. The previous11November sample56.51FPS was under different conditions and is not a valid before/after comparison.

Optimizations: merge static sweet-shop props and sweets, bounded road-edge instancing, distant character simplification, paced tile mounting, no server reconciliation/network snapshots, high-tier-only AO, tighter shadow frustum, medium foliage shadows disabled. Final valid measurements and remaining limitations are recorded in DELIVERY_REPORT.md.
