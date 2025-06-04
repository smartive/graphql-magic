import { IndentationText, Project } from 'ts-morph';
import { PRIMITIVE_TYPES } from '../db/generate';
import { Models } from '../models';
import { ACTIONS } from './generate';

export const generatePermissionTypes = (models: Models) => {
  const project = new Project({
    manipulationSettings: {
      indentationText: IndentationText.TwoSpaces,
    },
  });

  const sourceFile = project.createSourceFile('permissions.ts', '', {
    overwrite: true,
  });

  sourceFile.addStatements(`export type PermissionsConfig = Record<Role, PermissionsBlock>;`);

  sourceFile.addStatements((writer) =>
    writer.write(`export type PermissionsBlock = true | `).inlineBlock(() => {
      writer.writeLine(`me?: UserPermissions,`);
      for (const model of models.entities) {
        writer.writeLine(`${model.name}?: ${model.name}Permissions,`);
      }
    }),
  );

  const usedEnums = new Set<string>(['Role']);

  for (const model of models.entities) {
    sourceFile.addStatements((writer) =>
      writer.write(`export type ${model.name}Where = `).inlineBlock(() => {
        for (const field of model.fields.filter((field) => field.filterable)) {
          if (field.kind === 'relation') {
            writer.writeLine(`${field.name}?: ${field.type}Where,`);
          } else if (!field.kind || field.kind === 'primitive') {
            writer.writeLine(`${field.name}?: ${PRIMITIVE_TYPES[field.type]} | ${PRIMITIVE_TYPES[field.type]}[],`);
          } else {
            if (field.kind === 'enum') {
              usedEnums.add(field.type);
            }
            writer.writeLine(`${field.name}?: ${field.type} | ${field.type}[],`);
          }
        }
      }),
    );

    sourceFile.addStatements((writer) =>
      writer.write(`export type ${model.name}Permissions = `).inlineBlock(() => {
        for (const action of ACTIONS) {
          writer.writeLine(`${action}?: true,`);
        }
        writer.writeLine(`WHERE?: ${model.name}Where,`);
        const relations = [...model.relations, ...model.reverseRelations];
        if (relations.length > 0) {
          writer.write(`RELATIONS?: `).inlineBlock(() => {
            for (const relation of relations) {
              writer.writeLine(`${relation.name}?: ${relation.targetModel.name}Permissions,`);
            }
          });
        }
      }),
    );
  }

  for (const name of usedEnums) {
    sourceFile.addStatements((writer) =>
      writer.write(
        `type ${name} = ${models
          .getModel(name, 'enum')
          .values.map((v) => `'${v}'`)
          .join(' | ')};`,
      ),
    );
  }

  return sourceFile.getFullText();
};
