import { ForbiddenException } from '@nestjs/common';
import { OrganizationsController } from './organizations.controller';

describe('OrganizationsController', () => {
  const actor = { id: 'super-1', platformRole: 'SUPER_ADMIN' };
  const file = {
    buffer: Buffer.from('logo'),
    mimetype: 'image/png',
  } as Express.Multer.File;

  function setup() {
    const organizations = {
      adminDetail: jest.fn().mockResolvedValue({ organization: { id: 'org-1' } }),
      update: jest.fn().mockResolvedValue({ id: 'org-1', logoUrl: 'https://cdn.example/logo.webp' }),
    };
    const cloudinary = {
      uploadBuffer: jest.fn().mockResolvedValue({ secure_url: 'https://cdn.example/logo.webp' }),
    };
    const controller = new OrganizationsController(
      organizations as any,
      {} as any,
      {} as any,
      cloudinary as any,
    );
    return { controller, organizations, cloudinary };
  }

  it('authorizes the SUPER_ADMIN before uploading and persists the resulting logo URL', async () => {
    const { controller, organizations, cloudinary } = setup();

    await expect(controller.uploadLogo('org-1', file, actor)).resolves.toEqual({
      url: 'https://cdn.example/logo.webp',
      organization: { id: 'org-1', logoUrl: 'https://cdn.example/logo.webp' },
    });
    expect(organizations.adminDetail).toHaveBeenCalledWith('org-1', actor);
    expect(cloudinary.uploadBuffer).toHaveBeenCalledWith(file.buffer, 'image/png', 'outrahora/organizations');
    expect(organizations.update).toHaveBeenCalledWith(
      'org-1',
      { logoUrl: 'https://cdn.example/logo.webp' },
      actor,
    );
    expect(organizations.adminDetail.mock.invocationCallOrder[0]).toBeLessThan(
      cloudinary.uploadBuffer.mock.invocationCallOrder[0],
    );
  });

  it('does not upload when organization access is refused', async () => {
    const { controller, organizations, cloudinary } = setup();
    organizations.adminDetail.mockRejectedValue(new ForbiddenException());

    await expect(controller.uploadLogo('org-1', file, actor)).rejects.toBeInstanceOf(ForbiddenException);
    expect(cloudinary.uploadBuffer).not.toHaveBeenCalled();
    expect(organizations.update).not.toHaveBeenCalled();
  });
});
