import { z } from "zod";
import { isAddress } from "@solana/kit";

export const LAMPORTS_PER_SOL = 1e9;

export const solAddress = z.string()
    .refine((val) => isAddress(val.trim()), {
        message: "Invalid Solana address",
    });