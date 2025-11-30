import { Redis } from "ioredis";
import { redisURL } from "./envConfig.js";

export const redis = new Redis(redisURL);
