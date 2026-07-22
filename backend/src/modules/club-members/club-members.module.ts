import { Module } from '@nestjs/common';
import { ClubMembersController } from './club-members.controller';
import { ClubMembersService } from './club-members.service';

@Module({
  controllers: [ClubMembersController],
  providers: [ClubMembersService],
  exports: [ClubMembersService],
})
export class ClubMembersModule {}
