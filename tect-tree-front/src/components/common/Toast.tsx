"use client";

export function Toast({ message }: { message: string }) {
  return <div role="status">{message}</div>;
}
