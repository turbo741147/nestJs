export class UserDto {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  createdAt: Date;

  constructor(user: {
    id: string;
    email: string;
    name: string;
    role: string;
    status: string;
    createdAt: Date;
  }) {
    this.id = user.id;
    this.email = user.email;
    this.name = user.name;
    this.role = user.role;
    this.status = user.status;
    this.createdAt = user.createdAt;
  }
}
