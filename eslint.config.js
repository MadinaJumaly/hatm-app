import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores(["dist", ".wrangler", "coverage", "worker-configuration.d.ts"]),
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      // XSS protection (threat T5, design §I).
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message: "Raw HTML is not allowed (XSS). Render text instead.",
        },
        {
          selector:
            "JSXAttribute[name.name='style'] > :matches(Literal, JSXExpressionContainer > Literal, JSXExpressionContainer > TemplateLiteral)",
          message: "Use a CSS class. `style` is only allowed as an object for dynamic values.",
        },
        {
          selector:
            "AssignmentExpression > MemberExpression[property.name=/^(innerHTML|outerHTML)$/]",
          message: "Raw HTML is not allowed (XSS).",
        },
      ],
    },
  },
  { files: ["**/*.js"], extends: [tseslint.configs.disableTypeChecked] },
  prettier,
]);
