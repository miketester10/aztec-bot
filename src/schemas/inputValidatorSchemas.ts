import { z } from "zod";
import { InputType } from "../consts/input";

export const inputValidatorSchemas: Record<InputType, z.ZodType> = {
  ETH_ADDRESS: z
    .string()
    .trim()
    .nonempty("Address cannot be empty")
    .startsWith("0x", "Must start with '0x'")
    .refine((addr) => addr.length === 42, "Exact length: 42 characters (0x + 40 hexadecimal)")
    .refine((addr) => /^0x[0-9a-fA-F]{40}$/.test(addr), "Only hexadecimal characters allowed (0-9, a-f)"),

  PEER_ID: z
    .string()
    .trim()
    .nonempty("Peer ID cannot be empty")
    .startsWith("16Uiu2HA", "Must start with '16Uiu2HA'")
    .refine((id) => id.length === 53, { message: "Exact length: 53 characters" })
    .refine((id) => /^[1-9A-HJ-NP-Za-km-z]{53}$/.test(id), { message: "Must contain only valid Base58 characters (excluding 0, O, I, l)" }),
};
