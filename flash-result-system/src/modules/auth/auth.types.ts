export type LoginBody = {
  rollNumber?: unknown;
  dob?: unknown;
};

export type AuthenticatedStudent = {
  id: number;
  rollNumber: string;
  name: string;
};
