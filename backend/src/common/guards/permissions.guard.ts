import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY, PermissionMode, PermissionOptions } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const meta = this.reflector.getAllAndOverride<PermissionOptions | string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!meta) {
      return true;
    }

    let requiredPermissions: string[] = [];
    let mode: PermissionMode = PermissionMode.ANY;

    if (Array.isArray(meta)) {
      requiredPermissions = meta;
    } else if (meta && typeof meta === 'object') {
      requiredPermissions = meta.permissions || [];
      mode = meta.mode || PermissionMode.ANY;
    }

    if (requiredPermissions.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) return false;

    // user.permissions is populated by JwtStrategy based on role
    if (mode === PermissionMode.ALL) {
      return requiredPermissions.every((perm) => user.permissions?.includes(perm));
    } else {
      return requiredPermissions.some((perm) => user.permissions?.includes(perm));
    }
  }
}

