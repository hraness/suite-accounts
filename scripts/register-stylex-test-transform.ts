import { plugin } from "bun";
import { profileStylexTransform } from "./stylex-transform.js";

await plugin(profileStylexTransform(process.cwd()).plugin);
