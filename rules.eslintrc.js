export const sortImportsByLength = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Sort imports by length, alphabetize named imports, and keep type imports separate",
    },
    fixable: "code",
    schema: [],
  },

  create(context) {
    const sourceCode = context.sourceCode;

    const getSortedImportText = (imp) => {
      const text = sourceCode.getText(imp);

      const namedSpecifiers = imp.specifiers.filter((specifier) => specifier.type === "ImportSpecifier");

      if (namedSpecifiers.length < 2) {
        return text;
      }

      const sortedNamed = [...namedSpecifiers].sort((a, b) => {
        const importedA = a.imported.name.toLowerCase();
        const importedB = b.imported.name.toLowerCase();

        const result = importedA.localeCompare(importedB);

        if (result !== 0) return result;

        return sourceCode.getText(a).localeCompare(sourceCode.getText(b));
      });

      const replacement = sortedNamed.map((specifier) => sourceCode.getText(specifier)).join(", ");

      return text.replace(/\{[^}]*\}/, `{ ${replacement} }`);
    };

    return {
      Program(node) {
        const importNodes = node.body.filter((n) => n.type === "ImportDeclaration");

        if (importNodes.length < 2) return;

        const typeImports = [];
        const normalImports = [];

        for (const imp of importNodes) {
          if (imp.importKind === "type") {
            typeImports.push(imp);
          } else {
            normalImports.push(imp);
          }
        }

        const sortByLength = (a, b) => {
          const textA = getSortedImportText(a);
          const textB = getSortedImportText(b);

          if (textA.length !== textB.length) {
            return textA.length - textB.length;
          }

          return textA.localeCompare(textB);
        };

        const sortedNormal = [...normalImports].sort(sortByLength);
        const sortedType = [...typeImports].sort(sortByLength);

        const normalText = sortedNormal.map(getSortedImportText).join("\n");

        const typeText = sortedType.map(getSortedImportText).join("\n");

        const groups = [];

        if (normalImports.length) groups.push(normalText);
        if (typeImports.length) groups.push(typeText);

        const expectedText = groups.join("\n\n").trim();

        const firstImport = importNodes[0];
        const lastImport = importNodes[importNodes.length - 1];

        const actualText = sourceCode.text.slice(firstImport.range[0], lastImport.range[1]).trim();

        if (actualText !== expectedText) {
          context.report({
            node: firstImport,
            message:
              "Import declarations are not sorted correctly. Imports should be sorted by length, named imports alphabetically, and type imports kept separate.",
            fix(fixer) {
              return fixer.replaceTextRange([firstImport.range[0], lastImport.range[1]], expectedText);
            },
          });
        }
      },
    };
  },
};
