import { Body, Controller, Get, Put } from '@nestjs/common';

import {
  AdminSiteProfileResponse,
  PublicSiteProfileResponse,
  SiteProfileService,
  UpdateSiteProfilePayload,
} from './site-profile.service';
import { AdminAuthGuard } from '../iam/session.guard';

@Controller('site-profile')
export class SiteProfileController {
  constructor(private readonly siteProfileService: SiteProfileService) {}

  @Get('public')
  publicProfile(): Promise<PublicSiteProfileResponse> {
    return this.siteProfileService.getPublicProfile();
  }

  @Get()
  @AdminAuthGuard.Protect()
  profile(): Promise<AdminSiteProfileResponse> {
    return this.siteProfileService.getProfile();
  }

  @Put()
  @AdminAuthGuard.Protect()
  update(
    @Body() payload: UpdateSiteProfilePayload,
  ): Promise<AdminSiteProfileResponse> {
    return this.siteProfileService.updateProfile(payload);
  }
}
