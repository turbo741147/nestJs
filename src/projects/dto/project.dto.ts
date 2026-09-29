export class ProjectDto {
  id: string;
  name: string;
  description: string | null;
  status: string;
  createdAt: Date;

  constructor(project: {
    id: string;
    name: string;
    description: string | null;
    status: string;
    createdAt: Date;
  }) {
    this.id = project.id;
    this.name = project.name;
    this.description = project.description;
    this.status = project.status;
    this.createdAt = project.createdAt;
  }
}
