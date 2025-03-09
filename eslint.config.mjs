import { globalIgnores } from "eslint/config";
import tseslint from 'typescript-eslint';
import eslint from '@eslint/js';

// export default tseslint.config(
//   eslint.configs.recommended,
//   tseslint.configs.recommendedTypeChecked,
//   {
//     languageOptions: {
//       parserOptions: {
//         projectService: {
// 					allowDefaultProject: ['*.js', '*.mjs']
// 				},
//         tsconfigRootDir: import.meta.dirname,
//       }
//     },
//   },
// 	globalIgnores(["**/out/*", ".vscode-test/*", "coverage/*"])
// );

export default tseslint.config({
	files: ['**/*.ts'],
	extends: [
  	eslint.configs.recommended,
  	tseslint.configs.strict
	],
	rules: {
		//'@typescript-eslint/no-unsafe-member-access': 'warn'
	}
});
