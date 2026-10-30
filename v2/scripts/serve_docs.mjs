import http from "node:http"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import handler from "serve-handler"

const output = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../dist/docs")
const port = Number(process.argv[2] ?? 8788)

if (!fs.existsSync(output)) {
  throw new Error("dist/docs is missing; run npm run docs:build first")
}

const server = http.createServer((request, response) => {
  const pathname = new URL(request.url ?? "/", "http://localhost").pathname
  if (pathname === "/") {
    request.url = "/index.html"
  } else {
    const htmlPath = path.join(output, `${pathname}.html`)
    if (!path.extname(pathname) && fs.existsSync(htmlPath)) request.url = `${pathname}.html`
  }
  return handler(request, response, { public: output, directoryListing: false, cleanUrls: false })
})

server.listen(port, () => console.log(`Harvy docs preview: http://localhost:${port}`))
