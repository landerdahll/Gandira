import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const SelectedOrganization = createParamDecorator((_data: unknown, context: ExecutionContext) => {
  const value = context.switchToHttp().getRequest()?.headers?.['x-organization-id'];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
});
