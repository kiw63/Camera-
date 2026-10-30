# ULTRA Camera — runnable foundation

This repository contains a real browser-camera application and a small independently-owned ULTRA API foundation. It is **not yet the complete specification**. The feature matrix below is intentionally honest.

## Requirements
- Node.js 20+
- Python 3.11+
- Camera-capable browser. Camera access requires HTTPS or `localhost`.
- Grant camera permission when prompted.

## Run the web app
```bash
npm install
npm run dev
```
Open the Vite URL (normally `http://localhost:5173`). On a phone, use an HTTPS deployment; LAN HTTP generally cannot access the camera.

Build:
```bash
npm run build
npm run preview
```

## Browser-only architecture
The application is a static website/PWA; the camera, IndexedDB gallery, ONNX inference, image processing, and media capture run in the browser. No custom cloud backend is required or called by the app. The legacy `backend/` folder is an optional standalone API experiment and is not part of the browser-only product runtime.

## Run the optional API (not required)
```bash
cd backend
python -m venv .venv
# Windows: .venv\\Scripts\\activate
# macOS/Linux:
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
- `GET /api/v1/health`
- `POST /api/v1/media` — explicit multipart upload; never called automatically by the web app
- `GET /api/v1/media`
- `DELETE /api/v1/media/{media_id}`

Interactive API documentation: `http://localhost:8000/docs`.

Run API tests:
```bash
pip install pytest httpx
pytest
```

## Browser-only / local-AI architecture update
- No app/APK required. The camera and processing interface runs in the browser.
- Native zoom is applied only when the active video track exposes zoom capability. Zoom beyond that limit is implemented as a real frame crop at capture time, up to a requested 100×; it is digital enlargement and loses source detail.
- Torch is applied only when the browser reports the active track capability.
- Local AI integration uses ONNX Runtime Web. The built-in Real-ESRGAN x4plus model is fetched from a pinned public model artifact (~64 MB) once when the user requests it; inference runs on-device using WebGPU when available, with WASM fallback. Image processing is tiled to reduce peak memory. This first AI model performs super-resolution, not every listed denoise/deblur/color task.
- Live Photo saves a still plus a real 2-second post-capture WebM companion clip when MediaRecorder is supported. It is not a pre-capture rolling buffer.
- Experimental stabilization estimates frame translation with low-resolution optical flow and blends this with DeviceOrientation / DeviceMotion rotation readings. It is not calibrated high-rate gyro fusion or OIS; devices without sensor access still use optical flow alone.
- AI model inference and media capture do not upload user media. The initial model download does contact the public model host.

## Implemented in this foundation
- Real camera access through `getUserMedia`, permission/error handling, front/back facing preference, camera enumeration.
- Still-photo capture from the live camera stream; JPEG saved to IndexedDB.
- Real video recording through `MediaRecorder`; WebM saved to IndexedDB.
- Actual track settings displayed for resolution and reported frame rate.
- Native zoom capability used when browser exposes it; otherwise the zoom range is bounded and reports digital/native limitations in diagnostics. This first release does not implement a verified 100x pipeline.
- Torch attempted only when the active track reports torch capability.
- Grid overlay, 3-second/10-second capture timer.
- Internal gallery, preview, delete, download, persistence across refresh (subject to browser storage policy).
- Photo adjustment export (brightness, contrast, saturation, rotation) as a separate file; original is preserved.
- FastAPI service with health, explicit media upload, list/delete, streaming writes, SHA-256 metadata and basic automated health test.

## Current limitations

- 100× zoom is digital crop above any native zoom the browser exposes; it is not optical 100×.
- Neural AI denoise/deblur requires user-supplied compatible ONNX models; none are bundled. Classical median denoise and unsharp sharpening are available as local fallback filters.
- Cinematic depth requires a user-provided grayscale depth map; automatic depth estimation and person segmentation are not included.
- Stabilization uses low-resolution block-matching optical flow blended with browser orientation readings. It is experimental, not calibrated high-rate gyro fusion or optical image stabilization.
- Video editing currently supports start/end trimming and WebM export, not a complete multi-track timeline, advanced grading, or arbitrary codec transcoding.
- Device/browser compatibility and production deployment have not been verified.

## Model attribution
The default super-resolution model is Real-ESRGAN x4plus from the `skillsafe-ai/realesrgan-x4plus` model artifact, BSD-3-Clause, derived from the upstream Real-ESRGAN project. The model is downloaded only when the user explicitly requests it; inference is local.

## Test status
- Source package generation: completed.
- Offline app shell: service worker and web manifest included; camera/model execution still requires compatible browser APIs and model download on first use.
- Browser camera/video/torch/native zoom/AI inference/Live Photo: not yet hardware-tested in this environment.
- TypeScript production build: must be run on a machine with npm access using `npm install && npm run build`.
- Android and desktop browser compatibility: not yet verified.

## Important engineering limits
Browser APIs expose only capabilities supported by the current browser and camera. A browser app cannot promise the same access as a native camera application. `MediaRecorder` codec/container support varies. IndexedDB can be cleared by the user, browser cleanup, or storage pressure; it is not permanent archival storage. For important media, download or export a backup. The backend is an optional explicit-upload service and is not connected to automatic media sync.

## Privacy
The web app requests camera access only after it is opened. Captures are stored in the browser's IndexedDB. No media is uploaded to the API automatically. Camera and microphone permissions can be revoked in browser settings.


## v0.3.0 additions (experimental)

- **Stabilization:** the recorder now estimates low-resolution frame translation with block-matching optical flow and blends it with browser `deviceorientation` measurements. This is an experimental software stabilizer, not calibrated high-rate gyroscope fusion, OIS, or a replacement for native camera stabilization. It can crop, drift, or perform poorly in low light / low texture scenes.
- **AI denoise / deblur:** separate ONNX model upload slots are available. Bring compatible RGB float32 NCHW 1x-in/1x-out models; inference is local. No dedicated denoise/deblur weights are bundled. Classical median denoise and unsharp deblur fallbacks are also included and are explicitly not neural AI.
- **Cinematic depth:** accepts a grayscale depth map (white = background blur) and applies a local blur composite. It does not estimate depth automatically or segment people.
- **Video editing:** browser-based start/end trimming and WebM export using `captureStream` + `MediaRecorder`. It is not yet a full multi-track timeline editor; codecs/audio support vary by browser.
- **Backup / restore:** exports all IndexedDB media as a JSON backup and restores it locally. Large libraries may require substantial free memory and storage. Keep a second copy somewhere safe.

## Validation status

This source has not passed a production build in this environment because dependency installation timed out. No physical Android phone or desktop browser tests were run here. Do not label the app production-ready until `npm install`, `npm run build`, and real camera / recording / AI / backup tests pass on target browsers.

## GitHub Pages deployment (repository `Camera-`)

This project site uses the Vite base path `/Camera-/`. Deploy the generated `dist/` directory, not the raw TypeScript source tree. A GitHub Actions workflow is included at `.github/workflows/deploy.yml`; push this project to the `main` branch and enable **Settings → Pages → Build and deployment → GitHub Actions**. The workflow installs dependencies, builds the app, and publishes `dist/`.
