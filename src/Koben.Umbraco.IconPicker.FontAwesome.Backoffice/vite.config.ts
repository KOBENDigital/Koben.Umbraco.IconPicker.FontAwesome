import { defineConfig } from "vite";

const webAppPluginsOutDir = "../Web/App_Plugins/Koben.Umbraco.IconPicker.FontAwesome";
const packageOutDir = "dist";

export default defineConfig(({ mode }) => ({
	build: {
		emptyOutDir: true,
		lib: {
			entry: "src/index.ts",
			formats: ["es"],
			fileName: () => "index.js",
		},
		outDir: mode === "development" ? webAppPluginsOutDir : packageOutDir,
		rollupOptions: {
			external: [/^@umbraco-cms\/backoffice/],
			output: {
				assetFileNames: "[name][extname]",
				entryFileNames: "index.js",
			},
		},
		sourcemap: true,
		target: "es2022",
	},
	publicDir: "public",
}));


