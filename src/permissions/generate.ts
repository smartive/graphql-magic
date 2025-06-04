import { Models } from '../models/models';
import { isRelation } from '../models/utils';

export type PermissionAction = 'READ' | 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE' | 'LINK';

export const ACTIONS: PermissionAction[] = ['READ', 'CREATE', 'UPDATE', 'DELETE', 'RESTORE', 'LINK'];

/**
 * Initial representation (tree structure, as defined by user).
 */
export type PermissionsConfig = Record<string, true | Record<string, PermissionsBlock>>;

export type PermissionsBlock = Partial<Record<PermissionAction, true>> & {
  WHERE?: Record<string, any>;
  RELATIONS?: Record<string, PermissionsBlock>;
};

/**
 * Final representation (lookup table (role, model, action) -> permission stack).
 */
export type Permissions = Record<string, true | RolePermissions>;

type RolePermissions = Record<string, Partial<Record<PermissionAction, true | PermissionStack>>>;

/**
 * For a given role, model and action,
 * this represents the list of potential (join) paths
 * that would grant permission to perform that action.
 */
export type PermissionStack = PermissionChain[];

export type PermissionChain = PermissionLink[];

export type PermissionLink = {
  type: string;
  foreignKey?: string;
  reverse?: boolean;
  me?: boolean;

  where?: any;
};

export const generatePermissions = (models: Models, config: PermissionsConfig) => {
  const permissions: Permissions = {};
  for (const [role, roleConfig] of Object.entries(config)) {
    if (roleConfig === true) {
      permissions[role] = true;
      continue;
    }
    const rolePermissions: RolePermissions = {};
    for (const [key, block] of Object.entries(roleConfig)) {
      const type = key === 'me' ? 'User' : key;
      if (key !== 'me' && !('WHERE' in block)) {
        rolePermissions[type] = {};
        for (const action of ACTIONS) {
          if (action === 'READ' || action in block) {
            rolePermissions[type][action] = true;
          }
        }
      }
      addPermissions(
        models,
        rolePermissions,
        [
          {
            type,
            ...(key === 'me' && { me: true }),
            ...('WHERE' in block && { where: block.WHERE }),
          },
        ],
        block,
      );
    }
    permissions[role] = rolePermissions;
  }

  return permissions;
};

const addPermissions = (models: Models, permissions: RolePermissions, links: PermissionLink[], block: PermissionsBlock) => {
  const { type } = links[links.length - 1];
  const model = models.getModel(type, 'entity');

  for (const action of ACTIONS) {
    if (action === 'READ' || action in block) {
      if (!permissions[type]) {
        permissions[type] = {};
      }
      if (!permissions[type][action]) {
        permissions[type][action] = [];
      }
      if (permissions[type][action] !== true) {
        permissions[type][action].push(links);
      }
    }
  }

  if (block.RELATIONS) {
    for (const [relation, subBlock] of Object.entries(block.RELATIONS)) {
      const field = model.fields.filter(isRelation).find((field) => field.name === relation);
      let link: PermissionLink;
      if (field) {
        link = {
          type: field.type,
          foreignKey: field.foreignKey || `${field.name}Id`,
          reverse: true,
        };
      } else {
        const reverseRelation = model.reverseRelationsByName[relation];

        if (!reverseRelation) {
          throw new Error(`Relation ${relation} in model ${model.name} does not exist.`);
        }

        link = {
          type: reverseRelation.targetModel.name,
          foreignKey: reverseRelation.field.foreignKey,
        };
      }
      if (subBlock.WHERE) {
        link.where = subBlock.WHERE;
      }
      addPermissions(models, permissions, [...links, link], subBlock);
    }
  }
};
