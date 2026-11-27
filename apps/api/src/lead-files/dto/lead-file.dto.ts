import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class SaveMessageAttachmentDto {
  @ApiProperty()
  @IsString()
  messageId!: string;

  @ApiProperty()
  @IsString()
  attachmentId!: string;
}
