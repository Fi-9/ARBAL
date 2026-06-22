import { SetMetadata } from '@nestjs/common';

export enum PermissionMode {
  ANY = 'ANY',
  ALL = 'ALL',
}

export interface PermissionOptions {
  permissions: string[];
  mode?: PermissionMode;
}

export const PERMISSIONS_KEY = 'permissions';

export function Permissions(options: PermissionOptions): any;
export function Permissions(...permissions: string[]): any;
export function Permissions(...args: any[]) {
  if (args.length === 1 && typeof args[0] === 'object' && 'permissions' in args[0]) {
    return SetMetadata(PERMISSIONS_KEY, {
      permissions: args[0].permissions,
      mode: args[0].mode ?? PermissionMode.ANY,
    });
  }
  return SetMetadata(PERMISSIONS_KEY, {
    permissions: args as string[],
    mode: PermissionMode.ANY,
  });
}
