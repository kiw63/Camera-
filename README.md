# BLINK by Vella Studio

**A local-first browser camera and media studio.** BLINK is a static React + TypeScript + Vite website. The camera, photo/video capture, local gallery, editing and AI inference run in the browser. There is no bundled upload API or automatic media sync to a server. Fonts and app assets are self-contained/system-based; the camera app does not need an external font CDN.

## What is included

- **Camera:** front/back camera switching, camera selection, live preview, framing grid, capture timer, native zoom when exposed by the browser, and software crop zoom up to 100×. Above native zoom the image is enlarged from a digital crop and loses detail; it is not optical 100×.
- **Capture:** high-resolution still capture; Live Photo saves a still plus an approximately 2.2-second companion clip recorded after the shutter. This is not a pre-capture rolling buffer. Microphone audio is requested separately and can be omitted if permission is denied.
- **Manual controls:** exposure compensation and focus controls are shown only when the camera/browser exposes those capabilities. Autofocus stays managed by the device when manual focus is unavailable. Torch is attempted only when the active video track reports torch support.
- **Cinematic video:** 720p / 1080p / 4K ideal capture profiles (the actual negotiated resolution is displayed), 24 fps canvas output for cinematic mode, local color grading, vignette/letterbox treatment, software zoom crop, audio capture where allowed, and experimental software stabilization using low-resolution optical-flow estimation blended with orientation/motion sensor readings.
- **AI Super HD:** Real-ESRGAN x4plus ONNX inference using ONNX Runtime Web with WebGPU/WASM providers. The npm `postinstall` step copies the runtime's WASM/JSEP files into `public/ort/` so the model engine is served from the same GitHub Pages site rather than an undocumented third-party runtime CDN. The 63.95 MB model is fetched only after the user taps the AI model button, checked against a pinned SHA-256 digest, then cached by the browser where Cache Storage is available. The model runs on-device; only the model download contacts Hugging Face. The initial model is a super-resolution model, not a neural denoise/deblur model.
- **Extra image lab:** users can load their own compatible ONNX RGB NCHW models for denoise/deblur. A clearly identified classical median-filter/sharpen fallback and a grayscale depth-map blur composite are also included; these fallbacks are not represented as AI inference.
- **Photo editor:** brightness, contrast, saturation, rotation, optional BLINK watermark, and export as a separate copy.
- **Video editor:** start/end trimming and WebM/MP4 re-export using browser `captureStream` + `MediaRecorder` where supported.
- **Local Library:** IndexedDB persistence, photo preview, video entries, download, delete, JSON backup and restore.
- **PWA / offline shell:** web manifest with 192px/512px install icons and a service worker cache the built application shell. The camera and model download still require their respective permissions/network access.
- **GitHub Pages:** a ready GitHub Actions workflow builds `dist/` and deploys it to Pages. Relative asset paths support repository subpaths.

## Requirements

- Node.js **22.12+** and npm. The `postinstall` script copies ONNX Runtime Web's matching WASM assets from `node_modules` into `public/ort/`; keep that folder when deploying the built `dist/` output.
- A modern browser with camera support. Chromium-based Android browsers are the primary target. Feature availability still depends on browser and camera driver.
- Camera access requires **HTTPS** (GitHub Pages is HTTPS) or `localhost` during development.

## Run locally

```bash
npm install
npm run dev
```

Open the local Vite URL. Allow camera permission. To create the production site:

```bash
npm run typecheck
npm run build
npm run preview
```

The production files are written to `dist/`.

## Deploy to GitHub Pages

1. Create a new GitHub repository and upload the contents of this folder to its `main` branch.
2. In GitHub, open **Settings → Pages** and set the source to **GitHub Actions**.
3. Push to `main` (or run the `Build and deploy BLINK to GitHub Pages` workflow manually).
4. Open the Pages URL shown by the successful deployment. Use the site over HTTPS so camera permissions can work.

The included Vite config uses `base: './'` so assets work at `https://USER.github.io/REPOSITORY/` as well as at a custom domain.

## Privacy and storage

- Photo and video blobs are kept in this browser's IndexedDB. They are not uploaded automatically.
- AI model weights are downloaded only when explicitly requested. The model is verified and placed in the browser's model cache when storage permits; the image itself remains local during inference.
- Camera and microphone permissions are requested by capture actions. Revoke them in browser settings at any time.
- Browser storage is not a guaranteed archive. Browser cleanup, quota pressure, private-browsing mode, or clearing site data can remove local media. Use **Backup** and keep a separate copy of important files.

## Honest platform limits

A web app cannot guarantee native sensor access. Hardware autofocus, manual lens focus, exposure compensation, torch, native zoom, video codecs, requested resolution and frame rate are exposed inconsistently. The 4K setting is an ideal request, not a guarantee; BLINK displays the actual track settings. The 100× control is digital crop, never optical zoom. The software stabilizer is experimental and is not equivalent to OIS or calibrated native gyro fusion. Cinematic mode is a local color-grade/letterbox pipeline, not true sensor HDR or depth-of-field capture. The browser Live Photo is a still plus a short post-shot clip, not Apple's pre-capture Live Photo implementation.

The editor provides practical photo adjustments and basic video trimming, not a desktop-grade multi-track timeline. Neural denoise and deblur weights are not bundled; bring a compatible ONNX model for those tasks. A classical filter fallback is provided and labelled accurately.

## Test status

This source package was assembled in the current environment. The local `npm install` attempt timed out because package retrieval was unavailable in the build environment, so **a production Vite build and type-check could not be completed here**. No physical Infinix GT 30 5G, Android browser, iOS device or desktop camera was available for hardware QA. GitHub Actions will perform dependency installation and the production build after the repository is pushed. Verify all camera, recording, WebGPU/WASM, model, storage and backup flows on the target phone before calling the release production-tested.

## Key technical references

- [MDN — MediaDevices.getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)
- [MDN — MediaStream Recording API](https://developer.mozilla.org/en-US/docs/Web/API/MediaStream_Recording_API)
- [ONNX Runtime Web — WebGPU execution provider](https://onnxruntime.ai/docs/tutorials/web/ep-webgpu.html)
- [Real-ESRGAN x4plus browser ONNX model card and license](https://huggingface.co/skillsafe-ai/realesrgan-x4plus)
- [React releases](https://react.dev/versions) · [Vite releases](https://vite.dev/releases)

## Model attribution

Real-ESRGAN x4plus architecture and weights are provided under BSD-3-Clause by the upstream project. The model is pinned to the SkillSafe/Hugging Face artifact revision and the application verifies SHA-256 `4851ec156207d271f5328605d0582eeb851e656227da8aca093ced9e60789291` before accepting a fresh download. See the model card and upstream license for full notices.
