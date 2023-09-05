import { SourceFile, SyntaxKind, SyntaxList } from 'ts-morph';

export const findDeclarationInFile = (sourceFile: SourceFile, name: string) => {
  const syntaxList = sourceFile.getChildrenOfKind(SyntaxKind.SyntaxList)[0];
  if (!syntaxList) {
    throw new Error('No SyntaxList');
  }
  const declaration = findDeclaration(syntaxList, name);
  if (!declaration) {
    throw new Error('No rawModels declaration');
  }
  return declaration;
};

const findDeclaration = (syntaxList: SyntaxList, name: string) => {
  for (const variableStatement of syntaxList.getChildrenOfKind(SyntaxKind.VariableStatement)) {
    for (const declaration of variableStatement.getDeclarationList().getDeclarations()) {
      if (declaration.getName() === name) {
        return declaration;
      }
    }
  }
};
