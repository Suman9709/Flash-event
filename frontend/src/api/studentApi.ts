
import axios from "axios";

type Mark = number | string;

export type StudentResult = {
  rollNumber: string;
  name: string;
  english: Mark;
  physics: Mark;
  chemistry: Mark;
  math: Mark;
  hindi: Mark;
  totalMarks: Mark;
  percentage: number;
};

type LoginResponse = {
  success: true;
  expiresIn: number;
  student: {
    rollNumber: string;
    name: string;
  };
};

type ResultResponse = {
  success: true;
  result: StudentResult;
};

const studentApi = axios.create({
  baseURL: "http://localhost:3000/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

export async function studentLogin(rollNumber: string, dob: string) {
  const response = await studentApi.post<LoginResponse>("/auth/login", { rollNumber, dob });
  return response.data;
}

export async function studentResult() {
  const response = await studentApi.get<ResultResponse>("/results/me");
  return response.data.result;
}

export async function studentLogout() {
  await studentApi.post("/auth/logout");
}
