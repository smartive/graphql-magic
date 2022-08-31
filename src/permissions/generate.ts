import { Models } from '../models';
import { summonByName } from '../utils';

export type Action = 'READ' | 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE' | 'LINK';

const ACTIONS: Action[] = ['READ', 'CREATE', 'UPDATE', 'DELETE', 'RESTORE', 'LINK'];

/**
 * Initial representation (tree structure, as defined by user).
 */
export type PermissionsConfig = {
  [role: string]:
    | true
    | {
        [type: string]: PermissionsBlock;
      };
};

export type PermissionsBlock = {
  [action in Action]?: true;
} & {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  WHERE?: Record<string, any>;
  RELATIONS?: {
    [relation: string]: PermissionsBlock;
  };
};

/**
 * Final representation (lookup table (role, model, action) -> permission stack).
 */
export type Permissions = {
  [role: string]: true | RolePermissions;
};

type RolePermissions = {
  [type: string]: {
    [action in Action]?: true | PermissionStack;
  };
};

/**
 * For a given role, model and action,
 * this represents the list of potential (join) paths
 * that would grant permission to perform that action.
 */
export type PermissionStack = PermissionLink[][];

export type PermissionLink = {
  type: string;
  foreignKey?: string;
  reverse?: boolean;
  me?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        block
      );
    }
    permissions[role] = rolePermissions;
  }

  return permissions;
};

const addPermissions = (models: Models, permissions: RolePermissions, links: PermissionLink[], block: PermissionsBlock) => {
  const { type } = links[links.length - 1];
  const model = summonByName(models, type);

  for (const action of ACTIONS) {
    if (action === 'READ' || action in block) {
      if (!permissions[type]) {
        permissions[type] = {};
      }
      if (!permissions[type][action]) {
        permissions[type][action] = [];
      }
      if (permissions[type][action] !== true) {
        (permissions[type][action] as PermissionStack).push(links);
      }
    }
  }

  if (block.RELATIONS) {
    for (const [relation, subBlock] of Object.entries(block.RELATIONS)) {
      const field = model.fields.find((field) => field.relation && field.name === relation);
      let link: PermissionLink;
      if (field) {
        link = {
          type: field.type,
          foreignKey: field.foreignKey || `${field.name}Id`,
          reverse: true,
        };
      } else {
        const field = model.reverseRelationsByName[relation];
        link = {
          type: field.model.name,
          foreignKey: field.foreignKey,
        };
      }
      if (subBlock.WHERE) {
        link.where = subBlock.WHERE;
      }
      addPermissions(models, permissions, [...links, link], subBlock);
    }
  }
};
