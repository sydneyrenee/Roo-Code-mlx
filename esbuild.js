const esbuild = require("esbuild")
const fs = require("fs")
const path = require("path")

const production = process.argv.includes("--production")
const watch = process.argv.includes("--watch")

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
	name: "esbuild-problem-matcher",

	setup(build) {
		build.onStart(() => {
			console.log("[watch] build started")
		})
		build.onEnd((result) => {
			result.errors.forEach(({ text, location }) => {
				console.error(`✘ [ERROR] ${text}`)
				console.error(`    ${location.file}:${location.line}:${location.column}:`)
			})
			console.log("[watch] build finished")
		})
	},
}

const copyWasmFiles = {
	name: "copy-wasm-files",
	setup(build) {
		build.onEnd(() => {
			// Create dist directory if it doesn't exist
			const targetDir = path.join(__dirname, "dist")
			if (!fs.existsSync(targetDir)) {
				fs.mkdirSync(targetDir, { recursive: true })
			}

			// tree sitter
			const sourceDir = path.join(__dirname, "node_modules", "web-tree-sitter")
			
			// Copy tree-sitter.wasm if it exists
			const treeSitterWasmPath = path.join(sourceDir, "tree-sitter.wasm")
			if (fs.existsSync(treeSitterWasmPath)) {
				fs.copyFileSync(treeSitterWasmPath, path.join(targetDir, "tree-sitter.wasm"))
			}

			// Copy language-specific WASM files if they exist
			const languageWasmDir = path.join(__dirname, "node_modules", "tree-sitter-wasms", "out")
			if (fs.existsSync(languageWasmDir)) {
				const languages = [
					"typescript",
					"tsx",
					"python",
					"rust",
					"javascript",
					"go",
					"cpp",
					"c",
					"c_sharp",
					"ruby",
					"java",
					"php",
					"swift",
				]

				languages.forEach((lang) => {
					const filename = `tree-sitter-${lang}.wasm`
					const sourcePath = path.join(languageWasmDir, filename)
					if (fs.existsSync(sourcePath)) {
						fs.copyFileSync(sourcePath, path.join(targetDir, filename))
					}
				})
			}
		})
	},
}

// Plugin to filter out test files
const filterTestFiles = {
	name: 'filter-test-files',
	setup(build) {
		// Filter out test files
		build.onResolve({ filter: /\/__tests__\// }, args => {
			return { path: args.path, external: true }
		})
		build.onResolve({ filter: /\.test\./ }, args => {
			return { path: args.path, external: true }
		})
		build.onResolve({ filter: /\/test\// }, args => {
			return { path: args.path, external: true }
		})
	},
}

const extensionConfig = {
	bundle: true,
	minify: production,
	sourcemap: !production,
	logLevel: "silent",
	plugins: [
		filterTestFiles,
		copyWasmFiles,
		esbuildProblemMatcherPlugin,
	],
	entryPoints: ["src/extension.ts"],
	format: "cjs",
	sourcesContent: false,
	platform: "node",
	outfile: "dist/extension.js",
	external: ["vscode"],
}

async function main() {
	const extensionCtx = await esbuild.context(extensionConfig)
	if (watch) {
		await extensionCtx.watch()
	} else {
		await extensionCtx.rebuild()
		await extensionCtx.dispose()
	}
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
})
