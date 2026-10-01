import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { ProjectDto } from './dto/project.dto.js';

const projectSelect = {
  id: true,
  name: true,
  description: true,
  status: true,
  createdAt: true,
} satisfies Prisma.ProjectSelect;

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProjectDto): Promise<ProjectDto> {
    const project = await this.prisma.project.create({
      data: {
        name: dto.name,
        description: dto.description,
        status: dto.status ?? 'active',
      },
      select: projectSelect,
    });
    return project;
  }

  async findAll(): Promise<ProjectDto[]> {
    const projects = await this.prisma.project.findMany({
      select: projectSelect,
      orderBy: { id: 'asc' },
    });

    return projects;
  }
}
