import { IsNotEmpty, IsString } from 'class-validator';

export class AttachLabelDto {
  @IsString()
  @IsNotEmpty()
  labelId: string;
}
