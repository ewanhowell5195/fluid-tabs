import CleanCSS from "clean-css"
import { minify } from "terser"
import fs from "node:fs"

const version = JSON.parse(fs.readFileSync("package.json", "utf8")).version

fs.mkdirSync("dist", { recursive: true })

const js = fs.readFileSync("src/fluid-tabs.js", "utf8")
const css = fs.readFileSync("src/fluid-tabs.css", "utf8")

const banner = `/*!
 * fluid-tabs
 * Version  : ${version}
 * License  : MIT
 * Copyright: ${new Date().getFullYear()} Ewan Howell
 */
`

const minifiedJs = (await minify(js, {
  compress: true
})).code

const minifiedCss = new CleanCSS().minify(css).styles

fs.writeFileSync("dist/fluid-tabs.min.js", banner + minifiedJs)
fs.writeFileSync("dist/fluid-tabs.min.css", banner + minifiedCss)

console.log("Built fluid-tabs v" + version)
