# Cursus

**A personal resume studio for turning an existing resume into a focused draft for a specific role.** Paste your experience and a job description, review the result, then export it as a PDF or Word document.

Built by [@ztxv](https://github.com/ztxv) as a local-first portfolio project. Cursus keeps the editing flow simple and asks the model to work only with experience you provide.

## What it does

- Tailors a resume to a pasted job description using the OpenAI Responses API and a strict JSON schema.
- Shows the result in a live document preview, with PDF and DOCX exports.
- Saves your draft, selected model, appearance, and API key in your browser's local storage.
- Supports light and dark themes, responsive layouts, and a **Cmd/Ctrl + Enter** shortcut.
- Marks a previous result when you change the inputs or a new generation fails, so you know what the download buttons contain.

## Run locally

You need **Node.js 20+**, npm, and an [OpenAI API key](https://platform.openai.com/api-keys) with access to the model you choose.

```bash
git clone https://github.com/ztxv/cursus.git
cd cursus
npm install
npm start
```

Open **http://localhost:3000**. To use another port, run `PORT=3001 npm start`. For automatic server restarts while developing, use `npm run dev`.

1. Open **Settings** and enter your API key. Choose GPT-5 mini, GPT-5, or a custom GPT model ID available to your API project.
2. Paste your own master resume and the job description. Both inputs save in this browser.
3. Select **Tailor my resume**, review the preview for accuracy, and download a PDF or DOCX.

The app starts with an empty resume field. No personal resume or API key is included in the repository. OpenAI API usage may incur charges on your account.

## How it works

```text
Browser editor → local Express server → OpenAI Responses API
       ↑                 ↓
       └── structured resume + preview ──→ PDF / DOCX export
```

The browser sends your resume and job description to the local Express server when you generate a draft. The server forwards them to OpenAI, requests structured output, validates the returned shape, and builds the preview. Exports are created locally from that returned resume data: Puppeteer renders the PDF and `docx` builds the Word file.

The prompt instructs the model to preserve factual details and avoid inventing qualifications. **Review every generated line before using it**; AI output can still be inaccurate.

## Privacy and scope

- The API key, master resume, and job description are stored in your browser's **unencrypted local storage** on the device you use. Use a trusted browser profile, especially on a shared computer.
- The key is sent to the local server in an authorization header for generation, then forwarded to OpenAI. The server does not save the key or your input drafts to disk. Generation requests set `store: false`.
- The server listens on `127.0.0.1`, so this setup is intended for personal use on your own machine. Public hosting would require an authentication and security review.
- `.env` files, local output, and common resume export formats are ignored by Git. Keep personal source documents in `private/` or `resumes/` if you store them in this folder. Review `git status` before any public push.

## Tech stack

| Part | Tools |
| --- | --- |
| Server and API | Node.js, Express, OpenAI Responses API |
| Interface | HTML, CSS, JavaScript, Shoelace, Lucide, Motion |
| Documents | Puppeteer (PDF), `docx` (Word) |
| Checks | Node.js built-in test runner |

UI dependencies are served from installed packages, so the interface does not rely on a third-party asset CDN. PDF export uses an installed Chrome/Chromium on macOS when available, otherwise Puppeteer's browser installation.

## Test

```bash
npm test
```

The tests mock OpenAI requests and cover response validation, API errors, export formatting, and the state of the preview after edits or failed attempts. They do not need a real API key.

## Project structure

```text
lib/openai.js      OpenAI request, response schema, and validation
public/            Interface, styles, and browser interactions
server.js          Local API, preview HTML, and document exports
test/              Automated tests
```

---

Made by [@ztxv](https://github.com/ztxv).
