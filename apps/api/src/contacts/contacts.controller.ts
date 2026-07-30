import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiHeader } from "@nestjs/swagger";
import { ContactsService } from "./contacts.service";
import { OrganizationId } from "../common/decorators/organization.decorator";
import { DemoUser, type DemoUser as DemoUserType } from "../common/decorators/demo-user.decorator";
import {
  CreateContactDto,
  UpdateContactDto,
  QueryContactsDto,
  BulkTagsDto,
  BulkOwnerDto,
  BulkArchiveDto,
  MergeContactsDto,
  DuplicateCheckDto,
} from "./dto/contact.dto";

@ApiTags("contacts")
@ApiHeader({ name: "X-Demo-User-Id", required: false })
@Controller("contacts")
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get()
  @ApiOperation({ summary: "List contacts" })
  findAll(@OrganizationId() orgId: string, @Query() query: QueryContactsDto) {
    return this.contactsService.findAll(orgId, query);
  }

  @Post("bulk/tags")
  @ApiOperation({ summary: "Bulk add/remove/set tags" })
  bulkTags(@OrganizationId() orgId: string, @Body() dto: BulkTagsDto) {
    return this.contactsService.bulkTags(orgId, dto);
  }

  @Post("bulk/owner")
  @ApiOperation({ summary: "Bulk assign owner" })
  bulkOwner(@OrganizationId() orgId: string, @Body() dto: BulkOwnerDto) {
    return this.contactsService.bulkOwner(orgId, dto);
  }

  @Post("bulk/archive")
  @ApiOperation({ summary: "Bulk archive contacts" })
  bulkArchive(@OrganizationId() orgId: string, @Body() dto: BulkArchiveDto) {
    return this.contactsService.bulkArchive(orgId, dto);
  }

  @Post("merge")
  @ApiOperation({ summary: "Merge two contacts" })
  merge(@OrganizationId() orgId: string, @Body() dto: MergeContactsDto) {
    return this.contactsService.merge(orgId, dto);
  }

  @Post("duplicates")
  @ApiOperation({ summary: "Check for duplicate contacts" })
  checkDuplicates(@OrganizationId() orgId: string, @Body() dto: DuplicateCheckDto) {
    return this.contactsService.checkDuplicates(orgId, dto);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get contact by id" })
  findOne(@OrganizationId() orgId: string, @Param("id") id: string) {
    return this.contactsService.findOne(orgId, id);
  }

  @Post()
  @ApiOperation({ summary: "Create contact" })
  create(
    @OrganizationId() orgId: string,
    @DemoUser() user: DemoUserType,
    @Body() dto: CreateContactDto,
  ) {
    return this.contactsService.create(orgId, dto, user.id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update contact" })
  update(
    @OrganizationId() orgId: string,
    @Param("id") id: string,
    @Body() dto: UpdateContactDto,
  ) {
    return this.contactsService.update(orgId, id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Soft-delete contact" })
  remove(@OrganizationId() orgId: string, @Param("id") id: string) {
    return this.contactsService.remove(orgId, id);
  }
}
