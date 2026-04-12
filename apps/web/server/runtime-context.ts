import { detectRuntime } from "@locker/common";

export const runtime = Object.freeze(detectRuntime(process.env));

if (runtime.overrideRejected) {
  console.warn(
    `[locker] LOCKER_RUNTIME_ENV="${runtime.overrideRejected}" is not a valid runtime. ` +
    `Falling back to auto-detection (resolved: ${runtime.environment}). ` +
    `Valid values: vercel, aws_lambda, netlify, fly, railway, render, docker, development`,
  );
}
