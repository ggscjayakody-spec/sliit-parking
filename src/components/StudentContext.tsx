"use client";

import { createContext, useContext } from "react";
import type { Student } from "@/lib/types";

export const StudentCtx = createContext<{ student: Student; reload: () => void } | null>(null);

export const useStudent = () => {
  const v = useContext(StudentCtx);
  if (!v) throw new Error("useStudent must be used inside /student");
  return v;
};
