export const ACTIONS = ['READ', 'CREATE', 'UPDATE', 'DELETE', 'RESTORE', 'LINK'] as const;
export type PermissionAction = (typeof ACTIONS)[number];
export type PermissionLink = {
    type: string;
    foreignKey?: string;
    reverse?: boolean;
    me?: boolean;
    where?: any;
  };
export type PermissionChain = PermissionLink[];
export type PermissionStack = PermissionChain[];
export type RolePermissions = Record<string, Partial<Record<PermissionAction, true | PermissionStack>>>;
export type Permissions = Record<string, true | RolePermissions>;
export const permissions = {
  "ADMIN": true
} satisfies Permissions;
